import { useState, type FormEvent } from 'react'
import type { SavedReply } from '../hooks/useDesk'
import { supabase } from '../lib/supabase'

export function AdminSavedReplies({ replies, error, reload }: { replies: SavedReply[]; error: string; reload: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [problem, setProblem] = useState('')

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      setProblem('A saved reply needs a name and some text.')
      return
    }
    const { error } = await supabase!.from('ticket_saved_replies').insert({ title: title.trim(), body: body.trim() })
    setProblem(error?.message ?? '')
    if (!error) {
      setTitle('')
      setBody('')
      reload()
    }
  }

  async function remove(r: SavedReply) {
    if (!confirm(`Delete the saved reply "${r.title}"?`)) return
    const { error } = await supabase!.from('ticket_saved_replies').delete().eq('id', r.id)
    setProblem(error?.message ?? '')
    reload()
  }

  return (
    <section className="panel">
      <h2>Saved replies</h2>
      <p className="muted">Pick these when adding a note to a ticket, then edit before sending if needed.</p>
      <form className="saved-form" onSubmit={add}>
        <input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="Name, e.g. Restart first" aria-label="Saved reply name" />
        <textarea rows={3} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply text" aria-label="Saved reply text" />
        <button className="btn primary" type="submit">
          Add saved reply
        </button>
      </form>
      {(problem || error) && <p className="field-error">{problem || error}</p>}
      {replies.length === 0 ? (
        <p className="empty">No saved replies yet. Add the answers you give most often.</p>
      ) : (
        <ul className="saved-list">
          {replies.map((r, i) => (
            <li key={r.id} style={{ '--i': i } as React.CSSProperties}>
              <div>
                <strong>{r.title}</strong>
                <p>{r.body}</p>
              </div>
              <button className="link-btn danger" onClick={() => remove(r)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
