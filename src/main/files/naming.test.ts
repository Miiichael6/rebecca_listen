import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { buildFileName } from '@shared/naming'

// `naming.ts` imports `app` only for the default folder, which is not tested here.
vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const { freePath, resolveOutputPath } = await import('./naming')

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
    expect(resolveOutputPath(folder, now, 'mp3')).toBe(join(folder, '[2026-09-29][09-05-07].mp3'))
    expect(existsSync(folder)).toBe(true)
    expect(readdirSync(folder)).toEqual([])
  })

  it('never returns a name that is already on disk', () => {
    const folder = join(root, 'b')
    const first = resolveOutputPath(folder, now, 'wav')
    writeFileSync(first, '')
    expect(resolveOutputPath(folder, now, 'wav')).toBe(
      join(folder, '[2026-09-29][09-05-07] (1).wav')
    )
  })

  it('explains a folder that cannot be created', () => {
    const blocker = join(root, 'file')
    writeFileSync(blocker, '')
    expect(() => resolveOutputPath(join(blocker, 'rec'), now, 'mp3')).toThrow(
      /Cannot create the recordings folder/
    )
  })
})
