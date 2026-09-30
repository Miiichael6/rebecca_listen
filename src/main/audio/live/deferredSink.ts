/**
 * A `LiveSink` usable at once while the real one is still starting (finding
 * RebeccaWrites, creating the file). The blocks that arrive meanwhile are kept
 * and handed over in order, so the live audio lines up with the recording
 * instead of missing its first moments.
 *
 * Pure logic, no IO.
 */

import type { LiveSink } from './LiveLink'

export function deferredLiveSink(starting: Promise<LiveSink | null>): LiveSink {
  let waiting: Float32Array[] | null = []
  let sink: LiveSink | null = null

  const ready = starting
    .catch(() => null)
    .then((started) => {
      sink = started
      for (const block of waiting ?? []) sink?.write(block)
      waiting = null
    })

  return {
    write(samples) {
      // Blocks may be reused by the caller: keep a copy.
      if (waiting) waiting.push(samples.slice())
      else sink?.write(samples)
    },
    async end(finalPath) {
      await ready
      await sink?.end(finalPath)
    }
  }
}
