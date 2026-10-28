import { describe, expect, it } from 'vitest'
import { formatTicketId, groupByCategory, openTickets, parseTicketId, reasonError, validateTicket, type NewTicket, type Reason, type Ticket } from './tickets'

const reasons: Reason[] = [
  { id: 'r1', category: 'Hardware', label: 'Computer is running slowly', active: true },
  { id: 'r2', category: 'Hardware', label: 'Monitor not displaying', active: false },
  { id: 'r3', category: 'Network', label: 'VPN will not connect', active: true },
]

const input = (over: Partial<NewTicket> = {}): NewTicket => ({
  name: 'Sam',
  email: '',
  reasonId: 'r1',
  priority: 'normal',
  description: 'Takes ten minutes to boot since Monday.',
  ...over,
})

describe('validateTicket', () => {
  it('accepts a complete ticket', () => {
    expect(validateTicket(reasons, input())).toEqual({})
  })

  it('requires a name and a description', () => {
    const errors = validateTicket(reasons, input({ name: '  ', description: '' }))
    expect(errors.name).toBeDefined()
    expect(errors.description).toBeDefined()
  })

  it('rejects a description that is too short', () => {
    expect(validateTicket(reasons, input({ description: 'broken' })).description).toBeDefined()
  })

  it('allows a blank email but not a malformed one', () => {
    expect(validateTicket(reasons, input({ email: 'nope' })).email).toBeDefined()
  })

  it('rejects hidden or missing reasons', () => {
    expect(validateTicket(reasons, input({ reasonId: 'r2' })).reasonId).toBeDefined()
    expect(validateTicket(reasons, input({ reasonId: '' })).reasonId).toBeDefined()
  })
})

describe('ticket ids', () => {
  it('formats and parses', () => {
    expect(formatTicketId(1001)).toBe('TCK-1001')
    expect(parseTicketId('TCK-1001')).toBe(1001)
    expect(parseTicketId(' tck 1002 ')).toBe(1002)
    expect(parseTicketId('1003')).toBe(1003)
    expect(parseTicketId('abc')).toBeNull()
  })
})

describe('openTickets', () => {
  const t = (id: number, priority: Ticket['priority'], status: Ticket['status'], created_at: string): Ticket => ({
    id, priority, status, created_at, updated_at: created_at, name: 'x', email: null, reason_id: null, reason_label: 'x', category: 'x', description: 'x', notes: [],
  })

  it('sorts by priority then age and drops resolved tickets', () => {
    const list = [t(1, 'low', 'open', '2026-01-01'), t(2, 'urgent', 'in_progress', '2026-01-02'), t(3, 'urgent', 'open', '2026-01-03'), t(4, 'urgent', 'resolved', '2026-01-01')]
    expect(openTickets(list).map((x) => x.id)).toEqual([2, 3, 1])
  })
})

describe('reasons', () => {
  it('groups by category', () => {
    expect(groupByCategory(reasons).map(([c, rs]) => [c, rs.length])).toEqual([['Hardware', 2], ['Network', 1]])
  })

  it('blocks blanks and case-insensitive duplicates', () => {
    expect(reasonError(reasons, 'hardware', 'monitor NOT displaying')).not.toBe('')
    expect(reasonError(reasons, '', 'x')).not.toBe('')
    expect(reasonError(reasons, 'Hardware', 'Docking station not working')).toBe('')
  })
})
