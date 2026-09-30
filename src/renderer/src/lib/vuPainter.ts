/**
 * Drawing of the VU meter (spec §4.2, look of plan/images/app.png): two thin
 * rounded bars with a green → yellow → red gradient, lit up to the RMS level,
 * plus a bright tick at the held peak. The unlit part keeps a dim track.
 */

import { VU_FLOOR_DB, VU_GREEN_MAX_DB, VU_YELLOW_MAX_DB } from '@shared/defaults'
import type { CanvasSize } from '../hooks/useCanvasPainter'
import type { VuZone } from './vu'

/** Space between the two rows, in CSS pixels; matches `.channels` gap in VuMeter.module.css. */
const ROW_GAP_PX = 6
const PEAK_PX = 2

export type VuColors = Record<VuZone | 'off', string>

export interface VuRow {
  rmsDb: number
  peakDb: number
}

/** Position of a level along the bar, from 0 (floor) to 1 (0 dBFS). */
function ratioOf(db: number): number {
  return Math.min(1, Math.max(0, (db - VU_FLOOR_DB) / -VU_FLOOR_DB))
}

function zoneGradient(
  context: CanvasRenderingContext2D,
  width: number,
  colors: VuColors
): CanvasGradient {
  const gradient = context.createLinearGradient(0, 0, width, 0)
  const greenEnd = ratioOf(VU_GREEN_MAX_DB)
  const yellowEnd = ratioOf(VU_YELLOW_MAX_DB)
  gradient.addColorStop(0, colors.green)
  gradient.addColorStop(greenEnd * 0.85, colors.green)
  gradient.addColorStop(greenEnd, colors.yellow)
  gradient.addColorStop(yellowEnd, colors.red)
  gradient.addColorStop(1, colors.red)
  return gradient
}

function paintRow(
  context: CanvasRenderingContext2D,
  top: number,
  width: number,
  height: number,
  row: VuRow,
  gradient: CanvasGradient,
  colors: VuColors
): void {
  const radius = height / 2
  context.fillStyle = colors.off
  context.beginPath()
  context.roundRect(0, top, width, height, radius)
  context.fill()

  const lit = ratioOf(row.rmsDb) * width
  if (lit > 0) {
    context.fillStyle = gradient
    context.beginPath()
    context.roundRect(0, top, Math.max(lit, height), height, radius)
    context.fill()
  }

  if (row.peakDb > VU_FLOOR_DB) {
    const x = Math.min(width - PEAK_PX, ratioOf(row.peakDb) * width)
    context.fillStyle = gradient
    context.fillRect(x, top, PEAK_PX, height)
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
  const gradient = zoneGradient(context, size.width, colors)
  rows.forEach((row, index) => {
    paintRow(
      context,
      index * (rowHeight + ROW_GAP_PX),
      size.width,
      rowHeight,
      row,
      gradient,
      colors
    )
  })
}
