/** Known signals for the DSP tests: interleaved f32, the same value on every channel. */

function fill(
  seconds: number,
  rate: number,
  channels: number,
  sampleAt: (frame: number) => number
): Float32Array {
  const frames = Math.round(seconds * rate)
  const out = new Float32Array(frames * channels)
  for (let frame = 0; frame < frames; frame++) {
    const value = sampleAt(frame)
    for (let channel = 0; channel < channels; channel++) out[frame * channels + channel] = value
  }
  return out
}

export function sine(
  freq: number,
  amp: number,
  seconds: number,
  rate: number,
  channels: number
): Float32Array {
  return fill(
    seconds,
    rate,
    channels,
    (frame) => amp * Math.sin((2 * Math.PI * freq * frame) / rate)
  )
}

export function silence(seconds: number, rate: number, channels: number): Float32Array {
  return fill(seconds, rate, channels, () => 0)
}

/** Uniform noise in -amp..amp from a seeded generator (mulberry32), so tests repeat. */
export function whiteNoise(
  seed: number,
  amp: number,
  seconds: number,
  rate: number,
  channels: number
): Float32Array {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return fill(seconds, rate, channels, () => amp * (next() * 2 - 1))
}
