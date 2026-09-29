/**
 * Writes a WAV to `<path>.part` and renames it to `<path>` once closed, so a
 * finished name always means a complete file.
 */

import { closeSync, openSync, renameSync, writeSync } from 'fs'
import { WAV_HEADER_BYTES, floatToPcm16, pcm16Bytes, wavHeader } from './wav'

export class WavWriter {
  private readonly fd: number
  private readonly partPath: string
  private dataBytes = 0
  private closed = false

  constructor(
    readonly path: string,
    readonly sampleRate: number,
    readonly channels: number
  ) {
    this.partPath = `${path}.part`
    this.fd = openSync(this.partPath, 'w')
    writeSync(this.fd, wavHeader(0, sampleRate, channels))
  }

  /** Recorded length so far, from the frames written. */
  get durationMs(): number {
    return (this.dataBytes / pcm16Bytes(1, this.channels) / this.sampleRate) * 1000
  }

  get sizeBytes(): number {
    return WAV_HEADER_BYTES + this.dataBytes
  }

  write(samples: Float32Array): void {
    if (this.closed || samples.length === 0) return
    const pcm = floatToPcm16(samples)
    writeSync(this.fd, pcm)
    this.dataBytes += pcm.length
  }

  writeSilence(frames: number): void {
    if (frames > 0) this.write(new Float32Array(frames * this.channels))
  }

  /** Fixes the header sizes and gives the file its final name. */
  close(): void {
    if (this.closed) return
    this.closed = true
    writeSync(
      this.fd,
      wavHeader(this.dataBytes, this.sampleRate, this.channels),
      0,
      WAV_HEADER_BYTES,
      0
    )
    closeSync(this.fd)
    renameSync(this.partPath, this.path)
  }
}
