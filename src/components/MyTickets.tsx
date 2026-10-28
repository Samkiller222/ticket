import { useState } from 'react'
import { formatDate } from '../lib/format'
import { formatTicketId, STATUS_LABELS, type OwnTicket } from '../lib/tickets'
import { ChevronIcon, InboxIcon } from './Icons'
import { Skeleton } from './Skeleton'

export function MyTickets({ tickets, loaded, error }: { tickets: OwnTicket[]; loaded: boolean; error: string }) {
  const open = tickets.filter((t) => t.status !== 'resolved').length

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Your tickets</h2>
        {tickets.length > 0 && <span className="pill">{open} open</span>}
      </div>
      {error && <p className="field-error">Could not load your tickets: {error}</p>}
      {!loaded ? (
        <Skeleton rows={2} />
      ) : tickets.length === 0 ? (
        <div className="empty">
          <InboxIcon size={28} />
          <p>Tickets you submit from this browser appear here, with their status and any replies.</p>
        </div>
      ) : (
        <ul className="ticket-list">
          {tickets.map((t, i) => (
            <MyTicketRow key={t.id} ticket={t} index={i} />
          ))}
        </ul>
      )}
    </section>
  )
}

function MyTicketRow({ ticket: t, index }: { ticket: OwnTicket; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`ticket priority-${t.priority}${open ? ' expanded' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{formatTicketId(t.id)}</span>
        <span className="ticket-title">
          {t.reason_label}
          {t.notes.length > 0 && <span className="muted"> · {t.notes.length} {t.notes.length === 1 ? 'reply' : 'replies'}</span>}
        </span>
        <span key={t.status} className={`badge status status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
        <span className="chevron">
          <ChevronIcon size={16} />
        </span>
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
