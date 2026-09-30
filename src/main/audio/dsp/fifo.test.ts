import { describe, expect, it } from 'vitest'
import { SampleFifo } from './fifo'

const ramp = (from: number, frames: number, channels = 2): Float32Array =>
  Float32Array.from({ length: frames * channels }, (_, i) => from + Math.floor(i / channels))

describe('SampleFifo', () => {
  it('hands the frames back in order across the end of the ring', () => {
    const fifo = new SampleFifo(2, 5)
    fifo.write(ramp(0, 4))
    const out = new Float32Array(3 * 2)
    fifo.read(out)
    fifo.write(ramp(4, 3))
    expect(fifo.frames).toBe(4)
    const rest = new Float32Array(4 * 2)
    expect(fifo.read(rest)).toBe(0)
    expect(Array.from(rest)).toEqual(Array.from(ramp(3, 4)))
  })

  it('fills with zeros what it does not have and says how much', () => {
    const fifo = new SampleFifo(2, 8)
    fifo.write(ramp(1, 2))
    const out = new Float32Array(5 * 2).fill(9)
    expect(fifo.read(out)).toBe(3)
    expect(Array.from(out)).toEqual([1, 1, 2, 2, 0, 0, 0, 0, 0, 0])
    expect(fifo.frames).toBe(0)
  })

  it('drops the oldest frames when full', () => {
    const fifo = new SampleFifo(1, 4)
    fifo.write(ramp(0, 3, 1))
    expect(fifo.write(ramp(3, 3, 1))).toBe(2)
    const out = new Float32Array(4)
    fifo.read(out)
    expect(Array.from(out)).toEqual([2, 3, 4, 5])
  })

  it('keeps only the newest frames of a block bigger than itself', () => {
    const fifo = new SampleFifo(1, 3)
    fifo.write(ramp(0, 2, 1))
    expect(fifo.write(ramp(2, 5, 1))).toBe(4)
    const out = new Float32Array(3)
    fifo.read(out)
    expect(Array.from(out)).toEqual([4, 5, 6])
  })
})
