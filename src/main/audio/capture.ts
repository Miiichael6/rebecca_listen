/**
 * What a recording takes from the open input: the samples after the Level
 * gain, from the same stream the monitor shows (task 09 left one stream per
 * endpoint as the goal). `monitor.ts` implements it; the tests use a fake.
 */

import type { AudioDevice, SourceSelection } from '@shared/types'

export interface CaptureTap {
  device: AudioDevice
  /** The selection actually recorded: Computer Sounds when the chosen device is gone. */
  source: SourceSelection
  /** The chosen device was not connected and Computer Sounds is recorded instead (§4.1). */
  fellBack: boolean
  sampleRate: number
  channels: number
  /** Interleaved f32 samples after the gain, as they arrive. */
  onData(listener: (samples: Float32Array) => void): void
  /** The device went away; no more data will come. */
  onLost(listener: (reason: string) => void): void
  /** The recording no longer needs the input: it goes back to plain monitoring. */
  release(): void
}

export interface CaptureSource {
  /** Opens (or keeps) the selected source and holds it until `release`. */
  acquire(): Promise<CaptureTap>
}
