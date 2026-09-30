/**
 * What the recording session needs from a live transcription (task 46): a
 * place to send the blocks it writes, and a way to say the file is done.
 * `rebeccaWrites/liveLink.ts` implements it; the tests use a fake.
 */

export interface LiveRecording {
  /** File being recorded; the live entry is named after it. */
  path: string
  startedAt: number
  sampleRate: number
  channels: number
}

export interface LiveSink {
  /** The same interleaved f32 blocks the encoder gets, silence fills included. */
  write(samples: Float32Array): void
  /** The recording ended as `finalPath`, or was aborted (`null`). Never throws. */
  end(finalPath: string | null): Promise<void>
}

export interface LiveLink {
  /** A live transcription of the recording that opens; `null` when it is off or cannot start. */
  start(recording: LiveRecording): Promise<LiveSink | null>
}
