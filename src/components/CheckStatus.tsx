import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { onPing } from '../lib/live'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import { formatTicketId, parseTicketId, STATUS_LABELS, type PublicTicket } from '../lib/tickets'

export function CheckStatus() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<PublicTicket | null | undefined>(undefined)
  const [error, setError] = useState('')

  const lookup = useCallback(async (id: number) => {
    const { data, error } = await supabase!.rpc('ticket_lookup', { p_id: id })
    setError(error?.message ?? '')
    setResult((data as PublicTicket | null) ?? null)
  }, [])

  async function search(e: FormEvent) {
    e.preventDefault()
    const id = parseTicketId(query)
    if (id === null) setResult(null)
    else await lookup(id)
  }

  // Keep the shown ticket live: status changes and new notes appear without searching again.
  const shownId = result?.id
  useEffect(() => (shownId === undefined ? undefined : onPing(`ticket:${shownId}`, () => lookup(shownId))), [shownId, lookup])

  return (
    <section className="panel">
      <h2>Look up a ticket by number</h2>
      <p className="muted">For tickets sent from another device or browser.</p>
      <form className="inline-form" onSubmit={search}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticket number, e.g. TCK-1001" />
        <button className="btn" type="submit">
          Look up
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
      {result === null && !error && <p className="muted">No ticket with that number.</p>}
      {result && (
        <div className="status-card">
          <div className="row-between">
            <span className="ticket-id">{formatTicketId(result.id)}</span>
            <span className={`badge status-${result.status}`}>{STATUS_LABELS[result.status]}</span>
          </div>
          <p>
            {result.category} · {result.reason_label}
          </p>
          <p className="muted">
            Submitted {formatDate(result.created_at)} · last updated {formatDate(result.updated_at)}
          </p>
          {result.notes.length > 0 && (
            <ul className="notes">
              {result.notes.map((n) => (
                <li key={n.created_at}>
                  <span className="muted">{formatDate(n.created_at)}</span> {n.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
