/**
 * Rebuilds the PCM blocks the sidecar writes on stdout (see
 * `native/PROTOCOL.md`), whatever the chunk boundaries are:
 *
 * `[streamId u8][channels u16 LE][frameCount u32 LE][frameCount × channels × f32 LE]`
 */

export const HEADER_BYTES = 7

export interface PcmBlock {
  streamId: number
  channels: number
  /** Interleaved samples, `frames × channels` long. */
  samples: Float32Array
}

export class FrameDemuxer {
  private chunks: Buffer[] = []
  private buffered = 0

  constructor(private readonly onBlock: (block: PcmBlock) => void) {}

  push(chunk: Buffer): void {
    this.chunks.push(chunk)
    this.buffered += chunk.length
    if (this.buffered < HEADER_BYTES) return

    let data = Buffer.concat(this.chunks, this.buffered)
    let offset = 0
    while (data.length - offset >= HEADER_BYTES) {
      const channels = data.readUInt16LE(offset + 1)
      const frames = data.readUInt32LE(offset + 3)
      const length = HEADER_BYTES + frames * channels * 4
      if (data.length - offset < length) break

      const samples = new Float32Array(frames * channels)
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = data.readFloatLE(offset + HEADER_BYTES + index * 4)
      }
      this.onBlock({ streamId: data.readUInt8(offset), channels, samples })
      offset += length
    }

    data = data.subarray(offset)
    this.chunks = data.length > 0 ? [data] : []
    this.buffered = data.length
  }
}
