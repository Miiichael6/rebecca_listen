/**
 * Limits how often `fn` runs: the first call goes through at once, later ones
 * within `intervalMs` are folded into a single trailing call with the last
 * value, so the final position of a drag is never lost.
 */
export function throttle<T>(fn: (value: T) => void, intervalMs: number): (value: T) => void {
  let lastRun = -Infinity
  let pending: { value: T } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const run = (value: T): void => {
    lastRun = Date.now()
    fn(value)
  }

  return (value) => {
    const wait = lastRun + intervalMs - Date.now()
    if (wait <= 0 && !timer) {
      run(value)
      return
    }
    pending = { value }
    timer ??= setTimeout(
      () => {
        timer = null
        if (pending) run(pending.value)
        pending = null
      },
      Math.max(0, wait)
    )
  }
}
