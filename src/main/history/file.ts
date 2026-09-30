/**
 * `userData/history.json` (spec §13): the recordings of the list, newest
 * first. Whether each file still exists is not stored, it is checked on load.
 *
 * Written to a temporary file and renamed, so a crash while writing leaves the
 * old list instead of half a JSON. A file that cannot be read as a list is set
 * aside as `history.json.damaged` instead of being overwritten.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { AUDIO_FORMATS } from '@shared/defaults'
import type { HistoryItem, NewHistoryItem } from '@shared/types'

export const HISTORY_FILE_NAME = 'history.json'
const TEMP_SUFFIX = '.tmp'
/** Windows refuses a rename for a moment while an antivirus or the indexer reads the file. */
const RENAME_ATTEMPTS = 5
const RENAME_RETRY_MS = 20
const BUSY_CODES = ['EPERM', 'EACCES', 'EBUSY']
export const DAMAGED_SUFFIX = '.damaged'

export interface HistoryFileContents {
  entries: NewHistoryItem[]
  /** Entries left out because they are not recordings (hand-edited file). */
  dropped: number
  /** The file was not a JSON list and has been set aside. */
  damaged: boolean
}

export class HistoryFile {
  constructor(readonly path: string) {}

  /** A missing file reads as an empty list. */
  read(): HistoryFileContents {
    if (!existsSync(this.path)) return { entries: [], dropped: 0, damaged: false }
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(this.path, 'utf8'))
    } catch {
      parsed = null
    }
    if (!Array.isArray(parsed)) {
      renameSync(this.path, this.path + DAMAGED_SUFFIX)
      return { entries: [], dropped: 0, damaged: true }
    }
    const entries = parsed.filter(isStoredItem)
    return { entries, dropped: parsed.length - entries.length, damaged: false }
  }

  write(items: HistoryItem[]): void {
    const temp = this.path + TEMP_SUFFIX
    writeFileSync(temp, JSON.stringify(items.map(toStored), null, 2))
    renameWithRetry(temp, this.path)
  }
}

/** Waits a little longer after each refused try; the write stays synchronous. */
function renameWithRetry(from: string, to: string): void {
  for (let attempt = 1; ; attempt += 1) {
    try {
      renameSync(from, to)
      return
    } catch (error) {
      const busy = BUSY_CODES.includes((error as NodeJS.ErrnoException).code ?? '')
      if (!busy || attempt >= RENAME_ATTEMPTS) throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, RENAME_RETRY_MS * attempt)
    }
  }
}

/** The item without what is checked on load. */
function toStored(item: HistoryItem): NewHistoryItem {
  const entry: Partial<HistoryItem> = { ...item }
  delete entry.exists
  return entry as NewHistoryItem
}

function isStoredItem(value: unknown): value is NewHistoryItem {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  const source = entry['source']
  return (
    typeof entry['id'] === 'string' &&
    typeof entry['path'] === 'string' &&
    typeof entry['name'] === 'string' &&
    AUDIO_FORMATS.includes(entry['format'] as HistoryItem['format']) &&
    typeof entry['durationMs'] === 'number' &&
    typeof entry['sizeBytes'] === 'number' &&
    typeof entry['createdAt'] === 'number' &&
    (source === null ||
      (typeof source === 'object' && typeof (source as { mode?: unknown }).mode === 'string'))
  )
}
