import { describe, expect, it } from 'vitest'
import { awaitingReply, deskStats, formatTicketId, needsAttention, sortTickets, groupByCategory, openTickets, parseTicketId, reasonError, validateTicket, type NewTicket, type Reason, type Ticket } from './tickets'

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
    id, priority, status, created_at, updated_at: created_at, resolved_at: null, name: 'x', email: null, reason_id: null, reason_label: 'x', category: 'x', description: 'x', notes: [], attachments: [],
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

describe('awaitingReply', () => {
  const base = { status: 'open' as const }
  it('is true only when the submitter wrote last on an unresolved ticket', () => {
    expect(awaitingReply({ ...base, notes: [] })).toBe(false)
    expect(awaitingReply({ ...base, notes: [{ body: 'a', created_at: '1', from_submitter: false }, { body: 'b', created_at: '2', from_submitter: true }] })).toBe(true)
    expect(awaitingReply({ ...base, notes: [{ body: 'b', created_at: '2', from_submitter: true }, { body: 'a', created_at: '3', from_submitter: false }] })).toBe(false)
    expect(awaitingReply({ status: 'resolved', notes: [{ body: 'b', created_at: '2', from_submitter: true }] })).toBe(false)
  })
})

describe('admin helpers', () => {
  const now = new Date('2026-10-28T12:00:00Z')
  const mk = (over: Partial<Ticket>): Ticket => ({
    id: 1, name: 'x', email: null, reason_id: null, reason_label: 'Paper jam', category: 'Printing', priority: 'normal', description: 'x',
    status: 'open', created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', resolved_at: null, notes: [], attachments: [], ...over,
  })

  it('needsAttention: untouched open tickets and submitter replies', () => {
    expect(needsAttention(mk({}))).toBe(true)
    expect(needsAttention(mk({ notes: [{ body: 'on it', created_at: '1', from_submitter: false }] }))).toBe(false)
    expect(needsAttention(mk({ status: 'in_progress', notes: [{ body: 'on it', created_at: '1' }, { body: 'still broken', created_at: '2', from_submitter: true }] }))).toBe(true)
    expect(needsAttention(mk({ status: 'in_progress' }))).toBe(false)
  })

  it('sorts in each order', () => {
    const a = mk({ id: 1, priority: 'low', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-05T00:00:00Z' })
    const b = mk({ id: 2, priority: 'urgent', created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-03T00:00:00Z' })
    const c = mk({ id: 3, priority: 'high', created_at: '2026-10-03T00:00:00Z', updated_at: '2026-10-04T00:00:00Z' })
    expect(sortTickets([a, b, c], 'priority').map((t) => t.id)).toEqual([2, 3, 1])
    expect(sortTickets([a, b, c], 'newest').map((t) => t.id)).toEqual([3, 2, 1])
    expect(sortTickets([a, b, c], 'oldest').map((t) => t.id)).toEqual([1, 2, 3])
    expect(sortTickets([a, b, c], 'updated').map((t) => t.id)).toEqual([1, 3, 2])
  })

  it('computes desk stats', () => {
    const s = deskStats(
      [
        mk({ id: 1, priority: 'urgent' }),
        mk({ id: 2, priority: 'high', reason_label: 'VPN', notes: [{ body: 'on it', created_at: '1' }] }),
        mk({ id: 3, status: 'resolved', created_at: '2026-10-27T10:00:00Z', resolved_at: '2026-10-27T14:00:00Z' }),
        mk({ id: 4, status: 'resolved', created_at: '2026-10-01T10:00:00Z', resolved_at: null, updated_at: '2026-10-02T10:00:00Z' }),
      ],
      now,
    )
    expect(s.open).toBe(2)
    expect(s.needsAttention).toBe(1)
    expect(s.openByPriority).toEqual({ urgent: 1, high: 1, normal: 0, low: 0 })
    expect(s.openedThisWeek).toBe(3)
    expect(s.resolvedThisWeek).toBe(1)
    expect(s.avgResolveMs).toBe(((4 + 24) / 2) * 3_600_000)
    expect(s.topReasons).toEqual([{ label: 'Paper jam', count: 2 }, { label: 'VPN', count: 1 }])
  })
})
