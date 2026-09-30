/**
 * `userData/open-recordings.json`: the recordings being written right now. An
 * entry is added when a file opens and removed when it is saved, so after a
 * crash it still names the `.part` files, even in a folder that is no longer
 * the one of the settings.
 *
 * Written to a temporary file and renamed, so a crash while writing leaves
 * the old list instead of half a JSON.
 */

import { readFileSync, renameSync, writeFileSync } from 'fs'
import type { OpenRecording } from './partFiles'

const TEMP_SUFFIX = '.tmp'

export class OpenRecordings {
  constructor(private readonly file: string) {}

  /** The entries on disk; a missing or damaged file reads as none. */
  list(): OpenRecording[] {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.file, 'utf8'))
      return Array.isArray(parsed) ? parsed.filter(isOpenRecording) : []
    } catch {
      return []
    }
  }

  add(recording: OpenRecording): void {
    this.write([...this.list().filter((entry) => entry.path !== recording.path), recording])
  }

  remove(path: string): void {
    const entries = this.list()
    const kept = entries.filter((entry) => entry.path !== path)
    if (kept.length !== entries.length) this.write(kept)
  }

  private write(entries: OpenRecording[]): void {
    const temp = `${this.file}${TEMP_SUFFIX}`
    writeFileSync(temp, JSON.stringify(entries, null, 2))
    renameSync(temp, this.file)
  }
}

function isOpenRecording(value: unknown): value is OpenRecording {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  const source = entry['source'] as Record<string, unknown> | null
  return (
    typeof entry['path'] === 'string' &&
    typeof entry['createdAt'] === 'number' &&
    typeof source === 'object' &&
    source !== null &&
    typeof source['mode'] === 'string'
  )
}
