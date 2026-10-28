import { useState } from 'react'
import { formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import { formatTicketId, openTickets, STATUS_LABELS, STATUSES, type Status, type Ticket } from '../lib/tickets'
import { Collapse } from './Collapse'
import { ChevronIcon, InboxIcon, SearchIcon } from './Icons'
import { Segmented } from './Segmented'
import { Skeleton } from './Skeleton'

type Filter = 'open' | 'resolved' | 'all'

export function AdminTickets({ tickets, loading, error, reload }: { tickets: Ticket[]; loading: boolean; error: string; reload: () => void }) {
  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')

  const open = openTickets(tickets)
  const base = filter === 'open' ? open : tickets.filter((t) => filter === 'all' || t.status === 'resolved')
  const q = search.trim().toLowerCase()
  const shown = q
    ? base.filter((t) => [formatTicketId(t.id), t.name, t.email, t.reason_label, t.category, t.description].join(' ').toLowerCase().includes(q))
    : base

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Tickets</h2>
        <span className="pill">{open.length} open</span>
      </div>
      <div className="toolbar">
        <Segmented
          className="segmented"
          label="Show tickets"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        <label className="search">
          <SearchIcon size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets" aria-label="Search tickets" />
        </label>
      </div>
      {error && <p className="field-error">{error}</p>}
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <div className="empty" key={`empty-${filter}`}>
          <InboxIcon size={28} />
          <p>{filter === 'open' && !q ? 'No open tickets. New tickets appear here as soon as someone submits one.' : 'No tickets match.'}</p>
        </div>
      ) : (
        <ul className="ticket-list" key={filter}>
          {shown.map((t, i) => (
            <TicketRow key={t.id} ticket={t} reload={reload} index={i} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TicketRow({ ticket: t, reload, index }: { ticket: Ticket; reload: () => void; index: number }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  async function changeStatus(status: Status) {
    const { error } = await supabase!.from('ticket_tickets').update({ status }).eq('id', t.id)
    setError(error?.message ?? '')
    reload()
  }

  async function deleteTicket() {
    if (!confirm(`Delete ${formatTicketId(t.id)} and its notes? This cannot be undone.`)) return
    // RLS turns a refused delete into "0 rows", so ask for the deleted row back to tell the difference.
    const { data, error } = await supabase!.from('ticket_tickets').delete().eq('id', t.id).select('id')
    setError(error?.message ?? (data?.length ? '' : 'The ticket was not deleted. Check that you are signed in as an admin.'))
    reload()
  }

  async function addNote() {
    const { error } = await supabase!.from('ticket_notes').insert({ ticket_id: t.id, body: note.trim() })
    setError(error?.message ?? '')
    if (!error) setNote('')
    reload()
  }

  return (
    <li className={`ticket priority-${t.priority}${open ? ' expanded' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{formatTicketId(t.id)}</span>
        <span className="ticket-title">
          {t.reason_label}
          <span className="muted"> · {t.name}</span>
        </span>
        <span className={`badge priority-badge-${t.priority}`}>{t.priority}</span>
        <span key={t.status} className={`badge status status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
        <span className="chevron">
          <ChevronIcon size={16} />
        </span>
      </button>
      <Collapse open={open}>
        <div className="ticket-detail">
          <p className="muted">
            {t.category} · submitted {formatDate(t.created_at)}
            {t.email && (
              <>
                {' '}
                · <a href={`mailto:${t.email}?subject=${encodeURIComponent(`${formatTicketId(t.id)}: ${t.reason_label}`)}`}>{t.email}</a>
              </>
            )}
          </p>
          <p className="description">{t.description}</p>
          {t.notes.length > 0 && (
            <ul className="notes">
              {t.notes.map((n) => (
                <li key={n.id ?? n.created_at}>
                  <span className="muted">{formatDate(n.created_at)}</span> {n.body}
                </li>
              ))}
            </ul>
          )}
          <div className="toolbar">
            <label className="inline">
              Status{' '}
              <select value={t.status} onChange={(e) => changeStatus(e.target.value as Status)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="link-btn danger push-right" onClick={deleteTicket}>
              Delete ticket
            </button>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault()
              addNote()
            }}
          >
            <input value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (the submitter sees it when they check the ticket)" />
            <button className="btn" type="submit" disabled={!note.trim()}>
              Add note
            </button>
          </form>
          {error && <p className="field-error">{error}</p>}
        </div>
      </Collapse>
    </li>
  )
}
