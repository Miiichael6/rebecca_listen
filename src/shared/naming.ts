/**
 * Automatic file names (spec §9.1): `[YYYY-MM-DD][hh-mm-ss].<ext>`, the
 * `DEFAULT_NAMING_TEMPLATE`. Templates and prefix come back with task 22.
 */

import type { AudioFormat } from './types'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** Base name without extension, in local time. */
export function buildBaseName(now: Date): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
  return `[${date}][${time}]`
}

export function buildFileName(now: Date, format: AudioFormat): string {
  return `${buildBaseName(now)}.${format}`
}
