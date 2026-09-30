/**
 * Items of the context menu of a recording, in the order of the original app;
 * each key is the `RecordingCommand` it runs. No icons here: the view adds
 * them (`../menuIcons.ts`).
 */

import { AUDIO_FORMATS } from '@shared/defaults'
import type { AudioFormat, HistoryItem, RecordingCommand } from '@shared/types'
import type { MenuItem } from '../../ContextMenu/domain/types'
import { canMerge, canRun } from '../../../recordingCommands/domain/availability'

type MenuEntry = Omit<MenuItem, 'key' | 'disabled' | 'children'>

/** An item opening one choice per format; greyed out when none can be chosen. */
function formatSubmenu(key: string, entry: MenuEntry, children: MenuItem[]): MenuItem {
  return { key, ...entry, children, disabled: children.every((child) => child.disabled) }
}

const entry = (label: string, separated = false): MenuEntry => ({ label, separated })

export function menuItems(item: HistoryItem, items: HistoryItem[], canPlay: boolean): MenuItem[] {
  const command = (key: RecordingCommand, value: MenuEntry, allowed = true): MenuItem => ({
    key,
    ...value,
    disabled: !allowed || !canRun(item, key)
  })
  const formats = (
    action: 'convert' | 'merge',
    allowed: (format: AudioFormat) => boolean
  ): MenuItem[] =>
    AUDIO_FORMATS.map((format) =>
      command(`${action}:${format}`, { label: format.toUpperCase() }, allowed(format))
    )

  return [
    command('play', { label: 'Play', shortcut: 'Enter' }, canPlay),
    command('openExternal', entry('Open with default app')),
    command('rename', { label: 'Rename', shortcut: 'F2', separated: true }),
    command('tags', entry('Tag Editor…')),
    command('duplicate', { label: 'Duplicate', shortcut: 'Ctrl+D' }),
    formatSubmenu(
      'convert',
      entry('Convert to', true),
      formats('convert', (format) => format !== item.format)
    ),
    formatSubmenu(
      'merge',
      entry('Merge all to one'),
      formats('merge', () => canMerge(items))
    ),
    command('openLocation', entry('Open file location', true)),
    command('copyPath', entry('Copy path')),
    command('remove', { label: 'Remove from list', shortcut: 'Del', separated: true }),
    command('delete', { label: 'Delete file', shortcut: 'Shift+Del', danger: true }),
    command('clearAll', { ...entry('Clear all…'), danger: true })
  ]
}
