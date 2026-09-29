/**
 * The `rl-capture.exe` child process: starts it, writes commands, splits its
 * output into events (stderr) and PCM blocks (stdout), and starts it again when
 * it dies — at most `SIDECAR_MAX_RESTARTS` times per `SIDECAR_RESTART_WINDOW_MS`.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { SIDECAR_MAX_RESTARTS, SIDECAR_RESTART_WINDOW_MS } from '@shared/defaults'
import { logger } from '../../log'
import { FrameDemuxer, type PcmBlock } from './frameDemuxer'
import { LineReader } from './lineReader'
import { RestartBudget } from './restartBudget'
import { parseSidecarEvent, type SidecarCommand, type SidecarEvent } from './sidecarMessages'

export interface SidecarListeners {
  event: (event: SidecarEvent) => void
  pcm: (block: PcmBlock) => void
  /** The process is gone: every pending request and open stream is lost. */
  ended: (reason: string) => void
}

export class SidecarProcess {
  private child: ChildProcessWithoutNullStreams | null = null
  private startedOnce = false
  private disposed = false
  private readonly restarts = new RestartBudget(SIDECAR_MAX_RESTARTS, SIDECAR_RESTART_WINDOW_MS)

  constructor(
    private readonly binaryPath: () => string,
    private readonly listeners: SidecarListeners
  ) {}

  /** Writes one command, starting the process first if it is not running. */
  send(command: SidecarCommand): void {
    const child = this.child ?? this.start()
    child.stdin.write(`${JSON.stringify(command)}\n`)
  }

  /** Closing stdin makes the sidecar exit on its own. */
  dispose(): void {
    this.disposed = true
    this.child?.stdin.end()
    this.child = null
  }

  private start(): ChildProcessWithoutNullStreams {
    if (this.disposed) throw new Error('capture sidecar is shut down')
    // The first start is free; every later one is a restart and has a budget.
    if (this.startedOnce && !this.restarts.tryConsume(Date.now())) {
      throw new Error('capture sidecar keeps crashing; not restarting it for now')
    }
    const restart = this.startedOnce
    this.startedOnce = true

    const path = this.binaryPath()
    const child = spawn(path, [], { windowsHide: true })
    logger.info(`capture sidecar ${restart ? 'restarted' : 'started'}: ${path}`)

    const demuxer = new FrameDemuxer(this.listeners.pcm)
    child.stdout.on('data', (chunk: Buffer) => demuxer.push(chunk))

    const lines = new LineReader((line) => this.handleLine(line))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => lines.push(chunk))

    child.on('error', (error) => this.handleEnd(child, error.message))
    child.on('exit', (code) => this.handleEnd(child, `exit code ${code}`))
    child.stdin.on('error', (error) => this.handleEnd(child, error.message))

    this.child = child
    return child
  }

  private handleLine(line: string): void {
    const event = parseSidecarEvent(line)
    if (event) this.listeners.event(event)
    else logger.warn(`capture sidecar sent an invalid line: ${line}`)
  }

  private handleEnd(child: ChildProcessWithoutNullStreams, reason: string): void {
    // `error` and `exit` can both fire for the same process.
    if (this.child !== child) return
    this.child = null
    logger.warn(`capture sidecar ended: ${reason}`)
    this.listeners.ended(reason)
    if (this.disposed) return

    try {
      this.start()
    } catch (error) {
      logger.error(`capture sidecar not restarted: ${(error as Error).message}`)
    }
  }
}
