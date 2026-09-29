/**
 * Live waveform peaks (spec §4.3). The audio of one tick is split into
 * `columns` equal buckets and each one keeps its lowest and highest sample,
 * across every channel. A tick without audio gives flat columns, so the strip
 * keeps scrolling through silence.
 */

import type { WaveFrame } from '@shared/types'

/** Min/max pairs of `columns` equal buckets of interleaved `samples`. */
export function decimate(samples: Float32Array, channels: number, columns: number): WaveFrame {
  const min = new Array<number>(columns).fill(0)
  const max = new Array<number>(columns).fill(0)
  const frames = samples.length / channels
  if (frames === 0) return { min, max }

  for (let column = 0; column < columns; column++) {
    const start = Math.floor((column * frames) / columns) * channels
    const end = Math.floor(((column + 1) * frames) / columns) * channels
    if (start === end) continue
    let low = Infinity
    let high = -Infinity
    for (let i = start; i < end; i++) {
      if (samples[i] < low) low = samples[i]
      if (samples[i] > high) high = samples[i]
    }
    min[column] = low
    max[column] = high
  }
  return { min, max }
}

/** Collects the blocks of one tick and decimates them on `take()`. */
export class WaveformAccumulator {
  private blocks: Float32Array[] = []
  private length = 0

  constructor(
    private readonly channels: number,
    private readonly columns: number
  ) {}

  add(samples: Float32Array): void {
    this.blocks.push(samples)
    this.length += samples.length
  }

  take(): WaveFrame {
    const joined = new Float32Array(this.length)
    let offset = 0
    for (const block of this.blocks) {
      joined.set(block, offset)
      offset += block.length
    }
    this.blocks = []
    this.length = 0
    return decimate(joined, this.channels, this.columns)
  }
}
