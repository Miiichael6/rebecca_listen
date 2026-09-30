/** An audio file from disk ("Open audio file…") described as an item of the list. */

import { randomUUID } from 'crypto'
import { stat } from 'fs/promises'
import { basename, extname } from 'path'
import { AUDIO_FORMATS } from '@shared/defaults'
import type { AudioFormat, NewHistoryItem } from '@shared/types'

/** Length of a file in ms, `null` when it has no audio that can be read. */
export type ProbeDuration = (path: string) => Promise<number | null>

/** `mp3` or `wav` from the extension; `null` for anything else. */
export function formatOfPath(path: string): AudioFormat | null {
  const ext = extname(path).slice(1).toLowerCase()
  return AUDIO_FORMATS.find((format) => format === ext) ?? null
}

/** Throws with a message fit for the user when the file is not audio the app can list. */
export async function describeAudioFile(
  path: string,
  probeDuration: ProbeDuration
): Promise<NewHistoryItem> {
  const format = formatOfPath(path)
  if (!format) throw new Error(`Only ${AUDIO_FORMATS.join(' and ')} files can be opened`)
  const [info, durationMs] = await Promise.all([stat(path), probeDuration(path)])
  if (durationMs === null) throw new Error(`No audio could be read from ${basename(path)}`)
  return {
    id: randomUUID(),
    path,
    name: basename(path),
    format,
    durationMs,
    sizeBytes: info.size,
    createdAt: info.birthtimeMs,
    source: null
  }
}
