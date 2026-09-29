import { describe, expect, it } from 'vitest'
import { FrameDemuxer, HEADER_BYTES, type PcmBlock } from './frameDemuxer'

function block(streamId: number, channels: number, samples: number[]): Buffer {
  const frames = samples.length / channels
  const buffer = Buffer.alloc(HEADER_BYTES + samples.length * 4)
  buffer.writeUInt8(streamId, 0)
  buffer.writeUInt16LE(channels, 1)
  buffer.writeUInt32LE(frames, 3)
  samples.forEach((sample, index) => buffer.writeFloatLE(sample, HEADER_BYTES + index * 4))
  return buffer
}

function collect(): { blocks: PcmBlock[]; demuxer: FrameDemuxer } {
  const blocks: PcmBlock[] = []
  return { blocks, demuxer: new FrameDemuxer((b) => blocks.push(b)) }
}

describe('FrameDemuxer', () => {
  it('reads a whole block', () => {
    const { blocks, demuxer } = collect()
    demuxer.push(block(1, 2, [0.5, -0.5, 0.25, -0.25]))
    expect(blocks).toHaveLength(1)
    expect(blocks[0].streamId).toBe(1)
    expect(blocks[0].channels).toBe(2)
    expect(Array.from(blocks[0].samples)).toEqual([0.5, -0.5, 0.25, -0.25])
  })

  it('rebuilds a block split byte by byte', () => {
    const { blocks, demuxer } = collect()
    const data = block(2, 1, [0.5, 0.25, -1])
    for (const byte of data) demuxer.push(Buffer.from([byte]))
    expect(blocks).toHaveLength(1)
    expect(Array.from(blocks[0].samples)).toEqual([0.5, 0.25, -1])
  })

  it('rebuilds a header split across three chunks', () => {
    const { blocks, demuxer } = collect()
    const data = block(3, 2, [0.5, -0.5])
    demuxer.push(data.subarray(0, 2))
    demuxer.push(data.subarray(2, 5))
    expect(blocks).toHaveLength(0)
    demuxer.push(data.subarray(5))
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ streamId: 3, channels: 2 })
    expect(Array.from(blocks[0].samples)).toEqual([0.5, -0.5])
  })

  it('reads several interleaved streams from one chunk', () => {
    const { blocks, demuxer } = collect()
    demuxer.push(Buffer.concat([block(1, 2, [0, 0]), block(2, 1, [0.5]), block(1, 2, [1, 1])]))
    expect(blocks.map((b) => b.streamId)).toEqual([1, 2, 1])
  })

  it('accepts a block of zero frames', () => {
    const { blocks, demuxer } = collect()
    demuxer.push(Buffer.concat([block(1, 2, []), block(1, 2, [0.5, 0.5])]))
    expect(blocks.map((b) => b.samples.length)).toEqual([0, 2])
  })

  it('rebuilds a 1 kHz stereo sine exactly, whatever the chunk size', () => {
    const rate = 48_000
    const frames = rate / 10
    const sine = new Float32Array(frames * 2)
    for (let frame = 0; frame < frames; frame += 1) {
      const value = Math.sin((2 * Math.PI * 1000 * frame) / rate)
      sine[frame * 2] = value
      sine[frame * 2 + 1] = -value
    }
    const blockFrames = 480
    const blocksOut: Buffer[] = []
    for (let start = 0; start < frames; start += blockFrames) {
      blocksOut.push(block(1, 2, Array.from(sine.subarray(start * 2, (start + blockFrames) * 2))))
    }
    const data = Buffer.concat(blocksOut)

    for (const chunkSize of [1, 7, 1000, 4093, data.length]) {
      const { blocks, demuxer } = collect()
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        demuxer.push(data.subarray(offset, offset + chunkSize))
      }
      const rebuilt = Float32Array.from(blocks.flatMap((b) => Array.from(b.samples)))
      expect(rebuilt).toEqual(sine)
    }
  })
})
