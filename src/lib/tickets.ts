export type Priority = 'low' | 'normal' | 'high' | 'urgent'
export type Status = 'open' | 'in_progress' | 'resolved'

export interface Reason {
  id: string
  category: string
  label: string
  active: boolean
}

export interface Note {
  at: string
  text: string
}

export interface Ticket {
  id: string
  name: string
  email: string
  reasonId: string
  /** Copied at submit time so the ticket still reads right if the reason is renamed or removed. */
  reasonLabel: string
  category: string
  priority: Priority
  description: string
  status: Status
  createdAt: string
  updatedAt: string
  notes: Note[]
}

export interface Desk {
  reasons: Reason[]
  tickets: Ticket[]
  nextNumber: number
}

export const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent']
export const STATUSES: Status[] = ['open', 'in_progress', 'resolved']
export const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

const SEED: [string, string[]][] = [
  ['Accounts and access', ['Forgot password', 'Account locked out', 'Need access to a shared folder', 'Two-factor code not arriving', 'New starter account setup']],
  ['Hardware', ['Computer will not turn on', 'Computer is running slowly', 'Monitor not displaying', 'Keyboard or mouse not working', 'Laptop battery not charging']],
  ['Software', ['Application keeps crashing', 'Need software installed', 'Software licence expired', 'Operating system update failed', 'Pop-ups or suspected virus']],
  ['Network', ['No internet connection', 'Wi-Fi keeps dropping', 'VPN will not connect', 'Cannot reach an internal website']],
  ['Email', ['Cannot send or receive email', 'Mailbox is full', 'Suspicious or phishing email', 'Calendar not syncing']],
  ['Printing', ['Printer offline', 'Paper jam', 'Print jobs stuck in queue', 'Scanner not working']],
  ['Phones and devices', ['Phone not syncing work email', 'Lost or stolen device', 'Headset or webcam not working']],
  ['Other', ['Something else']],
]

export function seedDesk(): Desk {
  const reasons: Reason[] = []
  for (const [category, labels] of SEED) {
    for (const label of labels) reasons.push({ id: slug(category, label), category, label, active: true })
  }
  return { reasons, tickets: [], nextNumber: 1001 }
}

function slug(...parts: string[]): string {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function ticketId(n: number): string {
  return `TCK-${n}`
}

export interface NewTicket {
  name: string
  email: string
  reasonId: string
  priority: Priority
  description: string
}

export const MIN_DESCRIPTION = 10

/** Problems with a new ticket, keyed by field. Empty when the ticket can be submitted. */
export function validateTicket(desk: Desk, input: NewTicket): Partial<Record<keyof NewTicket, string>> {
  const errors: Partial<Record<keyof NewTicket, string>> = {}
  if (!input.name.trim()) errors.name = 'Enter your name.'
  const email = input.email.trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address, or leave it blank.'
  if (!desk.reasons.some((r) => r.id === input.reasonId && r.active)) errors.reasonId = 'Pick what the problem is.'
  const description = input.description.trim()
  if (!description) errors.description = 'Describe the problem.'
  else if (description.length < MIN_DESCRIPTION) errors.description = `Add a bit more detail (at least ${MIN_DESCRIPTION} characters).`
  return errors
}

export function addTicket(desk: Desk, input: NewTicket, now = new Date()): { desk: Desk; ticket: Ticket } {
  const errors = Object.values(validateTicket(desk, input))
  if (errors.length) throw new Error(errors[0])
  const reason = desk.reasons.find((r) => r.id === input.reasonId)!
  const at = now.toISOString()
  const ticket: Ticket = {
    id: ticketId(desk.nextNumber),
    name: input.name.trim(),
    email: input.email.trim(),
    reasonId: reason.id,
    reasonLabel: reason.label,
    category: reason.category,
    priority: input.priority,
    description: input.description.trim(),
    status: 'open',
    createdAt: at,
    updatedAt: at,
    notes: [],
  }
  return { desk: { ...desk, tickets: [ticket, ...desk.tickets], nextNumber: desk.nextNumber + 1 }, ticket }
}

function updateTicket(desk: Desk, id: string, change: (t: Ticket) => Partial<Ticket>, now: Date): Desk {
  return {
    ...desk,
    tickets: desk.tickets.map((t) => (t.id === id ? { ...t, ...change(t), updatedAt: now.toISOString() } : t)),
  }
}

export function setStatus(desk: Desk, id: string, status: Status, now = new Date()): Desk {
  return updateTicket(desk, id, () => ({ status }), now)
}

export function addNote(desk: Desk, id: string, text: string, now = new Date()): Desk {
  const trimmed = text.trim()
  if (!trimmed) return desk
  return updateTicket(desk, id, (t) => ({ notes: [...t.notes, { at: now.toISOString(), text: trimmed }] }), now)
}

export function findTicket(desk: Desk, id: string): Ticket | undefined {
  const wanted = id.trim().toUpperCase()
  const normalised = /^\d+$/.test(wanted) ? ticketId(Number(wanted)) : wanted
  return desk.tickets.find((t) => t.id === normalised)
}

const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

/** Open and in-progress tickets, most urgent first, then oldest first. */
export function openTickets(tickets: Ticket[]): Ticket[] {
  return tickets
    .filter((t) => t.status !== 'resolved')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.createdAt.localeCompare(b.createdAt))
}

export function addReason(desk: Desk, category: string, label: string): Desk {
  const c = category.trim()
  const l = label.trim()
  if (!c || !l) throw new Error('A reason needs a category and a label.')
  const exists = desk.reasons.some((r) => r.category.toLowerCase() === c.toLowerCase() && r.label.toLowerCase() === l.toLowerCase())
  if (exists) throw new Error('That reason already exists.')
  let id = slug(c, l)
  while (desk.reasons.some((r) => r.id === id)) id += '-x'
  return { ...desk, reasons: [...desk.reasons, { id, category: c, label: l, active: true }] }
}

export function toggleReason(desk: Desk, id: string): Desk {
  return { ...desk, reasons: desk.reasons.map((r) => (r.id === id ? { ...r, active: !r.active } : r)) }
}

/** Removes a reason outright. Tickets keep their copied label, so nothing breaks. */
export function deleteReason(desk: Desk, id: string): Desk {
  return { ...desk, reasons: desk.reasons.filter((r) => r.id !== id) }
}

export function groupByCategory(reasons: Reason[]): [string, Reason[]][] {
  const groups = new Map<string, Reason[]>()
  for (const r of reasons) groups.set(r.category, [...(groups.get(r.category) ?? []), r])
  return [...groups.entries()]
}
