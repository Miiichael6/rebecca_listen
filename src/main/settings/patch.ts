/**
 * Applying a `SettingsUpdate` to the settings already in memory.
 *
 * Pure logic: the caller validates and persists the result.
 */

import type { Settings, SettingsUpdate } from '@shared/types'
import { isRaw, type Raw } from './coerce'

/**
 * Merge limited to plain objects, so a patch on `files.format` does not wipe
 * `files.mp3`. Any other value in the patch replaces the stored one.
 */
function mergeDeep(base: unknown, patch: unknown): unknown {
  if (!isRaw(base) || !isRaw(patch)) return patch
  const merged: Raw = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    // `undefined` means "not in the patch", never "clear this key".
    if (value !== undefined) merged[key] = mergeDeep(merged[key], value)
  }
  return merged
}

/** The settings as the patch leaves them, still to be validated. */
export function applyUpdate(settings: Settings, update: SettingsUpdate): Settings {
  const section = mergeDeep(settings[update.section], update.patch)
  // The computed key keeps its own type only after the cast; `validateSettings()`
  // is what actually guarantees the result is a usable `Settings`.
  return { ...settings, [update.section]: section } as Settings
}
