/** Registers every IPC handler. Called once, after `app.whenReady()`. */

import { app } from 'electron'
import { APP_NAME } from '@shared/appInfo'
import { registerAudioIpc } from './audio'
import { registerFilesIpc } from './files'
import { registerHistoryIpc } from './history'
import { registerOptionsIpc } from './options'
import { registerRebeccaWritesIpc } from './rebeccaWrites'
import { registerSettingsIpc } from './settings'
import { registerUpdatesIpc } from './updates'
import { handle } from './typed'

export function registerIpc(): void {
  handle('app:info', () => ({
    // `productName` of package.json; `app.getName()` returns the `name` field.
    name: APP_NAME,
    version: app.getVersion()
  }))

  registerSettingsIpc()
  registerOptionsIpc()
  registerAudioIpc()
  registerFilesIpc()
  registerHistoryIpc()
  registerUpdatesIpc()
  registerRebeccaWritesIpc()
}
