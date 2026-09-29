/**
 * WASAPI loopback delivers no packets while nothing is playing, so a recording
 * of the system sound would skip every silence. Before each block (and at
 * stop) this works out how many frames of silence belong in front of it, from
 * the wall clock of the recording.
 *
 * It only fills after a real pause in the deliveries (`LOOPBACK_GAP_MS`), so
 * the small clock difference between the device and the computer never turns
 * into zeros in the middle of continuous audio.
 */

import { LOOPBACK_GAP_MS } from '@shared/defaults'

export interface Timeline {
  sampleRate: number
  /** Wall clock when the recording started, in ms. */
  startMs: number
  /** Wall clock of the last block received (or `startMs` before the first). */
  lastArrivalMs: number
  /** Frames written so far, silence included. */
  framesWritten: number
  /** Pauses filled with silence so far, for the log. */
  gaps: number
  /** Frames of silence written so far, for the log. */
  silenceFrames: number
}

/**
 * Frames of silence to write before a block of `incomingFrames` that arrived
 * at `nowMs`. Pass `incomingFrames = 0` at stop to fill the tail.
 */
export function silenceBefore(timeline: Timeline, nowMs: number, incomingFrames: number): number {
  if (nowMs - timeline.lastArrivalMs < LOOPBACK_GAP_MS) return 0
  const expected = Math.round(((nowMs - timeline.startMs) / 1000) * timeline.sampleRate)
  return Math.max(0, expected - timeline.framesWritten - incomingFrames)
}

/** Counts `frames` of silence written into the timeline. */
export function addSilence(timeline: Timeline, frames: number): void {
  if (frames <= 0) return
  timeline.framesWritten += frames
  timeline.silenceFrames += frames
  timeline.gaps += 1
}

export function startTimeline(sampleRate: number, nowMs: number): Timeline {
  return {
    sampleRate,
    startMs: nowMs,
    lastArrivalMs: nowMs,
    framesWritten: 0,
    gaps: 0,
    silenceFrames: 0
  }
}

export function framesToMs(timeline: Timeline, frames: number): number {
  return (frames / timeline.sampleRate) * 1000
}

/**
 * After a pause the wall clock has moved on without the file: the timeline is
 * moved so that what was written ends at `nowMs`, and the pause is never
 * filled with silence.
 */
export function resumeTimeline(timeline: Timeline, nowMs: number): void {
  timeline.startMs = nowMs - framesToMs(timeline, timeline.framesWritten)
  timeline.lastArrivalMs = nowMs
}
