import { describe, expect, it } from 'vitest'
import { WaveBuffer } from './waveBuffer'

describe('WaveBuffer', () => {
  it('reads columns from the newest back', () => {
    const buffer = new WaveBuffer(8)
    buffer.push({ min: [-0.1, -0.2], max: [0.1, 0.2] })
    buffer.push({ min: [-0.3], max: [0.3] })
    expect(buffer.length).toBe(3)
    expect(buffer.column(0)).toEqual({ min: expect.closeTo(-0.3), max: expect.closeTo(0.3) })
    expect(buffer.column(2)).toEqual({ min: expect.closeTo(-0.1), max: expect.closeTo(0.1) })
  })

  it('drops the oldest columns past its capacity', () => {
    const buffer = new WaveBuffer(2)
    buffer.push({ min: [0, 0, 0], max: [0.1, 0.2, 0.3] })
    expect(buffer.length).toBe(2)
    expect(buffer.column(0).max).toBeCloseTo(0.3)
    expect(buffer.column(1).max).toBeCloseTo(0.2)
  })
})
