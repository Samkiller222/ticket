import { useState } from 'react'
import type { SavedReply } from '../hooks/useDesk'
import { ageLevel, formatAge, formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  formatTicketId,
  needsAttention,
  PRIORITIES,
  SORT_LABELS,
  sortTickets,
  STATUS_LABELS,
  STATUSES,
  type Priority,
  type SortOrder,
  type Status,
  type Ticket,
} from '../lib/tickets'
import { Attachments } from './Attachments'
import { Collapse } from './Collapse'
import { Conversation } from './Conversation'
import { ChevronIcon, InboxIcon, SearchIcon, SendIcon } from './Icons'
import { Segmented } from './Segmented'
import { Skeleton } from './Skeleton'

type Filter = 'open' | 'waiting' | 'resolved' | 'all'

export function AdminTickets({
  tickets,
  loading,
  error,
  reload,
  savedReplies,
}: {
  tickets: Ticket[]
  loading: boolean
  error: string
  reload: () => void
  savedReplies: SavedReply[]
}) {
  const [filter, setFilter] = useState<Filter>('open')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOrder>('priority')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')

  const categories = [...new Set(tickets.map((t) => t.category))].sort()
  const openCount = tickets.filter((t) => t.status !== 'resolved').length
  const waitingCount = tickets.filter(needsAttention).length
  const q = search.trim().toLowerCase()
  const shown = sortTickets(
    tickets.filter(
      (t) =>
        (filter === 'all' ||
          (filter === 'open' && t.status !== 'resolved') ||
          (filter === 'waiting' && needsAttention(t)) ||
          (filter === 'resolved' && t.status === 'resolved')) &&
        (!category || t.category === category) &&
        (!priority || t.priority === priority) &&
        (!q || [formatTicketId(t.id), t.name, t.email, t.reason_label, t.category, t.description].join(' ').toLowerCase().includes(q)),
    ),
    sort,
  )
  const filtered = Boolean(q || category || priority)

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Tickets</h2>
        <span className="pill">{openCount} open</span>
      </div>
      <div className="toolbar">
        <Segmented
          className="segmented"
          label="Show tickets"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'waiting', label: <>Waiting on you {waitingCount > 0 && <span className="count">{waitingCount}</span>}</> },
            { value: 'resolved', label: 'Resolved' },
            { value: 'all', label: 'All' },
          ]}
        />
        <label className="search">
          <SearchIcon size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets" aria-label="Search tickets" />
        </label>
      </div>
      <div className="toolbar filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} aria-label="Priority">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p[0].toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} aria-label="Sort">
          {(Object.keys(SORT_LABELS) as SortOrder[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            className="link-btn"
            onClick={() => {
              setSearch('')
              setCategory('')
              setPriority('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
      {loading ? (
        <Skeleton rows={3} />
      ) : shown.length === 0 ? (
        <div className="empty" key={`empty-${filter}`}>
          <InboxIcon size={28} />
          <p>
            {filtered
              ? 'No tickets match these filters.'
              : filter === 'waiting'
                ? 'Nothing is waiting on you. New tickets and replies show here.'
                : filter === 'open'
                  ? 'No open tickets. New tickets appear here as soon as someone submits one.'
                  : 'No tickets here yet.'}
          </p>
        </div>
      ) : (
        <ul className="ticket-list" key={`${filter}-${sort}`}>
          {shown.map((t, i) => (
            <TicketRow key={t.id} ticket={t} reload={reload} index={i} savedReplies={savedReplies} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TicketRow({ ticket: t, reload, index, savedReplies }: { ticket: Ticket; reload: () => void; index: number; savedReplies: SavedReply[] }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const waiting = needsAttention(t)
  const level = t.status === 'resolved' ? '' : ageLevel(t.created_at)

  async function changeStatus(status: Status) {
    const { error } = await supabase!.from('ticket_tickets').update({ status }).eq('id', t.id)
    setError(error?.message ?? '')
    reload()
  }

  async function deleteTicket() {
    if (!confirm(`Delete ${formatTicketId(t.id)} with its notes and screenshots? This cannot be undone.`)) return
    // Screenshots live in storage, outside the database cascade, so remove them first.
    const paths = t.attachments.map((a) => a.path).filter((p): p is string => !!p)
    if (paths.length) await supabase!.storage.from('ticket-attachments').remove(paths)
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
    <li className={`ticket priority-${t.priority}${open ? ' expanded' : ''}${waiting ? ' waiting' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{formatTicketId(t.id)}</span>
        <span className="ticket-title">
          {t.reason_label}
          <span className="muted"> · {t.name}</span>
        </span>
        {waiting && <span className="badge needs">{t.notes.length ? 'New reply' : 'New'}</span>}
        {t.status !== 'resolved' && (
          <span className={`age ${level}`} title={`Opened ${formatDate(t.created_at)}`}>
            {formatAge(t.created_at)}
          </span>
        )}
        <span className={`badge priority-badge-${t.priority}`}>{t.priority}</span>
        <span key={t.status} className={`badge status status-${t.status}`}>
          {STATUS_LABELS[t.status]}
        </span>
        <span className="chevron">
          <ChevronIcon size={16} />
        </span>
      </button>
      <Collapse open={open}>
        <div className="ticket-detail">
          <p className="muted">
            {t.category} · submitted {formatDate(t.created_at)}
            {t.resolved_at && <> · resolved {formatDate(t.resolved_at)}</>}
            {t.email && (
              <>
                {' '}
                · <a href={`mailto:${t.email}?subject=${encodeURIComponent(`${formatTicketId(t.id)}: ${t.reason_label}`)}`}>{t.email}</a>
              </>
            )}
          </p>
          <p className="description">{t.description}</p>
          <Attachments attachments={t.attachments} />
          <Conversation notes={t.notes} viewer="admin" />
          <form
            className="reply-form"
            onSubmit={(e) => {
              e.preventDefault()
              addNote()
            }}
          >
            <textarea
              rows={2}
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reply to the submitter (they see it on their ticket)"
              aria-label="Reply"
            />
            <button className="btn primary" type="submit" disabled={!note.trim()}>
              <SendIcon size={15} />
              Send
            </button>
          </form>
          <div className="toolbar ticket-actions">
            {savedReplies.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const r = savedReplies.find((x) => x.id === e.target.value)
                  if (r) setNote((n) => (n.trim() ? `${n.trim()}\n\n${r.body}` : r.body))
                }}
                aria-label="Insert a saved reply"
              >
                <option value="">Insert saved reply…</option>
                {savedReplies.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            )}
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
          {error && <p className="field-error">{error}</p>}
        </div>
      </Collapse>
    </li>
  )
}
