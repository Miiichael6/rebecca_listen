/** Update handlers: state, search, download and install (see `updates/updater.ts`). */

import { checkForUpdates, downloadUpdate, getUpdateStatus, installUpdate } from '../updates/updater'
import { handle } from './typed'

export function registerUpdatesIpc(): void {
  handle('updates:status', () => getUpdateStatus())
  handle('updates:check', () => checkForUpdates())
  handle('updates:download', () => downloadUpdate())
  handle('updates:install', () => installUpdate())
}
