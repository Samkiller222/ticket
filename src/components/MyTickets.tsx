import { useState } from 'react'
import { formatDate } from '../lib/format'
import { formatTicketId, STATUS_LABELS, type OwnTicket } from '../lib/tickets'

export function MyTickets({ tickets, loaded, error }: { tickets: OwnTicket[]; loaded: boolean; error: string }) {
  const open = tickets.filter((t) => t.status !== 'resolved').length

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Your tickets</h2>
        {tickets.length > 0 && <span className="muted">{open} open</span>}
      </div>
      {error && <p className="field-error">Could not load your tickets: {error}</p>}
      {!loaded ? (
        <p className="empty">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="empty">Tickets you submit from this browser appear here, with their status and any replies.</p>
      ) : (
        <ul className="ticket-list">
          {tickets.map((t) => (
            <MyTicketRow key={t.id} ticket={t} />
          ))}
        </ul>
      )}
    </section>
  )
}

function MyTicketRow({ ticket: t }: { ticket: OwnTicket }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`ticket priority-${t.priority}`}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{formatTicketId(t.id)}</span>
        <span className="ticket-title">
          {t.reason_label}
          {t.notes.length > 0 && <span className="muted"> · {t.notes.length} {t.notes.length === 1 ? 'reply' : 'replies'}</span>}
        </span>
        <span className={`badge status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
      </button>
      {open && (
        <div className="ticket-detail">
          <p className="muted">
            {t.category} · {t.priority} priority · submitted {formatDate(t.created_at)} · updated {formatDate(t.updated_at)}
          </p>
          <p className="description">{t.description}</p>
          {t.notes.length > 0 && (
            <ul className="notes">
              {t.notes.map((n) => (
                <li key={n.created_at}>
                  <span className="muted">{formatDate(n.created_at)}</span> {n.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
