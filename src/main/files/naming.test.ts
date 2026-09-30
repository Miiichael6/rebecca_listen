import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { buildFileName } from '@shared/naming'
import type { NamingSettings } from '@shared/types'

// `naming.ts` imports `app` only for the default folder, which is not tested here.
vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const { checkWritableFolder, freePath, plannedPath, resolveOutputPath, withExtension } =
  await import('./naming')

const naming = (folder: string, format: 'mp3' | 'wav' = 'mp3'): NamingSettings => ({
  ...DEFAULT_SETTINGS.files,
  folder,
  format
})

describe('buildFileName', () => {
  it('pads every field with zeros', () => {
    expect(buildFileName(new Date(2026, 0, 5, 7, 3, 9), 'wav')).toBe('[2026-01-05][07-03-09].wav')
    expect(buildFileName(new Date(2026, 11, 31, 23, 59, 58), 'mp3')).toBe(
      '[2026-12-31][23-59-58].mp3'
    )
  })
})

describe('freePath', () => {
  const folder = 'rec'

  it('keeps the name when it is free', () => {
    expect(freePath(folder, 'a', 'wav', () => false)).toBe(join(folder, 'a.wav'))
  })

  it('adds (1), (2)... on collisions', () => {
    const taken = new Set([join(folder, 'a.wav'), join(folder, 'a (1).wav')])
    expect(freePath(folder, 'a', 'wav', (p) => taken.has(p))).toBe(join(folder, 'a (2).wav'))
  })

  it('treats a .part being written as taken', () => {
    const taken = new Set([join(folder, 'a.wav.part')])
    expect(freePath(folder, 'a', 'wav', (p) => taken.has(p))).toBe(join(folder, 'a (1).wav'))
  })
})

describe('resolveOutputPath', () => {
  const root = mkdtempSync(join(tmpdir(), 'rl-naming-'))
  afterAll(() => rmSync(root, { recursive: true, force: true }))
  const now = new Date(2026, 8, 29, 9, 5, 7)

  it('creates the folder and leaves only the recordings in it', () => {
    const folder = join(root, 'a', 'Rebecca Listen Recordings')
    expect(resolveOutputPath(naming(folder), now)).toBe(join(folder, '[2026-09-29][09-05-07].mp3'))
    expect(existsSync(folder)).toBe(true)
    expect(readdirSync(folder)).toEqual([])
  })

  it('never returns a name that is already on disk', () => {
    const folder = join(root, 'b')
    const first = resolveOutputPath(naming(folder, 'wav'), now)
    writeFileSync(first, '')
    expect(resolveOutputPath(naming(folder, 'wav'), now)).toBe(
      join(folder, '[2026-09-29][09-05-07] (1).wav')
    )
  })

  it('explains a folder that cannot be created', () => {
    const blocker = join(root, 'file')
    writeFileSync(blocker, '')
    expect(() => resolveOutputPath(naming(join(blocker, 'rec')), now)).toThrow(
      /Cannot create the recordings folder/
    )
  })
})

describe('plannedPath', () => {
  const folder = 'rec'
  const now = new Date(2026, 8, 29, 9, 5, 7)

  it('puts the prefix before the chosen convention', () => {
    const files = { ...naming(folder, 'wav'), prefix: 'Call ', template: 'compact' as const }
    expect(plannedPath(files, now, () => false)).toBe(join(folder, 'Call 20260929_090507.wav'))
  })

  it('takes the first free number for the counter instead of (1)', () => {
    const files = { ...naming(folder), template: 'counter' as const }
    const taken = new Set([join(folder, 'Recording_001.mp3'), join(folder, 'Recording_002.mp3.part')])
    expect(plannedPath(files, now, (p) => taken.has(p))).toBe(join(folder, 'Recording_003.mp3'))
  })

  it('expands a custom pattern', () => {
    const files = { ...naming(folder), template: 'custom' as const, customPattern: '{DD}.{MM} {hh}h' }
    expect(plannedPath(files, now, () => false)).toBe(join(folder, '29.09 09h.mp3'))
  })
})

describe('withExtension', () => {
  it('adds the extension only when it is missing', () => {
    expect(withExtension('D:/a/talk', 'mp3')).toBe('D:/a/talk.mp3')
    expect(withExtension('D:/a/talk.MP3', 'mp3')).toBe('D:/a/talk.MP3')
  })
})

describe('checkWritableFolder', () => {
  const root = mkdtempSync(join(tmpdir(), 'rl-folder-'))
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('accepts a folder it can write in, leaving nothing behind', () => {
    const folder = join(root, 'chosen')
    expect(() => checkWritableFolder(folder)).not.toThrow()
    expect(readdirSync(folder)).toEqual([])
  })

  it('refuses a path that cannot be a folder', () => {
    const blocker = join(root, 'file')
    writeFileSync(blocker, '')
    expect(() => checkWritableFolder(blocker)).toThrow(/recordings folder/)
  })
})
