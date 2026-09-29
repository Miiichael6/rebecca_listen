/** App lifecycle: log, settings, IPC and the main window, in that order. */

import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow } from 'electron'
import { APP_ID } from '@shared/appInfo'
import { watchDevicesWhileVisible } from './audio/deviceWatch'
import { disposeMonitor, monitorWhileVisible } from './audio/monitor'
import { isRecording, stopRecording } from './audio/appSession'
import { audioEngine } from './audio/engine/SidecarAudioEngine'
import { handleMediaProtocol, registerMediaScheme } from './files/mediaProtocol'
import { registerIpc } from './ipc'
import { initLog } from './log'
import { initSettings } from './settings'
import { createMainWindow } from './window'

// Before anything else, so an early failure is already in the log file.
initLog()
registerMediaScheme()

/** Device polling and level monitoring run only while the window can be seen. */
function openMainWindow(): void {
  const window = createMainWindow()
  watchDevicesWhileVisible(window)
  monitorWhileVisible(window)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId(APP_ID)

  // The IPC handlers and the window geometry both read the settings.
  initSettings()
  registerIpc()
  handleMediaProtocol()

  // F12 opens the DevTools in development; CommandOrControl+R is ignored in
  // production. See @electron-toolkit/utils.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  openMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) openMainWindow()
  })
})

// A recording in progress is closed properly before quitting, so the file is
// complete instead of a `.part`.
let finishing = false
app.on('before-quit', (event) => {
  if (!isRecording() || finishing) return
  event.preventDefault()
  finishing = true
  void stopRecording().finally(() => app.quit())
})

app.on('will-quit', () => {
  disposeMonitor()
  audioEngine.dispose()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
