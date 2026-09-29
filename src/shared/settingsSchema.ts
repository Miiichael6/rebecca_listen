/**
 * Shape and version of `userData/settings.json` (spec §13).
 *
 * There is a single configuration: profiles and the active profile are out of
 * scope, so the file holds one `Settings` object plus the bits of UI state that
 * must survive a restart.
 */

import { DEFAULT_LEVEL_PERCENT, DEFAULT_SETTINGS, DEFAULT_SOURCE } from './defaults'
import type { Settings, SourceSelection } from './types'

/**
 * Bumped every time a migration is added to `src/main/settingsMigrations.ts`.
 * A file without `version` is treated as version 0.
 */
export const SETTINGS_VERSION = 1

/** Position and size of the main window, as Electron reports them. */
export interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

/** The whole contents of `settings.json`. */
export interface StoredSettings {
  version: number
  settings: Settings
  source: SourceSelection
  /** Gain of the Level slider, in percent (see `LEVEL_PERCENT`). */
  level: number
  /** `bounds` is `null` until the window has been moved or resized once. */
  window: { bounds: WindowBounds | null }
}

/** A fresh file: the defaults of `defaults.ts` at the current version. */
export function defaultStoredSettings(): StoredSettings {
  return {
    version: SETTINGS_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    source: structuredClone(DEFAULT_SOURCE),
    level: DEFAULT_LEVEL_PERCENT,
    window: { bounds: null }
  }
}
