/**
 * The app's one recording session, wired to the real pieces: the monitored
 * stream, ffmpeg, the settings (read when each file opens, so a change of
 * format or folder applies to the next file) and the history.
 */

import { settings } from '../settings'
import { history } from '../history'
import { logger } from '../log'
import { recordingJournal } from '../files/appRecovery'
import type { BrowserWindow } from 'electron'
import type { SessionSnapshot } from '@shared/types'
import { resolveOutputPath } from '../files/naming'
import { askRecordingPath } from '../files/saveAs'
import { createRebeccaWritesLink } from '../rebeccaWrites/liveLink'
import { FfmpegEncoder } from './encoder/FfmpegEncoder'
import { ffmpegPath } from './encoder/ffmpegBinary'
import type { OutputSettings } from './encoder/Encoder'
import { acquireCapture } from './monitor'
import { RecordingSession, type SessionEmit } from './session'

let session: RecordingSession | null = null
/** Path typed in "Save as" for the recording about to start; used once. */
let chosenPath: string | null = null

/** A split while recording gets an automatic name too, even after "Save as". */
function nextFile(busy: readonly string[]): { path: string; output: OutputSettings } {
  const files = settings.get().files
  const { format, mp3, wav } = files
  const output: OutputSettings = format === 'mp3' ? { format, ...mp3 } : { format, ...wav }
  const path = chosenPath ?? resolveOutputPath(files, new Date(), busy)
  chosenPath = null
  return { path, output }
}

/**
 * Starts a recording. With Auto Name off the file name is asked first, and
 * cancelling the dialog records nothing.
 */
export async function startRecording(parent: BrowserWindow | null): Promise<SessionSnapshot> {
  if (!session) throw new Error('recording started before initSession()')
  const files = settings.get().files
  if (!files.autoName && !session.isActive()) {
    const path = await askRecordingPath(parent, files)
    if (!path) return session.snapshot()
    chosenPath = path
  }
  return session.record()
}

export function initSession(emit: SessionEmit): RecordingSession {
  session = new RecordingSession({
    capture: { acquire: acquireCapture },
    createEncoder: () =>
      new FfmpegEncoder({ binary: ffmpegPath(), warn: (message) => logger.warn(message) }),
    nextFile,
    addToHistory: (item) => history.add(item),
    journal: recordingJournal,
    live: createRebeccaWritesLink({
      warn: (message) => {
        logger.warn(message)
        emit.notice({ level: 'warn', message })
      },
      info: (message) => logger.info(message)
    }),
    emit,
    log: { info: (message) => logger.info(message), warn: (message) => logger.warn(message) }
  })
  return session
}

export function isRecording(): boolean {
  return session?.isActive() ?? false
}

/** Finishes the file in progress, if any (before quitting). */
export async function stopRecording(): Promise<void> {
  await session?.stop()
}
