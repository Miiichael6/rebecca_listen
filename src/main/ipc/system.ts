/** What the app tells about itself: name, version and its log (System tab of Options). */

import { app, shell } from 'electron'
import { APP_NAME } from '@shared/appInfo'
import { getLogFilePath, logger } from '../log'
import { handle } from './typed'

export function registerSystemIpc(): void {
  handle('app:info', () => ({
    // `productName` of package.json; `app.getName()` returns the `name` field.
    name: APP_NAME,
    version: app.getVersion()
  }))

  handle('shell:openLogFile', async () => {
    const path = getLogFilePath()
    // `openPath` answers with an error message instead of throwing.
    const failure = await shell.openPath(path)
    if (failure) logger.warn(`could not open the log ${path}: ${failure}`)
  })
}
