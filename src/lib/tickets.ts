export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Status = 'open' | 'in_progress' | 'resolved'

export interface Reason {
  id: string
  category: string
  label: string
  active: boolean
}

export interface Note {
  id?: string
  body: string
  created_at: string
  /** True when the person who raised the ticket wrote it; false for the help desk. */
  from_submitter?: boolean
}

export interface Attachment {
  id?: string
  name: string
  path?: string
  size?: number | null
}

/** A ticket as admins see it (row from ticket_tickets plus its notes). */
export interface Ticket {
  id: number
  name: string
  email: string | null
  reason_id: string | null
  reason_label: string
  category: string
  priority: Priority
  description: string
  status: Status
  created_at: string
  updated_at: string
  resolved_at: string | null
  notes: Note[]
  attachments: Attachment[]
}

/** What anyone can see through ticket_lookup: no name, email or description. */
export type PublicTicket = Pick<Ticket, 'id' | 'status' | 'priority' | 'reason_label' | 'category' | 'created_at' | 'updated_at' | 'notes'>

/** What ticket_mine_many returns: the visitor's own tickets, details included. */
export type OwnTicket = Omit<Ticket, 'reason_id'>

/** True when the latest note is from the submitter, i.e. the help desk owes a reply. */
export function awaitingReply(t: Pick<Ticket, 'notes' | 'status'>): boolean {
  return t.status !== 'resolved' && t.notes.length > 0 && t.notes[t.notes.length - 1].from_submitter === true
}

export interface NewTicket {
  name: string
  email: string
  reasonId: string
  priority: Priority
  description: string
}

export const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent']
export const STATUSES: Status[] = ['open', 'in_progress', 'resolved']
export const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}
export const MIN_DESCRIPTION = 10

export function formatTicketId(id: number): string {
  return `TCK-${id}`
}

/** Accepts "TCK-1001", "tck 1001" or "1001". */
export function parseTicketId(input: string): number | null {
  const m = input.trim().match(/^(?:tck[\s-]*)?(\d+)$/i)
  return m ? Number(m[1]) : null
}

/** Problems with a new ticket, keyed by field. Empty when it can be submitted. The database checks the same rules. */
export function validateTicket(reasons: Reason[], input: NewTicket): Partial<Record<keyof NewTicket, string>> {
  const errors: Partial<Record<keyof NewTicket, string>> = {}
  if (!input.name.trim()) errors.name = 'Enter your name.'
  const email = input.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address, or leave it blank.'
  if (!reasons.some((r) => r.id === input.reasonId && r.active)) errors.reasonId = 'Pick what the problem is.'
  const description = input.description.trim()
  if (!description) errors.description = 'Describe the problem.'
  else if (description.length < MIN_DESCRIPTION) errors.description = `Add a bit more detail (at least ${MIN_DESCRIPTION} characters).`
  return errors
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

/** Open and in-progress tickets, most urgent first, then oldest first. */
export function openTickets(tickets: Ticket[]): Ticket[] {
  return tickets
    .filter((t) => t.status !== 'resolved')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.created_at.localeCompare(b.created_at))
}

export function groupByCategory(reasons: Reason[]): [string, Reason[]][] {
  const groups = new Map<string, Reason[]>()
  for (const r of reasons) groups.set(r.category, [...(groups.get(r.category) ?? []), r])
  return [...groups.entries()]
}

/** Checks a new reason against the existing ones before it goes to the database. */
export function reasonError(reasons: Reason[], category: string, label: string): string {
  const c = category.trim().toLowerCase()
  const l = label.trim().toLowerCase()
  if (!c || !l) return 'A reason needs a category and a label.'
  if (reasons.some((r) => r.category.toLowerCase() === c && r.label.toLowerCase() === l)) return 'That reason already exists.'
  return ''
}

/** New and untouched, or the submitter has replied since: the tickets waiting on the help desk. */
export function needsAttention(t: Pick<Ticket, 'notes' | 'status'>): boolean {
  return (t.status === 'open' && !t.notes.some((n) => !n.from_submitter)) || awaitingReply(t)
}

export type SortOrder = 'priority' | 'newest' | 'oldest' | 'updated'
export const SORT_LABELS: Record<SortOrder, string> = {
  priority: 'Most urgent',
  newest: 'Newest',
  oldest: 'Oldest',
  updated: 'Recently updated',
}

export function sortTickets<T extends Pick<Ticket, 'priority' | 'created_at' | 'updated_at'>>(tickets: T[], order: SortOrder): T[] {
  const list = [...tickets]
  if (order === 'priority') return list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.created_at.localeCompare(b.created_at))
  if (order === 'oldest') return list.sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (order === 'updated') return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export interface DeskStats {
  open: number
  needsAttention: number
  openByPriority: Record<Priority, number>
  openedThisWeek: number
  resolvedThisWeek: number
  /** Average time from submitted to resolved, in ms, over tickets resolved in the last 30 days. Null when none. */
  avgResolveMs: number | null
  /** Most common reasons over the last 7 days, most frequent first (top 5). */
  topReasons: { label: string; count: number }[]
}

export function deskStats(tickets: Ticket[], now = new Date()): DeskStats {
  const weekAgo = now.getTime() - 7 * 86_400_000
  const monthAgo = now.getTime() - 30 * 86_400_000
  const open = tickets.filter((t) => t.status !== 'resolved')
  const openByPriority: Record<Priority, number> = { urgent: 0, high: 0, normal: 0, low: 0 }
  for (const t of open) openByPriority[t.priority]++

  // Older tickets resolved before resolved_at existed fall back to their last update.
  const resolvedAt = (t: Ticket) => new Date(t.resolved_at ?? t.updated_at).getTime()
  const resolved = tickets.filter((t) => t.status === 'resolved')
  const recent = resolved.filter((t) => resolvedAt(t) >= monthAgo)
  const avgResolveMs = recent.length
    ? recent.reduce((sum, t) => sum + (resolvedAt(t) - new Date(t.created_at).getTime()), 0) / recent.length
    : null

  const counts = new Map<string, number>()
  for (const t of tickets) {
    if (new Date(t.created_at).getTime() >= weekAgo) counts.set(t.reason_label, (counts.get(t.reason_label) ?? 0) + 1)
  }
  const topReasons = [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5)

  return {
    open: open.length,
    needsAttention: tickets.filter(needsAttention).length,
    openByPriority,
    openedThisWeek: tickets.filter((t) => new Date(t.created_at).getTime() >= weekAgo).length,
    resolvedThisWeek: resolved.filter((t) => resolvedAt(t) >= weekAgo).length,
    avgResolveMs,
    topReasons,
  }
}
