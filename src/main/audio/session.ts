/**
 * The recording session: Record opens the selected source and writes it to a
 * WAV, Stop closes the file and adds it to the list. Only `idle` and
 * `recording` for now; Pause and the state machine of §4.9 are task 13.
 */

import { randomUUID } from 'crypto'
import { basename } from 'path'
import { SESSION_TICK_MS } from '@shared/defaults'
import type { AudioDevice, Notice, SessionSnapshot, SourceSelection } from '@shared/types'
import { resolveOutputPath } from '../files/naming'
import { history } from '../history'
import { logger } from '../log'
import { settings } from '../settings'
import { WavWriter } from './encoder/WavWriter'
import type { AudioStream } from './engine/AudioEngine'
import { audioEngine } from './engine/SidecarAudioEngine'
import { resolveForRecording } from './devices'
import { addSilence, silenceBefore, type Timeline } from './silence'

interface Active {
  device: AudioDevice
  source: SourceSelection
  stream: AudioStream
  writer: WavWriter
  timeline: Timeline
  createdAt: number
  ticker: NodeJS.Timeout
}

type Emit = {
  state: (snapshot: SessionSnapshot) => void
  notice: (notice: Notice) => void
}

let active: Active | null = null
/** Set between Record and the stream being open, so a double click does nothing. */
let busy = false
let emit: Emit = { state: () => {}, notice: () => {} }

export function initSession(emitters: Emit): void {
  emit = emitters
}

export function snapshot(): SessionSnapshot {
  if (!active) return { state: 'idle', elapsedMs: 0, file: null }
  const { path } = active.writer
  return {
    state: 'recording',
    elapsedMs: active.writer.durationMs,
    file: { path, name: basename(path) }
  }
}

export function isRecording(): boolean {
  return active !== null
}

function fail(message: string): SessionSnapshot {
  logger.warn(message)
  emit.notice({ level: 'error', message })
  return snapshot()
}

export async function record(): Promise<SessionSnapshot> {
  if (active || busy) return snapshot()
  busy = true
  try {
    const chosen = settings.getSource()
    const { device, source, fellBack } = resolveForRecording(
      chosen,
      await audioEngine.listDevices()
    )
    if (!device) return fail('The selected source is not available. Pick another one.')
    if (fellBack) {
      const message = 'The selected device is not connected: recording Computer Sounds instead.'
      logger.warn(`${message} (${chosen.mode === 'device' ? chosen.deviceId : chosen.mode})`)
      emit.notice({ level: 'warn', message })
    }

    const path = resolveOutputPath(settings.get().files.folder, new Date(), 'wav')
    const stream = await audioEngine.openStream(device)
    const writer = new WavWriter(path, stream.sampleRate, stream.channels)
    const now = Date.now()
    const timeline: Timeline = {
      sampleRate: stream.sampleRate,
      startMs: now,
      lastArrivalMs: now,
      framesWritten: 0,
      gaps: 0,
      silenceFrames: 0
    }
    const loopback = device.kind === 'render'

    stream.onData((samples) => {
      const frames = samples.length / stream.channels
      const arrival = Date.now()
      if (loopback) fillSilence(writer, timeline, silenceBefore(timeline, arrival, frames))
      writer.write(samples)
      timeline.framesWritten += frames
      timeline.lastArrivalMs = arrival
    })
    stream.onError((reason) => {
      void finish(`Recording stopped: the device is no longer available (${reason}).`)
    })

    active = {
      device,
      source,
      stream,
      writer,
      timeline,
      createdAt: now,
      ticker: setInterval(() => emit.state(snapshot()), SESSION_TICK_MS)
    }
    logger.info(
      `recording started: ${path} from "${device.name}" (${device.kind}, ${stream.sampleRate} Hz, ${stream.channels} ch)`
    )
    emit.state(snapshot())
    return snapshot()
  } catch (error) {
    return fail(`Could not start recording: ${(error as Error).message}`)
  } finally {
    busy = false
  }
}

export async function stop(): Promise<SessionSnapshot> {
  if (!active) return snapshot()
  await finish(null)
  return snapshot()
}

function fillSilence(writer: WavWriter, timeline: Timeline, frames: number): void {
  writer.writeSilence(frames)
  addSilence(timeline, frames)
}

/** Closes the file and lists it. `warning` is shown when the stop was not asked for. */
async function finish(warning: string | null): Promise<void> {
  const current = active
  if (!current) return
  active = null
  clearInterval(current.ticker)

  await current.stream.stop().catch((error: Error) => logger.warn(`stream stop: ${error.message}`))
  const { writer, timeline } = current
  if (current.device.kind === 'render') {
    fillSilence(writer, timeline, silenceBefore(timeline, Date.now(), 0))
  }

  try {
    writer.close()
    history.add({
      id: randomUUID(),
      path: writer.path,
      name: basename(writer.path),
      format: 'wav',
      durationMs: writer.durationMs,
      sizeBytes: writer.sizeBytes,
      createdAt: current.createdAt,
      source: current.source
    })
    const silenceMs = Math.round((timeline.silenceFrames / timeline.sampleRate) * 1000)
    logger.info(
      `recording saved: ${writer.path} (${Math.round(writer.durationMs)} ms, ` +
        `${timeline.gaps} gaps filled with ${silenceMs} ms of silence)`
    )
    if (warning) emit.notice({ level: 'warn', message: warning })
  } catch (error) {
    fail(`Could not save the recording: ${(error as Error).message}`)
  }
  emit.state(snapshot())
}
