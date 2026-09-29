import { LOG_MAX_FILES, LOG_MAX_SIZE_BYTES } from '@shared/defaults'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rotateLogFiles } from './rotation'

const BASE = 'main'

let dir = ''
const logPath = (): string => join(dir, `${BASE}.log`)

/** One rotation cycle: electron-log recreates `main.log` right after. */
function rotate(contents: string, maxFiles = LOG_MAX_FILES): void {
  writeFileSync(logPath(), contents)
  rotateLogFiles(dir, BASE, logPath(), maxFiles)
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rebecca-log-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('rotateLogFiles', () => {
  it('turns the file that filled up into the first archive', () => {
    rotate('first')
    expect(existsSync(logPath())).toBe(false)
    expect(readFileSync(join(dir, 'main.1.log'), 'utf8')).toBe('first')
  })

  it('never keeps more files than the limit, dropping the oldest', () => {
    for (const contents of ['first', 'second', 'third', 'fourth', 'fifth']) rotate(contents)

    expect(readdirSync(dir).sort()).toEqual(['main.1.log', 'main.2.log'])
    // With LOG_MAX_FILES = 3 only the two newest survive; `first` is long gone.
    expect(readFileSync(join(dir, 'main.1.log'), 'utf8')).toBe('fifth')
    expect(readFileSync(join(dir, 'main.2.log'), 'utf8')).toBe('fourth')
  })

  it('keeps main.log plus LOG_MAX_FILES - 1 archives while the app runs', () => {
    for (const contents of ['first', 'second', 'third']) rotate(contents)
    writeFileSync(logPath(), 'live')

    expect(readdirSync(dir)).toHaveLength(LOG_MAX_FILES)
  })

  it('just deletes the file when no archive is allowed', () => {
    rotate('only', 1)
    expect(readdirSync(dir)).toEqual([])
  })
})

describe('log limits of the spec (§13: 5 MB x 3)', () => {
  it('rotates at 5 MB and keeps 3 files', () => {
    expect(LOG_MAX_SIZE_BYTES).toBe(5 * 1024 * 1024)
    expect(LOG_MAX_FILES).toBe(3)
  })
})
