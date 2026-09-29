/**
 * `AudioEngine` over `rl-capture.exe` (see `native/PROTOCOL.md`): matches the
 * sidecar's events to the requests that wait for them, routes PCM blocks to
 * their streams and polls the device list for changes.
 */

import { app } from 'electron'
import { join } from 'path'
import { DEVICE_POLL_MS, SIDECAR_TIMEOUT_MS } from '@shared/defaults'
import type { AudioDevice } from '@shared/types'
import { logger } from '../../log'
import type { AudioEngine, AudioStream } from './AudioEngine'
import { describeDiff } from './diffDevices'
import { DevicePoller } from './devicePoller'
import type { SidecarCommand, SidecarEvent } from './sidecarMessages'
import { SidecarProcess } from './sidecarProcess'

const BINARY = 'rl-capture.exe'

/** Stream ids travel as one byte in the PCM header. */
const MAX_STREAM_ID = 255

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

export class SidecarAudioEngine implements AudioEngine {
  private waiters: Waiter[] = []
  private streams = new Map<number, StreamHandlers>()
  private nextStreamId = 1
  /** `list` requests waiting for their answer. */
  private listsPending = 0
  /**
   * Warnings of the enumeration already logged: the same endpoint is skipped
   * again on every poll and would fill the log.
   */
  private readonly listWarningsSeen = new Set<string>()

  private readonly process = new SidecarProcess(binaryPath, {
    event: (event) => this.handleEvent(event),
    pcm: (block) => this.streams.get(block.streamId)?.data?.(block.samples),
    ended: (reason) => this.dropPending(reason)
  })

  private readonly poller = new DevicePoller(
    () => this.listDevices(),
    DEVICE_POLL_MS,
    (error) => logger.warn(`device polling failed: ${error.message}`)
  )

  constructor() {
    this.poller.onChange((_, diff) => logger.info(`devices changed: ${describeDiff(diff)}`))
  }

  async listDevices(): Promise<AudioDevice[]> {
    this.listsPending += 1
    const event = await this.request(
      { cmd: 'list' },
      (e) => e.type === 'devices' || e.type === 'error'
    ).finally(() => {
      this.listsPending -= 1
    })
    if (event.type !== 'devices') throw new Error(`device list failed: ${JSON.stringify(event)}`)
    return event.devices
  }

  onDevicesChanged(listener: (devices: AudioDevice[]) => void): () => void {
    return this.poller.onChange((devices) => listener(devices))
  }

  setWatchingDevices(watching: boolean): void {
    if (watching) this.poller.start()
    else this.poller.stop()
  }

  async openStream(device: AudioDevice): Promise<AudioStream> {
    const streamId = this.nextStreamId
    this.nextStreamId = (this.nextStreamId % MAX_STREAM_ID) + 1
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

  dispose(): void {
    this.poller.stop()
    this.process.dispose()
  }

  private request(command: SidecarCommand, accept: Waiter['accept']): Promise<SidecarEvent> {
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
      try {
        this.process.send(command)
      } catch (error) {
        this.waiters = this.waiters.filter((w) => w !== waiter)
        waiter.reject(error as Error)
      }
    })
  }

  /** The process died: nothing it was doing will ever answer. */
  private dropPending(reason: string): void {
    for (const waiter of this.waiters) waiter.reject(new Error(`capture sidecar ended: ${reason}`))
    this.waiters = []
    for (const handlers of this.streams.values()) handlers.error?.('sidecar_ended')
    this.streams.clear()
  }

  private logWarning(message: string): void {
    if (this.listsPending > 0) {
      if (this.listWarningsSeen.has(message)) return
      this.listWarningsSeen.add(message)
    }
    logger.warn(`capture sidecar: ${message}`)
  }

  private handleEvent(event: SidecarEvent): void {
    const waiter = this.waiters.find((w) => w.accept(event))
    if (waiter) {
      this.waiters = this.waiters.filter((w) => w !== waiter)
      waiter.resolve(event)
      return
    }

    switch (event.type) {
      case 'warning':
        this.logWarning(event.message)
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
}

export const audioEngine: AudioEngine = new SidecarAudioEngine()
