/**
 * The single configuration of the app (spec §13). Profiles are out of scope, so
 * there is one `Settings` object, kept in memory and written to
 * `userData/settings.json` on every change.
 *
 * Other modules of main read it through `settings` and react through
 * `settings.onChange`; the renderer reaches it over the `settings:*` channels.
 */

import { DEFAULT_SETTINGS, LEVEL_PERCENT } from '@shared/defaults'
import { SETTINGS_VERSION, type StoredSettings, type WindowBounds } from '@shared/settingsSchema'
import type { Settings, SettingsUpdate, SourceSelection, UiState } from '@shared/types'
import { logger } from '../log'
import { clampToRange } from './coerce'
import { openSettingsFile, type SettingsFile } from './file'
import { migrate } from './migrations'
import { applyUpdate } from './patch'
import { validateSettings, validateUiState } from './validate'

type ChangeListener = (settings: Settings) => void

let file: SettingsFile | null = null
let stored: StoredSettings | null = null
const listeners = new Set<ChangeListener>()

function state(): StoredSettings {
  if (!stored) throw new Error('settings read before initSettings()')
  return stored
}

function persist(): void {
  if (!file || !stored) return
  file.write(stored)
}

/** Persists and lets the rest of main (and the renderer) know. */
function commit(next: StoredSettings): Settings {
  stored = next
  persist()
  for (const listener of listeners) listener(next.settings)
  return next.settings
}

/**
 * Loads the file, migrating and repairing it. Call once after `app.whenReady()`
 * and before registering the IPC handlers.
 */
export function initSettings(): void {
  file = openSettingsFile()
  const raw = file.read()
  stored = migrate(raw)

  // Rewrite when the file was missing, corrupt, outdated or incomplete, so the
  // repair lands on disk instead of living only in memory.
  if (JSON.stringify(raw) !== JSON.stringify(stored)) {
    persist()
    logger.info(`settings rebuilt at v${SETTINGS_VERSION}: ${file.path}`)
  } else {
    logger.info(`settings loaded from ${file.path}`)
  }
}

function get(): Settings {
  return state().settings
}

/** Patches one section, clips the result and returns it as it was stored. */
function update(change: SettingsUpdate): Settings {
  const current = state()
  const patched = applyUpdate(current.settings, change)
  return commit({ ...current, settings: validateSettings(patched, current.settings) })
}

/** Back to the defaults of §9 and §10; source, level and geometry are kept. */
function reset(): Settings {
  return commit({ ...state(), settings: structuredClone(DEFAULT_SETTINGS) })
}

function getSource(): SourceSelection {
  return state().source
}

function setSource(source: SourceSelection): void {
  stored = { ...state(), source }
  persist()
}

function getLevel(): number {
  return state().level
}

function setLevel(percent: number): void {
  stored = { ...state(), level: clampToRange(percent, LEVEL_PERCENT, state().level) }
  persist()
}

function getUi(): UiState {
  return state().ui
}

function setUi(patch: Partial<UiState>): UiState {
  const current = state()
  stored = { ...current, ui: validateUiState({ ...current.ui, ...patch }, current.ui) }
  persist()
  return stored.ui
}

function getWindowBounds(): WindowBounds | null {
  return state().window.bounds
}

function setWindowBounds(bounds: WindowBounds): void {
  stored = { ...state(), window: { bounds } }
  persist()
}

/** Subscribes to `Settings` changes and returns the unsubscribe function. */
function onChange(listener: ChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const settings = {
  get,
  update,
  reset,
  getSource,
  setSource,
  getLevel,
  setLevel,
  getUi,
  setUi,
  getWindowBounds,
  setWindowBounds,
  onChange
}
