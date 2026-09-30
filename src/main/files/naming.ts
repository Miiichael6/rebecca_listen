/**
 * Where a new recording goes: the folder of the settings (by default
 * `<Desktop>/Rebecca Listen Recordings`, created if missing) and a free name
 * that never overwrites a file or a `.part` still being written.
 */

import { closeSync, existsSync, mkdirSync, openSync, rmSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { DEFAULT_FOLDER_NAME, NAME_COLLISION_SUFFIX, WRITE_PROBE_NAME } from '@shared/defaults'
import { buildNamedBase, namingPattern, usesCounter } from '@shared/naming'
import type { AudioFormat, NamingSettings } from '@shared/types'

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

/**
 * Creates the folder if needed and checks a file can be created in it, so a
 * recording never starts towards a folder it cannot write (`access(W_OK)`
 * only sees the read-only flag on Windows, not ACLs or Controlled Folder Access).
 */
export function checkWritableFolder(folder: string): void {
  try {
    mkdirSync(folder, { recursive: true })
  } catch (error) {
    throw new Error(`Cannot create the recordings folder ${folder}: ${(error as Error).message}`)
  }
  const probe = join(folder, WRITE_PROBE_NAME)
  try {
    closeSync(openSync(probe, 'w'))
    rmSync(probe)
  } catch (error) {
    throw new Error(`Cannot write in the recordings folder ${folder}: ${(error as Error).message}`)
  }
}

/**
 * The path the next recording would get, without touching the disk beyond
 * `exists`. With `{n}` in the pattern the first free number is used; any
 * other name gets ` (1)`, ` (2)`... on collisions.
 */
export function plannedPath(
  files: NamingSettings,
  now: Date,
  exists: (path: string) => boolean = existsSync
): string {
  const folder = recordingsFolder(files.folder)
  if (!usesCounter(namingPattern(files))) {
    return freePath(folder, buildNamedBase(files, now), files.format, exists)
  }
  const taken = (path: string): boolean => exists(path) || exists(`${path}.part`)
  let counter = 1
  const pathOf = (): string => join(folder, `${buildNamedBase(files, now, counter)}.${files.format}`)
  while (taken(pathOf())) counter += 1
  return pathOf()
}

/** Throws with a readable message if the folder cannot be created or written. */
export function resolveOutputPath(files: NamingSettings, now: Date): string {
  checkWritableFolder(recordingsFolder(files.folder))
  return plannedPath(files, now)
}

/** A name typed in "Save as" always ends in the extension of its format. */
export function withExtension(path: string, format: AudioFormat): string {
  return path.toLowerCase().endsWith(`.${format}`) ? path : `${path}.${format}`
}
