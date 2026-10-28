import { useState, type FormEvent } from 'react'
import { addTicket, groupByCategory, PRIORITIES, validateTicket, type Desk, type NewTicket, type Ticket } from '../lib/tickets'

const EMPTY: NewTicket = { name: '', email: '', reasonId: '', priority: 'normal', description: '' }

export function SubmitTicket({ desk, onSave }: { desk: Desk; onSave: (next: Desk) => void }) {
  const [form, setForm] = useState<NewTicket>(EMPTY)
  const [showErrors, setShowErrors] = useState(false)
  const [created, setCreated] = useState<Ticket | null>(null)

  const errors = validateTicket(desk, form)
  const visible = showErrors ? errors : {}
  const groups = groupByCategory(desk.reasons.filter((r) => r.active))
  const set = <K extends keyof NewTicket>(key: K, value: NewTicket[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (Object.keys(errors).length) {
      setShowErrors(true)
      return
    }
    const result = addTicket(desk, form)
    onSave(result.desk)
    setCreated(result.ticket)
    setForm(EMPTY)
    setShowErrors(false)
  }

  if (created) {
    return (
      <section className="panel">
        <h2>Ticket submitted</h2>
        <p>
          Your ticket number is <span className="ticket-id">{created.id}</span>. Keep it to check the status later.
        </p>
        <p className="muted">
          {created.category} · {created.reasonLabel} · {created.priority} priority
        </p>
        <button className="btn" onClick={() => setCreated(null)}>
          Submit another ticket
        </button>
      </section>
    )
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>Report a problem</h2>
      <div className="grid-2">
        <Field label="Your name" required error={visible.name}>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email (optional)" error={visible.email}>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="What is the problem?" required error={visible.reasonId}>
          <select value={form.reasonId} onChange={(e) => set('reasonId', e.target.value)}>
            <option value="">Choose a reason…</option>
            {groups.map(([category, reasons]) => (
              <optgroup key={category} label={category}>
                {reasons.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select value={form.priority} onChange={(e) => set('priority', e.target.value as NewTicket['priority'])}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description" required error={visible.description}>
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What happened, when it started, and anything you have already tried."
        />
      </Field>
      <button className="btn primary" type="submit">
        Submit ticket
      </button>
    </form>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className={`field${error ? ' has-error' : ''}`}>
      <span className="field-label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  )
}
