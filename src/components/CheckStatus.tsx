import { useState, type FormEvent } from 'react'
import { findTicket, STATUS_LABELS, type Desk, type Ticket } from '../lib/tickets'
import { formatDate } from '../lib/format'

export function CheckStatus({ desk }: { desk: Desk }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Ticket | null | undefined>(undefined)

  function search(e: FormEvent) {
    e.preventDefault()
    setResult(findTicket(desk, query) ?? null)
  }

  // Re-read from the desk so status changes made by an admin show up straight away.
  const live = result ? findTicket(desk, result.id) : result

  return (
    <section className="panel">
      <h2>Check a ticket</h2>
      <form className="inline-form" onSubmit={search}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticket number, e.g. TCK-1001" />
        <button className="btn" type="submit">
          Look up
        </button>
      </form>
      {live === null && <p className="muted">No ticket with that number.</p>}
      {live && (
        <div className="status-card">
          <div className="row-between">
            <span className="ticket-id">{live.id}</span>
            <span className={`badge status-${live.status}`}>{STATUS_LABELS[live.status]}</span>
          </div>
          <p>
            {live.category} · {live.reasonLabel}
          </p>
          <p className="muted">Submitted {formatDate(live.createdAt)} · last updated {formatDate(live.updatedAt)}</p>
          {live.notes.length > 0 && (
            <ul className="notes">
              {live.notes.map((n) => (
                <li key={n.at}>
                  <span className="muted">{formatDate(n.at)}</span> {n.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
