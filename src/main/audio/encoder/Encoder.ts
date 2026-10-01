/**
 * What a recording needs from an encoder (spec §3.3): raw PCM goes in, a
 * finished file comes out. Nothing here is specific to ffmpeg, so another
 * backend or more formats (§17) fit behind the same interface.
 */

import type { AudioFormat, Mp3Settings, WavSettings } from '@shared/types'

/** What an unfinished file is called until `close` renames it (see task 14 for the recovery). */
export const PART_SUFFIX = '.part'

/** Interleaved f32 samples as they come from the pipeline. */
export interface PcmFormat {
  sampleRate: number
  channels: number
}

/** Settings of each format of the Files tab. */
export interface FormatSettings {
  mp3: Mp3Settings
  wav: WavSettings
}

/** The file to produce, tagged with its format. */
export type OutputOf<F extends AudioFormat> = { format: F } & FormatSettings[F]
export type OutputSettings = { [F in AudioFormat]: OutputOf<F> }[AudioFormat]

export interface EncoderProgress {
  /** Size of the file on disk so far. */
  bytes: number
  /** Audio written so far, from the frames sent. */
  durationMs: number
}

export interface FinalFile {
  path: string
  format: AudioFormat
  sizeBytes: number
  durationMs: number
}

export interface Encoder {
  /**
   * Starts writing to `<path>.part`; `path` is the final name, with its
   * extension. Rejects if the encoder cannot start.
   */
  open(path: string, input: PcmFormat, output: OutputSettings): Promise<void>
  /** Resolves once the encoder can take more (backpressure). */
  write(samples: Float32Array): Promise<void>
  /**
   * Finishes the file and gives it its final name. On failure the `.part`
   * stays for the recovery of task 14 and the promise rejects.
   */
  close(): Promise<FinalFile>
  /** Stops at once, leaving the `.part` as it is. */
  abort(): Promise<void>
  /** Stops at once and deletes the `.part`: for a file that never got any audio. */
  discard(): Promise<void>
  onProgress(listener: (progress: EncoderProgress) => void): void
  /** The encoder died while recording (not after `close` or `abort`). */
  onError(listener: (error: Error) => void): void
}
