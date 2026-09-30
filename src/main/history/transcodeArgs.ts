/**
 * ffmpeg command lines of Convert to and Merge all to one. Pure: no process,
 * no file system. Both refuse to overwrite a file (`-n`).
 */

import { MERGE_CHANNEL_LAYOUT, MERGE_SAMPLE_RATE } from '@shared/defaults'
import type { AudioFormat } from '@shared/types'
import type { FormatSettings } from '../audio/encoder/Encoder'
import { fileCodecArgs, muxerArgs } from '../audio/encoder/ffmpegArgs'

const QUIET = ['-hide_banner', '-nostats', '-loglevel', 'error']

/** What every input is brought to before joining: the files may differ in rate and channels. */
const MERGE_FORMAT = `aformat=sample_fmts=fltp:sample_rates=${MERGE_SAMPLE_RATE}:channel_layouts=${MERGE_CHANNEL_LAYOUT}`

export function convertArgs(
  input: string,
  output: string,
  format: AudioFormat,
  settings: FormatSettings
): string[] {
  return [
    ...QUIET,
    '-n',
    '-i',
    input,
    // Only the audio (and the tags): cover art of an MP3 does not fit in a WAV.
    ...['-map', '0:a:0', '-map_metadata', '0'],
    ...fileCodecArgs(format, settings),
    ...muxerArgs(format),
    output
  ]
}

/** The files one after another, in the order given, as one new file without tags. */
export function mergeArgs(
  inputs: string[],
  output: string,
  format: AudioFormat,
  settings: FormatSettings
): string[] {
  const steps = inputs.map((_, index) => `[${index}:a:0]${MERGE_FORMAT}[a${index}]`)
  const joined = inputs.map((_, index) => `[a${index}]`).join('')
  const filter = [...steps, `${joined}concat=n=${inputs.length}:v=0:a=1[out]`].join(';')
  return [
    ...QUIET,
    '-n',
    ...inputs.flatMap((input) => ['-i', input]),
    ...['-filter_complex', filter, '-map', '[out]', '-map_metadata', '-1'],
    ...fileCodecArgs(format, settings),
    ...muxerArgs(format),
    output
  ]
}
