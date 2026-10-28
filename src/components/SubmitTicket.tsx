import { useState, type FormEvent } from 'react'
import { browserKey } from '../lib/browserKey'
import { SendIcon, SuccessCheck } from './Icons'
import { supabase } from '../lib/supabase'
import { formatTicketId, groupByCategory, PRIORITIES, validateTicket, type NewTicket, type Reason } from '../lib/tickets'

const EMPTY: NewTicket = { name: '', email: '', reasonId: '', priority: 'normal', description: '' }

export function SubmitTicket({ reasons, onSubmitted }: { reasons: Reason[]; onSubmitted: () => void }) {
  const [form, setForm] = useState<NewTicket>(EMPTY)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const [created, setCreated] = useState<{ id: number; reason: string } | null>(null)

  const errors = validateTicket(reasons, form)
  const visible = showErrors ? errors : {}
  const groups = groupByCategory(reasons.filter((r) => r.active))
  const set = <K extends keyof NewTicket>(key: K, value: NewTicket[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (Object.keys(errors).length) {
      setShowErrors(true)
      return
    }
    setSaving(true)
    setServerError('')
    const args = {
      p_name: form.name,
      p_email: form.email,
      p_reason_id: form.reasonId,
      p_priority: form.priority,
      p_description: form.description,
    }
    let { data, error } = await supabase!.rpc('ticket_submit', { ...args, p_owner_key: browserKey() })
    // PGRST202: the database predates browser keys (migration 20261028140000 not applied yet).
    if (error?.code === 'PGRST202') ({ data, error } = await supabase!.rpc('ticket_submit', args))
    setSaving(false)
    if (error) {
      setServerError(error.message)
      return
    }
    setCreated({ id: data as number, reason: reasons.find((r) => r.id === form.reasonId)?.label ?? '' })
    setForm(EMPTY)
    setShowErrors(false)
    onSubmitted()
  }

  if (created) {
    return (
      <section className="panel success">
        <SuccessCheck />
        <h2>Ticket submitted</h2>
        <p>
          Your ticket number is <span className="ticket-id">{formatTicketId(created.id)}</span>. It is listed under Your tickets in this browser.
        </p>
        <p className="muted">{created.reason}</p>
        <button className="btn secondary" onClick={() => setCreated(null)}>
          Submit another ticket
        </button>
      </section>
    )
  }

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <div className="panel-head">
        <h2>Report a problem</h2>
        <p className="muted">Fields marked * are required.</p>
      </div>
      <div className="grid-2">
        <Field label="Your name" required error={visible.name}>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" maxLength={100} />
        </Field>
        <Field label="Email (optional)" error={visible.email}>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" maxLength={200} />
        </Field>
      </div>
      <div className="grid-2">
        <Field label="What is the problem?" required error={visible.reasonId}>
          <select value={form.reasonId} onChange={(e) => set('reasonId', e.target.value)}>
            <option value="">Choose a reason…</option>
            {groups.map(([category, rs]) => (
              <optgroup key={category} label={category}>
                {rs.map((r) => (
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
          maxLength={5000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What happened, when it started, and anything you have already tried."
        />
      </Field>
      {serverError && <p className="field-error">{serverError}</p>}
      <button className="btn primary block" type="submit" disabled={saving}>
        {saving ? <span className="spinner" aria-hidden="true" /> : <SendIcon size={16} />}
        {saving ? 'Submitting…' : 'Submit ticket'}
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
