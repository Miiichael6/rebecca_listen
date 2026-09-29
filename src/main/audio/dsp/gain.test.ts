import { describe, expect, it } from 'vitest'
import { applyGain, GainStage, percentToLinear } from './gain'
import { MeterAccumulator } from './meter'
import { sine, whiteNoise } from './testSignals'

const RATE = 48000

function rmsDb(samples: Float32Array, channels: number): number {
  const meter = new MeterAccumulator(channels)
  meter.add(samples)
  return meter.take().rmsDb[0]
}

describe('percentToLinear', () => {
  it('maps the slider ends and the centre', () => {
    expect(percentToLinear(0)).toBe(0)
    expect(percentToLinear(100)).toBe(1)
    expect(percentToLinear(200)).toBe(2)
  })
})

describe('applyGain', () => {
  const signal = whiteNoise(7, 0.5, 0.1, RATE, 2)

  it('leaves the signal as it is at 100 %', () => {
    const one = percentToLinear(100)
    expect(applyGain(signal, 2, one, one)).toEqual(signal)
  })

  it('adds 6.02 dB at 200 %', () => {
    const two = percentToLinear(200)
    const tone = sine(1000, 0.25, 0.1, RATE, 2)
    expect(rmsDb(applyGain(tone, 2, two, two), 2) - rmsDb(tone, 2)).toBeCloseTo(6.02, 2)
  })

  it('silences at 0 %', () => {
    const zero = percentToLinear(0)
    expect(applyGain(signal, 2, zero, zero).every((value) => value === 0)).toBe(true)
  })

  it('does not change the input', () => {
    const copy = signal.slice()
    applyGain(signal, 2, 1, 2)
    expect(signal).toEqual(copy)
  })

  it('ramps a change across the block without jumps', () => {
    // A constant 1 makes the output the gain itself, frame by frame.
    const ones = new Float32Array(480 * 2).fill(1)
    const out = applyGain(ones, 2, 0, 2)
    const maxStep = 2 / 480
    for (let i = 2; i < out.length; i += 2) {
      expect(out[i] - out[i - 2]).toBeCloseTo(maxStep, 6)
      expect(out[i + 1]).toBe(out[i])
    }
    expect(out[out.length - 1]).toBeCloseTo(2, 6)
  })
})

describe('GainStage', () => {
  it('ramps from where the previous block ended', () => {
    const stage = new GainStage(1)
    const ones = new Float32Array(100).fill(1)
    expect(stage.process(ones, 1)[99]).toBeCloseTo(1, 6)

    stage.set(0.5)
    const ramped = stage.process(ones, 1)
    expect(ramped[0]).toBeCloseTo(1 - 0.5 / 100, 6)
    expect(ramped[99]).toBeCloseTo(0.5, 6)

    expect(stage.process(ones, 1).every((value) => Math.abs(value - 0.5) < 1e-6)).toBe(true)
  })
})
