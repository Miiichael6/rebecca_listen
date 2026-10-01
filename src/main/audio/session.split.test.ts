/**
 * Integration: a recording split 5 times at random frames, written by the real
 * ffmpeg as 16-bit WAV. Every sample of the input is a different number, so
 * joining the files back gives the input exactly or shows the gap or the
 * repeat.
 */

import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import type { NewHistoryItem } from '@shared/types'
import type { CaptureTap } from './capture'
import type { OutputSettings } from './encoder/Encoder'
import { FfmpegEncoder } from './encoder/FfmpegEncoder'
import { ffmpegPath } from './encoder/ffmpegBinary'
import { RecordingSession } from './session'

const RATE = 48_000
const CHANNELS = 2
const SECONDS = 10
const SPLITS = 5
/** Frames per block, like the 10 ms blocks of the sidecar. */
const BLOCK_FRAMES = 480
const INT16_SCALE = 32_768
const TIMEOUT_MS = 30_000

const WAV_16: OutputSettings = { format: 'wav', sampleRate: RATE, channels: CHANNELS, bitDepth: 16 }

const dir = mkdtempSync(join(tmpdir(), 'rl-split-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

/** Sample i = i, wrapped to 16 bits: exact in f32 and in the WAV. */
const rampValue = (i: number): number => (i % (2 * INT16_SCALE)) - INT16_SCALE

function ramp(frames: number): Float32Array {
  return Float32Array.from({ length: frames * CHANNELS }, (_, i) => rampValue(i) / INT16_SCALE)
}

/** The 16-bit samples of the `data` chunk of a WAV file. */
function readWavSamples(path: string): Int16Array {
  const bytes = readFileSync(path)
  let at = 12
  while (at < bytes.length) {
    const id = bytes.toString('ascii', at, at + 4)
    const size = bytes.readUInt32LE(at + 4)
    if (id === 'data') {
      const data = bytes.subarray(at + 8, at + 8 + size)
      return new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
    }
    at += 8 + size + (size % 2)
  }
  throw new Error(`No data chunk in ${path}`)
}

function recordingSession(): {
  session: RecordingSession
  history: NewHistoryItem[]
  push: (samples: Float32Array) => void
} {
  let data: (samples: Float32Array) => void = () => {}
  let files = 0
  const history: NewHistoryItem[] = []
  const tap: CaptureTap = {
    input: {
      kind: 'single',
      device: {
        id: 'fake',
        name: 'Fake',
        groupName: 'Test',
        kind: 'capture',
        isDefault: true,
        channels: CHANNELS,
        sampleRate: RATE
      }
    },
    source: { mode: 'voice' },
    fellBack: false,
    sampleRate: RATE,
    channels: CHANNELS,
    onData: (listener) => (data = listener),
    onLost: () => {},
    release: () => {}
  }
  const session = new RecordingSession({
    capture: { acquire: async () => tap },
    createEncoder: () => new FfmpegEncoder({ binary: ffmpegPath(), warn: () => {} }),
    nextFile: () => ({ path: join(dir, `part ${files++}.wav`), output: WAV_16 }),
    addToHistory: (item) => history.push(item),
    journal: { add: () => {}, remove: () => {} },
    emit: { state: () => {}, notice: () => {} },
    log: { info: () => {}, warn: () => {} }
  })
  return { session, history, push: (samples) => data(samples) }
}

describe('RecordingSession · split into WAV', () => {
  it(
    'joins back into the exact input after 5 random splits',
    async () => {
      const { session, history, push } = recordingSession()
      const input = ramp(SECONDS * RATE)
      const blocks = input.length / (BLOCK_FRAMES * CHANNELS)
      const splitAfter = new Set<number>()
      while (splitAfter.size < SPLITS) splitAfter.add(1 + Math.floor(Math.random() * (blocks - 2)))

      await session.record()
      for (let block = 0; block < blocks; block += 1) {
        const start = block * BLOCK_FRAMES * CHANNELS
        push(input.subarray(start, start + BLOCK_FRAMES * CHANNELS))
        if (splitAfter.has(block)) await session.split(Math.floor(Math.random() * BLOCK_FRAMES))
      }
      await session.stop()

      expect(history).toHaveLength(SPLITS + 1)
      // The files a split leaves behind are saved in the background, in any order.
      const inOrder = history.map((item) => item.path).sort()
      const joined = inOrder.flatMap((path) => [...readWavSamples(path)])
      const expected = Array.from({ length: input.length }, (_, i) => rampValue(i))
      expect(joined.length).toBe(expected.length)
      expect(joined).toEqual(expected)
    },
    TIMEOUT_MS
  )
})
