/**
 * The one open input stream (spec §4.2, §12.6). While the main window can be
 * seen, the selected source is open and its meter and waveform frames go to
 * the renderer at `METER_FPS`. A recording `acquire`s the same stream through
 * a `CaptureTap`: it stays open while the window is hidden, and a new default
 * device does not move it until the recording releases it.
 *
 * Every change (window shown or hidden, source picked, devices changed, stream
 * lost, recording started or ended) runs the same `reconcile`, one at a time:
 * work out which device should be open and reopen only if it is not the one
 * already open.
 */

import type { BrowserWindow } from 'electron'
import { METER_FPS } from '@shared/defaults'
import type { AudioDevice } from '@shared/types'
import { logger } from '../log'
import { settings } from '../settings'
import { onVisibilityChange } from '../windowVisibility'
import type { CaptureTap } from './capture'
import type { AudioStream } from './engine/AudioEngine'
import { audioEngine } from './engine/SidecarAudioEngine'
import { resolveForRecording } from './devices'
import { Pipeline, type PipelineOutput } from './pipeline'
import { startTicker } from './ticker'

const TICK_MS = 1000 / METER_FPS

interface Monitoring {
  device: AudioDevice
  stream: AudioStream
  pipeline: Pipeline
  stopTicker: () => void
}

/** The device a recording holds, and who to tell if it goes away. */
interface Held {
  device: AudioDevice
  lost: (reason: string) => void
}

let current: Monitoring | null = null
let held: Held | null = null
let visible = false
let queue: Promise<unknown> = Promise.resolve()
let output: PipelineOutput = { meter: () => {}, wave: () => {} }

export function initMonitor(emitters: PipelineOutput): void {
  output = emitters
}

export function monitorWhileVisible(window: BrowserWindow): void {
  onVisibilityChange(window, (next) => {
    visible = next
    refreshMonitor()
  })
}

/** Runs `job` after the ones before it; its failure reaches the caller only. */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job)
  queue = run.catch(() => {})
  return run
}

/** Re-checks which device should be monitored, after whatever changed. */
export function refreshMonitor(): void {
  enqueue(reconcile).catch((error: Error) => logger.warn(`monitor: ${error.message}`))
}

export function setMonitorLevel(percent: number): void {
  current?.pipeline.setLevel(percent)
}

/** Stops the ticks at quit; the sidecar itself is disposed by the engine. */
export function disposeMonitor(): void {
  visible = false
  current?.stopTicker()
  current = null
}

/** Holds the selected source for a recording: see `CaptureTap`. */
export async function acquireCapture(): Promise<CaptureTap> {
  const chosen = settings.getSource()
  const { device, source, fellBack } = resolveForRecording(chosen, await audioEngine.listDevices())
  if (!device) throw new Error('the selected source is not available. Pick another one.')

  let lost: (reason: string) => void = () => {}
  const open = await enqueue(async () => {
    held = { device, lost: (reason) => lost(reason) }
    try {
      await reconcile()
    } catch (error) {
      held = null
      refreshMonitor()
      throw error
    }
    if (!current) throw new Error(`"${device.name}" could not be opened`)
    return current
  })

  const release = (): void => {
    if (held?.device !== device) return
    held = null
    if (current === open) open.pipeline.setSink(null)
    refreshMonitor()
  }
  return {
    device,
    source,
    fellBack,
    sampleRate: open.stream.sampleRate,
    channels: open.stream.channels,
    onData: (listener) => open.pipeline.setSink(listener),
    onLost: (listener) => {
      lost = listener
    },
    release
  }
}

async function wantedDevice(): Promise<AudioDevice | null> {
  if (held) return held.device
  if (!visible) return null
  return resolveForRecording(settings.getSource(), await audioEngine.listDevices()).device
}

async function reconcile(): Promise<void> {
  const device = await wantedDevice()
  if (current?.device.id === device?.id) return
  await close()
  if (device) await open(device)
}

async function open(device: AudioDevice): Promise<void> {
  const stream = await audioEngine.openStream(device)
  const pipeline = new Pipeline(stream.channels, settings.getLevel(), output)
  stream.onData((samples) => pipeline.push(samples))
  stream.onError((reason) => {
    if (current?.stream !== stream) return
    logger.warn(`monitor: "${device.name}" lost (${reason})`)
    current.stopTicker()
    current = null
    // The recording is let go first, so the reconcile below does not reopen a device that is gone.
    const holder = held?.device.id === device.id ? held : null
    if (holder) held = null
    holder?.lost(reason)
    refreshMonitor()
  })
  current = { device, stream, pipeline, stopTicker: startTicker(TICK_MS, () => pipeline.tick()) }
  logger.info(
    `monitoring "${device.name}" (${device.kind}, ${stream.sampleRate} Hz, ${stream.channels} ch)`
  )
}

async function close(): Promise<void> {
  const closing = current
  if (!closing) return
  current = null
  closing.stopTicker()
  await closing.stream.stop().catch((error: Error) => logger.warn(`monitor stop: ${error.message}`))
}
