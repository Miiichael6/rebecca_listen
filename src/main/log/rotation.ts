/**
 * Log rotation on disk (spec §13: 5 MB x 3).
 *
 * `electron-log` calls this once `main.log` passes its maximum size and then
 * recreates an empty one. Only `fs` is used here, no `electron`, so the shifting
 * is unit tested against a real folder.
 */

import { existsSync, renameSync, rmSync } from 'fs'
import { join } from 'path'

/** Archive 1 is the most recent one: `main.1.log`, `main.2.log`... */
export function archivePath(dir: string, baseName: string, index: number): string {
  return join(dir, `${baseName}.${index}.log`)
}

/**
 * Drops the oldest archive, shifts the rest one number up and turns the file
 * that just filled up into archive 1.
 *
 * `maxFiles` counts the live `main.log` itself, so at most `maxFiles - 1`
 * archives are kept and the folder never holds more than `maxFiles` log files.
 */
export function rotateLogFiles(
  dir: string,
  baseName: string,
  fullLogPath: string,
  maxFiles: number
): void {
  const archives = maxFiles - 1
  if (archives < 1) {
    rmSync(fullLogPath, { force: true })
    return
  }

  const pathOf = (index: number): string => archivePath(dir, baseName, index)
  rmSync(pathOf(archives), { force: true })
  for (let index = archives - 1; index >= 1; index--) {
    if (existsSync(pathOf(index))) renameSync(pathOf(index), pathOf(index + 1))
  }
  renameSync(fullLogPath, pathOf(1))
}
