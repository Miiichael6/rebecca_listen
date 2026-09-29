/**
 * The recording session (spec §4.4, §4.9): runs the effects of
 * `sessionMachine` against the capture tap and an encoder. Events are handled
 * one at a time, so a Stop that arrives while the file is still opening waits
 * for it instead of racing it.
 *
 * Nothing here touches Electron: `appSession.ts` wires the real capture,
 * ffmpeg, settings and history, and the tests wire fakes.
 */

import { randomUUID } from 'crypto'
import { basename } from 'path'
import { SESSION_TICK_MS } from '@shared/defaults'
import type { HistoryItem, Notice, SessionSnapshot, SessionState } from '@shared/types'
import type { CaptureSource, CaptureTap } from './capture'
import type { Encoder, OutputSettings } from './encoder/Encoder'
import { pauseToggle, transition, type SessionEffect, type SessionEvent } from './sessionMachine'
import {
  addSilence,
  framesToMs,
  resumeTimeline,
  silenceBefore,
  startTimeline,
  type Timeline
} from './silence'
import { startTicker } from './ticker'

export interface SessionEmit {
  state: (snapshot: SessionSnapshot) => void
  notice: (notice: Notice) => void
}

export interface SessionDeps {
  capture: CaptureSource
  createEncoder: () => Encoder
  /** Where the next file goes and how it is encoded, read from the settings when it opens. */
  nextFile: () => { path: string; output: OutputSettings }
  addToHistory: (item: HistoryItem) => void
  emit: SessionEmit
  log: { info: (message: string) => void; warn: (message: string) => void }
  now?: () => number
}

interface OpenFile {
  tap: CaptureTap
  encoder: Encoder
  path: string
  output: OutputSettings
  timeline: Timeline
  /** WASAPI loopback sends nothing during silence: the gaps are filled (see `silence.ts`). */
  loopback: boolean
  /** `false` while paused: the blocks keep coming but are not written. */
  writing: boolean
  createdAt: number
  stopTicker: () => void
}

export class RecordingSession {
  private state: SessionState = 'idle'
  private file: OpenFile | null = null
  private queue: Promise<void> = Promise.resolve()
  private readonly now: () => number

  constructor(private readonly deps: SessionDeps) {
    this.now = deps.now ?? Date.now
  }

  record(): Promise<SessionSnapshot> {
    return this.dispatch({ type: 'RECORD' })
  }

  /** Pauses while recording, resumes while paused (§4.8). */
  togglePause(): Promise<SessionSnapshot> {
    return this.dispatch(pauseToggle(this.state))
  }

  stop(): Promise<SessionSnapshot> {
    return this.dispatch({ type: 'STOP' })
  }

  isActive(): boolean {
    return this.state !== 'idle'
  }

  snapshot(): SessionSnapshot {
    const file = this.file
    return {
      state: this.state,
      elapsedMs: file ? framesToMs(file.timeline, file.timeline.framesWritten) : 0,
      file: file ? { path: file.path, name: basename(file.path) } : null
    }
  }

  private dispatch(event: SessionEvent): Promise<SessionSnapshot> {
    const run = this.queue.then(() => this.step(event))
    this.queue = run.catch((error: Error) => this.deps.log.warn(`session: ${error.message}`))
    return this.queue.then(() => this.snapshot())
  }

  private async step(event: SessionEvent): Promise<void> {
    const next = transition(this.state, event)
    if (!next.valid) {
      this.deps.log.warn(`session: ${event.type} ignored while ${this.state}`)
      return
    }
    this.state = next.state
    for (const effect of next.effects) await this.run(effect)
    this.deps.emit.state(this.snapshot())
  }

  private async run(effect: SessionEffect): Promise<void> {
    switch (effect.type) {
      case 'openFile':
        return this.openFile()
      case 'pauseFile':
        return this.pauseFile()
      case 'resumeFile':
        return this.resumeFile()
      case 'closeFile':
        return this.closeFile(effect.notice)
      case 'abortFile':
        return this.abortFile(effect.message)
    }
  }

