import { describe, expect, it } from 'vitest'
import { VU_FLOOR_DB, VU_PEAK_FALL_DB_PER_S, VU_PEAK_HOLD_MS } from '@shared/defaults'
import { NO_PEAK, heldPeakDb, holdPeak } from './peakHold'

describe('peak hold', () => {
  it('holds the peak for the hold time', () => {
    const held = holdPeak(NO_PEAK, -6, 0)
    expect(heldPeakDb(held, VU_PEAK_HOLD_MS)).toBe(-6)
  })

  it('then falls at the fall rate down to the floor', () => {
    const held = holdPeak(NO_PEAK, -6, 0)
    expect(heldPeakDb(held, VU_PEAK_HOLD_MS + 500)).toBeCloseTo(-6 - VU_PEAK_FALL_DB_PER_S / 2)
    expect(heldPeakDb(held, VU_PEAK_HOLD_MS + 60_000)).toBe(VU_FLOOR_DB)
  })

  it('ignores lower peaks while holding and takes higher ones', () => {
    const held = holdPeak(NO_PEAK, -6, 0)
    expect(holdPeak(held, -10, 100)).toBe(held)
    expect(holdPeak(held, -3, 100)).toEqual({ db: -3, heldAtMs: 100 })
  })

  it('lets a lower peak take over once the held one fell below it', () => {
    const held = holdPeak(NO_PEAK, -6, 0)
    const later = VU_PEAK_HOLD_MS + 1000
    expect(holdPeak(held, -20, later)).toEqual({ db: -20, heldAtMs: later })
  })
})
