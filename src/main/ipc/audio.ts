/** Devices, source, level, monitoring, recording session and opening recordings. */

import { mkdirSync } from 'fs'
import { BrowserWindow, shell } from 'electron'
import { openFolder } from '../files/explorer'
import { recordingsFolder } from '../files/naming'
import { history } from '../history'
import { logger } from '../log'
import { settings } from '../settings'
import { audioEngine } from '../audio/engine/SidecarAudioEngine'
import { initMonitor, refreshMonitor, setMonitorLevel } from '../audio/monitor'
import { initSession, startRecording } from '../audio/appSession'
import { broadcast, handle } from './typed'

async function open(path: string): Promise<void> {
  // `openPath` resolves with an error message instead of rejecting.
  const error = await shell.openPath(path)
  if (error) {
    logger.warn(`could not open ${path}: ${error}`)
    broadcast('notice', { level: 'error', message: `Could not open ${path}: ${error}` })
  }
}

/** Logs and shows why the Explorer could not open `path`. */
function explorerFailed(path: string): (message: string) => void {
  return (message) => {
    logger.warn(`could not open ${path}: ${message}`)
    broadcast('notice', { level: 'error', message: `Could not open ${path}: ${message}` })
  }
}

export function registerAudioIpc(): void {
  const session = initSession({
    state: (next) => broadcast('session:state', next),
    notice: (notice) => broadcast('notice', notice)
  })

  initMonitor({
    meter: (frame) => broadcast('meter:frame', frame),
    wave: (frame) => broadcast('wave:frame', frame)
  })

  handle('devices:list', () => audioEngine.listDevices())
  audioEngine.onDevicesChanged((devices) => {
    broadcast('devices:changed', devices)
    refreshMonitor()
  })
  handle('source:get', () => settings.getSource())
  handle('source:set', (source) => {
    settings.setSource(source)
    refreshMonitor()
  })
  handle('level:get', () => settings.getLevel())
  handle('level:set', (percent) => {
    settings.setLevel(percent)
    setMonitorLevel(settings.getLevel())
  })

  handle('session:record', (_, event) =>
    startRecording(BrowserWindow.fromWebContents(event.sender))
  )
  handle('session:pause', () => session.togglePause())
  handle('session:stop', () => session.stop())
  // Split comes with task 27: until then it changes nothing.
  handle('session:split', () => session.snapshot())

  // Only files this app recorded: the renderer cannot open arbitrary paths.
  handle('shell:openPath', async ({ path }) => {
    if (history.has(path)) await open(path)
  })
  handle('shell:openRecordingsFolder', async () => {
    const folder = recordingsFolder(settings.get().files.folder)
    mkdirSync(folder, { recursive: true })
    openFolder(folder, explorerFailed(folder))
  })
}
