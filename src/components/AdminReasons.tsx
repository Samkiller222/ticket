import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { groupByCategory, reasonError, type Reason } from '../lib/tickets'

export function AdminReasons({ reasons, reload }: { reasons: Reason[]; reload: () => void }) {
  const [category, setCategory] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const groups = groupByCategory(reasons)

  async function run(action: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await action
    setError(error?.message ?? '')
    reload()
    return !error
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const problem = reasonError(reasons, category, label)
    if (problem) {
      setError(problem)
      return
    }
    if (await run(supabase!.from('ticket_reasons').insert({ category: category.trim(), label: label.trim() }))) setLabel('')
  }

  return (
    <section className="panel">
      <h2>Ticket reasons</h2>
      <form className="reason-form" onSubmit={submit}>
        <input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category, e.g. Hardware" maxLength={60} />
        <datalist id="categories">
          {groups.map(([c]) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Reason, e.g. Docking station not working" maxLength={120} />
        <button className="btn primary" type="submit">
          Add reason
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
      <p className="muted">Hidden reasons stay on old tickets but cannot be picked for new ones.</p>
      {groups.map(([c, rs]) => (
        <div key={c} className="reason-group">
          <h3>{c}</h3>
          <ul>
            {rs.map((r) => (
              <li key={r.id} className={r.active ? '' : 'inactive'}>
                <span>{r.label}</span>
                <span className="actions">
                  <button className="link-btn" onClick={() => run(supabase!.from('ticket_reasons').update({ active: !r.active }).eq('id', r.id))}>
                    {r.active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => confirm(`Delete "${r.label}"?`) && run(supabase!.from('ticket_reasons').delete().eq('id', r.id))}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
