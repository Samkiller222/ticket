import { useState, type FormEvent } from 'react'
import { addReason, deleteReason, groupByCategory, toggleReason, type Desk } from '../lib/tickets'

export function AdminReasons({ desk, update }: { desk: Desk; update: (change: (d: Desk) => Desk) => void }) {
  const [category, setCategory] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  const groups = groupByCategory(desk.reasons)

  function submit(e: FormEvent) {
    e.preventDefault()
    try {
      const next = addReason(desk, category, label)
      update(() => next)
      setLabel('')
      setError('')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="panel">
      <h2>Ticket reasons</h2>
      <form className="reason-form" onSubmit={submit}>
        <input list="categories" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category, e.g. Hardware" />
        <datalist id="categories">
          {groups.map(([c]) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Reason, e.g. Docking station not working" />
        <button className="btn primary" type="submit">
          Add reason
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
      <p className="muted">Hidden reasons stay on old tickets but cannot be picked for new ones.</p>
      {groups.map(([c, reasons]) => (
        <div key={c} className="reason-group">
          <h3>{c}</h3>
          <ul>
            {reasons.map((r) => (
              <li key={r.id} className={r.active ? '' : 'inactive'}>
                <span>{r.label}</span>
                <span className="actions">
                  <button className="link-btn" onClick={() => update((d) => toggleReason(d, r.id))}>
                    {r.active ? 'Hide' : 'Show'}
                  </button>
                  <button
                    className="link-btn danger"
                    onClick={() => confirm(`Delete "${r.label}"?`) && update((d) => deleteReason(d, r.id))}
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
