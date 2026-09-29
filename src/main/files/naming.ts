/**
 * Where a new recording goes: the folder of the settings (by default
 * `<Desktop>/Rebecca Listen Recordings`, created if missing) and a free name
 * that never overwrites a file or a `.part` still being written.
 */

import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { DEFAULT_FOLDER_NAME, NAME_COLLISION_SUFFIX } from '@shared/defaults'
import { buildBaseName } from '@shared/naming'
import type { AudioFormat } from '@shared/types'

export function recordingsFolder(configured: string): string {
  return configured || join(app.getPath('desktop'), DEFAULT_FOLDER_NAME)
}

/** First free `<base>.<ext>`, `<base> (1).<ext>`... in `folder`. */
export function freePath(
  folder: string,
  base: string,
  format: AudioFormat,
  exists: (path: string) => boolean = existsSync
): string {
  const taken = (path: string): boolean => exists(path) || exists(`${path}.part`)
  let path = join(folder, `${base}.${format}`)
  for (let n = 1; taken(path); n += 1) {
    path = join(folder, `${base}${NAME_COLLISION_SUFFIX(n)}.${format}`)
  }
  return path
}

/** Creates the folder if needed; throws with a readable message if it cannot. */
export function resolveOutputPath(
  configuredFolder: string,
  now: Date,
  format: AudioFormat
): string {
  const folder = recordingsFolder(configuredFolder)
  try {
    mkdirSync(folder, { recursive: true })
  } catch (error) {
    throw new Error(`Cannot create the recordings folder ${folder}: ${(error as Error).message}`)
  }
  return freePath(folder, buildBaseName(now), format)
}
