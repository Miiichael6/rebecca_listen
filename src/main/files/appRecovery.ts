/**
 * The recovery at startup (spec §3.3, §16), wired to the real pieces: the
 * journal in `userData`, the recordings folder of the settings, ffmpeg, the
 * history and the log. Nothing is asked: what can be repaired is, the rest is
 * kept as it is and logged.
 */

import { existsSync, readdirSync } from 'fs'
import { stat } from 'fs/promises'
import { randomUUID } from 'crypto'
import { basename, join } from 'path'
import { app } from 'electron'
import { DEFAULT_SOURCE } from '@shared/defaults'
import type { Notice } from '@shared/types'
import { ffmpegPath } from '../audio/encoder/ffmpegBinary'
import { history } from '../history'
import { logger } from '../log'
import { settings } from '../settings'
import { recordingsFolder } from './naming'
import { OpenRecordings } from './openRecordings'
import {
  isPartFile,
  recoveryNotice,
  unfinishedRecordings,
  type OpenRecording,
  type UnfinishedRecording
} from './partFiles'
import { repairPart } from './recovery'

const JOURNAL_NAME = 'open-recordings.json'

let journal: OpenRecordings | null = null

function openRecordings(): OpenRecordings {
  journal ??= new OpenRecordings(join(app.getPath('userData'), JOURNAL_NAME))
  return journal
}

/** A failure to update the journal is logged: it must never stop a recording. */
function logFailure(action: () => void): void {
  try {
    action()
  } catch (error) {
    logger.warn(`${JOURNAL_NAME}: ${(error as Error).message}`)
  }
}

/** What the recording session calls when a file opens and when it is saved. */
export const recordingJournal = {
  add: (recording: OpenRecording): void => logFailure(() => openRecordings().add(recording)),
  remove: (path: string): void => logFailure(() => openRecordings().remove(path))
}

function scanPartFiles(folder: string): string[] {
  try {
    return readdirSync(folder)
      .filter(isPartFile)
      .map((name) => join(folder, name))
  } catch {
    // No recordings folder yet: nothing was ever recorded there.
    return []
  }
}

/**
 * The `.part` files to repair. Taken before any recording can start, so the
 * `.part` of a new recording is never mistaken for a lost one.
 */
export function findUnfinished(): UnfinishedRecording[] {
  const folder = recordingsFolder(settings.get().files.folder)
  return unfinishedRecordings(openRecordings().list(), scanPartFiles(folder))
}

/** Repairs each one, adds it to the history and tells the user once. */
export async function recoverUnfinished(
  unfinished: UnfinishedRecording[],
  notify: (notice: Notice) => void
): Promise<void> {
  let recovered = 0
  let failed = 0
  for (const recording of unfinished) {
    if (existsSync(recording.partPath)) {
      if (await recoverOne(recording)) recovered += 1
      else failed += 1
    }
    recordingJournal.remove(recording.path)
  }
  const notice = recoveryNotice(recovered, failed)
  if (notice) notify(notice)
}

async function recoverOne(recording: UnfinishedRecording): Promise<boolean> {
  try {
    const createdAt = recording.createdAt ?? (await stat(recording.partPath)).birthtimeMs
    const file = await repairPart(ffmpegPath(), recording)
    history.add({
      id: randomUUID(),
      path: file.path,
      name: basename(file.path),
      format: recording.format,
      durationMs: file.durationMs,
      sizeBytes: file.sizeBytes,
      createdAt,
      source: recording.source ?? DEFAULT_SOURCE
    })
    logger.info(`recovered ${recording.partPath} as ${file.path} (${file.durationMs} ms)`)
    return true
  } catch (error) {
    logger.warn(
      `could not recover ${recording.partPath}, kept as it is: ${(error as Error).message}`
    )
    return false
  }
}
