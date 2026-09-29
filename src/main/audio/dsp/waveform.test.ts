import { describe, expect, it } from 'vitest'
import { decimate, WaveformAccumulator } from './waveform'
import { silence, sine } from './testSignals'

describe('decimate', () => {
  it('gives the asked number of columns', () => {
    const frame = decimate(sine(100, 1, 0.1, 48000, 2), 2, 7)
    expect(frame.min).toHaveLength(7)
    expect(frame.max).toHaveLength(7)
  })

  it('keeps the exact min and max of each bucket across channels', () => {
    // Two stereo frames per bucket; the right channel holds the extremes of bucket 2.
    const samples = Float32Array.from([0.1, -0.2, 0.3, 0.0, -0.4, 0.9, 0.2, -0.8])
    expect(decimate(samples, 2, 2)).toEqual({
      min: [Math.fround(-0.2), Math.fround(-0.8)],
      max: [Math.fround(0.3), Math.fround(0.9)]
    })
  })

  it('spans ±amp on a sine with whole periods per bucket', () => {
    const frame = decimate(sine(100, 0.5, 0.1, 48000, 1), 1, 2)
    for (const low of frame.min) expect(low).toBeCloseTo(-0.5, 3)
    for (const high of frame.max) expect(high).toBeCloseTo(0.5, 3)
  })

  it('gives flat columns for silence and for no audio at all', () => {
    const flat = { min: [0, 0, 0], max: [0, 0, 0] }
    expect(decimate(silence(0.1, 48000, 2), 2, 3)).toEqual(flat)
    expect(decimate(new Float32Array(0), 2, 3)).toEqual(flat)
  })

  it('leaves a bucket flat when there are fewer frames than columns', () => {
    expect(decimate(Float32Array.from([0.5]), 1, 2)).toEqual({ min: [0, 0.5], max: [0, 0.5] })
  })
})

describe('WaveformAccumulator', () => {
  it('decimates the blocks of one tick together and then starts over', () => {
    const wave = new WaveformAccumulator(1, 2)
    wave.add(Float32Array.from([0.5, -0.5]))
    wave.add(Float32Array.from([0.25, -0.25]))
    expect(wave.take()).toEqual({ min: [-0.5, -0.25], max: [0.5, 0.25] })
    expect(wave.take()).toEqual({ min: [0, 0], max: [0, 0] })
  })
})
