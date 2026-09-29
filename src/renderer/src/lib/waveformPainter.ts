/**
 * Drawing of the live waveform (spec §4.3): faint grey grid and a blue filled
 * shape mirrored around the centre line, newest column at the right edge.
 *
 * Kept apart from the component so React only owns the canvas element, and the
 * drawing can be reasoned about on its own.
 */

import type { CanvasSize } from '../hooks/useCanvasPainter'
import type { WaveBuffer } from './waveBuffer'

/** Side of the grid squares, in CSS pixels. */
const GRID_PX = 32

/** Width of one peak column, in CSS pixels. Columns older than the width scroll out. */
export const COLUMN_PX = 2

export interface WaveColors {
  background: string
  grid: string
  wave: string
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
 * Paints the buffer right-aligned. `scrollPx` shifts every column right: the
 * columns of a frame that just arrived start past the edge and slide in.
 */
export function paintWaveform(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  buffer: WaveBuffer,
  scrollPx: number,
  colors: WaveColors
): void {
  context.fillStyle = colors.background
  context.fillRect(0, 0, size.width, size.height)
  paintGrid(context, size, colors.grid)

  const middle = size.height / 2
  context.fillStyle = colors.wave
  context.fillRect(0, middle, size.width, 1)

  const visible = Math.min(buffer.length, Math.ceil((size.width + scrollPx) / COLUMN_PX))
  for (let age = 0; age < visible; age += 1) {
    const { min, max } = buffer.column(age)
    const x = size.width + scrollPx - (age + 1) * COLUMN_PX
    const top = middle - Math.min(1, Math.max(0, max)) * middle
    const bottom = middle - Math.max(-1, Math.min(0, min)) * middle
    context.fillRect(x, top, COLUMN_PX - 1, Math.max(1, bottom - top))
  }
}
