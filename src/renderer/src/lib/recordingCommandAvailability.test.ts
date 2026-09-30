import { describe, expect, it } from 'vitest'
import { canRun } from './recordingCommandAvailability'

describe('canRun', () => {
  it('allows everything on a file that exists', () => {
    expect(canRun({ exists: true }, 'play')).toBe(true)
    expect(canRun({ exists: true }, 'delete')).toBe(true)
  })

  it('only allows removing and copying the path of a missing file', () => {
    expect(canRun({ exists: false }, 'remove')).toBe(true)
    expect(canRun({ exists: false }, 'copyPath')).toBe(true)
    expect(canRun({ exists: false }, 'play')).toBe(false)
    expect(canRun({ exists: false }, 'rename')).toBe(false)
    expect(canRun({ exists: false }, 'delete')).toBe(false)
  })
})
