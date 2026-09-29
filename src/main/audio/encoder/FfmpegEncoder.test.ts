/**
 * Integration: runs the real ffmpeg of `ffmpeg-static` on synthetic PCM and
 * reads the result back with `ffmpeg -i`.
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { sine } from '../dsp/testSignals'
import type { EncoderProgress, OutputSettings, PcmFormat } from './Encoder'
import { FfmpegEncoder } from './FfmpegEncoder'
import { ffmpegPath } from './ffmpegBinary'

const INPUT: PcmFormat = { sampleRate: 48000, channels: 2 }
/** Frames per write, like the ~100 ms blocks of the sidecar. */
const BLOCK_FRAMES = 4800
const TIMEOUT_MS = 20_000

const MP3_CBR: OutputSettings = {
  format: 'mp3',
  sampleRate: 48000,
  channels: 2,
  mode: 'cbr',
  bitrateKbps: 192,
  quality: 2
}
const WAV_16: OutputSettings = { format: 'wav', sampleRate: 48000, channels: 2, bitDepth: 16 }

const dir = mkdtempSync(join(tmpdir(), 'rl-encoder-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

function newEncoder(): { encoder: FfmpegEncoder; warnings: string[] } {
  const warnings: string[] = []
  const encoder = new FfmpegEncoder({
    binary: ffmpegPath(),
    warn: (message) => warnings.push(message)
  })
  return { encoder, warnings }
}

async function writeSine(encoder: FfmpegEncoder, seconds: number): Promise<void> {
  const samples = sine(440, 0.5, seconds, INPUT.sampleRate, INPUT.channels)
  const block = BLOCK_FRAMES * INPUT.channels
  for (let start = 0; start < samples.length; start += block) {
    await encoder.write(samples.subarray(start, start + block))
  }
}

const LAYOUT_CHANNELS: Record<string, number> = { mono: 1, stereo: 2 }

/** What `ffmpeg -i` says about a file. A WAV without a layout reads as `1 channels`. */
function probe(path: string): { seconds: number; rate: number; channels: number } {
  const info = spawnSync(ffmpegPath(), ['-hide_banner', '-i', path], { encoding: 'utf8' }).stderr
  const [, hours, minutes, seconds] = /Duration: (\d+):(\d+):([\d.]+)/.exec(info) ?? []
  const [, rate, layout] = /Audio: .*?, (\d+) Hz, (mono|stereo|\d+ channels)/.exec(info) ?? []
  const channels = LAYOUT_CHANNELS[layout] ?? parseInt(layout)
  return { seconds: +hours * 3600 + +minutes * 60 + +seconds, rate: +rate, channels }
}

describe('FfmpegEncoder', () => {
  it.each<[string, OutputSettings, { rate: number; channels: number }]>([
    ['MP3 CBR stereo', MP3_CBR, { rate: 48000, channels: 2 }],
    [
      'MP3 VBR mono',
      { ...MP3_CBR, sampleRate: 44100, channels: 1, mode: 'vbr' },
      { rate: 44100, channels: 1 }
    ],
    ['WAV 24-bit stereo', { ...WAV_16, bitDepth: 24 }, { rate: 48000, channels: 2 }],
    [
      'WAV 16-bit mono resampled',
      { ...WAV_16, sampleRate: 22050, channels: 1 },
      { rate: 22050, channels: 1 }
    ]
  ])(
    'encodes 3 s of sine to %s',
    async (name, output, expected) => {
      const { encoder, warnings } = newEncoder()
      const path = join(dir, `${name}.${output.format}`)
      await encoder.open(path, INPUT, output)
      await writeSine(encoder, 3)
      const file = await encoder.close()

      expect(existsSync(path)).toBe(true)
      expect(existsSync(`${path}.part`)).toBe(false)
      expect(file).toMatchObject({ path, format: output.format, durationMs: 3000 })
      expect(file.sizeBytes).toBeGreaterThan(0)
      const info = probe(path)
      expect(info.seconds).toBeCloseTo(3, 1)
      expect(info).toMatchObject(expected)
      expect(warnings).toEqual([])
    },
    TIMEOUT_MS
  )

  it(
    'reports the size and duration while encoding',
    async () => {
      const { encoder } = newEncoder()
      const progress: EncoderProgress[] = []
      encoder.onProgress((update) => progress.push(update))
      await encoder.open(join(dir, 'progress.wav'), INPUT, WAV_16)
      await writeSine(encoder, 1)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      await encoder.close()

      const last = progress.at(-1)
      expect(last?.durationMs).toBe(1000)
      expect(last?.bytes).toBeGreaterThan(0)
    },
    TIMEOUT_MS
  )

  it(
    'leaves only the .part when aborted',
    async () => {
      const { encoder } = newEncoder()
      const path = join(dir, 'aborted.mp3')
      await encoder.open(path, INPUT, MP3_CBR)
      await writeSine(encoder, 1)
      await encoder.abort()

      expect(existsSync(`${path}.part`)).toBe(true)
      expect(existsSync(path)).toBe(false)
    },
    TIMEOUT_MS
  )

  it(
    'reports an ffmpeg that dies, logs its stderr and keeps no final file',
    async () => {
      const { encoder, warnings } = newEncoder()
      const errors: Error[] = []
      encoder.onError((error) => errors.push(error))
      const path = join(dir, 'broken.mp3')
      // LAME has no 7000 Hz: ffmpeg exits right after starting.
      await encoder.open(path, INPUT, { ...MP3_CBR, sampleRate: 7000 })
      await writeSine(encoder, 1)
      await expect.poll(() => errors.length).toBe(1)

      expect(errors[0].message).toMatch(/partial file was kept/)
      expect(warnings[0]).toMatch(/ffmpeg stopped while recording/)
      expect(existsSync(path)).toBe(false)
      await expect(encoder.close()).rejects.toThrow()
    },
    TIMEOUT_MS
  )
})
