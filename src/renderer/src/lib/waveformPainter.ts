/**
 * Drawing of the live waveform (spec §4.3): faint grey grid and a blue filled
 * shape mirrored around the centre line.
 *
 * Kept apart from the component so React only owns the canvas element and its
 * size, and the drawing can be reasoned about on its own.
 */

import type { WaveFrame } from '@shared/types'

/** Side of the grid squares, in CSS pixels. */
const GRID_PX = 32

/** Width of one peak column, in CSS pixels. Buckets older than the width scroll out. */
export const COLUMN_PX = 2

export interface CanvasSize {
  width: number
  height: number
}

/** How many buckets fit in a canvas of this width. */
export function columnsFor(width: number): number {
  return Math.max(1, Math.floor(width / COLUMN_PX))
}

function paintGrid(context: CanvasRenderingContext2D, size: CanvasSize, color: string): void {
  context.strokeStyle = color
  context.lineWidth = 1
  context.beginPath()
  for (let x = GRID_PX; x < size.width; x += GRID_PX) {
    context.moveTo(x + 0.5, 0)
    context.lineTo(x + 0.5, size.height)
  }
  for (let y = GRID_PX; y < size.height; y += GRID_PX) {
    context.moveTo(0, y + 0.5)
    context.lineTo(size.width, y + 0.5)
  }
  context.stroke()
}

/**
 * Paints the frame right-aligned, so the newest bucket sits at the right edge
 * and the older ones scroll out on the left.
 */
export function paintWaveform(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  frame: WaveFrame,
  colors: { background: string; grid: string; wave: string }
): void {
  context.fillStyle = colors.background
  context.fillRect(0, 0, size.width, size.height)
  paintGrid(context, size, colors.grid)

  const middle = size.height / 2
  const columns = Math.min(frame.max.length, columnsFor(size.width))
  const first = frame.max.length - columns

  context.fillStyle = colors.wave
  context.fillRect(0, middle, size.width, 1)
  for (let index = 0; index < columns; index += 1) {
    const top = middle - Math.min(1, Math.max(0, frame.max[first + index])) * middle
    const bottom = middle - Math.max(-1, Math.min(0, frame.min[first + index])) * middle
    context.fillRect(index * COLUMN_PX, top, COLUMN_PX - 1, Math.max(1, bottom - top))
  }
}
