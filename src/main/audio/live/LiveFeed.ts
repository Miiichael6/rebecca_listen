/**
 * The growing PCM file RebeccaWrites reads while the recording goes on (task
 * 46): blocks of the recording come in as f32, go out as s16le mono 16 kHz,
 * appended in order. A write error is reported once and the feed goes quiet;
 * the recording itself never hears about it.
 */

import { createWriteStream, type WriteStream } from 'fs'
import { mkdir, rm } from 'fs/promises'
import { dirname } from 'path'
import { Pcm16kConverter } from './pcm16k'

export interface LiveFeedOptions {
  path: string
  /** Rate and channels of the blocks that will be written. */
  sampleRate: number
  channels: number
  onError: (error: Error) => void
}

export class LiveFeed {
  private failed = false

  private constructor(
    readonly path: string,
    private readonly stream: WriteStream,
    private readonly converter: Pcm16kConverter,
    private readonly onError: (error: Error) => void
  ) {
    stream.on('error', (error) => this.fail(error))
  }

  /** Creates the file (and its folder), empty, before anyone is told to read it. */
  static async open({ path, sampleRate, channels, onError }: LiveFeedOptions): Promise<LiveFeed> {
    await mkdir(dirname(path), { recursive: true })
    const stream = createWriteStream(path, { flags: 'w' })
    await new Promise<void>((resolve, reject) => {
      stream.once('ready', () => resolve())
      stream.once('error', reject)
    })
    return new LiveFeed(path, stream, new Pcm16kConverter(sampleRate, channels), onError)
  }

  write(samples: Float32Array): void {
    if (this.failed) return
    const bytes = this.converter.convert(samples)
    if (bytes.length > 0) this.stream.write(bytes)
  }

  /** Writes what the resampler held back and closes the file. */
  async close(): Promise<void> {
    const tail = this.failed ? Buffer.alloc(0) : this.converter.flush()
    await new Promise<void>((resolve) => {
      this.stream.once('close', () => resolve())
      this.stream.end(tail)
    })
  }

  /** Closes and deletes the file: nobody is going to read it. */
  async discard(): Promise<void> {
    await this.close()
    await rm(this.path, { force: true })
  }

  private fail(error: Error): void {
    if (this.failed) return
    this.failed = true
    this.onError(error)
  }
}
