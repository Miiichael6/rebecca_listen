/**
 * Convert to, Merge all to one and the Tag Editor: ffmpeg runs on files of
 * the list. A new file joins the list on top; nothing is ever overwritten but
 * the file whose tags are rewritten, and only once ffmpeg has finished.
 */

import { randomUUID } from 'crypto'
import { existsSync, rmSync } from 'fs'
import { rename, stat } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { MERGE_MIN_FILES, MERGED_FILE_PREFIX } from '@shared/defaults'
import { buildBaseName } from '@shared/naming'
import type { AudioTags, AudioFormat, HistoryItem } from '@shared/types'
import type { FormatSettings } from '../../audio/encoder/Encoder'
import { ffmpegStdout, probeDurationMs, runFfmpeg } from '../../audio/encoder/runFfmpeg'
import { firstFreePath, history, withFormat } from '..'
import { parseTags, readTagsArgs, writeTagsArgs } from './tags'
import { convertArgs, mergeArgs } from './transcodeArgs'

/** Where the tags are written before the file is replaced; same extension, so the same muxer. */
const TAGS_TEMP_MARKER = '.tags-tmp'

/** What each edit needs from outside: the ffmpeg binary and the Files settings of now. */
export interface AudioEditTools {
  ffmpeg: string
  formats: FormatSettings
}

/** Runs ffmpeg writing `output`; a half-written file is not left behind. */
async function writeWithFfmpeg(ffmpeg: string, args: string[], output: string): Promise<void> {
  try {
    await runFfmpeg(ffmpeg, args)
  } catch (error) {
    rmSync(output, { force: true })
    throw error
  }
}

/** A copy of the item in `format`, next to it, with the same length, date and tags. */
export async function convert(
  tools: AudioEditTools,
  id: string,
  format: AudioFormat
): Promise<HistoryItem> {
  const item = history.existing(id)
  if (item.format === format) throw new Error(`${item.name} is already ${format.toUpperCase()}`)
  const output = firstFreePath(withFormat(item.path, format))
  await writeWithFfmpeg(tools.ffmpeg, convertArgs(item.path, output, format, tools.formats), output)
  const { size } = await stat(output)
  const converted = { ...item, id: randomUUID(), path: output, name: basename(output), format }
  history.add({ ...converted, sizeBytes: size })
  return { ...converted, sizeBytes: size, exists: true }
}

/** Every file of the list still on disk, oldest first, joined into one new file. */
export async function mergeAll(
  tools: AudioEditTools,
  format: AudioFormat,
  now: Date
): Promise<HistoryItem> {
  const sources = history
    .list()
    .filter((item) => item.exists && existsSync(item.path))
    .reverse()
  const newest = sources[sources.length - 1]
  if (sources.length < MERGE_MIN_FILES || !newest) {
    throw new Error('Merging needs at least two files in the list')
  }
  const name = `${MERGED_FILE_PREFIX}${buildBaseName(now)}.${format}`
  const output = firstFreePath(join(dirname(newest.path), name))
  await writeWithFfmpeg(
    tools.ffmpeg,
    mergeArgs(
      sources.map((item) => item.path),
      output,
      format,
      tools.formats
    ),
    output
  )
  const [{ size }, durationMs] = await Promise.all([
    stat(output),
    probeDurationMs(tools.ffmpeg, output)
  ])
  const merged = {
    id: randomUUID(),
    path: output,
    name: basename(output),
    format,
    durationMs: durationMs ?? sources.reduce((total, item) => total + item.durationMs, 0),
    sizeBytes: size,
    createdAt: now.getTime(),
    source: null
  }
  history.add(merged)
  return { ...merged, exists: true }
}

export async function readTags(ffmpeg: string, id: string): Promise<AudioTags> {
  const item = history.existing(id)
  return parseTags(await ffmpegStdout(ffmpeg, readTagsArgs(item.path)))
}

/** Rewrites the file with other tags: a copy is written, then takes the place of the file. */
export async function writeTags(
  ffmpeg: string,
  id: string,
  tags: AudioTags
): Promise<HistoryItem[]> {
  const item = history.existing(id)
  const temp = `${item.path}${TAGS_TEMP_MARKER}.${item.format}`
  await writeWithFfmpeg(ffmpeg, writeTagsArgs(item.path, temp, item.format, tags), temp)
  try {
    await rename(temp, item.path)
  } catch (error) {
    rmSync(temp, { force: true })
    throw error
  }
  const { size } = await stat(item.path)
  return history.update(id, { sizeBytes: size })
}
