/**
 * The audio being recorded, in the format RebeccaWrites transcribes (task 46):
 * interleaved f32 of N channels at the capture rate becomes s16le mono at
 * 16 kHz. The resampler keeps its filter history between blocks, so the file
 * sounds the same however the blocks were split.
 *
 * Pure logic, no IO: `LiveFeed.ts` writes the bytes.
 */

import { LIVE_CHANNELS, LIVE_SAMPLE_RATE } from '../../rebeccaWrites/liveArgs'
import { Resampler } from '../dsp/resampler'

const BYTES_PER_SAMPLE = 2
const INT16_MAX = 32767

/** Average of the channels of each frame. */
export function downmixToMono(samples: Float32Array, channels: number): Float32Array {
  if (channels === 1) return samples
  const frames = samples.length / channels
  const mono = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) sum += samples[frame * channels + channel]
    mono[frame] = sum / channels
  }
  return mono
}

/** Little-endian 16-bit samples, clipped to -1..1. */
export function floatToS16le(samples: Float32Array): Buffer {
  const bytes = Buffer.alloc(samples.length * BYTES_PER_SAMPLE)
  for (let i = 0; i < samples.length; i++) {
    const clipped = Math.max(-1, Math.min(1, samples[i]))
    bytes.writeInt16LE(Math.round(clipped * INT16_MAX), i * BYTES_PER_SAMPLE)
  }
  return bytes
}

export class Pcm16kConverter {
  private readonly resampler: Resampler

  constructor(
    inRate: number,
    private readonly channels: number
  ) {
    this.resampler = new Resampler({ inRate, outRate: LIVE_SAMPLE_RATE, channels: LIVE_CHANNELS })
  }

  /** The bytes for the next block; the last few wait for the block after it. */
  convert(samples: Float32Array): Buffer {
    return floatToS16le(this.resampler.process(downmixToMono(samples, this.channels)))
  }

  /** The bytes still held back by the resampler's filter, at the end. */
  flush(): Buffer {
    return floatToS16le(this.resampler.flush())
  }
}
