/**
 * Integration: a real ffmpeg is killed while encoding, like a crash of the
 * app, and the `.part` it leaves is repaired and read back with `ffmpeg -i`.
 */

import { spawn, spawnSync } from 'child_process'
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { sine } from '../audio/dsp/testSignals'
import { PART_SUFFIX, type OutputSettings, type PcmFormat } from '../audio/encoder/Encoder'
import { ffmpegArgs } from '../audio/encoder/ffmpegArgs'
import { ffmpegPath } from '../audio/encoder/ffmpegBinary'
import { parseDurationMs } from '../audio/encoder/ffmpegDuration'
import { repairPart } from './recovery'
import type { UnfinishedRecording } from './partFiles'

vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const INPUT: PcmFormat = { sampleRate: 48000, channels: 2 }
const SECONDS = 5
const TIMEOUT_MS = 20_000
/** The `.part` is taken as flushed once its size has not changed for this long. */
const SETTLE_MS = 300

const OUTPUTS: Record<string, OutputSettings> = {
  MP3: { format: 'mp3', sampleRate: 48000, channels: 2, mode: 'cbr', bitrateKbps: 192, quality: 2 },
  WAV: { format: 'wav', sampleRate: 48000, channels: 2, bitDepth: 16 }
}

const dir = mkdtempSync(join(tmpdir(), 'rl-recovery-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

function unfinished(path: string, format: UnfinishedRecording['format']): UnfinishedRecording {
  return { path, partPath: `${path}${PART_SUFFIX}`, format }
}

function durationMs(path: string): number | null {
  return parseDurationMs(
    spawnSync(ffmpegPath(), ['-hide_banner', '-i', path], { encoding: 'utf8' }).stderr
  )
}

/** Resolves once the file stops growing: ffmpeg wrote all it was given. */
async function settled(path: string): Promise<void> {
  let last = -1
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))
    const size = existsSync(path) ? statSync(path).size : 0
    if (size > 0 && size === last) return
    last = size
  }
}

/** Encodes `SECONDS` of sine to `<path>.part` and kills ffmpeg before it can finish the file. */
async function crashWhileEncoding(path: string, output: OutputSettings): Promise<void> {
  const partPath = `${path}${PART_SUFFIX}`
  const child = spawn(ffmpegPath(), ffmpegArgs(INPUT, output, partPath), { windowsHide: true })
  const exited = new Promise((resolve) => child.once('close', resolve))
  child.stdin.on('error', () => {})
  const samples = sine(440, 0.5, SECONDS, INPUT.sampleRate, INPUT.channels)
  child.stdin.write(Buffer.from(samples.buffer))
  await settled(partPath)
  child.kill('SIGKILL')
  await exited
}

describe('repairPart', () => {
  it.each(Object.keys(OUTPUTS))(
    'recovers a %s whose ffmpeg was killed',
    async (name) => {
      const output = OUTPUTS[name]
      const path = join(dir, `killed.${output.format}`)
      await crashWhileEncoding(path, output)

      const recovered = await repairPart(ffmpegPath(), unfinished(path, output.format))

      expect(recovered.path).toBe(path)
      expect(existsSync(`${path}${PART_SUFFIX}`)).toBe(false)
      expect(recovered.sizeBytes).toBe(statSync(path).size)
      // An MP3 loses at most the frames the encoder still held.
      expect(recovered.durationMs).toBeGreaterThan((SECONDS - 1) * 1000)
      expect(durationMs(path)).toBe(recovered.durationMs)
    },
    TIMEOUT_MS
  )

  it(
    'takes a free name when the final one is taken',
    async () => {
      const path = join(dir, 'taken.wav')
      writeFileSync(path, 'someone else')
      await crashWhileEncoding(path, OUTPUTS.WAV)

      const recovered = await repairPart(ffmpegPath(), unfinished(path, 'wav'))

      expect(recovered.path).toBe(join(dir, 'taken (1).wav'))
      expect(readFileSync(path, 'utf8')).toBe('someone else')
    },
    TIMEOUT_MS
  )

  it.each([
    ['empty', ''],
    ['unreadable', 'not audio at all'.repeat(100)]
  ])(
    'keeps an %s .part as it is and throws',
    async (name, contents) => {
      const path = join(dir, `${name}.mp3`)
      const partPath = `${path}${PART_SUFFIX}`
      writeFileSync(partPath, contents)

      await expect(repairPart(ffmpegPath(), unfinished(path, 'mp3'))).rejects.toThrow()

      expect(readFileSync(partPath, 'utf8')).toBe(contents)
      expect(existsSync(path)).toBe(false)
      expect(readdirSync(dir).filter((file) => file.startsWith(name))).toEqual([`${name}.mp3.part`])
    },
    TIMEOUT_MS
  )
})
