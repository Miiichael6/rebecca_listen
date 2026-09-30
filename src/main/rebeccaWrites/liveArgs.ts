/**
 * The contract with RebeccaWrites for live transcription (task 46 here, task
 * 27 there): where the growing PCM file goes and the arguments that tell
 * RebeccaWrites a recording started or ended.
 *
 * Pure logic, no IO.
 */

import { basename, extname, join } from 'path'

/** Folder under the system temp folder where the growing PCM files live. */
export const LIVE_FOLDER_NAME = 'rebecca-live'

/** Format of the PCM file: s16le, mono, no header. */
export const LIVE_SAMPLE_RATE = 16000
export const LIVE_CHANNELS = 1

/** `%TEMP%\rebecca-live\<id>.pcm`, the id being when the recording started. */
export function livePcmPath(tempDir: string, startedAt: number): string {
  return join(tempDir, LIVE_FOLDER_NAME, `${startedAt}.pcm`)
}

/** The entry in RebeccaWrites is named after the recording, without the extension. */
export function liveName(recordingPath: string): string {
  return basename(recordingPath, extname(recordingPath))
}

export function liveStartArgs(pcmPath: string, name: string): string[] {
  return ['--live-start', pcmPath, '--live-name', name]
}

/** Without `media` (the recording was aborted) RebeccaWrites closes the entry with what it has. */
export function liveEndArgs(pcmPath: string, media: string | null): string[] {
  return media ? ['--live-end', pcmPath, '--live-media', media] : ['--live-end', pcmPath]
}
