/**
 * Gain of the Level slider (spec §4.2). A change of level is ramped across one
 * block instead of jumping, so moving the slider never clicks.
 */

/** Level slider percent (0-200) to a linear factor: 100 % is unity, 200 % is +6.02 dB. */
export function percentToLinear(percent: number): number {
  return percent / 100
}

/** Gain in dB to a linear factor: 0 dB is unity. */
export function dbToLinear(db: number): number {
  return 10 ** (db / 20)
}

/**
 * Interleaved `samples` scaled by a gain that moves linearly from `from` to
 * `to` across the block. The input is left untouched.
 */
export function applyGain(
  samples: Float32Array,
  channels: number,
  from: number,
  to: number
): Float32Array {
  const out = new Float32Array(samples.length)
  const frames = samples.length / channels
  const step = frames > 0 ? (to - from) / frames : 0
  for (let frame = 0; frame < frames; frame++) {
    const gain = from + step * (frame + 1)
    const base = frame * channels
    for (let channel = 0; channel < channels; channel++) {
      out[base + channel] = samples[base + channel] * gain
    }
  }
  return out
}

/** Keeps the gain between blocks so each change ramps from where the last block ended. */
export class GainStage {
  private current: number
  private target: number

  constructor(linear: number) {
    this.current = linear
    this.target = linear
  }

  set(linear: number): void {
    this.target = linear
  }

  process(samples: Float32Array, channels: number): Float32Array {
    const from = this.current
    this.current = this.target
    return applyGain(samples, channels, from, this.target)
  }
}
