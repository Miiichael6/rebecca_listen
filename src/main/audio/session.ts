/**
 * The recording session (spec §4.4, §4.9): runs the effects of
 * `sessionMachine` against the capture tap and the files it writes. Events are
 * handled one at a time, so a Stop that arrives while a file is still opening
 * waits for it instead of racing it.
 *
 * A take is what runs from Record to Stop: the input, the timer and the
 * silence fills. It writes one file, or several when it is split (§12.2):
 * Split is the one way to cut, so anything else that wants a new file goes
 * through `SPLIT` too.
 *
 * Nothing here touches Electron: `appSession.ts` wires the real capture,
 * ffmpeg, settings and history, and the tests wire fakes.
 */

import { basename } from 'path'
import { SESSION_TICK_MS } from '@shared/defaults'
import type { Notice, SessionSnapshot, SessionState } from '@shared/types'
import type { CaptureSource, CaptureTap } from './capture'
import { describePlan, skipsSilence } from './devices'
import { RecordingFiles, type RecordingFile, type RecordingFileDeps } from './recordingFile'
import { pauseToggle, transition, type SessionEffect, type SessionEvent } from './sessionMachine'
import {
  addSilence,
  framesToMs,
  resumeTimeline,
  silenceBefore,
  startTimeline,
  type Timeline
} from './silence'
import { splitBlock } from './splitter'
import { startTicker } from './ticker'

export interface SessionEmit {
  state: (snapshot: SessionSnapshot) => void
  notice: (notice: Notice) => void
}

export interface SessionDeps extends Omit<RecordingFileDeps, 'log' | 'fail' | 'now'> {
  capture: CaptureSource
  emit: SessionEmit
  log: { info: (message: string) => void; warn: (message: string) => void }
  now?: () => number
}

/** A split waiting for the next block: the file after the cut is already open. */
interface PendingCut {
  next: RecordingFile
  /** Frame of the next block where the cut goes. */
  atFrame: number
}

interface Take {
  tap: CaptureTap
  /** The file being written now. */
  file: RecordingFile
  cut: PendingCut | null
  /** Frames of the whole take, so the timer goes on across splits. */
  timeline: Timeline
  /** WASAPI loopback sends nothing during silence: the gaps are filled (see `silence.ts`). */
  loopback: boolean
  /** `false` while paused: the blocks keep coming but are not written. */
  writing: boolean
  stopTicker: () => void
}

export class RecordingSession {
  private state: SessionState = 'idle'
  private take: Take | null = null
  private queue: Promise<void> = Promise.resolve()
  /** Files left behind by a split, still being finished while the take goes on. */
  private readonly saving = new Set<Promise<unknown>>()
  private readonly files: RecordingFiles
  private readonly now: () => number

  constructor(private readonly deps: SessionDeps) {
    this.now = deps.now ?? Date.now
    this.files = new RecordingFiles({
      ...deps,
      fail: (message) => this.notifyError(message),
      now: this.now
    })
  }

  record(): Promise<SessionSnapshot> {
    return this.dispatch({ type: 'RECORD' })
  }

  /** Pauses while recording, resumes while paused (§4.8). */
  togglePause(): Promise<SessionSnapshot> {
    return this.dispatch(pauseToggle(this.state))
  }

  /**
   * Ends the file and goes on in a new one without losing a sample: the cut
   * falls at `atFrame` of the next block (its start by default).
   */
  split(atFrame?: number): Promise<SessionSnapshot> {
    return this.dispatch({ type: 'SPLIT', atFrame })
  }

  stop(): Promise<SessionSnapshot> {
    return this.dispatch({ type: 'STOP' })
  }

  isActive(): boolean {
    return this.state !== 'idle'
  }

  snapshot(): SessionSnapshot {
    const take = this.take
    return {
      state: this.state,
      elapsedMs: take ? framesToMs(take.timeline, take.timeline.framesWritten) : 0,
      file: take ? { path: take.file.path, name: basename(take.file.path) } : null
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
      case 'rotateFile':
        return this.rotateFile(effect.atFrame)
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
      const file = await this.files.open(tap, [])
      this.attach(tap, file)
    } catch (error) {
      tap?.release()
      await this.step({
        type: 'FAILED',
        message: `Could not start recording: ${(error as Error).message}`
      })
    }
  }

  private attach(tap: CaptureTap, file: RecordingFile): void {
    const now = this.now()
    const take: Take = {
      tap,
      file,
      cut: null,
      timeline: startTimeline(tap.sampleRate, now),
      loopback: skipsSilence(tap.input),
      writing: true,
      stopTicker: startTicker(SESSION_TICK_MS, () => this.deps.emit.state(this.snapshot()))
    }
    this.take = take
    this.files.begin(file, tap)
    this.watch(file)

    tap.onData((samples) => this.write(take, samples))
    tap.onLost((reason) => {
      if (this.take === take) void this.dispatch({ type: 'DEVICE_LOST', reason })
    })

    if (tap.fellBack) {
      const message = 'The selected device is not connected: recording Computer Sounds instead.'
      this.deps.log.warn(message)
      this.deps.emit.notice({ level: 'warn', message })
    }
    this.deps.log.info(
      `recording started: ${file.path} (${file.output.format}) from ${describePlan(tap.input)} ` +
        `(${tap.sampleRate} Hz, ${tap.channels} ch)`
    )
  }

