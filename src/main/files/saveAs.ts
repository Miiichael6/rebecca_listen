/**
 * "Save as" before recording (spec §9.1), used while Auto Name is off: the
 * dialog starts on the name Auto Name would have given.
 */

import { dialog, type BrowserWindow } from 'electron'
import type { FilesSettings } from '@shared/types'
import { plannedPath, withExtension } from './naming'

const FORMAT_NAMES: Record<FilesSettings['format'], string> = {
  mp3: 'MP3 audio',
  wav: 'WAV audio'
}

/** The path typed by the user, or `null` when the dialog was cancelled. */
export async function askRecordingPath(
  parent: BrowserWindow | null,
  files: FilesSettings
): Promise<string | null> {
  const options = {
    title: 'Save recording as',
    defaultPath: plannedPath(files, new Date()),
    filters: [{ name: FORMAT_NAMES[files.format], extensions: [files.format] }]
  }
  const { canceled, filePath } = parent
    ? await dialog.showSaveDialog(parent, options)
    : await dialog.showSaveDialog(options)
  return canceled || !filePath ? null : withExtension(filePath, files.format)
}
