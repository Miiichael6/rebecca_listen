/**
 * VU meter maths (spec §4.2): where a level falls on the row of segments and
 * which colour each segment has. Pure: no React, no DOM.
 */

import { VU_FLOOR_DB, VU_GREEN_MAX_DB, VU_SEGMENTS, VU_YELLOW_MAX_DB } from '@shared/defaults'

export type VuZone = 'green' | 'yellow' | 'red'

/** Top of the scale is 0 dBFS, the bottom is `VU_FLOOR_DB`. */
export function segmentDb(index: number): number {
  return VU_FLOOR_DB + ((index + 1) / VU_SEGMENTS) * -VU_FLOOR_DB
}

/** Green up to -12 dBFS, yellow up to -3 dBFS, red above. */
export function zoneOf(db: number): VuZone {
  if (db <= VU_GREEN_MAX_DB) return 'green'
  if (db <= VU_YELLOW_MAX_DB) return 'yellow'
  return 'red'
}

/** How many segments a level lights up, from 0 to `VU_SEGMENTS`. */
export function litSegments(db: number): number {
  if (db <= VU_FLOOR_DB) return 0
  if (db >= 0) return VU_SEGMENTS
  return Math.ceil(((db - VU_FLOOR_DB) / -VU_FLOOR_DB) * VU_SEGMENTS)
}
