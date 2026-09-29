import { describe, expect, it } from 'vitest'
import { LOOPBACK_GAP_MS } from '@shared/defaults'
import { addSilence, silenceBefore, type Timeline } from './silence'

const RATE = 1000 // one frame per millisecond keeps the numbers readable

function timeline(partial: Partial<Timeline>): Timeline {
  const empty = { sampleRate: RATE, startMs: 0, lastArrivalMs: 0, framesWritten: 0 }
  return { ...empty, gaps: 0, silenceFrames: 0, ...partial }
}

describe('silenceBefore', () => {
  it('adds nothing while blocks keep arriving', () => {
    expect(silenceBefore(timeline({ lastArrivalMs: 990, framesWritten: 900 }), 1000, 10)).toBe(0)
  })

  it('fills a pause in the deliveries up to the new block', () => {
    // 1 s written, then 3 s of nothing, then a 10 ms block.
    const t = timeline({ lastArrivalMs: 1000, framesWritten: 1000 })
    expect(silenceBefore(t, 4000, 10)).toBe(2990)
  })

  it('fills the start when the first block comes late', () => {
    expect(silenceBefore(timeline({}), 2000, 10)).toBe(1990)
  })

  it('fills the tail at stop', () => {
    const t = timeline({ lastArrivalMs: 1000, framesWritten: 1000 })
    expect(silenceBefore(t, 1000 + LOOPBACK_GAP_MS + 500, 0)).toBe(LOOPBACK_GAP_MS + 500)
  })

  it('never goes negative when the device runs ahead of the clock', () => {
    const t = timeline({ lastArrivalMs: 1000, framesWritten: 5000 })
    expect(silenceBefore(t, 2000, 10)).toBe(0)
  })
})

describe('addSilence', () => {
  it('counts each filled pause and its frames', () => {
    const t = timeline({ framesWritten: 100 })
    addSilence(t, 50)
    addSilence(t, 0)
    addSilence(t, 25)
    expect(t).toMatchObject({ framesWritten: 175, gaps: 2, silenceFrames: 75 })
  })
})
