/** Which command already holds a hotkey, so one combination never runs two commands. */

import { HOTKEY_COMMANDS } from '@shared/defaults'
import type { HotkeyCommand, HotkeysSettings } from '@shared/types'

/** Accelerators are case-insensitive for Electron (`ctrl+r` is `Ctrl+R`). */
const sameAccelerator = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase()

/**
 * The other command that already uses `accelerator`, or `null` when giving it
 * to `command` is fine. "None" never conflicts.
 */
export function findConflict(
  hotkeys: HotkeysSettings,
  command: HotkeyCommand,
  accelerator: string | null
): HotkeyCommand | null {
  if (accelerator === null) return null
  return (
    HOTKEY_COMMANDS.find((other) => {
      const taken = hotkeys[other]
      return other !== command && taken !== null && sameAccelerator(taken, accelerator)
    }) ?? null
  )
}
