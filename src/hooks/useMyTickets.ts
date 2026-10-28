import { useCallback, useEffect, useState } from 'react'
import { browserKey } from '../lib/browserKey'
import { supabase } from '../lib/supabase'
import type { OwnTicket } from '../lib/tickets'

function fetchMine() {
  return supabase!.rpc('ticket_mine', { p_owner_key: browserKey() })
}

/** Tickets submitted from this browser. Refreshes when the tab comes back into view and every minute. */
export function useMyTickets() {
  const [tickets, setTickets] = useState<OwnTicket[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')

  const reload = useCallback(
    () =>
      fetchMine().then(({ data, error }) => {
        setLoaded(true)
        setError(error?.message ?? '')
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
    const timer = setInterval(onVisible, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [reload])

  return { tickets, loaded, error, reload }
}
