import { useState, type FormEvent } from 'react'
import { browserKeys, linkedOnLoad } from '../lib/browserKey'
import { ageLevel, formatAge, formatDate } from '../lib/format'
import { supabase } from '../lib/supabase'
import { formatTicketId, STATUS_LABELS, type OwnTicket } from '../lib/tickets'
import { Collapse } from './Collapse'
import { Conversation } from './Conversation'
import { DeviceLink } from './DeviceLink'
import { ChevronIcon, DevicesIcon, InboxIcon, PaperclipIcon, SendIcon } from './Icons'
import { Skeleton } from './Skeleton'

export function MyTickets({ tickets, loaded, error, reload }: { tickets: OwnTicket[]; loaded: boolean; error: string; reload: () => void }) {
  const open = tickets.filter((t) => t.status !== 'resolved').length
  const [showLink, setShowLink] = useState(false)

  return (
    <section className="panel">
      <div className="row-between">
        <h2>Your tickets</h2>
        <div className="row-gap">
          {tickets.length > 0 && <span className="pill">{open} open</span>}
          <button className="btn ghost small" onClick={() => setShowLink(true)} title="Show these tickets on another device">
            <DevicesIcon size={15} />
            Other device
          </button>
        </div>
      </div>
      {linkedOnLoad && <p className="notice ok">This device is now linked. Tickets from your other device show here too.</p>}
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
            <MyTicketRow key={t.id} ticket={t} index={i} reload={reload} />
          ))}
        </ul>
      )}
      {showLink && <DeviceLink onClose={() => setShowLink(false)} />}
    </section>
  )
}

function MyTicketRow({ ticket: t, index, reload }: { ticket: OwnTicket; index: number; reload: () => void }) {
  const [open, setOpen] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const replies = t.notes.filter((n) => !n.from_submitter).length
  const level = t.status === 'resolved' ? '' : ageLevel(t.created_at)

  async function send(e: FormEvent) {
    e.preventDefault()
    setSending(true)
    const { error } = await supabase!.rpc('ticket_reply', { p_owner_keys: browserKeys(), p_ticket_id: t.id, p_body: reply })
    setSending(false)
    setError(error?.message ?? '')
    if (!error) {
      setReply('')
      reload()
    }
  }

  return (
    <li className={`ticket priority-${t.priority}${open ? ' expanded' : ''}`} style={{ '--i': index } as React.CSSProperties}>
      <button className="ticket-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="ticket-id">{formatTicketId(t.id)}</span>
        <span className="ticket-title">
          {t.reason_label}
          {replies > 0 && <span className="muted"> · {replies} {replies === 1 ? 'reply' : 'replies'}</span>}
        </span>
        {t.status !== 'resolved' && <span className={`age ${level}`} title={`Opened ${formatDate(t.created_at)}`}>{formatAge(t.created_at)}</span>}
        <span key={t.status} className={`badge status status-${t.status}`}>{STATUS_LABELS[t.status]}</span>
        <span className="chevron">
          <ChevronIcon size={16} />
        </span>
      </button>
      <Collapse open={open}>
        <div className="ticket-detail">
          <p className="muted">
            {t.category} · {t.priority} priority · submitted {formatDate(t.created_at)}
            {t.resolved_at && <> · resolved {formatDate(t.resolved_at)}</>}
          </p>
          <p className="description">{t.description}</p>
          {t.attachments.length > 0 && (
            <p className="muted attachments-line">
              <PaperclipIcon size={14} /> {t.attachments.map((a) => a.name).join(', ')}
            </p>
          )}
          <Conversation notes={t.notes} viewer="submitter" />
          <form className="reply-form" onSubmit={send}>
            <textarea
              rows={2}
              maxLength={2000}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t.status === 'resolved' ? 'Still a problem? Reply to reopen this ticket.' : 'Reply to the help desk'}
              aria-label="Reply"
            />
            <button className="btn primary" type="submit" disabled={sending || !reply.trim()}>
              <SendIcon size={15} />
              Send
            </button>
          </form>
          {error && <p className="field-error">{error}</p>}
        </div>
      </Collapse>
    </li>
  )
}
