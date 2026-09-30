/**
 * Integration: Convert to, Merge all to one and the Tag Editor with the real
 * ffmpeg of `ffmpeg-static` on short generated tones.
 */

import { spawnSync } from 'child_process'
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { AudioFormat } from '@shared/types'
import { ffmpegPath } from '../../audio/encoder/ffmpegBinary'
import { convert, mergeAll, readTags, writeTags, type AudioEditTools } from './audioEdits'
import { history, HISTORY_FILE_NAME, initHistory } from '..'
import { EMPTY_TAGS } from './tags'

const TIMEOUT_MS = 30_000
const { mp3, wav } = DEFAULT_SETTINGS.files
const tools: AudioEditTools = { ffmpeg: ffmpegPath(), formats: { mp3, wav } }
const log = { info: (): void => {}, warn: (): void => {} }

const root = mkdtempSync(join(tmpdir(), 'rl-audio-edits-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
let folder = ''

beforeEach(() => {
  folder = mkdtempSync(join(root, 'case-'))
  initHistory(join(folder, HISTORY_FILE_NAME), log)
})

/** A tone of `seconds` written by ffmpeg and added to the list. */
function tone(name: string, format: AudioFormat, seconds: number, rate = 48000): string {
  const path = join(folder, name)
  const made = spawnSync(ffmpegPath(), [
    ...['-hide_banner', '-loglevel', 'error', '-f', 'lavfi'],
    ...['-i', `sine=frequency=440:duration=${seconds}:sample_rate=${rate}`, path]
  ])
  expect(made.status).toBe(0)
  const id = name
  history.add({
    id,
    path,
    name,
    format,
    durationMs: seconds * 1000,
    sizeBytes: statSync(path).size,
    createdAt: 1,
    source: { mode: 'system' }
  })
  return id
}

describe('convert', () => {
  it(
    'writes a copy in the other format next to the file, keeping its tags',
    async () => {
      const id = tone('take.mp3', 'mp3', 1)
      await writeTags(tools.ffmpeg, id, { ...EMPTY_TAGS, title: 'Take', artist: 'Me' })

      const copy = await convert(tools, id, 'wav')
      expect(copy.name).toBe('take.wav')
      expect(existsSync(copy.path)).toBe(true)
      expect(await readTags(tools.ffmpeg, copy.id)).toMatchObject({ title: 'Take', artist: 'Me' })
      expect(history.list().map((item) => item.format)).toEqual(['wav', 'mp3'])
    },
    TIMEOUT_MS
  )

  it(
    'never overwrites: a name that is taken gets a number',
    async () => {
      const id = tone('take.wav', 'wav', 1)
      tone('take.mp3', 'mp3', 1)
      const copy = await convert(tools, id, 'mp3')
      expect(copy.name).toBe('take (1).mp3')
      await expect(convert(tools, id, 'wav')).rejects.toThrow('already WAV')
    },
    TIMEOUT_MS
  )
})

describe('mergeAll', () => {
  it(
    'joins the files of the list, oldest first, even with different rates',
    async () => {
      tone('a.wav', 'wav', 1, 44100)
      tone('b.mp3', 'mp3', 2, 48000)
      const merged = await mergeAll(tools, 'wav', new Date(2026, 8, 29, 10, 5, 7))
      expect(merged.name).toBe('Merged [2026-09-29][10-05-07].wav')
      expect(merged.durationMs).toBeGreaterThan(2900)
      expect(merged.durationMs).toBeLessThan(3200)
      expect(history.list()[0].id).toBe(merged.id)
    },
    TIMEOUT_MS
  )

  it('needs two files', async () => {
    tone('a.wav', 'wav', 1)
    await expect(mergeAll(tools, 'mp3', new Date())).rejects.toThrow('at least two')
  })
})

describe('tags', () => {
  it(
    'rewrites the tags in place, removes emptied ones and leaves no temporary file',
    async () => {
      for (const format of ['mp3', 'wav'] as const) {
        const id = tone(`t.${format}`, format, 1)
        const tags = { ...EMPTY_TAGS, title: 'T=1;x', album: 'Album', year: '2026' }
        const items = await writeTags(tools.ffmpeg, id, tags)
        expect(await readTags(tools.ffmpeg, id)).toEqual(tags)
        expect(items.find((item) => item.id === id)?.sizeBytes).toBe(
          statSync(join(folder, `t.${format}`)).size
        )

        await writeTags(tools.ffmpeg, id, { ...tags, album: '' })
        expect((await readTags(tools.ffmpeg, id)).album).toBe('')
      }
      expect(readdirSync(folder).filter((name) => name.includes('tmp'))).toEqual([])
    },
    TIMEOUT_MS
  )
})
