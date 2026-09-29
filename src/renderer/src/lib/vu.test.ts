import { describe, expect, it } from 'vitest'
import { VU_FLOOR_DB, VU_SEGMENTS } from '@shared/defaults'
import { litSegments, segmentDb, zoneOf } from './vu'

describe('litSegments', () => {
  it('is empty at or below the floor and full at 0 dBFS', () => {
    expect(litSegments(VU_FLOOR_DB)).toBe(0)
    expect(litSegments(-100)).toBe(0)
    expect(litSegments(0)).toBe(VU_SEGMENTS)
    expect(litSegments(3)).toBe(VU_SEGMENTS)
  })

  it('lights half the row at the middle of the scale', () => {
    expect(litSegments(VU_FLOOR_DB / 2)).toBe(VU_SEGMENTS / 2)
  })
})

describe('zoneOf', () => {
  it('splits the scale at -12 and -3 dBFS', () => {
    expect(zoneOf(-40)).toBe('green')
    expect(zoneOf(-12)).toBe('green')
    expect(zoneOf(-11.9)).toBe('yellow')
    expect(zoneOf(-3)).toBe('yellow')
    expect(zoneOf(-2.9)).toBe('red')
  })
})

describe('segmentDb', () => {
  it('ends at 0 dBFS on the last segment', () => {
    expect(segmentDb(VU_SEGMENTS - 1)).toBe(0)
    expect(segmentDb(0)).toBeCloseTo(VU_FLOOR_DB + -VU_FLOOR_DB / VU_SEGMENTS)
  })
})
