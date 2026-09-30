import { describe, expect, it } from 'vitest'
import { clamp, enabledIndexes, stepFrom } from './menuNavigation'

describe('enabledIndexes', () => {
  it('skips disabled items', () => {
    const items = [
      { key: 'a', label: 'A' },
      { key: 'b', label: 'B', disabled: true },
      { key: 'c', label: 'C' }
    ]
    expect(enabledIndexes(items)).toEqual([0, 2])
  })
})

describe('stepFrom', () => {
  const enabled = [0, 2, 5]

  it('moves to the next and previous enabled item, going round', () => {
    expect(stepFrom(enabled, 0, 1)).toBe(2)
    expect(stepFrom(enabled, 5, 1)).toBe(0)
    expect(stepFrom(enabled, 0, -1)).toBe(5)
  })

  it('starts at the first enabled item and gives -1 when there is none', () => {
    expect(stepFrom(enabled, -1, 1)).toBe(0)
    expect(stepFrom([], 0, 1)).toBe(-1)
  })
})

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(4, 0, 10)).toBe(4)
    expect(clamp(12, 0, 10)).toBe(10)
  })
})