  /** An encoder dying while it has, or is about to get, the audio breaks the recording. */
  private watch(file: RecordingFile): void {
    file.encoder.onError((error) => {
      const take = this.take
      if (take && (take.file === file || take.cut?.next === file)) {
        void this.dispatch({ type: 'FAILED', message: error.message })
      }
    })
  }

  private write(take: Take, samples: Float32Array): void {
    if (!take.writing) return
    const frames = samples.length / take.tap.channels
    const arrival = this.now()
    if (take.loopback) this.fillSilence(take, silenceBefore(take.timeline, arrival, frames))
    this.writeAudio(take, samples)
    take.timeline.framesWritten += frames
    take.timeline.lastArrivalMs = arrival
  }

  private fillSilence(take: Take, frames: number): void {
    if (frames <= 0) return
    this.writeAudio(take, new Float32Array(frames * take.tap.channels))
    addSilence(take.timeline, frames)
  }

  /** Every sample goes through here, so a pending cut always lands on the right one. */
  private writeAudio(take: Take, samples: Float32Array): void {
    const cut = take.cut
    if (!cut) return this.files.write(take.file, samples)
    const [before, after] = splitBlock(samples, take.tap.channels, cut.atFrame)
    this.files.write(take.file, before)
    this.handOver(take)
    this.files.write(take.file, after)
  }

  /** Silence up to now, when the loopback went quiet before the pause or the stop. */
  private fillTail(take: Take): void {
    if (take.loopback && take.writing) {
      this.fillSilence(take, silenceBefore(take.timeline, this.now(), 0))
    }
  }

  /**
   * Opens the next file before letting go of the current one, so the capture
   * never waits: the blocks that come meanwhile still go to the current file,
   * and the next block is cut between both.
   */
  private async rotateFile(atFrame: number): Promise<void> {
    const take = this.take
    if (!take) return
    if (take.cut) {
      this.deps.log.warn('session: split ignored, the previous one has not happened yet')
      return
    }
    try {
      const next = await this.files.open(take.tap, [take.file.path])
      this.watch(next)
      take.cut = { next, atFrame }
    } catch (error) {
      this.notifyError(`Could not split the recording: ${(error as Error).message}`)
    }
  }

  /** The next file takes the audio; the previous one is finished without holding the capture. */
  private handOver(take: Take): void {
    const cut = take.cut
    if (!cut) return
    take.cut = null
    const previous = take.file
    take.file = cut.next
    this.files.begin(take.file, take.tap)
    this.finishInBackground(previous, take)
    this.deps.log.info(`recording split: ${previous.path} → ${take.file.path}`)
    this.deps.emit.state(this.snapshot())
  }

  private finishInBackground(file: RecordingFile, take: Take): void {
    const saved = this.files.save(file, take.tap.source).finally(() => this.saving.delete(saved))
    this.saving.add(saved)
  }

  /** Waits for the files a split left behind, so Stop returns with every file listed. */
  private async settle(): Promise<void> {
    await Promise.all(this.saving)
  }

  private pauseFile(): void {
    const take = this.take
    if (!take) return
    this.fillTail(take)
    // A split just before the pause falls at the pause: the next file starts when it resumes.
    this.handOver(take)
    take.writing = false
  }

  private resumeFile(): void {
    const take = this.take
    if (!take) return
    resumeTimeline(take.timeline, this.now())
    take.writing = true
  }

  /** Takes the take out of the session, so late blocks and events find nothing. */
  private detach(): Take | null {
    const take = this.take
    this.take = null
    if (!take) return null
    take.stopTicker()
    take.tap.release()
    return take
  }

  private async closeFile(notice?: string): Promise<void> {
    const take = this.take
    if (!take) return
    this.fillTail(take)
    this.detach()
    // A split that no block reached would only make an empty file.
    if (take.cut) await this.files.discard(take.cut.next)
    const [saved] = await Promise.all([this.files.save(take.file, take.tap.source), this.settle()])
    const { gaps, silenceFrames } = take.timeline
    this.deps.log.info(
      `recording stopped after ${Math.round(framesToMs(take.timeline, take.timeline.framesWritten))} ms ` +
        `(${gaps} gaps filled with ${Math.round(framesToMs(take.timeline, silenceFrames))} ms of silence)`
    )
    if (saved && notice) {
      this.deps.log.warn(notice)
      this.deps.emit.notice({ level: 'warn', message: notice })
    }
  }

  private async abortFile(message: string): Promise<void> {
    const take = this.detach()
    if (take) {
      await this.files.abort(take.file)
      if (take.cut) await this.files.discard(take.cut.next)
    }
    await this.settle()
    this.notifyError(message)
  }

  private notifyError(message: string): void {
    this.deps.log.warn(message)
    this.deps.emit.notice({ level: 'error', message })
  }
}
