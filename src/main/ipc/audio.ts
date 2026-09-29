/** Devices, source, recording session, the list of recordings and opening them. */

import { mkdirSync } from 'fs'
import { shell } from 'electron'
import { recordingsFolder } from '../files/naming'
import { history } from '../history'
import { logger } from '../log'
import { settings } from '../settings'
import { audioEngine } from '../audio/engine/SidecarAudioEngine'
import { initSession, record, snapshot, stop } from '../audio/session'
import { broadcast, handle } from './typed'

async function open(path: string): Promise<void> {
  // `openPath` resolves with an error message instead of rejecting.
  const error = await shell.openPath(path)
  if (error) {
    logger.warn(`could not open ${path}: ${error}`)
    broadcast('notice', { level: 'error', message: `Could not open ${path}: ${error}` })
  }
}

export function registerAudioIpc(): void {
  initSession({
    state: (next) => broadcast('session:state', next),
    notice: (notice) => broadcast('notice', notice)
  })

  handle('devices:list', () => audioEngine.listDevices())
  handle('source:get', () => settings.getSource())
  handle('source:set', (source) => settings.setSource(source))

  handle('session:record', () => record())
  handle('session:stop', () => stop())
  // Pause and Split come with tasks 13 and 27: until then they change nothing.
  handle('session:pause', () => snapshot())
  handle('session:split', () => snapshot())

  handle('history:list', () => history.list())
  history.onChange((items) => broadcast('history:changed', items))

  // Only files this app recorded: the renderer cannot open arbitrary paths.
  handle('shell:openPath', async ({ path }) => {
    if (history.has(path)) await open(path)
  })
  handle('shell:openRecordingsFolder', async () => {
    const folder = recordingsFolder(settings.get().files.folder)
    mkdirSync(folder, { recursive: true })
    await open(folder)
  })
}
