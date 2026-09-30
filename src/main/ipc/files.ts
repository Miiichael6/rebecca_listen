/**
 * The recordings folder: which one is in use and the picker that changes it.
 * A folder is only saved once a file could be created in it, so a recording
 * never starts towards a folder it cannot write. A recording in progress
 * keeps its file; the new folder applies from the next one.
 */

import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import { checkWritableFolder, plannedPath, recordingsFolder } from '../files/naming'
import { logger } from '../log'
import { settings } from '../settings'
import { broadcast, handle } from './typed'

const currentFolder = (): string => recordingsFolder(settings.get().files.folder)

async function pickFolder(event: IpcMainInvokeEvent): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender)
  const options = {
    title: 'Save recordings in',
    defaultPath: currentFolder(),
    properties: ['openDirectory' as const, 'createDirectory' as const]
  }
  const { canceled, filePaths } = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  return canceled ? null : (filePaths[0] ?? null)
}

/** A picked folder a file can be created in; the refusal is shown as a notice. */
async function pickWritableFolder(event: IpcMainInvokeEvent): Promise<string | null> {
  const folder = await pickFolder(event)
  if (!folder) return null
  try {
    checkWritableFolder(folder)
    return folder
  } catch (error) {
    const message = (error as Error).message
    logger.warn(message)
    broadcast('notice', { level: 'error', message })
    return null
  }
}

async function chooseFolder(event: IpcMainInvokeEvent): Promise<string | null> {
  const folder = await pickWritableFolder(event)
  if (!folder) return null
  settings.update({ section: 'files', patch: { folder } })
  logger.info(`recordings folder: ${folder}`)
  broadcast('notice', { level: 'info', message: `Recordings will be saved in ${folder}` })
  return folder
}

export function registerFilesIpc(): void {
  handle('files:getFolder', () => currentFolder())
  handle('files:chooseFolder', (_, event) => chooseFolder(event))
  handle('files:pickFolder', (_, event) => pickWritableFolder(event))
  handle('files:previewPath', (files) => plannedPath(files, new Date()))
}
