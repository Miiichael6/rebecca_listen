/**
 * Readers for untrusted JSON. `settings.json` is user-writable and survives app
 * updates, so every value read from it goes through one of these: they return a
 * usable value or the fallback, and never throw.
 *
 * Pure logic, no IO: this is what the validation tests exercise.
 */

import type { NumericRange } from '@shared/defaults'

/** A JSON object, the only shape worth walking into. */
export type Raw = Record<string, unknown>

export function isRaw(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads one key without caring whether the parent is an object at all. */
export function rawAt(value: unknown, key: string): unknown {
  return isRaw(value) ? value[key] : undefined
}

export function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function integerOr(value: unknown, fallback: number): number {
  return isFiniteNumber(value) ? Math.round(value) : fallback
}

/** Keeps the value only while it is one of the options the UI offers. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

/** Clips to `min`..`max` and snaps to `step`, so the UI can always show it. */
export function clampToRange(value: unknown, range: NumericRange, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback
  const clipped = clip(value, range.min, range.max)
  const snapped = range.min + Math.round((clipped - range.min) / range.step) * range.step
  return clip(snapped, range.min, range.max)
}

/**
 * Snaps to the closest value of a list of options, which also clips anything
 * above or below the list to its ends: a 96000 sample rate becomes 48000.
 */
export function closestOf<T extends number>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (!isFiniteNumber(value)) return fallback
  return allowed.reduce((best, option) =>
    Math.abs(option - value) < Math.abs(best - value) ? option : best
  )
}

export function clip(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
