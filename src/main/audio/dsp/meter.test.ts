import { describe, expect, it } from 'vitest'
import { METER_FLOOR_DB } from '@shared/defaults'
import { MeterAccumulator, toDbfs } from './meter'
import { silence, sine, whiteNoise } from './testSignals'

const RATE = 48000

function measure(samples: Float32Array, channels: number): ReturnType<MeterAccumulator['take']> {
  const meter = new MeterAccumulator(channels)
  meter.add(samples)
  return meter.take()
}

describe('toDbfs', () => {
  it('clips silence to the floor', () => {
    expect(toDbfs(0)).toBe(METER_FLOOR_DB)
    expect(toDbfs(1e-9)).toBe(METER_FLOOR_DB)
  })
})

describe('MeterAccumulator', () => {
  it('reads a full-scale sine as −3.01 dBFS RMS and 0 dBFS peak', () => {
    // 1 kHz at 48 kHz: 48 samples per period, one of them exactly on the crest.
    const frame = measure(sine(1000, 1, 1, RATE, 2), 2)
    for (const rms of frame.rmsDb) expect(rms).toBeCloseTo(-3.01, 2)
    for (const peak of frame.peakDb) expect(peak).toBeCloseTo(0, 6)
  })

  it('reads silence as the floor', () => {
    expect(measure(silence(0.1, RATE, 2), 2)).toEqual({
      rmsDb: [METER_FLOOR_DB, METER_FLOOR_DB],
      peakDb: [METER_FLOOR_DB, METER_FLOOR_DB]
    })
  })

  it('reads uniform noise as amp/√3 RMS with its peak below amp', () => {
    const frame = measure(whiteNoise(1, 0.5, 1, RATE, 1), 1)
    expect(frame.rmsDb[0]).toBeCloseTo(toDbfs(0.5 / Math.sqrt(3)), 1)
    expect(frame.peakDb[0]).toBeLessThanOrEqual(toDbfs(0.5))
    expect(frame.peakDb[0]).toBeGreaterThan(toDbfs(0.49))
  })

  it('measures each channel on its own', () => {
    const left = sine(1000, 1, 0.1, RATE, 1)
    const stereo = new Float32Array(left.length * 2)
    left.forEach((value, i) => {
      stereo[i * 2] = value
      stereo[i * 2 + 1] = value * 0.5
    })
    const frame = measure(stereo, 2)
    expect(frame.peakDb[0]).toBeCloseTo(0, 6)
    expect(frame.peakDb[1]).toBeCloseTo(-6.02, 2)
    expect(frame.rmsDb[0] - frame.rmsDb[1]).toBeCloseTo(6.02, 2)
  })

  it('adds up several blocks and starts over after take()', () => {
    const meter = new MeterAccumulator(1)
    meter.add(sine(1000, 1, 0.05, RATE, 1))
    meter.add(silence(0.05, RATE, 1))
    // Half the time at −3.01 dB and half silent: 3.01 dB lower.
    expect(meter.take().rmsDb[0]).toBeCloseTo(-6.02, 2)
    expect(meter.take().rmsDb[0]).toBe(METER_FLOOR_DB)
  })
})
