/**
 * Date and size columns of the recording list. Pure: no React, no DOM.
 */

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** Local `YYYY-MM-DD` of an epoch in milliseconds. */
export function formatDate(epochMs: number): string {
  const date = new Date(epochMs)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const UNITS = ['B', 'KB', 'MB', 'GB']

/** Whole units below 10 get one decimal: `850KB`, `4.2MB`, `12MB`. */
export function formatSize(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const text = unit > 0 && value < 10 ? value.toFixed(1) : Math.round(value).toString()
  return `${text}${UNITS[unit]}`
}
