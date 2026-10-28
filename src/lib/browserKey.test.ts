import { describe, expect, it } from 'vitest'
import { sha256Hex } from './browserKey'

describe('sha256Hex', () => {
  it('matches ticket_key_hash() in the database, so live-update topics line up', async () => {
    // Value produced by public.ticket_key_hash('cccccccc-1111-2222-3333-444444444444').
    expect(await sha256Hex('cccccccc-1111-2222-3333-444444444444')).toBe('600bc4fc005db6ae69d38e6135cbbdfa93586a5f28285e366fdde53f859e590a')
  })
})
