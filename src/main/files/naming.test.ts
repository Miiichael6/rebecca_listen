import { join } from 'path'
import { describe, expect, it, vi } from 'vitest'
import { buildFileName } from '@shared/naming'

// `naming.ts` imports `app` only for the default folder, which is not tested here.
vi.mock('electron', () => ({ app: { getPath: () => '' } }))

const { freePath } = await import('./naming')

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
