/** How the Hotkeys tab names its commands, an empty hotkey and its errors. */

import type { HotkeyCommand } from '@shared/types'

export const COMMAND_LABELS: Record<HotkeyCommand, string> = {
  file: 'File',
  record: 'Record',
  pause: 'Pause',
  play: 'Play',
  stop: 'Stop',
  cut: 'Cut'
}

/** The "None" of the original for a command without hotkey. */
export const NO_HOTKEY_LABEL = 'None'

export const MISSING_MODIFIER_MESSAGE = 'Add Ctrl, Alt or Win to the key (F-keys work alone).'

export const describeHotkey = (accelerator: string | null): string => accelerator ?? NO_HOTKEY_LABEL

export const conflictMessage = (accelerator: string, owner: HotkeyCommand): string =>
  `${accelerator} is already used by ${COMMAND_LABELS[owner]}.`
