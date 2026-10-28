import { useCallback, useEffect, useState } from 'react'
import { browserKeys, sha256Hex } from '../lib/browserKey'
import { onPing } from '../lib/live'
import { supabase } from '../lib/supabase'
import type { OwnTicket } from '../lib/tickets'

function fetchMine() {
  return supabase!.rpc('ticket_mine_many', { p_owner_keys: browserKeys() })
}

/** Tickets for every key this browser holds. Updates live, and again whenever the tab comes back into view. */
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
    let stops: (() => void)[] = []
    let active = true
    Promise.all(browserKeys().map(sha256Hex)).then((hashes) => {
      if (active) stops = hashes.map((hash) => onPing(`owner:${hash}`, reload))
    })
    return () => {
      active = false
      stops.forEach((stop) => stop())
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  return { tickets, loaded, error, reload }
}
