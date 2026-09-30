/**
 * Items of the context menu of a recording, in the order of the original app;
 * each key is the `RecordingCommand` it runs.
 */

import {
  ArrowRightLeft,
  ClipboardCopy,
  Combine,
  Copy,
  Eraser,
  ExternalLink,
  FileAudio,
  FolderOpen,
  ListX,
  PencilLine,
  Play,
  Tags,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { AUDIO_FORMATS } from '@shared/defaults'
import type { AudioFormat, HistoryItem, RecordingCommand } from '@shared/types'
import { canMerge, canRun } from '../../lib/recordingCommandAvailability'
import type { ContextMenuItem } from '../ContextMenu/ContextMenu'

type MenuEntry = Omit<ContextMenuItem, 'key' | 'disabled' | 'children'>

/** An item opening one choice per format; greyed out when none can be chosen. */
function formatSubmenu(
  key: string,
  entry: MenuEntry,
  children: ContextMenuItem[]
): ContextMenuItem {
  return { key, ...entry, children, disabled: children.every((child) => child.disabled) }
}

const entry = (label: string, icon: LucideIcon, separated = false): MenuEntry => ({
  label,
  icon,
  separated
})

export function menuItems(
  item: HistoryItem,
  items: HistoryItem[],
  canPlay: boolean
): ContextMenuItem[] {
  const command = (key: RecordingCommand, value: MenuEntry, allowed = true): ContextMenuItem => ({
    key,
    ...value,
    disabled: !allowed || !canRun(item, key)
  })
  const formats = (
    action: 'convert' | 'merge',
    allowed: (format: AudioFormat) => boolean
  ): ContextMenuItem[] =>
    AUDIO_FORMATS.map((format) =>
      command(
        `${action}:${format}`,
        { label: format.toUpperCase(), icon: FileAudio },
        allowed(format)
      )
    )

  return [
    command('play', { label: 'Play', icon: Play, shortcut: 'Enter' }, canPlay),
    command('openExternal', entry('Open with default app', ExternalLink)),
    command('rename', { label: 'Rename', icon: PencilLine, shortcut: 'F2', separated: true }),
    command('tags', entry('Tag Editor…', Tags)),
    command('duplicate', { label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D' }),
    formatSubmenu(
      'convert',
      entry('Convert to', ArrowRightLeft, true),
      formats('convert', (format) => format !== item.format)
    ),
    formatSubmenu(
      'merge',
      entry('Merge all to one', Combine),
      formats('merge', () => canMerge(items))
    ),
    command('openLocation', entry('Open file location', FolderOpen, true)),
    command('copyPath', entry('Copy path', ClipboardCopy)),
    command('remove', { label: 'Remove from list', icon: ListX, shortcut: 'Del', separated: true }),
    command('delete', { label: 'Delete file', icon: Trash2, shortcut: 'Shift+Del', danger: true }),
    command('clearAll', { ...entry('Clear all…', Eraser), danger: true })
  ]
}
