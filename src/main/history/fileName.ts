/** File names of the list: what a rename may ask for and where a new file goes. Pure but for `exists`. */

import { existsSync } from 'fs'
import { extname } from 'path'
import { NAME_COLLISION_SUFFIX } from '@shared/defaults'

// Characters Windows does not allow in a file name, plus control characters.
// eslint-disable-next-line no-control-regex
const INVALID_NAME = /[<>:"/\\|?*\u0000-\u001f]/
const RESERVED_NAME = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i
const COPY_SUFFIX = ' - Copy'

/**
 * The file name a rename asks for, with the recording's extension kept: the
 * user edits the base name, and an extension typed by hand is not a format
 * conversion. Throws with a message fit for the user when the name is invalid.
 */
export function normalizeFileName(requested: string, current: string): string {
  const ext = extname(current)
  let base = requested.trim()
  if (ext && base.toLowerCase().endsWith(ext.toLowerCase())) base = base.slice(0, -ext.length)
  base = base.replace(/[. ]+$/, '')
  if (!base) throw new Error('The name cannot be empty')
  if (INVALID_NAME.test(base)) throw new Error('The name cannot contain < > : " / \\ | ? *')
  if (RESERVED_NAME.test(base)) throw new Error(`"${base}" is a name reserved by Windows`)
  return base + ext
}

type Exists = (path: string) => boolean

/** `path` if it is free, otherwise the first free `<base> (1)<ext>`, `<base> (2)<ext>`... */
export function firstFreePath(path: string, exists: Exists = existsSync): string {
  const ext = extname(path)
  const base = path.slice(0, path.length - ext.length)
  let free = path
  for (let n = 1; exists(free); n += 1) free = base + NAME_COLLISION_SUFFIX(n) + ext
  return free
}

/** First free `<base> - Copy<ext>`, `<base> - Copy (1)<ext>`... next to `path`. */
export function copyPath(path: string, exists: Exists = existsSync): string {
  const ext = extname(path)
  return firstFreePath(path.slice(0, path.length - ext.length) + COPY_SUFFIX + ext, exists)
}

/** `path` with the extension of `format`, where Convert to writes. */
export function withFormat(path: string, format: string): string {
  const ext = extname(path)
  return `${path.slice(0, path.length - ext.length)}.${format}`
}
