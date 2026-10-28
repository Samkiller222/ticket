import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { onPing } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { Reason, Ticket } from '../lib/tickets'

function fetchReasons() {
  return supabase!.from('ticket_reasons').select('id, category, label, active').order('category').order('label')
}

function fetchTickets() {
  return supabase!
    .from('ticket_tickets')
    .select('*, notes:ticket_notes(id, body, created_at, from_submitter), attachments:ticket_attachments(id, name, path, size)')
    .order('created_at', { ascending: false })
    .order('created_at', { referencedTable: 'ticket_notes' })
}

/** What the admin is alerted about: a new ticket, or a reply from whoever raised one. */
export type AdminEvent = { kind: 'ticket'; ticket: Ticket } | { kind: 'reply'; ticketId: number; body: string }

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
export function useAdminTickets(enabled: boolean, onEvent?: (e: AdminEvent) => void) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Latest callback without resubscribing the channel when it changes.
  const eventRef = useRef(onEvent)
  useEffect(() => {
    eventRef.current = onEvent
  })

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_tickets' }, (payload) => {
        if (payload.eventType === 'INSERT') eventRef.current?.({ kind: 'ticket', ticket: payload.new as Ticket })
        reload()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_notes' }, (payload) => {
        const note = payload.new as { ticket_id?: number; body?: string; from_submitter?: boolean }
        if (payload.eventType === 'INSERT' && note.from_submitter) eventRef.current?.({ kind: 'reply', ticketId: note.ticket_id ?? 0, body: note.body ?? '' })
        reload()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_attachments' }, () => reload())
      .subscribe()
    return () => {
      client.removeChannel(channel)
    }
  }, [enabled, reload])

  return { tickets, loading, error, reload }
}

export interface SavedReply {
  id: string
  title: string
  body: string
}

/** The admin's saved replies. */
export function useSavedReplies(enabled: boolean) {
  const [replies, setReplies] = useState<SavedReply[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(
    () =>
      supabase!
        .from('ticket_saved_replies')
        .select('id, title, body')
        .order('title')
        .then(({ data, error }) => {
          setError(error?.message ?? '')
          if (data) setReplies(data)
        }),
    [],
  )

  useEffect(() => {
    if (enabled && supabase) reload()
  }, [enabled, reload])

  return { replies, error, reload }
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
