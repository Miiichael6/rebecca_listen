/**
 * Finding `RebeccaWrites.exe` on this machine (task 46): the one chosen by
 * hand, the one in the Uninstall keys of the registry (current user, then the
 * machine) or the default per-user folder. The first file that exists wins.
 */

import { execFile } from 'child_process'
import { access } from 'fs/promises'
import { settings } from '../settings'
import {
  exeCandidates,
  exeFromUninstallString,
  findUninstallString,
  parseRegQuery,
  REBECCA_WRITES_DISPLAY_NAME
} from './exePath'

const UNINSTALL_KEYS = [
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
] as const

/** A filtered `reg query` takes around 0.1 s; this only guards against a hung one. */
const REG_TIMEOUT_MS = 5000

/** What `reg` printed; empty when it failed or found nothing (it exits with 1 then). */
function reg(args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true, timeout: REG_TIMEOUT_MS }, (error, stdout) =>
      resolve(error ? '' : stdout)
    )
  })
}

/**
 * The exe of the installed RebeccaWrites according to the registry. The keys
 * are searched by data first: dumping the whole Uninstall key of the machine
 * is ten times slower.
 */
async function installedExe(): Promise<string | null> {
  for (const root of UNINSTALL_KEYS) {
    const search = ['query', root, '/s', '/f', REBECCA_WRITES_DISPLAY_NAME, '/d', '/e']
    for (const key of parseRegQuery(await reg(search)).keys()) {
      const uninstallString = findUninstallString(parseRegQuery(await reg(['query', key])))
      const exe = uninstallString ? exeFromUninstallString(uninstallString) : null
      if (exe) return exe
    }
  }
  return null
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false
  )
}

/** The RebeccaWrites to open, or `null` when there is none. */
export async function locateRebeccaWrites(): Promise<string | null> {
  const candidates = exeCandidates({
    chosen: settings.get().transcription.rebeccaWritesExe,
    installed: await installedExe(),
    localAppData: process.env['LOCALAPPDATA'] ?? null
  })
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }
  return null
}
