import { mkdtempSync, readFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { floatToPcm16, wavHeader } from './wav'
import { WavWriter } from './WavWriter'

describe('wavHeader', () => {
  it('describes 16-bit PCM with the given sizes', () => {
    const header = wavHeader(1000, 48000, 2)
    expect(header.toString('ascii', 0, 4)).toBe('RIFF')
    expect(header.readUInt32LE(4)).toBe(1036)
    expect(header.readUInt16LE(22)).toBe(2)
    expect(header.readUInt32LE(24)).toBe(48000)
    expect(header.readUInt32LE(28)).toBe(48000 * 4)
    expect(header.readUInt16LE(34)).toBe(16)
    expect(header.readUInt32LE(40)).toBe(1000)
  })
})

describe('floatToPcm16', () => {
  it('maps full scale and clips beyond it', () => {
    const pcm = floatToPcm16(new Float32Array([0, 1, -1, 2, -2]))
    expect([0, 1, 2, 3, 4].map((i) => pcm.readInt16LE(i * 2))).toEqual([
      0, 32767, -32768, 32767, -32768
    ])
  })
})

describe('WavWriter', () => {
  it('writes through a .part file and fixes the header on close', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'rl-wav-')), 'take.wav')
    const writer = new WavWriter(path, 8000, 1)
    writer.write(new Float32Array([0.5, -0.5]))
    writer.writeSilence(8000)
    expect(existsSync(`${path}.part`)).toBe(true)
    expect(writer.durationMs).toBeCloseTo(1000.25)

    writer.close()
    expect(existsSync(`${path}.part`)).toBe(false)
    const file = readFileSync(path)
    expect(file.length).toBe(44 + 8002 * 2)
    expect(file.readUInt32LE(40)).toBe(8002 * 2)
    expect(file.readInt16LE(44)).toBe(Math.round(0.5 * 32767))
  })
})
