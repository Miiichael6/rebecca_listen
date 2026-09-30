/** Devices, source, level, monitoring, recording session and opening recordings. */

import { spawn } from 'child_process'
import { mkdirSync } from 'fs'
import { shell } from 'electron'
import { recordingsFolder } from '../files/naming'
import { history } from '../history'
import { logger } from '../log'
import { settings } from '../settings'
import { audioEngine } from '../audio/engine/SidecarAudioEngine'
import { initMonitor, refreshMonitor, setMonitorLevel } from '../audio/monitor'
import { initSession } from '../audio/appSession'
import { broadcast, handle } from './typed'

async function open(path: string): Promise<void> {
  // `openPath` resolves with an error message instead of rejecting.
  const error = await shell.openPath(path)
  if (error) {
    logger.warn(`could not open ${path}: ${error}`)
    broadcast('notice', { level: 'error', message: `Could not open ${path}: ${error}` })
  }
}

/**
 * Opens a folder in the Explorer. `shell.openPath` goes through the default
 * verb of folders, which some context-menu tools break (a `none` verb gives
 * "application not found"); calling `explorer.exe` does not depend on it.
 */
function openFolder(folder: string): void {
  if (process.platform !== 'win32') {
    void open(folder)
    return
  }
  // The Explorer exits with 1 even when it opened the folder: only a failure to start counts.
  const explorer = spawn('explorer.exe', [folder], { detached: true, stdio: 'ignore' })
  explorer.on('error', (error) => {
    logger.warn(`could not open ${folder}: ${error.message}`)
    broadcast('notice', { level: 'error', message: `Could not open ${folder}: ${error.message}` })
  })
  explorer.unref()
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

  handle('session:record', () => session.record())
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
    openFolder(folder)
  })
}
