import { describe, expect, it } from 'vitest'
import { ageLevel, formatAge, formatDuration } from './format'

const now = new Date('2026-10-28T12:00:00Z')

describe('formatAge', () => {
  it('uses minutes, hours, then days', () => {
    expect(formatAge('2026-10-28T11:48:00Z', now)).toBe('12m')
    expect(formatAge('2026-10-28T07:00:00Z', now)).toBe('5h')
    expect(formatAge('2026-10-25T11:00:00Z', now)).toBe('3d')
    expect(formatAge('2026-10-28T12:05:00Z', now)).toBe('0m')
  })
})

describe('ageLevel', () => {
  it('warns from 2 days and flags late from 5', () => {
    expect(ageLevel('2026-10-27T12:00:00Z', now)).toBe('')
    expect(ageLevel('2026-10-26T11:00:00Z', now)).toBe('warn')
    expect(ageLevel('2026-10-23T11:00:00Z', now)).toBe('late')
  })
})

describe('formatDuration', () => {
  it('picks a readable unit', () => {
    expect(formatDuration(25 * 60_000)).toBe('25 min')
    expect(formatDuration(5 * 3_600_000)).toBe('5 h')
    expect(formatDuration(4 * 86_400_000)).toBe('4 days')
  })
})
