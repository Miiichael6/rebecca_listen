/**
 * `Encoder` over an ffmpeg child process (spec §3.3): PCM f32le goes to its
 * stdin and it writes `<path>.part`, which is renamed to `<path>` only after
 * ffmpeg exits cleanly. So a final name always means a complete file.
 *
 * One instance encodes one file: a new recording takes a new encoder.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { rename, stat } from 'fs/promises'
import type { Writable } from 'stream'
import { FFMPEG_STDERR_TAIL_BYTES, FILE_PROGRESS_MS } from '@shared/defaults'
import {
  PART_SUFFIX,
  type Encoder,
  type EncoderProgress,
  type FinalFile,
  type OutputSettings,
  type PcmFormat
} from './Encoder'
import { ffmpegArgs } from './ffmpegArgs'

export interface FfmpegEncoderOptions {
  /** Path of the ffmpeg executable (`ffmpegPath()` in the app). */
  binary: string
  /** Where ffmpeg's stderr goes when an encoding fails. */
  warn: (message: string) => void
}

interface Running {
  child: ChildProcessWithoutNullStreams
  path: string
  partPath: string
  input: PcmFormat
  output: OutputSettings
  exited: Promise<number | null>
  progressTimer: NodeJS.Timeout
}

export class FfmpegEncoder implements Encoder {
  private running: Running | null = null
  private framesWritten = 0
  private stderrTail = ''
  /** Set by `close` and `abort`, so their exit is not reported as a failure. */
  private ending = false
  private progressListeners: ((progress: EncoderProgress) => void)[] = []
  private errorListeners: ((error: Error) => void)[] = []

  constructor(private readonly options: FfmpegEncoderOptions) {}

  async open(path: string, input: PcmFormat, output: OutputSettings): Promise<void> {
    if (this.running) throw new Error('The encoder is already open')
    const partPath = `${path}${PART_SUFFIX}`
    const child = spawn(this.options.binary, ffmpegArgs(input, output, partPath), {
      windowsHide: true
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      this.stderrTail = (this.stderrTail + chunk).slice(-FFMPEG_STDERR_TAIL_BYTES)
    })
    // A dead ffmpeg closes the pipe: the exit handler reports it, not EPIPE.
    child.stdin.on('error', () => {})

    const exited = new Promise<number | null>((resolve) => child.once('close', resolve))
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })

    this.running = {
      child,
      path,
      partPath,
      input,
      output,
      exited,
      progressTimer: setInterval(() => void this.reportProgress(), FILE_PROGRESS_MS)
    }
    void exited.then((code) => this.onExit(code))
  }

  write(samples: Float32Array): Promise<void> {
    const running = this.running
    if (!running || this.ending || samples.length === 0) return Promise.resolve()
    this.framesWritten += samples.length / running.input.channels
    // A copy: the caller may reuse its array before the pipe flushes.
    const bytes = samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength)
    const { stdin } = running.child
    return stdin.write(Buffer.from(bytes)) ? Promise.resolve() : whenWritable(stdin, running.exited)
  }

  async close(): Promise<FinalFile> {
    const running = this.takeRunning()
    running.child.stdin.end()
    const code = await running.exited
    if (code !== 0) throw this.failure(running, `ffmpeg exited with code ${code}`)
    await rename(running.partPath, running.path)
    const { size } = await stat(running.path)
    return {
      path: running.path,
      format: running.output.format,
      sizeBytes: size,
      durationMs: this.writtenMs(running)
    }
  }

  async abort(): Promise<void> {
    if (!this.running || this.ending) return
    const running = this.takeRunning()
    running.child.kill()
    await running.exited
  }

  onProgress(listener: (progress: EncoderProgress) => void): void {
    this.progressListeners.push(listener)
  }

  onError(listener: (error: Error) => void): void {
    this.errorListeners.push(listener)
  }

  private takeRunning(): Running {
    const running = this.running
    if (!running || this.ending) throw new Error('The encoder is not open')
    this.ending = true
    clearInterval(running.progressTimer)
    return running
  }

  /** Audio length from the frames sent, not from what ffmpeg has flushed. */
  private writtenMs(running: Running): number {
    return (this.framesWritten / running.input.sampleRate) * 1000
  }

  private async reportProgress(): Promise<void> {
    const running = this.running
    if (!running) return
    try {
      const { size } = await stat(running.partPath)
      const progress = { bytes: size, durationMs: this.writtenMs(running) }
      this.progressListeners.forEach((listener) => listener(progress))
    } catch {
      // ffmpeg creates the file after its first output; the next tick sees it.
    }
  }

  /** ffmpeg exited without `close` or `abort` asking: the recording is broken. */
  private onExit(code: number | null): void {
    const running = this.running
    if (!running || this.ending) return
    clearInterval(running.progressTimer)
    this.ending = true
    const error = this.failure(running, `ffmpeg stopped while recording (code ${code})`)
    this.errorListeners.forEach((listener) => listener(error))
  }

  private failure(running: Running, message: string): Error {
    this.options.warn(`${message}: ${running.partPath}\n${this.stderrTail.trim()}`)
    return new Error(`${message}. The partial file was kept: ${running.partPath}`)
  }
}

/**
 * Resolves when the pipe takes more data, or when ffmpeg exits: a dead
 * ffmpeg leaves the pipe full without ever emitting `drain` or `close`.
 */
function whenWritable(stdin: Writable, exited: Promise<unknown>): Promise<void> {
  return new Promise((resolve) => {
    const done = (): void => {
      stdin.off('drain', done)
      resolve()
    }
    stdin.on('drain', done)
    void exited.then(done)
  })
}
