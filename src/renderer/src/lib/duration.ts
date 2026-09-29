/**
 * Duration formatting shared by the timer (§4.4) and the recording list (§4.6).
 * Pure: no React, no DOM.
 */

/** What a row of the list shows while its file is still being recorded (§4.6). */
export const UNKNOWN_DURATION = '--:--'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * `MM:SS`, or `H:MM:SS` once the hour is passed (§4.4). Negative values and
 * fractions of a second are clamped away instead of printing `-1:-1`.
 */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}
