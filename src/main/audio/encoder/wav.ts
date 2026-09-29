/**
 * 16-bit PCM WAV, written by main without ffmpeg: the header goes first with
 * zero sizes and is rewritten with the real ones when the file is closed.
 * MP3 arrives with the ffmpeg encoder (task 11).
 */

export const WAV_HEADER_BYTES = 44
const BYTES_PER_SAMPLE = 2

export function wavHeader(dataBytes: number, sampleRate: number, channels: number): Buffer {
  const header = Buffer.alloc(WAV_HEADER_BYTES)
  const blockAlign = channels * BYTES_PER_SAMPLE
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16) // fmt chunk size
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * blockAlign, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataBytes, 40)
  return header
}

/** f32 in -1..1 to s16 little endian, clipping whatever falls outside. */
export function floatToPcm16(samples: Float32Array): Buffer {
  const out = Buffer.alloc(samples.length * BYTES_PER_SAMPLE)
  for (let index = 0; index < samples.length; index += 1) {
    const clipped = Math.max(-1, Math.min(1, samples[index]))
    out.writeInt16LE(Math.round(clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff), index * 2)
  }
  return out
}

export function pcm16Bytes(frames: number, channels: number): number {
  return frames * channels * BYTES_PER_SAMPLE
}
