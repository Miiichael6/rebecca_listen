import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from './throttle'

describe('throttle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the first call at once and folds the rest into one trailing call', () => {
    const fn = vi.fn()
    const send = throttle(fn, 30)
    send(1)
    send(2)
    send(3)
    expect(fn.mock.calls).toEqual([[1]])
    vi.advanceTimersByTime(30)
    expect(fn.mock.calls).toEqual([[1], [3]])
  })

  it('runs at once again after a quiet interval', () => {
    const fn = vi.fn()
    const send = throttle(fn, 30)
    send(1)
    vi.advanceTimersByTime(100)
    send(2)
    expect(fn.mock.calls).toEqual([[1], [2]])
  })
})
