/**
 * Level monitoring in Ready (spec §4.2, §12.6): while the main window can be
 * seen, the selected source is open and its meter and waveform frames go to
 * the renderer at `METER_FPS`, recording or not.
 *
 * Every change (window shown or hidden, source picked, devices changed, stream
 * lost) runs the same `reconcile`, one at a time: work out which device should
 * be open and reopen only if it is not the one already open.
 */

import type { BrowserWindow } from 'electron'
import { METER_FPS } from '@shared/defaults'
import type { AudioDevice } from '@shared/types'
import { logger } from '../log'
import { settings } from '../settings'
import { onVisibilityChange } from '../windowVisibility'
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

let current: Monitoring | null = null
let visible = false
let queue: Promise<void> = Promise.resolve()
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

/** Re-checks which device should be monitored, after whatever changed. */
export function refreshMonitor(): void {
  queue = queue.then(reconcile).catch((error: Error) => logger.warn(`monitor: ${error.message}`))
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

async function wantedDevice(): Promise<AudioDevice | null> {
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
