import { formatDuration } from '../lib/format'
import { deskStats, PRIORITIES, type Ticket } from '../lib/tickets'

export function AdminOverview({ tickets }: { tickets: Ticket[] }) {
  const s = deskStats(tickets)
  const maxPriority = Math.max(1, ...PRIORITIES.map((p) => s.openByPriority[p]))
  const maxReason = Math.max(1, ...s.topReasons.map((r) => r.count))

  return (
    <section className="panel">
      <h2>Overview</h2>
      <div className="stat-grid">
        <Stat label="Open tickets" value={s.open} />
        <Stat label="Waiting on you" value={s.needsAttention} highlight={s.needsAttention > 0} />
        <Stat label="Opened this week" value={s.openedThisWeek} />
        <Stat label="Resolved this week" value={s.resolvedThisWeek} />
        <Stat label="Average time to resolve" value={s.avgResolveMs === null ? '—' : formatDuration(s.avgResolveMs)} note="last 30 days" />
      </div>

      <div className="grid-2 overview-charts">
        <div>
          <h3>Open by priority</h3>
          <ul className="bars">
            {[...PRIORITIES].reverse().map((p, i) => (
              <li key={p}>
                <span className="bar-label">{p[0].toUpperCase() + p.slice(1)}</span>
                <span className="bar-track">
                  <span className={`bar priority-fill-${p}`} style={{ width: `${(s.openByPriority[p] / maxPriority) * 100}%`, animationDelay: `${i * 60}ms` }} />
                </span>
                <span className="bar-value">{s.openByPriority[p]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Most common problems this week</h3>
          {s.topReasons.length === 0 ? (
            <p className="muted">No tickets in the last 7 days.</p>
          ) : (
            <ul className="bars">
              {s.topReasons.map((r, i) => (
                <li key={r.label}>
                  <span className="bar-label" title={r.label}>
                    {r.label}
                  </span>
                  <span className="bar-track">
                    <span className="bar" style={{ width: `${(r.count / maxReason) * 100}%`, animationDelay: `${i * 60}ms` }} />
                  </span>
                  <span className="bar-value">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value, note, highlight }: { label: string; value: number | string; note?: string; highlight?: boolean }) {
  return (
    <div className={`stat${highlight ? ' highlight' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  )
}
