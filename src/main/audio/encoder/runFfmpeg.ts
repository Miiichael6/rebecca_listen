/** One-shot ffmpeg runs: remuxing a file, or reading its length. */

import { spawn } from 'child_process'
import { FFMPEG_STDERR_TAIL_BYTES } from '@shared/defaults'
import { parseDurationMs } from './ffmpegDuration'

/**
 * Runs ffmpeg and resolves with its stderr. `ffmpeg -i <file>` alone always
 * exits with an error (no output given), so `probe` ignores the exit code.
 */
export function runFfmpeg(binary: string, args: string[], probe = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true })
    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-FFMPEG_STDERR_TAIL_BYTES)
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (probe || code === 0) resolve(stderr)
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`))
    })
  })
}

/** Length of an audio file; `null` when ffmpeg cannot read one from it. */
export async function probeDurationMs(binary: string, path: string): Promise<number | null> {
  return parseDurationMs(await runFfmpeg(binary, ['-hide_banner', '-i', path], true))
}
