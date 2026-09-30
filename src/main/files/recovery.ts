/**
 * Repairs one `.part` with ffmpeg (spec §3.3): the audio is copied into a
 * temporary file, and only once ffmpeg reads a length from it does it take the
 * final name and the `.part` go away. On any failure the `.part` is left
 * exactly as it was.
 */

import { existsSync } from 'fs'
import { rename, rm, stat } from 'fs/promises'
import { basename, dirname, extname } from 'path'
import { probeDurationMs, runFfmpeg } from '../audio/encoder/runFfmpeg'
import { freePath } from './naming'
import { remuxArgs, type UnfinishedRecording } from './partFiles'

/** The repaired copy while ffmpeg writes it: not a `.part`, so a crash here is not repaired again. */
const REPAIRING_SUFFIX = '.repairing'

export interface RecoveredFile {
  path: string
  sizeBytes: number
  durationMs: number
}

export async function repairPart(
  binary: string,
  recording: UnfinishedRecording
): Promise<RecoveredFile> {
  const { partPath, format } = recording
  const { size } = await stat(partPath)
  if (size === 0) throw new Error('the file is empty')

  // Its own `.part` does not count as taking the name.
  const taken = (path: string): boolean => path !== partPath && existsSync(path)
  const path = freePath(dirname(recording.path), baseName(recording.path), format, taken)
  const temp = `${path}${REPAIRING_SUFFIX}`
  let durationMs: number | null
  try {
    await runFfmpeg(binary, remuxArgs(format, partPath, temp))
    durationMs = await probeDurationMs(binary, temp)
    if (!durationMs) throw new Error('no audio could be read from it')
    await rename(temp, path)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
  await rm(partPath)
  const { size: sizeBytes } = await stat(path)
  return { path, sizeBytes, durationMs }
}

function baseName(path: string): string {
  return basename(path, extname(path))
}
