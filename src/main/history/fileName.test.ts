import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { copyPath, normalizeFileName } from './fileName'

describe('normalizeFileName', () => {
  it('keeps the extension of the recording', () => {
    expect(normalizeFileName('meeting', 'a.mp3')).toBe('meeting.mp3')
    expect(normalizeFileName(' meeting.MP3 ', 'a.mp3')).toBe('meeting.mp3')
    expect(normalizeFileName('meeting.wav', 'a.mp3')).toBe('meeting.wav.mp3')
  })

  it('rejects empty, invalid and reserved names', () => {
    expect(() => normalizeFileName('  ', 'a.mp3')).toThrow()
    expect(() => normalizeFileName('a/b', 'a.mp3')).toThrow()
    expect(() => normalizeFileName('a\\b', 'a.mp3')).toThrow()
    expect(() => normalizeFileName('what?', 'a.mp3')).toThrow()
    expect(() => normalizeFileName('a\b', 'a.mp3')).toThrow()
    expect(() => normalizeFileName('CON', 'a.mp3')).toThrow()
  })
})

describe('copyPath', () => {
  it('adds " - Copy" and a number when that is taken', () => {
    const taken = new Set([join('d', 'a - Copy.mp3'), join('d', 'a - Copy (1).mp3')])
    expect(copyPath(join('d', 'a.mp3'), () => false)).toBe(join('d', 'a - Copy.mp3'))
    expect(copyPath(join('d', 'a.mp3'), (path) => taken.has(path))).toBe(
      join('d', 'a - Copy (2).mp3')
    )
  })
})
