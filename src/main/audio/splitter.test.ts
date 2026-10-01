import { describe, expect, it } from 'vitest'
import { splitBlock } from './splitter'

/** Sample i = i, so any lost or repeated sample shows. */
const ramp = (length: number): Float32Array => Float32Array.from({ length }, (_, i) => i)

describe('splitBlock', () => {
  it('puts the whole block after a cut at frame 0', () => {
    const [before, after] = splitBlock(ramp(8), 1, 0)
    expect([...before]).toEqual([])
    expect([...after]).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('puts the whole block before a cut at its last frame', () => {
    const [before, after] = splitBlock(ramp(8), 1, 8)
    expect([...before]).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect([...after]).toEqual([])
  })

  it('cuts in the middle without losing or repeating a sample', () => {
    const [before, after] = splitBlock(ramp(8), 1, 3)
    expect([...before]).toEqual([0, 1, 2])
    expect([...after]).toEqual([3, 4, 5, 6, 7])
  })

  it('cuts stereo between frames, never between the channels of one frame', () => {
    const [before, after] = splitBlock(ramp(8), 2, 1)
    expect([...before]).toEqual([0, 1])
    expect([...after]).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('clamps a frame outside the block', () => {
    expect(splitBlock(ramp(4), 2, -3)[0]).toHaveLength(0)
    expect(splitBlock(ramp(4), 2, 99)[1]).toHaveLength(0)
  })
})
