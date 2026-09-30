import { describe, expect, it } from 'vitest'
import { Resampler } from './resampler'
import { sine } from './testSignals'

const STEREO = 2
const SUPPORTED_RATES = [8000, 11025, 16000, 22050, 32000, 44100, 48000]

/** The whole signal through one resampler, in blocks of the given sizes (in frames), then flushed. */
function run(
  resampler: Resampler,
  signal: Float32Array,
  channels: number,
  blocks: number[]
): Float32Array {
  const parts: Float32Array[] = []
  let at = 0
  for (let i = 0; at < signal.length; i++) {
    const size = blocks[i % blocks.length] * channels
    parts.push(resampler.process(signal.subarray(at, at + size)))
    at += size
  }
  parts.push(resampler.flush())
  const out = new Float32Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** One channel of an interleaved signal. */
function channel(signal: Float32Array, channels: number, index = 0): Float32Array {
  return signal.filter((_, i) => i % channels === index)
}

/** Frequency from the rising zero crossings, away from the edges. */
function frequencyOf(mono: Float32Array, rate: number): number {
  const crossings: number[] = []
  for (let i = 1; i < mono.length; i++) {
    if (mono[i - 1] < 0 && mono[i] >= 0) crossings.push(i - mono[i] / (mono[i] - mono[i - 1]))
  }
  const inner = crossings.slice(2, -2)
  return ((inner.length - 1) * rate) / (inner[inner.length - 1] - inner[0])
}

function rms(mono: Float32Array): number {
  return Math.sqrt(mono.reduce((sum, x) => sum + x * x, 0) / mono.length)
}

describe('Resampler', () => {
  it('keeps a 1 kHz sine at 1 kHz from 44.1k to 48k, with the expected length', () => {
    const input = sine(1000, 0.5, 2, 44_100, STEREO)
    const out = run(
      new Resampler({ inRate: 44_100, outRate: 48_000, channels: STEREO }),
      input,
      STEREO,
      [441]
    )

    expect(Math.abs(out.length / STEREO - 96_000)).toBeLessThanOrEqual(1)
    const mono = channel(out, STEREO, 1)
    expect(frequencyOf(mono, 48_000)).toBeCloseTo(1000, 1)
    expect(rms(mono.subarray(1000, -1000))).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  it('converts between every pair of supported rates', () => {
    for (const inRate of SUPPORTED_RATES) {
      for (const outRate of SUPPORTED_RATES) {
        const input = sine(440, 0.5, 0.5, inRate, 1)
        const out = run(new Resampler({ inRate, outRate, channels: 1 }), input, 1, [512])
        expect(Math.abs(out.length - (input.length * outRate) / inRate)).toBeLessThanOrEqual(1)
        expect(frequencyOf(out, outRate)).toBeCloseTo(440, 0)
      }
    }
  })

  it('gives the same samples however the input is split into blocks', () => {
    const input = sine(997, 0.5, 1, 48_000, STEREO)
    const options = { inRate: 48_000, outRate: 44_100, channels: STEREO }
    const whole = run(new Resampler(options), input, STEREO, [48_000])
    const split = run(new Resampler(options), input, STEREO, [1, 37, 480, 3, 2048, 129])
    expect(split).toEqual(whole)
  })

  it('keeps the band up to 18 kHz and filters out what would alias, going from 48k to 44.1k', () => {
    const gainOf = (freq: number): number => {
      const input = sine(freq, 0.5, 1, 48_000, 1)
      const out = run(
        new Resampler({ inRate: 48_000, outRate: 44_100, channels: 1 }),
        input,
        1,
        [480]
      )
      return 20 * Math.log10(rms(out.subarray(2000, -2000)) / rms(input))
    }
    expect(gainOf(18_000)).toBeGreaterThan(-0.5)
    // 21 kHz sits in the transition band, just under the new Nyquist (22.05 kHz).
    expect(gainOf(21_000)).toBeLessThan(-12)
    // 23 kHz would fold back to 21.1 kHz.
    expect(gainOf(23_000)).toBeLessThan(-70)
  })

  it('copies the samples when the rates match and there is no nudge', () => {
    const input = sine(440, 0.5, 0.1, 48_000, STEREO)
    const out = run(
      new Resampler({ inRate: 48_000, outRate: 48_000, channels: STEREO }),
      input,
      STEREO,
      [480]
    )
    expect(out).toEqual(input)
  })

  it('gives 100 ppm more frames over 60 s with +100 ppm', () => {
    const rate = 48_000
    const input = new Float32Array(rate * 60)
    const resampler = new Resampler({ inRate: rate, outRate: rate, channels: 1 })
    resampler.setRatioAdjust(100)
    const out = run(resampler, input, 1, [480])
    expect(Math.abs(out.length - input.length * (1 + 100e-6))).toBeLessThanOrEqual(1)
  })

  it('moves the ratio without a jump in the signal', () => {
    const rate = 48_000
    const input = sine(1000, 0.5, 1, rate, 1)
    const resampler = new Resampler({ inRate: rate, outRate: rate, channels: 1 })
    const parts: Float32Array[] = []
    for (let at = 0, block = 0; at < input.length; at += 480, block++) {
      // Passthrough, then nudged both ways, then back to passthrough.
      resampler.setRatioAdjust([0, 1000, -1000, 0][Math.floor(block / 25)])
      parts.push(resampler.process(input.subarray(at, at + 480)))
    }
    const out = Float32Array.from(parts.flatMap((part) => [...part]))
    // The largest step of a 1 kHz sine of amplitude 0.5 at 48k is 2π·1000·0.5/48000 ≈ 0.065.
    let largestStep = 0
    for (let i = 1; i < out.length; i++)
      largestStep = Math.max(largestStep, Math.abs(out[i] - out[i - 1]))
    expect(largestStep).toBeLessThan(0.07)
  })

  it('clamps the nudge to ±1000 ppm', () => {
    const input = new Float32Array(48_000)
    const resampler = new Resampler({ inRate: 48_000, outRate: 48_000, channels: 1 })
    resampler.setRatioAdjust(5000)
    expect(Math.abs(run(resampler, input, 1, [480]).length - 48_048)).toBeLessThanOrEqual(1)
  })

  it('converts a minute of 48k stereo in well under 1 % of real time', () => {
    const seconds = 60
    const input = sine(1000, 0.5, seconds, 48_000, STEREO)
    const resampler = new Resampler({ inRate: 48_000, outRate: 44_100, channels: STEREO })
    const started = performance.now()
    run(resampler, input, STEREO, [480])
    const share = (performance.now() - started) / (seconds * 1000)
    console.info(`resampler: 48k→44.1k stereo at ${(share * 100).toFixed(3)} % of real time`)
    expect(share).toBeLessThan(0.01)
  })
})
