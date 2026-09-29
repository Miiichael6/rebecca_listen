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
})
