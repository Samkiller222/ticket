import { useState, type FormEvent } from 'react'
import { loginEmail, supabase } from '../lib/supabase'

export function AdminLogin({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase!.auth.signInWithPassword({ email: loginEmail(name), password })
    setBusy(false)
    if (error) {
      setError(/invalid/i.test(error.message) ? 'Wrong name or password.' : error.message)
      setPassword('')
    } else onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="panel modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>Admin sign in</h2>
        <label className="field">
          <span className="field-label">Name</span>
          <input autoFocus autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="field-error">{error}</p>}
        <div className="row-end">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || !name.trim() || !password}>
            Sign in
          </button>
        </div>
      </form>
    </div>
  )
}
