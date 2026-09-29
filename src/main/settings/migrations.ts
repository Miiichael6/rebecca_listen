/**
 * Reading `settings.json` across app versions.
 *
 * `migrate()` is the only way the service reads the file: it runs the pending
 * migrations in order and then hands the result to `validate.ts`, so it always
 * returns a complete `StoredSettings` and never throws.
 *
 * Pure logic, no IO: unit tested in `migrations.test.ts`.
 */

import { LEVEL_PERCENT } from '@shared/defaults'
import {
  SETTINGS_VERSION,
  defaultStoredSettings,
  type StoredSettings
} from '@shared/settingsSchema'
import { clampToRange, isRaw, rawAt, type Raw } from './coerce'
import { validateSettings, validateSource, validateWindowBounds } from './validate'

/** One step of the chain: reads the file at `to - 1` and returns it at `to`. */
interface Migration {
  to: number
  run: (raw: Raw) => Raw
}

/**
 * Ordered by `to`, one entry per `SETTINGS_VERSION`. Nothing has to be moved or
 * renamed yet: version 0 (an empty file, or one written before the version field
 * existed) becomes version 1 as it is, because `normalize()` fills the gaps.
 */
const MIGRATIONS: readonly Migration[] = [{ to: 1, run: (raw) => ({ ...raw, version: 1 }) }]

/** A file without a usable version is version 0. */
function readVersion(raw: unknown): number {
  const version = rawAt(raw, 'version')
  return typeof version === 'number' && Number.isFinite(version) ? Math.trunc(version) : 0
}

function normalize(raw: Raw): StoredSettings {
  const fallback = defaultStoredSettings()
  return {
    // A file written by a newer build keeps its own version: that build still
    // recognises it as its own, and this one does not claim to have downgraded it.
    version: Math.max(readVersion(raw), SETTINGS_VERSION),
    settings: validateSettings(raw.settings),
    source: validateSource(raw.source, fallback.source),
    level: clampToRange(raw.level, LEVEL_PERCENT, fallback.level),
    window: { bounds: validateWindowBounds(rawAt(raw.window, 'bounds')) }
  }
}

/** Whatever was read from disk, as usable settings. */
export function migrate(raw: unknown): StoredSettings {
  let current: Raw = isRaw(raw) ? raw : {}
  const from = readVersion(current)
  for (const migration of MIGRATIONS) {
    if (migration.to > from) current = migration.run(current)
  }
  return normalize(current)
}
