import { describe, expect, it } from 'vitest'
import { formatDuration } from './duration'

describe('formatDuration', () => {
  it('shows MM:SS below one hour', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(5_000)).toBe('00:05')
    expect(formatDuration(29_400)).toBe('00:29')
    expect(formatDuration(59 * 60_000 + 59_000)).toBe('59:59')
  })

  it('switches to H:MM:SS from one hour on', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00')
    expect(formatDuration(3_723_000)).toBe('1:02:03')
    expect(formatDuration(36_000_000)).toBe('10:00:00')
  })

  it('truncates instead of rounding up', () => {
    expect(formatDuration(1_999)).toBe('00:01')
  })

  it('clamps negative values to zero', () => {
    expect(formatDuration(-1)).toBe('00:00')
  })
})
