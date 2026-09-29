/**
 * Drawing of the VU meter (spec §4.2): two rows of `VU_SEGMENTS` segments,
 * lit up to the RMS level, plus the segment of the held peak.
 */

import { VU_SEGMENTS } from '@shared/defaults'
import type { CanvasSize } from '../hooks/useCanvasPainter'
import { litSegments, segmentDb, zoneOf, type VuZone } from './vu'

/** Space between segments and between the two rows, in CSS pixels. */
const SEGMENT_GAP_PX = 1
const ROW_GAP_PX = 2

export type VuColors = Record<VuZone | 'off', string>

export interface VuRow {
  rmsDb: number
  peakDb: number
}

function paintRow(
  context: CanvasRenderingContext2D,
  top: number,
  width: number,
  height: number,
  row: VuRow,
  colors: VuColors
): void {
  const segmentWidth = (width - (VU_SEGMENTS - 1) * SEGMENT_GAP_PX) / VU_SEGMENTS
  const lit = litSegments(row.rmsDb)
  const peak = litSegments(row.peakDb) - 1
  for (let index = 0; index < VU_SEGMENTS; index += 1) {
    const on = index < lit || index === peak
    context.fillStyle = on ? colors[zoneOf(segmentDb(index))] : colors.off
    context.fillRect(index * (segmentWidth + SEGMENT_GAP_PX), top, segmentWidth, height)
  }
}

export function paintVu(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  rows: readonly VuRow[],
  colors: VuColors
): void {
  context.clearRect(0, 0, size.width, size.height)
  const rowHeight = (size.height - ROW_GAP_PX * (rows.length - 1)) / rows.length
  rows.forEach((row, index) => {
    paintRow(context, index * (rowHeight + ROW_GAP_PX), size.width, rowHeight, row, colors)
  })
}
