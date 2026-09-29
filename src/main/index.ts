/** App lifecycle: log, settings, IPC and the main window, in that order. */

import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { APP_ID } from '@shared/appInfo'
import { registerIpc } from './ipc'
import { initLog } from './log'
import { initSettings } from './settings'
import { createMainWindow } from './window'

// Before anything else, so an early failure is already in the log file.
initLog()

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_ID)

  // The IPC handlers and the window geometry both read the settings.
  initSettings()
  registerIpc()

  // F12 opens the DevTools in development; CommandOrControl+R is ignored in
  // production. See @electron-toolkit/utils.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
