import { useState } from 'react'
import { addNote, openTickets, setStatus, STATUS_LABELS, STATUSES, type Desk, type Status, type Ticket } from '../lib/tickets'
import { formatDate } from '../lib/format'

type Filter = 'open' | 'resolved' | 'all'

export function AdminTickets({ desk, update }: { desk: Desk; update: (change: (d: Desk) => Desk) => void }) {
  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')

  const base = filter === 'open' ? openTickets(desk.tickets) : desk.tickets.filter((t) => filter === 'all' || t.status === 'resolved')
  const q = search.trim().toLowerCase()
  const shown = q ? base.filter((t) => [t.id, t.name, t.email, t.reasonLabel, t.category, t.description].join(' ').toLowerCase().includes(q)) : base
  const openCount = openTickets(desk.tickets).length

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Tickets</h2>
        <span className="muted">{openCount} open</span>
      </div>
      <div className="toolbar">
        <div className="segmented">
          {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets" />
      </div>
      {shown.length === 0 ? (
        <p className="empty">{filter === 'open' ? 'No open tickets. New tickets appear here as soon as someone submits one.' : 'No tickets match.'}</p>
      ) : (
        <ul className="ticket-list">
          {shown.map((t) => (
            <TicketRow key={t.id} ticket={t} update={update} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TicketRow({ ticket: t, update }: { ticket: Ticket; update: (change: (d: Desk) => Desk) => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')

  return (
    <li className={`ticket priority-${t.priority}`}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{t.id}</span>
        <span className="ticket-title">
          {t.reasonLabel}
          <span className="muted"> · {t.name}</span>
        </span>
        <span className={`badge priority-badge-${t.priority}`}>{t.priority}</span>
        <span className={`badge status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
      </button>
      {open && (
        <div className="ticket-detail">
          <p className="muted">
            {t.category} · submitted {formatDate(t.createdAt)}
            {t.email && (
              <>
                {' '}
                · <a href={`mailto:${t.email}?subject=${encodeURIComponent(`${t.id}: ${t.reasonLabel}`)}`}>{t.email}</a>
              </>
            )}
          </p>
          <p className="description">{t.description}</p>
          {t.notes.length > 0 && (
            <ul className="notes">
              {t.notes.map((n) => (
                <li key={n.at}>
                  <span className="muted">{formatDate(n.at)}</span> {n.text}
                </li>
              ))}
            </ul>
          )}
          <div className="toolbar">
            <label className="inline">
              Status{' '}
              <select value={t.status} onChange={(e) => update((d) => setStatus(d, t.id, e.target.value as Status))}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault()
              update((d) => addNote(d, t.id, note))
              setNote('')
            }}
          >
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (the submitter sees it when they check the ticket)" />
            <button className="btn" type="submit" disabled={!note.trim()}>
              Add note
            </button>
          </form>
        </div>
      )}
    </li>
  )
}
