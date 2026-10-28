import { useState, type FormEvent } from 'react'
import { checkPin } from '../lib/pin'

export function AdminLogin({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (await checkPin(pin)) onSuccess()
    else {
      setError('Wrong PIN.')
      setPin('')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <form className="panel modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2>Admin access</h2>
        <input type="password" inputMode="numeric" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
        {error && <p className="field-error">{error}</p>}
        <div className="row-end">
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Enter
          </button>
        </div>
      </form>
    </div>
  )
}
