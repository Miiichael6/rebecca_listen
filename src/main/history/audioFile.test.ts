import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { describeAudioFile, formatOfPath } from './audioFile'

const folder = mkdtempSync(join(tmpdir(), 'rl-audio-file-'))
afterAll(() => rmSync(folder, { recursive: true, force: true }))

describe('formatOfPath', () => {
  it('reads mp3 and wav in any case, nothing else', () => {
    expect(formatOfPath(join('a', 'song.MP3'))).toBe('mp3')
    expect(formatOfPath('take.wav')).toBe('wav')
    expect(formatOfPath('take.ogg')).toBeNull()
    expect(formatOfPath('noext')).toBeNull()
  })
})

describe('describeAudioFile', () => {
  it('describes a file as a list item without a source', async () => {
    const path = join(folder, 'song.mp3')
    writeFileSync(path, 'abcd')
    const item = await describeAudioFile(path, async () => 1234)
    expect(item).toMatchObject({
      path,
      name: 'song.mp3',
      format: 'mp3',
      durationMs: 1234,
      sizeBytes: 4,
      source: null
    })
  })

  it('rejects other formats and files without audio', async () => {
    const path = join(folder, 'noise.wav')
    writeFileSync(path, 'x')
    await expect(describeAudioFile(join(folder, 'a.ogg'), async () => 1)).rejects.toThrow(/mp3/)
    await expect(describeAudioFile(path, async () => null)).rejects.toThrow(/No audio/)
  })
})
