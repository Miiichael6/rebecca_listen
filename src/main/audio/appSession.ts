/**
 * The app's one recording session, wired to the real pieces: the monitored
 * stream, ffmpeg, the settings (read when each file opens, so a change of
 * format or folder applies to the next file) and the history.
 */

import { settings } from '../settings'
import { history } from '../history'
import { logger } from '../log'
import { recordingJournal } from '../files/appRecovery'
import { resolveOutputPath } from '../files/naming'
import { FfmpegEncoder } from './encoder/FfmpegEncoder'
import { ffmpegPath } from './encoder/ffmpegBinary'
import type { OutputSettings } from './encoder/Encoder'
import { acquireCapture } from './monitor'
import { RecordingSession, type SessionEmit } from './session'

let session: RecordingSession | null = null

function nextFile(): { path: string; output: OutputSettings } {
  const { folder, format, mp3, wav } = settings.get().files
  const output: OutputSettings = format === 'mp3' ? { format, ...mp3 } : { format, ...wav }
  return { path: resolveOutputPath(folder, new Date(), format), output }
}

export function initSession(emit: SessionEmit): RecordingSession {
  session = new RecordingSession({
    capture: { acquire: acquireCapture },
    createEncoder: () =>
      new FfmpegEncoder({ binary: ffmpegPath(), warn: (message) => logger.warn(message) }),
    nextFile,
    addToHistory: (item) => history.add(item),
    journal: recordingJournal,
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
