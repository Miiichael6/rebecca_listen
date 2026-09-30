import { describe, expect, it } from 'vitest'
import { remapChannels } from './channelMap'

describe('remapChannels', () => {
  it('leaves the samples alone when the count does not change', () => {
    const samples = Float32Array.of(1, 2, 3, 4)
    expect(remapChannels(samples, 2, 2)).toBe(samples)
  })

  it('copies mono to every channel', () => {
    expect(Array.from(remapChannels(Float32Array.of(0.5, -0.25), 1, 2))).toEqual([
      0.5, 0.5, -0.25, -0.25
    ])
  })

  it('averages the channels into mono', () => {
    expect(Array.from(remapChannels(Float32Array.of(1, 0, 0.5, 0.5), 2, 1))).toEqual([0.5, 0.5])
  })

  it('copies the shared channels and leaves the extra ones silent', () => {
    expect(Array.from(remapChannels(Float32Array.of(1, 2), 2, 4))).toEqual([1, 2, 0, 0])
    expect(Array.from(remapChannels(Float32Array.of(1, 2, 3, 4), 4, 2))).toEqual([1, 2])
  })
})
