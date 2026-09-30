/** One-shot ffmpeg runs: remuxing or encoding a file, reading its length or its tags. */

import { spawn } from 'child_process'
import { FFMPEG_STDERR_TAIL_BYTES } from '@shared/defaults'
import { parseDurationMs } from './ffmpegDuration'

interface FfmpegOutput {
  stdout: string
  stderr: string
}

/**
 * Runs ffmpeg to the end. `ffmpeg -i <file>` alone always exits with an
 * error (no output given), so `probe` ignores the exit code.
 */
function run(binary: string, args: string[], probe: boolean): Promise<FfmpegOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => (stdout += chunk))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-FFMPEG_STDERR_TAIL_BYTES)
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (probe || code === 0) resolve({ stdout, stderr })
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.trim()}`))
    })
  })
}

/** Runs ffmpeg and resolves with its stderr. */
export async function runFfmpeg(binary: string, args: string[], probe = false): Promise<string> {
  return (await run(binary, args, probe)).stderr
}

/** Runs ffmpeg writing to `-` and resolves with what it wrote. */
export async function ffmpegStdout(binary: string, args: string[]): Promise<string> {
  return (await run(binary, args, false)).stdout
}

/** Length of an audio file; `null` when ffmpeg cannot read one from it. */
export async function probeDurationMs(binary: string, path: string): Promise<number | null> {
  return parseDurationMs(await runFfmpeg(binary, ['-hide_banner', '-i', path], true))
}
