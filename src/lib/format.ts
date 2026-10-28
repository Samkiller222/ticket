export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Short age like "12m", "5h" or "3d". */
export function formatAge(fromIso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** How overdue an unresolved ticket is: fine under 2 days, "warn" from 2 days, "late" from 5. */
export function ageLevel(fromIso: string, now = new Date()): '' | 'warn' | 'late' {
  const days = (now.getTime() - new Date(fromIso).getTime()) / 86_400_000
  return days >= 5 ? 'late' : days >= 2 ? 'warn' : ''
}

/** "2 hours", "3 days" — for averages on the overview. */
export function formatDuration(ms: number): string {
  const hours = ms / 3_600_000
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`
  if (hours < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} days`
}
