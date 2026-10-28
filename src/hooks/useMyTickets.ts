import { useCallback, useEffect, useState } from 'react'
import { browserKey, browserKeyHash } from '../lib/browserKey'
import { onPing } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { OwnTicket } from '../lib/tickets'

function fetchMine() {
  return supabase!.rpc('ticket_mine', { p_owner_key: browserKey() })
}

/** Tickets submitted from this browser. Updates live, and again whenever the tab comes back into view. */
export function useMyTickets() {
  const [tickets, setTickets] = useState<OwnTicket[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  // False until the database has ticket_mine (migration 20261028140000).
  const [available, setAvailable] = useState(true)

  const reload = useCallback(
    () =>
      fetchMine().then(({ data, error }) => {
        setLoaded(true)
        setAvailable(error?.code !== 'PGRST202')
        setError(error && error.code !== 'PGRST202' ? error.message : '')
        if (data) setTickets(data as OwnTicket[])
      }),
    [],
  )

  useEffect(() => {
    if (!supabase) return
    reload()
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    let stop = () => {}
    let active = true
    browserKeyHash().then((hash) => {
      if (active) stop = onPing(`owner:${hash}`, reload)
    })
    return () => {
      active = false
      stop()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  return { tickets, loaded, error, available, reload }
}
