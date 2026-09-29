/**
 * A repeating timer that holds its average rate. Windows rounds timers to its
 * ~15.6 ms tick, so `setInterval(33)` runs at ~27 per second; here each tick
 * is scheduled against the wall clock, and a late tick makes the next one
 * earlier.
 */

/** Calls `fn` every `intervalMs` on average; returns the stop function. */
export function startTicker(
  intervalMs: number,
  fn: () => void,
  now: () => number = Date.now
): () => void {
  const start = now()
  let count = 0
  let timer: NodeJS.Timeout

  const schedule = (): void => {
    count += 1
    timer = setTimeout(
      () => {
        fn()
        schedule()
      },
      Math.max(0, start + count * intervalMs - now())
    )
  }
  schedule()
  return () => clearTimeout(timer)
}
