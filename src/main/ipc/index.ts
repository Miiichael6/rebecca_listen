/** Registers every IPC handler. Called once, after `app.whenReady()`. */

import { app } from 'electron'
import { APP_NAME } from '@shared/appInfo'
import { handle } from './typed'

export function registerIpc(): void {
  handle('app:info', () => ({
    // `productName` of package.json; `app.getName()` returns the `name` field.
    name: APP_NAME,
    version: app.getVersion()
  }))
}
