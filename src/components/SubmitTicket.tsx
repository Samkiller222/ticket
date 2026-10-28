import { useEffect, useState, type ClipboardEvent, type FormEvent } from 'react'
import { fileProblem, MAX_FILES, uploadAttachments } from '../lib/attachments'
import { browserKey } from '../lib/browserKey'
import { ImageIcon, SendIcon, SuccessCheck, XIcon } from './Icons'
import { supabase } from '../lib/supabase'
import { formatTicketId, groupByCategory, PRIORITIES, validateTicket, type NewTicket, type Reason } from '../lib/tickets'

const EMPTY: NewTicket = { name: '', email: '', reasonId: '', priority: 'normal', description: '' }

export function SubmitTicket({ reasons, onSubmitted }: { reasons: Reason[]; onSubmitted: () => void }) {
  const [form, setForm] = useState<NewTicket>(EMPTY)
  const [showErrors, setShowErrors] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState('')
  const [created, setCreated] = useState<{ id: number; reason: string; failedUploads: number } | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState('')

  const errors = validateTicket(reasons, form)
  const visible = showErrors ? errors : {}
  const groups = groupByCategory(reasons.filter((r) => r.active))
  const set = <K extends keyof NewTicket>(key: K, value: NewTicket[K]) => setForm((f) => ({ ...f, [key]: value }))

  function addFiles(incoming: File[]) {
    const problems = incoming.map(fileProblem).filter(Boolean)
    const ok = incoming.filter((f) => !fileProblem(f))
    const room = MAX_FILES - files.length
    setFileError(problems[0] ?? (ok.length > room ? `You can attach up to ${MAX_FILES} screenshots.` : ''))
    if (ok.length && room > 0) setFiles((fs) => [...fs, ...ok.slice(0, room)])
  }

  // Pasting a screenshot anywhere in the form attaches it.
  function onPaste(e: ClipboardEvent) {
    const images = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'))
    if (images.length) {
      e.preventDefault()
      addFiles(images.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pasted-${Date.now()}-${i}.png`, { type: f.type }))))
    }
  }

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
    const { data, error } = await supabase!.rpc('ticket_submit', { ...args, p_owner_key: browserKey() })
    if (error) {
      setSaving(false)
      setServerError(error.message)
      return
    }
    const failedUploads = files.length ? await uploadAttachments(data as number, files) : 0
    setSaving(false)
    setCreated({ id: data as number, reason: reasons.find((r) => r.id === form.reasonId)?.label ?? '', failedUploads })
    setFiles([])
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
        {created.failedUploads > 0 && (
          <p className="field-error">
            {created.failedUploads === 1 ? 'One screenshot' : `${created.failedUploads} screenshots`} could not be uploaded. The ticket itself was sent.
          </p>
        )}
        <button className="btn secondary" onClick={() => setCreated(null)}>
          Submit another ticket
        </button>
      </section>
    )
  }

  return (
    <form className="panel" onSubmit={submit} onPaste={onPaste} noValidate>
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
      <Screenshots files={files} onAdd={addFiles} onRemove={(i) => setFiles((fs) => fs.filter((_, j) => j !== i))} error={fileError} />
      {serverError && <p className="field-error">{serverError}</p>}
      <button className="btn primary block" type="submit" disabled={saving}>
        {saving ? <span className="spinner" aria-hidden="true" /> : <SendIcon size={16} />}
        {saving ? 'Submitting…' : 'Submit ticket'}
      </button>
    </form>
  )
}

function Screenshots({ files, onAdd, onRemove, error }: { files: File[]; onAdd: (f: File[]) => void; onRemove: (i: number) => void; error: string }) {
  return (
    <div className="field">
      <span className="field-label">Screenshots (optional)</span>
      <div className="shots">
        {files.map((f, i) => (
          <Thumb key={`${f.name}-${f.size}-${i}`} file={f} onRemove={() => onRemove(i)} />
        ))}
        {files.length < MAX_FILES && (
          <label className="shot-add">
            <ImageIcon size={20} />
            <span>Add image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              onChange={(e) => {
                onAdd([...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
      <span className="muted">Up to {MAX_FILES} images, 5 MB each. You can also paste a screenshot into the form.</span>
      {error && <span className="field-error">{error}</span>}
    </div>
  )
}

function Thumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    // A data URL (rather than an object URL) needs no cleanup, so it survives StrictMode re-runs.
    const reader = new FileReader()
    reader.onload = () => setUrl(String(reader.result))
    reader.readAsDataURL(file)
    return () => reader.abort()
  }, [file])
  return (
    <div className="shot">
      {url && <img src={url} alt={file.name} />}
      <button type="button" className="shot-remove" onClick={onRemove} aria-label={`Remove ${file.name}`}>
        <XIcon size={14} />
      </button>
    </div>
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
