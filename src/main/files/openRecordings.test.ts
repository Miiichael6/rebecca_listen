import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import { OpenRecordings } from './openRecordings'
import type { OpenRecording } from './partFiles'

const dir = mkdtempSync(join(tmpdir(), 'rl-journal-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const recording = (path: string): OpenRecording => ({
  path,
  createdAt: 1,
  source: { mode: 'system' }
})

describe('OpenRecordings', () => {
  it('adds, lists and removes, and survives a new instance', () => {
    const file = join(dir, 'list.json')
    const journal = new OpenRecordings(file)
    expect(journal.list()).toEqual([])
    journal.add(recording('a.mp3'))
    journal.add(recording('b.wav'))
    journal.add(recording('a.mp3'))
    journal.remove('b.wav')
    expect(new OpenRecordings(file).list()).toEqual([recording('a.mp3')])
  })

  it('reads a damaged file as empty and skips entries that are not recordings', () => {
    const damaged = join(dir, 'damaged.json')
    writeFileSync(damaged, '[{"path": "a.mp3", "createdAt"')
    expect(new OpenRecordings(damaged).list()).toEqual([])

    const mixed = join(dir, 'mixed.json')
    writeFileSync(mixed, JSON.stringify([recording('ok.mp3'), { path: 3 }, null, 'x']))
    expect(new OpenRecordings(mixed).list()).toEqual([recording('ok.mp3')])
  })
})
