import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { onPing } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { Reason, Ticket } from '../lib/tickets'

function fetchReasons() {
  return supabase!.from('ticket_reasons').select('id, category, label, active').order('category').order('label')
}

function fetchTickets() {
  return supabase!
    .from('ticket_tickets')
    .select('*, notes:ticket_notes(id, body, created_at)')
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'ticket_notes' })
}

/** Ticket reasons. Visitors get the active ones; admins also get hidden ones. */
export function useReasons(session: Session | null) {
  const [reasons, setReasons] = useState<Reason[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(
    () =>
      fetchReasons().then(({ data, error }) => {
        setError(error?.message ?? '')
        if (data) setReasons(data)
      }),
    [],
  )

  // Reload when the session changes, since admins can also see hidden reasons.
  useEffect(() => {
    if (supabase) reload()
  }, [reload, session])

  useEffect(() => onPing('reasons', reload), [reload])

  return { reasons, error, reload }
}

/** All tickets with their notes, refreshed live while an admin is signed in. */
export function useAdminTickets(enabled: boolean) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(
    () =>
      fetchTickets().then(({ data, error }) => {
        setLoading(false)
        setError(error?.message ?? '')
        if (data) setTickets(data as Ticket[])
      }),
    [],
  )

  useEffect(() => {
    if (!enabled || !supabase) return
    reload()
    const client = supabase
    const channel = client
      .channel('ticket-desk-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_tickets' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_notes' }, () => reload())
      .subscribe()
    return () => {
      client.removeChannel(channel)
    }
  }, [enabled, reload])

  return { tickets, loading, error, reload }
}

/** The signed-in session (if any) and whether that user is a ticket admin. */
export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    client.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = client.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !session) return
    let current = true
    supabase.rpc('ticket_is_admin').then(({ data }) => {
      if (current) setIsAdmin(data === true)
    })
    return () => {
      current = false
      setIsAdmin(false)
    }
  }, [session])

  return { session, isAdmin }
}
