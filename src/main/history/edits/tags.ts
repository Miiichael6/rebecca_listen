/**
 * Tags of the Tag Editor through ffmpeg: read as an `ffmetadata` text and
 * written by copying the audio into a new file with other tags. Pure.
 */

import type { AudioFormat, AudioTags } from '@shared/types'
import { muxerArgs } from '../../audio/encoder/ffmpegArgs'

/** Name of each tag for ffmpeg, which maps it to ID3 (MP3) or RIFF INFO (WAV). */
const TAG_KEYS: Record<keyof AudioTags, string> = {
  title: 'title',
  artist: 'artist',
  album: 'album',
  year: 'date',
  genre: 'genre',
  comment: 'comment'
}

/** Other names a tag is read under (files tagged by other programs). */
const ALIASES: Record<string, keyof AudioTags> = { year: 'year', description: 'comment' }

export const EMPTY_TAGS: AudioTags = {
  title: '',
  artist: '',
  album: '',
  year: '',
  genre: '',
  comment: ''
}

export function readTagsArgs(path: string): string[] {
  return ['-hide_banner', '-loglevel', 'error', '-i', path, '-f', 'ffmetadata', '-']
}

/**
 * Copies `input` to `output` with `tags` instead of the ones of the Tag
 * Editor; an empty tag is removed, any other tag of the file is kept.
 */
export function writeTagsArgs(
  input: string,
  output: string,
  format: AudioFormat,
  tags: AudioTags
): string[] {
  const entries = Object.entries(TAG_KEYS) as [keyof AudioTags, string][]
  const set = entries.flatMap(([field, key]) => ['-metadata', `${key}=${tags[field].trim()}`])
  return [
    ...['-hide_banner', '-nostats', '-loglevel', 'error', '-y', '-i', input],
    ...['-map', '0', '-c', 'copy', '-map_metadata', '0'],
    ...set,
    ...muxerArgs(format),
    output
  ]
}

/** What `ffmetadata` puts before `=`, `;`, `#`, `\` and a newline inside a value. */
const ESCAPE = '\\'

/** Lines of the text; a newline escaped with `\` stays inside its line. */
function logicalLines(text: string): string[] {
  const lines: string[] = []
  let line = ''
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === ESCAPE && i + 1 < text.length) {
      line += char + text[i + 1]
      i += 1
    } else if (char === '\n') {
      lines.push(line)
      line = ''
    } else if (char !== '\r') {
      line += char
    }
  }
  lines.push(line)
  return lines
}

/** Index of the first `=` not escaped with `\`, or -1. */
function separatorOf(line: string): number {
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === ESCAPE) i += 1
    else if (line[i] === '=') return i
  }
  return -1
}

const unescape = (value: string): string => value.replace(/\\([\s\S])/g, '$1')

/** Tags of an `ffmetadata` text; only the part before the first `[SECTION]` is the file's. */
export function parseTags(text: string): AudioTags {
  const tags = { ...EMPTY_TAGS }
  const fields = new Map<string, keyof AudioTags>(
    (Object.entries(TAG_KEYS) as [keyof AudioTags, string][]).map(([field, key]) => [key, field])
  )
  for (const line of logicalLines(text)) {
    if (line.startsWith('[')) break
    if (line.startsWith(';') || line.startsWith('#')) continue
    const at = separatorOf(line)
    if (at <= 0) continue
    const key = unescape(line.slice(0, at)).toLowerCase()
    const field = fields.get(key) ?? ALIASES[key]
    if (field && !tags[field]) tags[field] = unescape(line.slice(at + 1))
  }
  return tags
}
