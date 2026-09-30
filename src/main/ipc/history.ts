/**
 * The list of recordings: rename, duplicate, remove, clear, delete to the
 * Recycle Bin, add a file from disk, convert, merge and edit tags. Only files of the list are touched:
 * the renderer names recordings by id, never by path.
 */

import { BrowserWindow, dialog, shell, type IpcMainInvokeEvent } from 'electron'
import { AUDIO_FORMATS } from '@shared/defaults'
import type { AudioFormat, HistoryItem } from '@shared/types'
import { ffmpegPath } from '../audio/encoder/ffmpegBinary'
import { probeDurationMs } from '../audio/encoder/runFfmpeg'
import { history } from '../history'
import { convert, mergeAll, readTags, writeTags, type AudioEditTools } from '../history/audioEdits'
import { describeAudioFile } from '../history/audioFile'
import { logger } from '../log'
import { settings } from '../settings'
import { broadcast, handle } from './typed'

/** Logs a failed action and shows it to the user. */
function report(action: string, subject: string, error: unknown): void {
  const message = (error as Error).message
  logger.warn(`could not ${action} ${subject}: ${message}`)
  broadcast('notice', { level: 'error', message: `Could not ${action}: ${message}` })
}

/** Runs a change of the list; a failure becomes a notice and leaves the list as it was. */
async function attempt(
  action: string,
  subject: string,
  run: () => unknown
): Promise<HistoryItem[]> {
  try {
    await run()
  } catch (error) {
    report(action, subject, error)
  }
  return history.list()
}

/** What the notices and the log call a file of the list. */
const pathOf = (id: string): string => history.get(id)?.path ?? id

function inform(message: string): void {
  broadcast('notice', { level: 'info', message })
}

function editTools(): AudioEditTools {
  const { mp3, wav } = settings.get().files
  return { ffmpeg: ffmpegPath(), formats: { mp3, wav } }
}

/** Encoding takes a while: the user is told it started and where the file went. */
async function convertFile(id: string, format: AudioFormat): Promise<void> {
  inform(`Converting ${history.get(id)?.name ?? ''} to ${format.toUpperCase()}…`)
  const converted = await convert(editTools(), id, format)
  logger.info(`converted ${pathOf(id)} to ${converted.path}`)
  inform(`Saved ${converted.name}`)
}

async function mergeFiles(format: AudioFormat): Promise<void> {
  inform(`Merging the list into one ${format.toUpperCase()} file…`)
  const merged = await mergeAll(editTools(), format, new Date())
  logger.info(`merged the list into ${merged.path}`)
  inform(`Saved ${merged.name}`)
}

interface Confirmation {
  title: string
  message: string
  detail: string
  confirm: string
}

/** Warning box with the action and Cancel; resolves `true` when the action is chosen. */
async function confirm(event: IpcMainInvokeEvent, question: Confirmation): Promise<boolean> {
  const options = {
    type: 'warning' as const,
    title: question.title,
    message: question.message,
    detail: question.detail,
    buttons: [question.confirm, 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  }
  const window = BrowserWindow.fromWebContents(event.sender)
  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options)
  return response === 0
}

async function deleteFile(event: IpcMainInvokeEvent, id: string): Promise<HistoryItem[]> {
  const item = history.existing(id)
  const confirmed = await confirm(event, {
    title: 'Delete file',
    message: `Delete "${item.name}"?`,
    detail: 'The file is moved to the Recycle Bin.',
    confirm: 'Delete'
  })
  if (!confirmed) return history.list()
  await shell.trashItem(item.path)
  logger.info(`moved to the Recycle Bin: ${item.path}`)
  return history.remove(id)
}

async function clearList(event: IpcMainInvokeEvent): Promise<HistoryItem[]> {
  if (history.list().length === 0) return history.list()
  const confirmed = await confirm(event, {
    title: 'Clear list',
    message: 'Remove every recording from the list?',
    detail: 'The files stay on disk.',
    confirm: 'Clear'
  })
  return confirmed ? history.clear() : history.list()
}

/** File picker; the file joins the list unless it is already there. */
async function importFile(event: IpcMainInvokeEvent): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender)
  const options = {
    title: 'Open audio file',
    properties: ['openFile' as const],
    filters: [{ name: 'Audio', extensions: [...AUDIO_FORMATS] }]
  }
  const { canceled, filePaths } = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  const [path] = filePaths
  if (canceled || !path) return null

  const listed = history.findByPath(path)
  if (listed) return listed.id
  try {
    const item = await describeAudioFile(path, (file) => probeDurationMs(ffmpegPath(), file))
    history.add(item)
    logger.info(`added to the list: ${path}`)
    return item.id
  } catch (error) {
    report('open', path, error)
    return null
  }
}

export function registerHistoryIpc(): void {
  handle('history:list', () => history.list())
  history.onChange((items) => broadcast('history:changed', items))

  handle('history:rename', ({ id, name }) =>
    attempt('rename', pathOf(id), () => history.rename(id, name))
  )
  handle('history:duplicate', ({ id }) =>
    attempt('duplicate', pathOf(id), () => history.duplicate(id))
  )
  handle('history:remove', ({ id }) => history.remove(id))
  handle('history:clear', (_, event) => clearList(event))
  handle('history:delete', ({ id }, event) =>
    attempt('delete', pathOf(id), () => deleteFile(event, id))
  )
  handle('history:import', (_, event) => importFile(event))
  handle('history:convert', ({ id, format }) =>
    attempt('convert', pathOf(id), () => convertFile(id, format))
  )
  handle('history:merge', ({ format }) => attempt('merge', 'the list', () => mergeFiles(format)))
  handle('history:readTags', async ({ id }) => {
    try {
      return await readTags(ffmpegPath(), id)
    } catch (error) {
      report('read the tags of', pathOf(id), error)
      return null
    }
  })
  handle('history:writeTags', ({ id, tags }) =>
    attempt('save the tags of', pathOf(id), () => writeTags(ffmpegPath(), id, tags))
  )

  handle('shell:showItemInFolder', ({ path }) => {
    if (history.has(path)) shell.showItemInFolder(path)
  })
}
