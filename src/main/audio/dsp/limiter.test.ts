import { describe, expect, it } from 'vitest'
import { softLimit, softLimitInPlace } from './limiter'

describe('softLimit', () => {
  it('lets the quiet samples through untouched', () => {
    for (const sample of [0, 0.3, -0.5, 0.8, -0.8]) expect(softLimit(sample)).toBe(sample)
  })

  it('never goes past full scale, however loud the sum', () => {
    for (const sample of [0.9, 1, 1.5, 2, 10]) {
      expect(softLimit(sample)).toBeLessThanOrEqual(1)
      expect(softLimit(-sample)).toBe(-softLimit(sample))
    }
  })

  it('bends without steps: louder in, louder out', () => {
    let previous = softLimit(0.7)
    for (let sample = 0.701; sample < 2; sample += 0.001) {
      const next = softLimit(sample)
      expect(next).toBeGreaterThan(previous)
      expect(next - previous).toBeLessThanOrEqual(0.0011)
      previous = next
    }
  })

  it('limits a whole block in place', () => {
    const block = Float32Array.of(0.5, 2, -2)
    softLimitInPlace(block)
    expect(block[0]).toBe(0.5)
    expect(Math.max(...block.map(Math.abs))).toBeLessThanOrEqual(1)
  })
})
