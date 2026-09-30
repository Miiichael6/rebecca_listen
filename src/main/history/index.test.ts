import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NewHistoryItem } from '@shared/types'
import { history, HISTORY_FILE_NAME, initHistory } from '.'

const root = mkdtempSync(join(tmpdir(), 'rl-history-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

let folder = ''
let historyPath = ''
const log = { info: vi.fn(), warn: vi.fn() }

/** A fresh folder and history file for every test. */
beforeEach(() => {
  folder = mkdtempSync(join(root, 'case-'))
  historyPath = join(folder, HISTORY_FILE_NAME)
  log.info.mockClear()
  log.warn.mockClear()
  initHistory(historyPath, log)
})

/** Creates the file on disk and adds it to the list. */
function record(id: string, name: string): NewHistoryItem {
  const path = join(folder, name)
  writeFileSync(path, '')
  const item: NewHistoryItem = {
    id,
    path,
    name,
    format: 'mp3',
    durationMs: 5000,
    sizeBytes: 0,
    createdAt: 1,
    source: { mode: 'system' }
  }
  history.add(item)
  return item
}

function ids(): string[] {
  return history.list().map((item) => item.id)
}

describe('history: add and persistence', () => {
  it('lists the newest first and marks it as existing', () => {
    record('a', 'a.mp3')
    record('b', 'b.mp3')
    expect(ids()).toEqual(['b', 'a'])
    expect(history.list()[0].exists).toBe(true)
  })

  it('survives a restart, without storing `exists`', () => {
    record('a', 'a.mp3')
    record('b', 'b.mp3')
    expect(readFileSync(historyPath, 'utf8')).not.toContain('exists')

    initHistory(historyPath, log)
    expect(ids()).toEqual(['b', 'a'])
    expect(history.list()[1]).toMatchObject({ name: 'a.mp3', durationMs: 5000, exists: true })
  })

  it('pushes every change to its listeners', () => {
    const listener = vi.fn()
    history.onChange(listener)
    record('a', 'a.mp3')
    expect(listener).toHaveBeenLastCalledWith(history.list())
  })
})

describe('history: missing files', () => {
  it('marks a file deleted from disk when loading and when checking again', () => {
    const a = record('a', 'a.mp3')
    rmSync(a.path)
    initHistory(historyPath, log)
    expect(history.get('a')?.exists).toBe(false)

    writeFileSync(a.path, '')
    history.checkFiles()
    expect(history.get('a')?.exists).toBe(true)
  })

  it('refuses to rename or duplicate a file that is gone', async () => {
    const a = record('a', 'a.mp3')
    rmSync(a.path)
    await expect(history.rename('a', 'x')).rejects.toThrow(/no longer exists/)
    await expect(history.duplicate('a')).rejects.toThrow(/no longer exists/)
  })
})

describe('history: damaged file', () => {
  it('starts empty, logs it and sets the file aside', () => {
    writeFileSync(historyPath, '{ not json')
    initHistory(historyPath, log)
    expect(history.list()).toEqual([])
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'))
    expect(existsSync(`${historyPath}.damaged`)).toBe(true)
  })

  it('leaves out entries that are not recordings', () => {
    record('a', 'a.mp3')
    const stored: unknown[] = JSON.parse(readFileSync(historyPath, 'utf8'))
    writeFileSync(historyPath, JSON.stringify([...stored, { id: 'x' }, 42]))
    initHistory(historyPath, log)
    expect(ids()).toEqual(['a'])
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('2 invalid entries'))
  })
})

describe('history: rename', () => {
  it('renames the file on disk and in the list', async () => {
    const a = record('a', 'first.mp3')
    await history.rename('a', 'renamed')
    expect(history.get('a')).toMatchObject({
      name: 'renamed.mp3',
      path: join(folder, 'renamed.mp3')
    })
    expect(existsSync(a.path)).toBe(false)
    expect(existsSync(join(folder, 'renamed.mp3'))).toBe(true)
  })

  it('refuses a name already taken', async () => {
    record('a', 'first.mp3')
    record('b', 'second.mp3')
    await expect(history.rename('b', 'first')).rejects.toThrow(/already exists/)
    expect(existsSync(join(folder, 'second.mp3'))).toBe(true)
    expect(history.get('b')?.name).toBe('second.mp3')
  })
})

describe('history: duplicate, remove and clear', () => {
  it('copies the file and lists the copy first', async () => {
    record('a', 'third.mp3')
    const items = await history.duplicate('a')
    expect(items[0]).toMatchObject({ name: 'third - Copy.mp3', durationMs: 5000 })
    expect(items[0].id).not.toBe('a')
    expect(existsSync(join(folder, 'third - Copy.mp3'))).toBe(true)
  })

  it('removes from the list and keeps the file', () => {
    const a = record('a', 'a.mp3')
    record('b', 'b.mp3')
    expect(history.remove('a').map((item) => item.id)).toEqual(['b'])
    expect(existsSync(a.path)).toBe(true)
  })

  it('clears the list, also on disk', () => {
    record('a', 'a.mp3')
    history.clear()
    initHistory(historyPath, log)
    expect(history.list()).toEqual([])
  })

  it('finds an item by path regardless of case', () => {
    const a = record('a', 'a.mp3')
    expect(history.findByPath(a.path.toUpperCase())?.id).toBe('a')
  })
})
