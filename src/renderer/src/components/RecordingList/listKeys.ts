/**
 * Keys of the recording list. Pure: no React state, no DOM.
 */

import type { RecordingCommand } from '@shared/types'

export type KeyPress = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'shiftKey'>

/** The command of a key pressed on the list, if it has one. */
export function commandOfKey(event: KeyPress): RecordingCommand | null {
  if (event.altKey) return null
  if (event.ctrlKey) return event.key.toLowerCase() === 'd' ? 'duplicate' : null
  switch (event.key) {
    case 'Enter':
      return 'play'
    case 'F2':
      return 'rename'
    case 'Delete':
      return event.shiftKey ? 'delete' : 'remove'
    default:
      return null
  }
}

/** The menu key and `Shift+F10` open the context menu, as in Windows. */
export function opensMenu(event: KeyPress): boolean {
  return event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')
}

/** Name without its extension, which is what the user edits. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
