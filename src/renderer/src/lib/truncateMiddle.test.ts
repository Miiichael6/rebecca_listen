import { describe, expect, it } from 'vitest'
import { truncateMiddle } from './truncateMiddle'

describe('truncateMiddle', () => {
  it('leaves a short text alone', () => {
    expect(truncateMiddle('C:\\a.mp3', 20)).toBe('C:\\a.mp3')
  })

  it('cuts the middle and keeps both ends', () => {
    const cut = truncateMiddle('C:\\Users\\USER\\Desktop\\Recordings\\[2026-09-28].mp3', 24)
    expect(cut).toHaveLength(24)
    expect(cut.startsWith('C:\\Users')).toBe(true)
    expect(cut.endsWith('28].mp3')).toBe(true)
    expect(cut).toContain('…')
  })
})
