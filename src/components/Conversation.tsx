import { formatDate } from '../lib/format'
import type { Note } from '../lib/tickets'

/**
 * Notes as a conversation. `viewer` decides which side is "you": the submitter sees their own
 * messages on the right, the admin sees the help desk's messages on the right.
 */
export function Conversation({ notes, viewer }: { notes: Note[]; viewer: 'submitter' | 'admin' }) {
  if (notes.length === 0) return null
  return (
    <ul className="conversation">
      {notes.map((n, i) => {
        const mine = viewer === 'submitter' ? n.from_submitter === true : n.from_submitter !== true
        const who = n.from_submitter ? (viewer === 'submitter' ? 'You' : 'Submitter') : viewer === 'admin' ? 'You' : 'IT help desk'
        return (
          <li key={n.id ?? `${n.created_at}-${i}`} className={`bubble${mine ? ' mine' : ''}${n.from_submitter ? ' from-submitter' : ''}`}>
            <span className="bubble-meta">
              {who} · {formatDate(n.created_at)}
            </span>
            <span className="bubble-body">{n.body}</span>
          </li>
        )
      })}
    </ul>
  )
}
