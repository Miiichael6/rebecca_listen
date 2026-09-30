/**
 * Where `RebeccaWrites.exe` may be (task 46), worked out from text: the output
 * of `reg query` on the Uninstall keys, and the paths of the NSIS install.
 *
 * Pure logic, no IO: `locate.ts` runs `reg` and checks the files exist.
 * Windows paths are handled with `path.win32` so the tests run anywhere.
 */

import { win32 } from 'path'

/** `DisplayName` of RebeccaWrites in the Uninstall keys (its `productName`). */
export const REBECCA_WRITES_DISPLAY_NAME = 'RebeccaWrites'

/** File name of the app; Windows compares it without case (`rebeccawrites.exe` installed). */
export const REBECCA_WRITES_EXE = 'RebeccaWrites.exe'

/** Per-user NSIS installs go to `%LOCALAPPDATA%\Programs\<name>\`. */
const DEFAULT_INSTALL_FOLDER = ['Programs', 'RebeccaWrites'] as const

/** electron-builder names the uninstaller after the exe: `Uninstall <exe>`. */
const UNINSTALLER_PREFIX = 'Uninstall '

/** One key of a `reg query /s` dump with its values, by name. */
export type RegKeyValues = Map<string, Record<string, string>>

/** Header of a key in the dump: `HKEY_CURRENT_USER\Software\...`. */
const KEY_LINE = /^HKEY_[A-Z_]+\\/
/** `    Name    REG_SZ    Value` (the value may be empty or contain spaces). */
const VALUE_LINE = /^\s+(.+?)\s{4}(REG_[A-Z_]+)(?:\s{4}(.*))?$/

/** The keys of a `reg query` output, each with its values (a `/f` search lists only the matches). */
export function parseRegQuery(output: string): RegKeyValues {
  const keys: RegKeyValues = new Map()
  let current: Record<string, string> | null = null
  for (const line of output.split(/\r?\n/)) {
    if (KEY_LINE.test(line)) {
      current = {}
      keys.set(line.trim(), current)
      continue
    }
    const value = VALUE_LINE.exec(line)
    if (value && current) current[value[1]] = value[3] ?? ''
  }
  return keys
}

/** `UninstallString` of the entry named RebeccaWrites, if the dump has one. */
export function findUninstallString(keys: RegKeyValues): string | null {
  for (const values of keys.values()) {
    if (values['DisplayName'] === REBECCA_WRITES_DISPLAY_NAME && values['UninstallString']) {
      return values['UninstallString']
    }
  }
  return null
}

/** The program of a command line: the quoted part, or everything before the first space. */
function commandProgram(command: string): string {
  const trimmed = command.trim()
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1)
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end)
  }
  return trimmed.split(' ')[0]
}

/**
 * The app next to its uninstaller. `InstallLocation` comes empty from NSIS, so
 * the folder is taken from `UninstallString`, e.g.
 * `"C:\...\rebeccawrites\Uninstall rebeccawrites.exe" /currentuser`.
 */
export function exeFromUninstallString(uninstallString: string): string | null {
  const uninstaller = commandProgram(uninstallString)
  if (!win32.isAbsolute(uninstaller)) return null
  const name = win32.basename(uninstaller)
  const exe = name.startsWith(UNINSTALLER_PREFIX)
    ? name.slice(UNINSTALLER_PREFIX.length)
    : REBECCA_WRITES_EXE
  return win32.join(win32.dirname(uninstaller), exe)
}

/** Where a per-user install leaves the app when nothing else says otherwise. */
export function defaultExePath(localAppData: string): string {
  return win32.join(localAppData, ...DEFAULT_INSTALL_FOLDER, REBECCA_WRITES_EXE)
}

/** What "Localizar RebeccaWrites…" accepts: a file called `RebeccaWrites.exe`, any case. */
export function isRebeccaWritesExe(path: string): boolean {
  return win32.basename(path).toLowerCase() === REBECCA_WRITES_EXE.toLowerCase()
}

/**
 * Candidates in the order they are tried: the one chosen by hand (the user
 * pointed at it on purpose), then the installed one, then the default folder.
 * Repeated paths are tried once.
 */
export function exeCandidates(sources: {
  chosen: string | null
  installed: string | null
  localAppData: string | null
}): string[] {
  const paths = [
    sources.chosen,
    sources.installed,
    sources.localAppData ? defaultExePath(sources.localAppData) : null
  ]
  const seen = new Set<string>()
  return paths.filter((path): path is string => {
    if (!path) return false
    const key = path.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
