/**
 * Level meter (spec §4.2): RMS and peak per channel, in dBFS, over everything
 * added since the last `take()`. The caller takes one frame per tick
 * (`METER_FPS`), so a tick without audio reads as the floor.
 */

import { METER_FLOOR_DB } from '@shared/defaults'
import type { MeterFrame } from '@shared/types'

/** Linear amplitude to dBFS, with silence clipped to `METER_FLOOR_DB`. */
export function toDbfs(linear: number): number {
  return Math.max(METER_FLOOR_DB, 20 * Math.log10(linear))
}

export class MeterAccumulator {
  private sumSquares: number[]
  private peaks: number[]
  private frames = 0

  constructor(private readonly channels: number) {
    this.sumSquares = new Array(channels).fill(0)
    this.peaks = new Array(channels).fill(0)
  }

  add(samples: Float32Array): void {
    const { channels } = this
    for (let i = 0; i < samples.length; i++) {
      const channel = i % channels
      const value = samples[i]
      this.sumSquares[channel] += value * value
      const magnitude = Math.abs(value)
      if (magnitude > this.peaks[channel]) this.peaks[channel] = magnitude
    }
    this.frames += samples.length / channels
  }

  /** The frame for what was added since the last call, and a fresh start. */
  take(): MeterFrame {
    const frames = this.frames
    const frame: MeterFrame = {
      rmsDb: this.sumSquares.map((sum) => toDbfs(frames > 0 ? Math.sqrt(sum / frames) : 0)),
      peakDb: this.peaks.map(toDbfs)
    }
    this.sumSquares.fill(0)
    this.peaks.fill(0)
    this.frames = 0
    return frame
  }
}
