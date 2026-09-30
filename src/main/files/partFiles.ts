/**
 * What to do with the `.part` files a crash leaves behind (spec §3.3). Pure:
 * no process, no file system. `recovery.ts` runs the plan.
 */

import { extname, resolve } from 'path'
import { AUDIO_FORMATS } from '@shared/defaults'
import type { AudioFormat, Notice, SourceSelection } from '@shared/types'
import { PART_SUFFIX } from '../audio/encoder/Encoder'

/** A recording that was being written, as `openRecordings` remembers it. */
export interface OpenRecording {
  /** The final name; the file on disk is `<path>.part`. */
  path: string
  /** Epoch milliseconds. */
  createdAt: number
  source: SourceSelection
}

/** A `.part` to repair, with what is known of its recording. */
export interface UnfinishedRecording {
  path: string
  partPath: string
  format: AudioFormat
  /** Only for the ones the journal knows; a scanned `.part` has none. */
  createdAt?: number
  source?: SourceSelection
}

export function isPartFile(name: string): boolean {
  return name.endsWith(PART_SUFFIX)
}

/** `a.mp3.part` → `a.mp3`. */
export function finalPathOf(partPath: string): string {
  return partPath.slice(0, -PART_SUFFIX.length)
}

/** The format its final name says, or `null` for a `.part` that is not ours. */
export function formatOf(path: string): AudioFormat | null {
  const extension = extname(path).slice(1).toLowerCase()
  return AUDIO_FORMATS.find((format) => format === extension) ?? null
}

/**
 * The recordings of the journal plus the `.part` files found in the folder,
 * each once. Files of another format are left out.
 */
export function unfinishedRecordings(
  journal: OpenRecording[],
  scannedPartPaths: string[]
): UnfinishedRecording[] {
  const byPath = new Map<string, UnfinishedRecording>()
  const addPath = (path: string, known?: OpenRecording): void => {
    const format = formatOf(path)
    const key = resolve(path).toLowerCase()
    if (!format || byPath.has(key)) return
    byPath.set(key, { path, partPath: `${path}${PART_SUFFIX}`, format, ...pick(known) })
  }
  journal.forEach((entry) => addPath(entry.path, entry))
  scannedPartPaths.forEach((partPath) => addPath(finalPathOf(partPath)))
  return [...byPath.values()]
}

function pick(known?: OpenRecording): Pick<UnfinishedRecording, 'createdAt' | 'source'> {
  return known ? { createdAt: known.createdAt, source: known.source } : {}
}

/** The input options that let ffmpeg read each format cut short. */
const READ_UNFINISHED: Record<AudioFormat, string[]> = {
  // The frames after the last whole one are dropped instead of failing.
  mp3: ['-err_detect', 'ignore_err'],
  // The RIFF and data sizes were never written: read up to the end of the file.
  wav: ['-ignore_length', '1']
}

/**
 * Copies the audio of a `.part` into a new file with a proper header (WAV
 * sizes, MP3 Xing frame), without re-encoding it.
 */
export function remuxArgs(format: AudioFormat, partPath: string, outPath: string): string[] {
  // Each format's demuxer and muxer are named like it: `-f mp3`, `-f wav`.
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    format,
    ...READ_UNFINISHED[format],
    '-i',
    partPath,
    '-c',
    'copy',
    '-f',
    format,
    '-y',
    outPath
  ]
}

const plural = (count: number): string => `${count} unfinished recording${count === 1 ? '' : 's'}`

/** What the user is told after the recovery at startup; `null` when there was nothing to do. */
export function recoveryNotice(recovered: number, failed: number): Notice | null {
  const kept = `could not be repaired and ${failed === 1 ? 'was' : 'were'} kept as .part (see the log)`
  if (failed === 0)
    return recovered ? { level: 'info', message: `Recovered ${plural(recovered)}` } : null
  const message = recovered
    ? `Recovered ${plural(recovered)}; ${failed} ${kept}`
    : `${plural(failed)} ${kept}`
  return { level: 'warn', message }
}
