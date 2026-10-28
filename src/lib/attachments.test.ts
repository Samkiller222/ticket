import { describe, expect, it } from 'vitest'
import { fileProblem, safeName } from './attachments'

describe('attachments', () => {
  it('accepts small images only', () => {
    expect(fileProblem({ type: 'image/png', size: 1000 })).toBe('')
    expect(fileProblem({ type: 'application/pdf', size: 1000 })).not.toBe('')
    expect(fileProblem({ type: 'image/jpeg', size: 6 * 1024 * 1024 })).not.toBe('')
  })

  it('makes names safe for storage paths', () => {
    expect(safeName('Screen Shot 2026-10-28 at 10.00.png')).toBe('Screen_Shot_2026-10-28_at_10.00.png')
    expect(safeName('../../etc/passwd')).toBe('etc_passwd')
    expect(safeName('')).toBe('screenshot.png')
  })
})
