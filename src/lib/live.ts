import { supabase } from './supabase'

/**
 * Calls onChange whenever the database pings a ticket-desk topic (see migration
 * 20261028160000_ticket_live_updates.sql). Pings carry no data; callers reload what they show.
 * Returns an unsubscribe function.
 */
export function onPing(topic: string, onChange: () => void): () => void {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client
    .channel(`ticket-desk:${topic}`)
    .on('broadcast', { event: 'changed' }, () => onChange())
    .subscribe()
  return () => {
    client.removeChannel(channel)
  }
}
