/**
 * One file of a recording, from opening to its row in the list. A recording
 * without splits is one file; each split (spec §12.2) ends one and goes on in
 * the next, so `session.ts` only decides when, and this does the rest: the
 * encoder, the journal for the recovery (task 14), the history and the live
 * transcription (task 46).
 */

import { randomUUID } from 'crypto'
import { basename } from 'path'
import type { NewHistoryItem, SourceSelection } from '@shared/types'
import type { OpenRecording } from '../files/partFiles'
import type { CaptureTap } from './capture'
import type { Encoder, FinalFile, OutputSettings } from './encoder/Encoder'
import { deferredLiveSink } from './live/deferredSink'
import type { LiveLink, LiveSink } from './live/LiveLink'

export interface RecordingFile {
  encoder: Encoder
  /** Final name; the encoder writes `<path>.part` until it is saved. */
  path: string
  output: OutputSettings
  /** When its audio starts: set again when a split hands it the recording. */
  createdAt: number
  /** Gets every block the encoder gets; `null` without live transcription or before it starts. */
  live: LiveSink | null
}

export interface RecordingFileDeps {
  createEncoder: () => Encoder
  /**
   * Where the next file goes and how it is encoded, read from the settings
   * when it opens. `busy` are the files still being written, whose names the
   * new one must not take (their `.part` may not be on disk yet).
   */
  nextFile: (busy: readonly string[]) => { path: string; output: OutputSettings }
  addToHistory: (item: NewHistoryItem) => void
  /** Remembers the files being written, for the recovery after a crash (task 14). */
  journal: { add: (recording: OpenRecording) => void; remove: (path: string) => void }
  /** Live transcription of what is recorded (task 46); without it, none. */
  live?: LiveLink
  log: { info: (message: string) => void }
  /** A file could not be saved: the user is told, the recording goes on. */
  fail: (message: string) => void
  now: () => number
}

export class RecordingFiles {
  constructor(private readonly deps: RecordingFileDeps) {}

  /** Opens the encoder of a new file for `tap`. Rejects if it cannot start. */
  async open(tap: CaptureTap, busy: readonly string[]): Promise<RecordingFile> {
    const { path, output } = this.deps.nextFile(busy)
    const encoder = this.deps.createEncoder()
    await encoder.open(path, { sampleRate: tap.sampleRate, channels: tap.channels }, output)
    const createdAt = this.deps.now()
    this.deps.journal.add({ path, createdAt, source: tap.source })
    return { encoder, path, output, createdAt, live: null }
  }

  /**
   * The file starts getting the audio. Starting the live side takes a moment
   * (finding RebeccaWrites): the recording does not wait, the deferred sink
   * keeps the blocks.
   */
  begin(file: RecordingFile, tap: CaptureTap): void {
    file.createdAt = this.deps.now()
    const live = this.deps.live
    if (!live) return
    file.live = deferredLiveSink(
      live.start({
        path: file.path,
        startedAt: file.createdAt,
        sampleRate: tap.sampleRate,
        channels: tap.channels
      })
    )
  }

  /** The file and the live transcription get the same audio, so their times match. */
  write(file: RecordingFile, samples: Float32Array): void {
    if (samples.length === 0) return
    void file.encoder.write(samples)
    file.live?.write(samples)
  }

  /** Finishes the file and lists it. On failure the `.part` stays for the recovery. */
  async save(file: RecordingFile, source: SourceSelection): Promise<FinalFile | null> {
    let final: FinalFile | null = null
    try {
      final = await file.encoder.close()
      this.deps.journal.remove(file.path)
      this.deps.addToHistory({
        id: randomUUID(),
        path: final.path,
        name: basename(final.path),
        format: final.format,
        durationMs: final.durationMs,
        sizeBytes: final.sizeBytes,
        createdAt: file.createdAt,
        source
      })
      this.deps.log.info(
        `recording saved: ${final.path} (${final.format}, ${Math.round(final.durationMs)} ms)`
      )
    } catch (error) {
      this.deps.fail(`Could not save the recording: ${(error as Error).message}`)
    }
    await file.live?.end(final?.path ?? null)
    return final
  }

  /** Stops at once, keeping the `.part` for the recovery. */
  async abort(file: RecordingFile): Promise<void> {
    await file.encoder.abort()
    await file.live?.end(null)
  }

  /** Drops a file that never got any audio, `.part` included. */
  async discard(file: RecordingFile): Promise<void> {
    await file.encoder.discard()
    this.deps.journal.remove(file.path)
    await file.live?.end(null)
  }
}
