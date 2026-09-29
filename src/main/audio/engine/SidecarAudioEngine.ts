/**
 * Talks to `rl-capture.exe` (see `native/PROTOCOL.md`): JSON commands on
 * stdin, JSON events on stderr, PCM blocks on stdout.
 *
 * The process is started on first use and again on the next request if it
 * dies. Automatic restart and device polling are task 06.
 */

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { app } from 'electron'
import { join } from 'path'
import { SIDECAR_TIMEOUT_MS } from '@shared/defaults'
import type { AudioDevice } from '@shared/types'
import { logger } from '../../log'
import { FrameDemuxer } from './frameDemuxer'
import { LineReader } from './lineReader'

const BINARY = 'rl-capture.exe'

type StreamErrorReason = 'open_failed' | 'device_lost' | 'stream_failed'

type SidecarEvent =
  | { type: 'devices'; devices: AudioDevice[] }
  | { type: 'warning'; message: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'opened'; streamId: number; sampleRate: number; channels: number }
  | { type: 'stopped'; streamId: number }
  | { type: 'stream_error'; streamId: number; reason: StreamErrorReason; message: string }

export interface AudioStream {
  readonly sampleRate: number
  readonly channels: number
  /** Interleaved f32 samples, as they arrive. */
  onData(listener: (samples: Float32Array) => void): void
  /** The stream ended on its own (device lost, sidecar gone...). */
  onError(listener: (reason: string) => void): void
  stop(): Promise<void>
}

interface StreamHandlers {
  data?: (samples: Float32Array) => void
  error?: (reason: string) => void
}

/** Next event matching `accept`, or a rejection after `SIDECAR_TIMEOUT_MS`. */
interface Waiter {
  accept: (event: SidecarEvent) => boolean
  resolve: (event: SidecarEvent) => void
  reject: (error: Error) => void
}

function binaryPath(): string {
  // Packed builds keep `resources/**` outside the asar (electron-builder.yml).
  return join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'resources', 'bin', BINARY)
}

export class SidecarAudioEngine {
  private child: ChildProcessWithoutNullStreams | null = null
  private waiters: Waiter[] = []
  private streams = new Map<number, StreamHandlers>()
  private nextStreamId = 1

  async listDevices(): Promise<AudioDevice[]> {
    const event = await this.request(
      { cmd: 'list' },
      (e) => e.type === 'devices' || e.type === 'error'
    )
    if (event.type !== 'devices') throw new Error(`device list failed: ${JSON.stringify(event)}`)
    return event.devices
  }

  async openStream(device: AudioDevice): Promise<AudioStream> {
    const streamId = this.nextStreamId
    this.nextStreamId = (this.nextStreamId % 255) + 1
    const handlers: StreamHandlers = {}
    this.streams.set(streamId, handlers)

    const event = await this.request(
      { cmd: 'open', streamId, deviceId: device.id, kind: device.kind },
      (e) => (e.type === 'opened' || e.type === 'stream_error') && e.streamId === streamId
    ).catch((error: Error) => {
      this.streams.delete(streamId)
      throw error
    })
    if (event.type !== 'opened') {
      this.streams.delete(streamId)
      throw new Error(event.type === 'stream_error' ? event.message : 'open failed')
    }

    return {
      sampleRate: event.sampleRate,
      channels: event.channels,
      onData: (listener) => {
        handlers.data = listener
      },
      onError: (listener) => {
        handlers.error = listener
      },
      stop: async () => {
        if (!this.streams.has(streamId)) return
        await this.request(
          { cmd: 'stop', streamId },
          (e) => e.type === 'stopped' && e.streamId === streamId
        ).finally(() => this.streams.delete(streamId))
      }
    }
  }

  private request(command: object, accept: Waiter['accept']): Promise<SidecarEvent> {
    const child = this.ensureProcess()
    return new Promise((resolve, reject) => {
      const waiter: Waiter = {
        accept,
        resolve: (event) => {
          clearTimeout(timer)
          resolve(event)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        }
      }
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        reject(new Error(`capture sidecar did not answer ${JSON.stringify(command)}`))
      }, SIDECAR_TIMEOUT_MS)
      this.waiters.push(waiter)
      child.stdin.write(`${JSON.stringify(command)}\n`)
    })
  }

  private ensureProcess(): ChildProcessWithoutNullStreams {
    if (this.child) return this.child
    const path = binaryPath()
    const child = spawn(path, [], { windowsHide: true })
    logger.info(`capture sidecar started: ${path}`)

    const demuxer = new FrameDemuxer((block) =>
      this.streams.get(block.streamId)?.data?.(block.samples)
    )
    child.stdout.on('data', (chunk: Buffer) => demuxer.push(chunk))

    const lines = new LineReader((line) => this.handleLine(line))
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => lines.push(chunk))

    const gone = (why: string): void => {
      if (this.child !== child) return
      this.child = null
      logger.warn(`capture sidecar ended: ${why}`)
      for (const waiter of this.waiters) waiter.reject(new Error(`capture sidecar ended: ${why}`))
      this.waiters = []
      for (const handlers of this.streams.values()) handlers.error?.('sidecar_ended')
      this.streams.clear()
    }
    child.on('error', (error) => gone(error.message))
    child.on('exit', (code) => gone(`exit code ${code}`))
    child.stdin.on('error', (error) => gone(error.message))

    this.child = child
    return child
  }

  private handleLine(line: string): void {
    let event: SidecarEvent
    try {
      event = JSON.parse(line) as SidecarEvent
    } catch {
      logger.warn(`capture sidecar sent an invalid line: ${line}`)
      return
    }

    const waiter = this.waiters.find((w) => w.accept(event))
    if (waiter) {
      this.waiters = this.waiters.filter((w) => w !== waiter)
      waiter.resolve(event)
      return
    }

    switch (event.type) {
      case 'warning':
        logger.warn(`capture sidecar: ${event.message}`)
        break
      case 'stream_error':
        logger.warn(`stream ${event.streamId} failed (${event.reason}): ${event.message}`)
        this.streams.get(event.streamId)?.error?.(event.reason)
        this.streams.delete(event.streamId)
        break
      case 'error':
        logger.warn(`capture sidecar error ${event.code}: ${event.message}`)
        break
      default:
        break
    }
  }

  /** Ends the process; stdin closing makes the sidecar exit on its own. */
  dispose(): void {
    this.child?.stdin.end()
    this.child = null
  }
}

export const audioEngine = new SidecarAudioEngine()
