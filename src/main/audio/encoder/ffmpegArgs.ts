/**
 * The ffmpeg command line of an encoding (spec §3.3). Pure: no process, no
 * file system. A new format (§17) is one more entry in `FORMATS`.
 */

import type { AudioFormat, WavBitDepth } from '@shared/types'
import type { FormatSettings, OutputOf, OutputSettings, PcmFormat } from './Encoder'

interface FormatSpec<F extends AudioFormat> {
  /** Muxer name: the `.part` extension tells ffmpeg nothing. */
  muxer: string
  codecArgs: (output: OutputOf<F>) => string[]
}

const WAV_CODECS: Record<WavBitDepth, string> = {
  16: 'pcm_s16le',
  24: 'pcm_s24le',
  32: 'pcm_f32le'
}

const FORMATS: { [F in AudioFormat]: FormatSpec<F> } = {
  mp3: {
    muxer: 'mp3',
    codecArgs: (mp3) => [
      '-c:a',
      'libmp3lame',
      ...(mp3.mode === 'cbr' ? ['-b:a', `${mp3.bitrateKbps}k`] : ['-q:a', String(mp3.quality)])
    ]
  },
  wav: {
    muxer: 'wav',
    codecArgs: (wav) => ['-c:a', WAV_CODECS[wav.bitDepth]]
  }
}

/** ffmpeg's smallest probe: the raw PCM needs none, and probing more delays the start ~1 s. */
const MIN_PROBE_BYTES = '32'

/** The raw PCM the pipeline writes to stdin. */
function inputArgs(input: PcmFormat): string[] {
  return [
    '-probesize',
    MIN_PROBE_BYTES,
    '-analyzeduration',
    '0',
    '-f',
    'f32le',
    '-ar',
    String(input.sampleRate),
    '-ac',
    String(input.channels)
  ]
}

function specOf<F extends AudioFormat>(output: OutputOf<F>): FormatSpec<F> {
  const spec: FormatSpec<F> | undefined = FORMATS[output.format]
  if (!spec) throw new Error(`Unknown audio format: ${String(output.format)}`)
  return spec
}

function codecArgs<F extends AudioFormat>(output: OutputOf<F>): string[] {
  return specOf(output).codecArgs(output)
}

/** Codec and quality of `format` with the Files settings, for a file of the list encoded again. */
export function fileCodecArgs(format: AudioFormat, settings: FormatSettings): string[] {
  return format === 'mp3'
    ? codecArgs({ format, ...settings.mp3 })
    : codecArgs({ format, ...settings.wav })
}

/** Container options of a copied or converted file; ID3v2.3 is what the Windows Explorer shows. */
export function muxerArgs(format: AudioFormat): string[] {
  return format === 'mp3' ? ['-id3v2_version', '3'] : []
}

function formatArgs<F extends AudioFormat>(output: OutputOf<F>): string[] {
  return [...codecArgs(output), '-f', specOf(output).muxer]
}

export function ffmpegArgs(input: PcmFormat, output: OutputSettings, outPath: string): string[] {
  return [
    '-hide_banner',
    '-nostats',
    // Only errors reach stderr, which is logged when the encoding fails.
    '-loglevel',
    'error',
    ...inputArgs(input),
    '-i',
    'pipe:0',
    '-ar',
    String(output.sampleRate),
    '-ac',
    String(output.channels),
    ...formatArgs(output),
    // Write each packet as it comes, so the file size grows smoothly (otherwise in 256 KB steps).
    '-flush_packets',
    '1',
    '-y',
    outPath
  ]
}
