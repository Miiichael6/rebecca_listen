import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startTicker } from './ticker'

describe('startTicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps a fractional interval on average', () => {
    const fn = vi.fn()
    const stop = startTicker(1000 / 30, fn)
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(30)
    stop()
  })

  it('catches up after a late tick', () => {
    // The clock the ticker reads jumps 25 ms during the first tick, as if it took that long.
    let lag = 0
    let calls = 0
    const stop = startTicker(
      10,
      () => {
        calls += 1
        if (calls === 1) lag = 25
      },
      () => Date.now() + lag
    )
    // First tick at 10 ms ends at 35: the ticks of 20 and 30 run at once
    // (Node turns a 0 ms timeout into 1 ms).
    vi.advanceTimersByTime(10)
    expect(calls).toBe(1)
    vi.advanceTimersByTime(2)
    expect(calls).toBe(3)
    // Back on the grid: those two ran at 36 and 37, the tick of 40 is 3 ms later.
    vi.advanceTimersByTime(2)
    expect(calls).toBe(3)
    vi.advanceTimersByTime(1)
    expect(calls).toBe(4)
    stop()
  })

  it('stops', () => {
    const fn = vi.fn()
    const stop = startTicker(10, fn)
    stop()
    vi.advanceTimersByTime(100)
    expect(fn).not.toHaveBeenCalled()
  })
})
