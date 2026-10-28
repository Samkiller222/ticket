import { useCallback, useEffect, useState } from 'react'
import { AdminAlerts } from './components/AdminAlerts'
import { AdminOverview } from './components/AdminOverview'
import { AdminSavedReplies } from './components/AdminSavedReplies'
import { AdminLogin } from './components/AdminLogin'
import { AdminReasons } from './components/AdminReasons'
import { AdminTickets } from './components/AdminTickets'
import { CheckStatus } from './components/CheckStatus'
import { LogoIcon } from './components/Icons'
import { MyTickets } from './components/MyTickets'
import { Segmented } from './components/Segmented'
import { SubmitTicket } from './components/SubmitTicket'
import { ThemeToggle } from './components/ThemeToggle'
import { useAdminSession, useAdminTickets, useReasons, useSavedReplies, type AdminEvent } from './hooks/useDesk'
import { notify, playChime, soundEnabled } from './lib/alerts'
import { useMyTickets } from './hooks/useMyTickets'
import { supabase } from './lib/supabase'
import { formatTicketId, needsAttention } from './lib/tickets'

type AdminTab = 'tickets' | 'overview' | 'reasons' | 'replies'

export default function App() {
  const { session, isAdmin } = useAdminSession()
  const { reasons, error: reasonsError, reload: reloadReasons } = useReasons(session)
  const onAdminEvent = useCallback((e: AdminEvent) => {
    if (soundEnabled()) playChime()
    if (e.kind === 'ticket') notify(`New ticket ${formatTicketId(e.ticket.id)}`, `${e.ticket.reason_label} · ${e.ticket.name}`)
    else notify(`New reply on ${formatTicketId(e.ticketId)}`, e.body.slice(0, 120))
  }, [])
  const adminTickets = useAdminTickets(isAdmin, onAdminEvent)
  const saved = useSavedReplies(isAdmin)
  const waiting = adminTickets.tickets.filter(needsAttention).length

  // The tab title shows how many tickets are waiting, so it is visible from other tabs.
  useEffect(() => {
    document.title = isAdmin && waiting > 0 ? `(${waiting}) IT help desk` : 'IT help desk'
  }, [isAdmin, waiting])
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
                {isAdmin && (
                  <>
                    <AdminAlerts />
                    <span className="badge admin">Admin</span>
                  </>
                )}
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
            <Segmented
              className="tabs"
              label="Admin sections"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'tickets', label: <>Tickets {waiting > 0 && <span className="count">{waiting}</span>}</> },
                { value: 'overview', label: 'Overview' },
                { value: 'reasons', label: 'Ticket reasons' },
                { value: 'replies', label: 'Saved replies' },
              ]}
            />
            {tab === 'tickets' && <AdminTickets {...adminTickets} savedReplies={saved.replies} />}
            {tab === 'overview' && <AdminOverview tickets={adminTickets.tickets} />}
            {tab === 'reasons' && <AdminReasons reasons={reasons} reload={reloadReasons} />}
            {tab === 'replies' && <AdminSavedReplies {...saved} />}
          </div>
        ) : (
          <div className="layout">
            <div className="stack">
              {reasonsError && <p className="panel field-error">Could not load ticket reasons: {reasonsError}</p>}
              <SubmitTicket reasons={reasons} onSubmitted={mine.reload} />
            </div>
            <div className="stack">
              <MyTickets {...mine} />
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
