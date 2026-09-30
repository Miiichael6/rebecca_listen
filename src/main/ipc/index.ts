/** Registers every IPC handler. Called once, after `app.whenReady()`. */

import { registerAudioIpc } from './audio'
import { registerFilesIpc } from './files'
import { registerHistoryIpc } from './history'
import { registerOptionsIpc } from './options'
import { registerRebeccaWritesIpc } from './rebeccaWrites'
import { registerSettingsIpc } from './settings'
import { registerSystemIpc } from './system'
import { registerUpdatesIpc } from './updates'

export function registerIpc(): void {
  registerSystemIpc()
  registerSettingsIpc()
  registerOptionsIpc()
  registerAudioIpc()
  registerFilesIpc()
  registerHistoryIpc()
  registerUpdatesIpc()
  registerRebeccaWritesIpc()
}
