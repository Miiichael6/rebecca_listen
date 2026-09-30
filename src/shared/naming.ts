/**
 * Automatic file names (spec §9.1): a prefix plus a naming convention whose
 * tokens `{YYYY} {MM} {DD} {hh} {mm} {ss} {n}` are filled in local time. The
 * default is `[YYYY-MM-DD][hh-mm-ss]`.
 *
 * Pure: main uses it to name recordings, the Files tab to check what is typed.
 */

import { COUNTER_DIGITS, NAMING_TEMPLATES } from './defaults'
import type { AudioFormat, FilesSettings } from './types'

/** Characters Windows refuses in a file name. */
const FORBIDDEN_CHARACTERS = /[<>:"/\\|?*]/
/** Device names Windows reserves, with or without an extension. */
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i
const COUNTER_TOKEN = '{n}'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

/** Fills the tokens of `pattern`; `{n}` becomes the counter, padded to three digits. */
export function expandPattern(pattern: string, now: Date, counter = 1): string {
  const tokens: Record<string, string> = {
    YYYY: String(now.getFullYear()),
    MM: pad(now.getMonth() + 1),
    DD: pad(now.getDate()),
    hh: pad(now.getHours()),
    mm: pad(now.getMinutes()),
    ss: pad(now.getSeconds()),
    n: String(counter).padStart(COUNTER_DIGITS, '0')
  }
  return pattern.replace(/\{(\w+)\}/g, (token, name: string) => tokens[name] ?? token)
}

/** The token pattern the settings name files with. */
export function namingPattern(files: Pick<FilesSettings, 'template' | 'customPattern'>): string {
  return files.template === 'custom' ? files.customPattern : NAMING_TEMPLATES[files.template].pattern
}

/** Whether names need the counter: then the first free number is used, not ` (1)`. */
export function usesCounter(pattern: string): boolean {
  return pattern.includes(COUNTER_TOKEN)
}

/** Base name without extension from the prefix and the naming convention. */
export function buildNamedBase(
  files: Pick<FilesSettings, 'prefix' | 'template' | 'customPattern'>,
  now: Date,
  counter = 1
): string {
  return `${files.prefix}${expandPattern(namingPattern(files), now, counter)}`.trim()
}

/** Why the prefix cannot start a file name, or `null` when it can. */
export function validatePrefix(prefix: string): string | null {
  if (FORBIDDEN_CHARACTERS.test(prefix)) return 'Cannot contain < > : " / \\ | ? *'
  if (RESERVED_NAMES.test(prefix.trim())) return 'This name is reserved by Windows'
  return null
}

/** Why a custom pattern cannot name files, or `null` when it can. */
export function validatePattern(pattern: string): string | null {
  if (expandPattern(pattern, new Date()).trim() === '') return 'Write a pattern, e.g. {YYYY}-{MM}-{DD}'
  return validatePrefix(pattern)
}

/** The default convention, for names that are not settings-driven (merged files). */
export function buildBaseName(now: Date): string {
  return expandPattern(NAMING_TEMPLATES.bracketed.pattern, now)
}

export function buildFileName(now: Date, format: AudioFormat): string {
  return `${buildBaseName(now)}.${format}`
}
