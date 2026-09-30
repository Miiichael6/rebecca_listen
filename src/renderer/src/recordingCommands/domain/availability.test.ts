import { describe, expect, it } from 'vitest'
import { canMerge, canRun, parseFormatCommand } from './availability'

describe('canRun', () => {
  it('allows everything on a file that exists', () => {
    expect(canRun({ exists: true }, 'play')).toBe(true)
    expect(canRun({ exists: true }, 'delete')).toBe(true)
    expect(canRun({ exists: true }, 'convert:wav')).toBe(true)
  })

  it('only allows what does not need the file on a missing one', () => {
    expect(canRun({ exists: false }, 'remove')).toBe(true)
    expect(canRun({ exists: false }, 'copyPath')).toBe(true)
    expect(canRun({ exists: false }, 'clearAll')).toBe(true)
    expect(canRun({ exists: false }, 'merge:mp3')).toBe(true)
    expect(canRun({ exists: false }, 'play')).toBe(false)
    expect(canRun({ exists: false }, 'rename')).toBe(false)
    expect(canRun({ exists: false }, 'delete')).toBe(false)
    expect(canRun({ exists: false }, 'tags')).toBe(false)
    expect(canRun({ exists: false }, 'convert:mp3')).toBe(false)
  })
})

describe('parseFormatCommand', () => {
  it('reads the action and the format', () => {
    expect(parseFormatCommand('convert:mp3')).toEqual({ action: 'convert', format: 'mp3' })
    expect(parseFormatCommand('merge:wav')).toEqual({ action: 'merge', format: 'wav' })
  })

  it('ignores the other commands', () => {
    expect(parseFormatCommand('play')).toBeNull()
    expect(parseFormatCommand('tags')).toBeNull()
  })
})

describe('canMerge', () => {
  it('needs two files still on disk', () => {
    expect(canMerge([{ exists: true }, { exists: false }])).toBe(false)
    expect(canMerge([{ exists: true }, { exists: true }])).toBe(true)
    expect(canMerge([])).toBe(false)
  })
})
