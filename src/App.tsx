import { useState } from 'react'
import { AdminLogin } from './components/AdminLogin'
import { AdminReasons } from './components/AdminReasons'
import { AdminTickets } from './components/AdminTickets'
import { CheckStatus } from './components/CheckStatus'
import { SubmitTicket } from './components/SubmitTicket'
import { useAdminSession, useAdminTickets, useReasons } from './hooks/useDesk'
import { supabase } from './lib/supabase'
import { openTickets } from './lib/tickets'

type AdminTab = 'tickets' | 'reasons'

export default function App() {
  const { session, isAdmin } = useAdminSession()
  const { reasons, error: reasonsError, reload: reloadReasons } = useReasons(session)
  const adminTickets = useAdminTickets(isAdmin)
  const [askLogin, setAskLogin] = useState(false)
  const [tab, setTab] = useState<AdminTab>('tickets')

  if (!supabase) {
    return <p className="empty">The app was built without its Supabase settings. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>IT help desk</h1>
          {session && (
            <div className="admin-bar">
              {isAdmin && <span className="badge admin">Admin</span>}
              <button className="link-btn light" onClick={() => supabase!.auth.signOut()}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {session && !isAdmin && <p className="panel muted">This account is not a help desk admin.</p>}
        {isAdmin ? (
          <>
            <nav className="tabs">
              <button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>
                Open tickets ({openTickets(adminTickets.tickets).length})
              </button>
              <button className={tab === 'reasons' ? 'active' : ''} onClick={() => setTab('reasons')}>
                Ticket reasons
              </button>
            </nav>
            {tab === 'tickets' && <AdminTickets {...adminTickets} />}
            {tab === 'reasons' && <AdminReasons reasons={reasons} reload={reloadReasons} />}
          </>
        ) : (
          <>
            {reasonsError && <p className="panel field-error">Could not load ticket reasons: {reasonsError}</p>}
            <SubmitTicket reasons={reasons} />
            <CheckStatus />
          </>
        )}
      </main>

      <footer className="footer">
        <span>IT help desk</span>
        {/* The secret admin button: a faint dot that only looks like punctuation. */}
        <button className="secret" aria-label="Admin" onClick={() => (isAdmin ? setTab('tickets') : setAskLogin(true))}>
          ·
        </button>
      </footer>

      {askLogin && <AdminLogin onClose={() => setAskLogin(false)} />}
    </div>
  )
}
