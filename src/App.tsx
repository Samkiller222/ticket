import { useState } from 'react'
import { AdminLogin } from './components/AdminLogin'
import { AdminReasons } from './components/AdminReasons'
import { AdminTickets } from './components/AdminTickets'
import { CheckStatus } from './components/CheckStatus'
import { LogoIcon } from './components/Icons'
import { MyTickets } from './components/MyTickets'
import { SubmitTicket } from './components/SubmitTicket'
import { ThemeToggle } from './components/ThemeToggle'
import { useAdminSession, useAdminTickets, useReasons } from './hooks/useDesk'
import { useMyTickets } from './hooks/useMyTickets'
import { supabase } from './lib/supabase'
import { openTickets } from './lib/tickets'

type AdminTab = 'tickets' | 'reasons'

export default function App() {
  const { session, isAdmin } = useAdminSession()
  const { reasons, error: reasonsError, reload: reloadReasons } = useReasons(session)
  const adminTickets = useAdminTickets(isAdmin)
  const mine = useMyTickets()
  const [askLogin, setAskLogin] = useState(false)
  const [tab, setTab] = useState<AdminTab>('tickets')

  if (!supabase) {
    return <p className="empty">The app was built without its Supabase settings. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-mark">
              <LogoIcon size={20} />
            </span>
            <div>
              <h1>IT help desk</h1>
              <p className="tagline">Report a problem and follow it until it is fixed</p>
            </div>
          </div>
          <div className="header-actions">
            {session && (
              <>
                {isAdmin && <span className="badge admin">Admin</span>}
                <button className="btn ghost small" onClick={() => supabase!.auth.signOut()}>
                  Sign out
                </button>
              </>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="main">
        {session && !isAdmin && <p className="notice">This account is not a help desk admin.</p>}
        {isAdmin ? (
          <div className="stack">
            <nav className="tabs">
              <button className={tab === 'tickets' ? 'active' : ''} onClick={() => setTab('tickets')}>
                Open tickets <span className="count">{openTickets(adminTickets.tickets).length}</span>
              </button>
              <button className={tab === 'reasons' ? 'active' : ''} onClick={() => setTab('reasons')}>
                Ticket reasons
              </button>
            </nav>
            {tab === 'tickets' && <AdminTickets {...adminTickets} />}
            {tab === 'reasons' && <AdminReasons reasons={reasons} reload={reloadReasons} />}
          </div>
        ) : (
          <div className="layout">
            <div className="stack">
              {reasonsError && <p className="panel field-error">Could not load ticket reasons: {reasonsError}</p>}
              <SubmitTicket reasons={reasons} onSubmitted={mine.reload} />
            </div>
            <div className="stack">
              {mine.available && <MyTickets {...mine} />}
              <CheckStatus />
            </div>
          </div>
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
