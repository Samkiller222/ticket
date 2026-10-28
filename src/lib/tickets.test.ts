import { describe, expect, it } from 'vitest'
import { addNote, addReason, addTicket, deleteReason, findTicket, openTickets, seedDesk, setStatus, toggleReason, validateTicket, type NewTicket } from './tickets'

const input = (over: Partial<NewTicket> = {}): NewTicket => ({
  name: 'Sam',
  email: '',
  reasonId: 'hardware-computer-is-running-slowly',
  priority: 'normal',
  description: 'Takes ten minutes to boot since Monday.',
  ...over,
})

describe('validateTicket', () => {
  it('requires a name and a description', () => {
    const errors = validateTicket(seedDesk(), input({ name: '  ', description: '' }))
    expect(errors.name).toBeDefined()
    expect(errors.description).toBeDefined()
  })

  it('rejects a description that is too short', () => {
    expect(validateTicket(seedDesk(), input({ description: 'broken' })).description).toBeDefined()
  })

  it('allows a blank email but not a malformed one', () => {
    expect(validateTicket(seedDesk(), input()).email).toBeUndefined()
    expect(validateTicket(seedDesk(), input({ email: 'nope' })).email).toBeDefined()
  })

  it('rejects hidden reasons', () => {
    const desk = toggleReason(seedDesk(), 'hardware-computer-is-running-slowly')
    expect(validateTicket(desk, input()).reasonId).toBeDefined()
  })
})

describe('tickets', () => {
  it('numbers tickets and copies the reason label', () => {
    const first = addTicket(seedDesk(), input())
    const second = addTicket(first.desk, input())
    expect(first.ticket.id).toBe('TCK-1001')
    expect(second.ticket.id).toBe('TCK-1002')
    expect(first.ticket.reasonLabel).toBe('Computer is running slowly')
    expect(first.ticket.status).toBe('open')
  })

  it('refuses to add an invalid ticket', () => {
    expect(() => addTicket(seedDesk(), input({ name: '' }))).toThrow()
  })

  it('keeps the label after the reason is deleted', () => {
    const { desk, ticket } = addTicket(seedDesk(), input())
    const after = deleteReason(desk, ticket.reasonId)
    expect(findTicket(after, 'tck-1001')?.reasonLabel).toBe('Computer is running slowly')
  })

  it('finds by bare number', () => {
    const { desk } = addTicket(seedDesk(), input())
    expect(findTicket(desk, '1001')?.id).toBe('TCK-1001')
  })

  it('lists open tickets by priority then age, without resolved ones', () => {
    let desk = seedDesk()
    desk = addTicket(desk, input({ priority: 'low' }), new Date('2026-01-01')).desk
    desk = addTicket(desk, input({ priority: 'urgent' }), new Date('2026-01-02')).desk
    desk = addTicket(desk, input({ priority: 'urgent' }), new Date('2026-01-03')).desk
    desk = setStatus(desk, 'TCK-1003', 'resolved')
    expect(openTickets(desk.tickets).map((t) => t.id)).toEqual(['TCK-1002', 'TCK-1001'])
  })

  it('adds notes and ignores blank ones', () => {
    const { desk } = addTicket(seedDesk(), input())
    const noted = addNote(addNote(desk, 'TCK-1001', 'On it'), 'TCK-1001', '  ')
    expect(findTicket(noted, 'TCK-1001')?.notes.map((n) => n.text)).toEqual(['On it'])
  })
})

describe('reasons', () => {
  it('adds a reason and blocks duplicates', () => {
    const desk = addReason(seedDesk(), 'Hardware', 'Docking station not working')
    expect(desk.reasons.at(-1)).toMatchObject({ category: 'Hardware', label: 'Docking station not working', active: true })
    expect(() => addReason(desk, 'hardware', 'docking station not working')).toThrow()
    expect(() => addReason(desk, '', 'x')).toThrow()
  })
})
