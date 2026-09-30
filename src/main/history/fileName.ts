/** File names of the list: what a rename may ask for and where a copy goes. Pure but for `exists`. */

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

/** First free `<base> - Copy<ext>`, `<base> - Copy (1)<ext>`... next to `path`. */
export function copyPath(path: string, exists: (path: string) => boolean = existsSync): string {
  const ext = extname(path)
  const base = path.slice(0, path.length - ext.length) + COPY_SUFFIX
  let copy = base + ext
  for (let n = 1; exists(copy); n += 1) copy = base + NAME_COLLISION_SUFFIX(n) + ext
  return copy
}
