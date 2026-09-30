import { describe, expect, it } from 'vitest'
import { sine } from '../dsp/testSignals'
import { downmixToMono, floatToS16le, Pcm16kConverter } from './pcm16k'

/** Samples of a s16le buffer, back to -1..1. */
function readS16le(bytes: Buffer): number[] {
  const out: number[] = []
  for (let at = 0; at < bytes.length; at += 2) out.push(bytes.readInt16LE(at) / 32767)
  return out
}

function rms(values: number[]): number {
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)
}

describe('downmixToMono', () => {
  it('averages the channels of each frame', () => {
    expect([...downmixToMono(new Float32Array([1, 0, 0.5, 0.5, -1, 1]), 2)]).toEqual([0.5, 0.5, 0])
  })

  it('leaves mono as it is', () => {
    const mono = new Float32Array([0.1, 0.2])
    expect(downmixToMono(mono, 1)).toBe(mono)
  })
})

describe('floatToS16le', () => {
  it('writes little-endian 16-bit samples and clips beyond full scale', () => {
    const bytes = floatToS16le(new Float32Array([0, 1, -1, 2, -2, 0.5]))
    expect(bytes.length).toBe(12)
    expect([...new Int16Array(bytes.buffer, bytes.byteOffset, 6)]).toEqual([
      0, 32767, -32767, 32767, -32767, 16384
    ])
  })
})

describe('Pcm16kConverter', () => {
  it('turns 1 s of 48 kHz stereo into 1 s of 16 kHz mono, block by block', () => {
    const converter = new Pcm16kConverter(48000, 2)
    const input = sine(440, 0.5, 1, 48000, 2)
    const block = 480 * 2
    const chunks: Buffer[] = []
    for (let at = 0; at < input.length; at += block) {
      chunks.push(converter.convert(input.subarray(at, at + block)))
    }
    chunks.push(converter.flush())
    const samples = readS16le(Buffer.concat(chunks))

    expect(Math.abs(samples.length - 16000)).toBeLessThanOrEqual(1)
    // A 440 Hz sine keeps its level: RMS of 0.5 amplitude is 0.354.
    expect(rms(samples.slice(1000, 15000))).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })

  it('removes what 16 kHz cannot hold instead of folding it back', () => {
    const converter = new Pcm16kConverter(48000, 1)
    // 12 kHz is above the 8 kHz Nyquist of the output.
    const samples = readS16le(converter.convert(sine(12000, 0.5, 0.5, 48000, 1)))
    expect(rms(samples.slice(500, samples.length - 500))).toBeLessThan(0.01)
  })
})
