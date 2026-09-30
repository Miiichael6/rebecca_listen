import { describe, expect, it } from 'vitest'
import { formatDate, formatSize } from './fileInfo'

describe('formatDate', () => {
  it('prints the local day as YYYY-MM-DD', () => {
    expect(formatDate(new Date(2024, 4, 15, 23, 59).getTime())).toBe('2024-05-15')
    expect(formatDate(new Date(2025, 0, 3).getTime())).toBe('2025-01-03')
  })
})

describe('formatSize', () => {
  it('picks the largest unit below 1024', () => {
    expect(formatSize(0)).toBe('0B')
    expect(formatSize(900)).toBe('900B')
    expect(formatSize(850 * 1024)).toBe('850KB')
    expect(formatSize(12 * 1024 * 1024)).toBe('12MB')
    expect(formatSize(3 * 1024 ** 3)).toBe('3.0GB')
  })

  it('keeps one decimal below ten units', () => {
    expect(formatSize(4.2 * 1024 * 1024)).toBe('4.2MB')
  })
})
