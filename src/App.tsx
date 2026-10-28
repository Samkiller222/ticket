import { useState } from 'react'
import { AdminLogin } from './components/AdminLogin'
import { AdminReasons } from './components/AdminReasons'
import { AdminSettings } from './components/AdminSettings'
import { AdminTickets } from './components/AdminTickets'
import { CheckStatus } from './components/CheckStatus'
import { SubmitTicket } from './components/SubmitTicket'
import { useDesk } from './hooks/useDesk'
import { isAdminSession, setAdminSession } from './lib/pin'
import { openTickets } from './lib/tickets'

type AdminTab = 'tickets' | 'reasons' | 'settings'

export default function App() {
  const { desk, update } = useDesk()
  const [admin, setAdmin] = useState(isAdminSession)
  const [askPin, setAskPin] = useState(false)
  const [tab, setTab] = useState<AdminTab>('tickets')

  function enterAdmin() {
    setAdminSession(true)
    setAdmin(true)
    setAskPin(false)
  }

  function leaveAdmin() {
    setAdminSession(false)
    setAdmin(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>IT help desk</h1>
          {admin && (
            <div className="admin-bar">
              <span className="badge admin">Admin</span>
              <button className="link-btn light" onClick={leaveAdmin}>
                Exit admin
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {admin ? (
          <>
            <nav className="tabs">
              <button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>
                Open tickets ({openTickets(desk.tickets).length})
              </button>
              <button className={tab === 'reasons' ? 'active' : ''} onClick={() => setTab('reasons')}>
                Ticket reasons
              </button>
              <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
                Settings
              </button>
            </nav>
            {tab === 'tickets' && <AdminTickets desk={desk} update={update} />}
            {tab === 'reasons' && <AdminReasons desk={desk} update={update} />}
            {tab === 'settings' && <AdminSettings update={update} />}
          </>
        ) : (
          <>
            <SubmitTicket desk={desk} onSave={(next) => update(() => next)} />
            <CheckStatus desk={desk} />
          </>
        )}
      </main>

      <footer className="footer">
        <span>IT help desk</span>
        {/* The secret admin button: a faint dot that only looks like punctuation. */}
        <button className="secret" aria-label="Admin" title="" onClick={() => (admin ? setTab('tickets') : setAskPin(true))}>
          ·
        </button>
      </footer>

      {askPin && <AdminLogin onSuccess={enterAdmin} onCancel={() => setAskPin(false)} />}
    </div>
  )
}
