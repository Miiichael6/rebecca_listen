/**
 * Disk access for `userData/settings.json` (spec §13) and nothing else: the
 * service above decides *what* to store, this module only reads and writes it.
 */

import Store from 'electron-store'
import type { StoredSettings } from '@shared/settingsSchema'
import type { Raw } from './coerce'

/** Gives the file its name: `settings.json`. */
const STORE_NAME = 'settings'

export interface SettingsFile {
  /** Full path, for the log and for "open the settings folder". */
  path: string
  /** The raw contents; `{}` when the file does not exist. */
  read: () => unknown
  write: (value: StoredSettings) => void
}

/** Opens the file. Call it once, after `app.whenReady()`. */
export function openSettingsFile(): SettingsFile {
  const store = new Store<Raw>({
    // A hand-edited or truncated file is replaced instead of throwing at startup;
    // `migrate()` then rebuilds the contents from the defaults.
    clearInvalidConfig: true,
    name: STORE_NAME
  })

  return {
    path: store.path,
    read: () => store.store,
    write: (value) => {
      store.store = { ...value }
    }
  }
}
