/**
 * Peak hold of the VU meter (spec §4.2): the highest peak stays for
 * `VU_PEAK_HOLD_MS`, then falls at `VU_PEAK_FALL_DB_PER_S` until a new peak
 * reaches it. Pure: the caller passes the clock.
 */

import { VU_FLOOR_DB, VU_PEAK_FALL_DB_PER_S, VU_PEAK_HOLD_MS } from '@shared/defaults'

export interface HeldPeak {
  db: number
  heldAtMs: number
}

export const NO_PEAK: HeldPeak = { db: VU_FLOOR_DB, heldAtMs: -Infinity }

/** Where the held peak is drawn at `nowMs`. */
export function heldPeakDb(held: HeldPeak, nowMs: number): number {
  const fallingMs = nowMs - held.heldAtMs - VU_PEAK_HOLD_MS
  if (fallingMs <= 0) return held.db
  return Math.max(VU_FLOOR_DB, held.db - (fallingMs / 1000) * VU_PEAK_FALL_DB_PER_S)
}

/** A new peak takes over when it reaches the (possibly falling) held one. */
export function holdPeak(held: HeldPeak, peakDb: number, nowMs: number): HeldPeak {
  return peakDb >= heldPeakDb(held, nowMs) ? { db: peakDb, heldAtMs: nowMs } : held
}
