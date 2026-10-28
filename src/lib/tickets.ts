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
  notes: Note[]
}

/** What anyone can see through ticket_lookup: no name, email or description. */
export type PublicTicket = Pick<Ticket, 'id' | 'status' | 'priority' | 'reason_label' | 'category' | 'created_at' | 'updated_at' | 'notes'>

/** What ticket_mine returns: the visitor's own tickets, details included. */
export type OwnTicket = Omit<Ticket, 'reason_id'>

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
