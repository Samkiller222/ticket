import { useState, type FormEvent } from 'react'
import { DEFAULT_PIN, setPin } from '../lib/pin'
import { seedDesk, type Desk } from '../lib/tickets'

export function AdminSettings({ update }: { update: (change: (d: Desk) => Desk) => void }) {
  const [pin, setPinValue] = useState('')
  const [message, setMessage] = useState('')

  async function savePin(e: FormEvent) {
    e.preventDefault()
    if (!/^\d{4,8}$/.test(pin)) {
      setMessage('Use 4 to 8 digits.')
      return
    }
    await setPin(pin)
    setPinValue('')
    setMessage('PIN changed.')
  }

  return (
    <section className="panel">
      <h2>Settings</h2>
      <form className="inline-form" onSubmit={savePin}>
        <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPinValue(e.target.value)} placeholder="New admin PIN" />
        <button className="btn" type="submit">
          Change PIN
        </button>
      </form>
      {message && <p className="muted">{message}</p>}
      <p className="muted">The default PIN is {DEFAULT_PIN}. Tickets are saved in this browser only.</p>
      <button
        className="btn secondary danger"
        onClick={() => confirm('Delete every ticket and restore the default reasons?') && update(() => seedDesk())}
      >
        Reset all data
      </button>
    </section>
  )
}