  private async openFile(): Promise<void> {
    let tap: CaptureTap | null = null
    try {
      tap = await this.deps.capture.acquire()
      const { path, output } = this.deps.nextFile()
      const encoder = this.deps.createEncoder()
      await encoder.open(path, { sampleRate: tap.sampleRate, channels: tap.channels }, output)
      this.attach(tap, encoder, path, output)
    } catch (error) {
      tap?.release()
      await this.step({
        type: 'FAILED',
        message: `Could not start recording: ${(error as Error).message}`
      })
    }
  }

  private attach(tap: CaptureTap, encoder: Encoder, path: string, output: OutputSettings): void {
    const now = this.now()
    const file: OpenFile = {
      tap,
      encoder,
      path,
      output,
      timeline: startTimeline(tap.sampleRate, now),
      loopback: tap.device.kind === 'render',
      writing: true,
      createdAt: now,
      stopTicker: startTicker(SESSION_TICK_MS, () => this.deps.emit.state(this.snapshot()))
    }
    this.file = file

    tap.onData((samples) => this.write(file, samples))
    tap.onLost((reason) => {
      if (this.file === file) void this.dispatch({ type: 'DEVICE_LOST', reason })
    })
    encoder.onError((error) => {
      if (this.file === file) void this.dispatch({ type: 'FAILED', message: error.message })
    })

    if (tap.fellBack) {
      const message = 'The selected device is not connected: recording Computer Sounds instead.'
      this.deps.log.warn(message)
      this.deps.emit.notice({ level: 'warn', message })
    }
    this.deps.log.info(
      `recording started: ${path} (${output.format}) from "${tap.device.name}" ` +
        `(${tap.device.kind}, ${tap.sampleRate} Hz, ${tap.channels} ch)`
    )
  }

  private write(file: OpenFile, samples: Float32Array): void {
    if (!file.writing) return
    const frames = samples.length / file.tap.channels
    const arrival = this.now()
    if (file.loopback) this.fillSilence(file, silenceBefore(file.timeline, arrival, frames))
    void file.encoder.write(samples)
    file.timeline.framesWritten += frames
    file.timeline.lastArrivalMs = arrival
  }

  private fillSilence(file: OpenFile, frames: number): void {
    if (frames <= 0) return
    void file.encoder.write(new Float32Array(frames * file.tap.channels))
    addSilence(file.timeline, frames)
  }

  /** Silence up to now, when the loopback went quiet before the pause or the stop. */
  private fillTail(file: OpenFile): void {
    if (file.loopback && file.writing) {
      this.fillSilence(file, silenceBefore(file.timeline, this.now(), 0))
    }
  }

  private pauseFile(): void {
    const file = this.file
    if (!file) return
    this.fillTail(file)
    file.writing = false
  }

  private resumeFile(): void {
    const file = this.file
    if (!file) return
    resumeTimeline(file.timeline, this.now())
    file.writing = true
  }

  /** Takes the open file out of the session, so late blocks and events find nothing. */
  private detach(): OpenFile | null {
    const file = this.file
    this.file = null
    if (!file) return null
    file.stopTicker()
    file.tap.release()
    return file
  }

  private async closeFile(notice?: string): Promise<void> {
    const file = this.file
    if (!file) return
    this.fillTail(file)
    this.detach()
    try {
      const final = await file.encoder.close()
      this.deps.addToHistory({
        id: randomUUID(),
        path: final.path,
        name: basename(final.path),
        format: final.format,
        durationMs: final.durationMs,
        sizeBytes: final.sizeBytes,
        createdAt: file.createdAt,
        source: file.tap.source
      })
      const { gaps, silenceFrames } = file.timeline
      this.deps.log.info(
        `recording saved: ${final.path} (${final.format}, ${Math.round(final.durationMs)} ms, ` +
          `${gaps} gaps filled with ${Math.round(framesToMs(file.timeline, silenceFrames))} ms of silence)`
      )
      if (notice) {
        this.deps.log.warn(notice)
        this.deps.emit.notice({ level: 'warn', message: notice })
      }
    } catch (error) {
      this.notifyError(`Could not save the recording: ${(error as Error).message}`)
    }
  }

  private async abortFile(message: string): Promise<void> {
    const file = this.detach()
    await file?.encoder.abort()
    this.notifyError(message)
  }

  private notifyError(message: string): void {
    this.deps.log.warn(message)
    this.deps.emit.notice({ level: 'error', message })
  }
}
