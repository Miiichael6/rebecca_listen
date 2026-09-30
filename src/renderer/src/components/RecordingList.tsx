/**
 * Recording list (spec §4.6, look of plan/images/app.png): a table with File
 * Name, Duration, Date Recorded and Size under a fixed header. The selected row
 * is tinted blue, and the file being recorded shows `--:--` in blue. A file
 * gone from disk is struck through in grey with a warning icon; only Remove
 * and Copy path stay available on it.
 *
 * Double click plays the file and right click opens its context menu. The
 * keys act on the selected row like the items of that menu: `Enter` plays,
 * `F2` renames in place (`Enter` or leaving the field saves, `Esc` cancels),
 * `Ctrl+D` duplicates, `Supr` removes from the list, `Shift+Supr` deletes the
 * file, and the menu key or `Shift+F10` opens the menu.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ClipboardCopy,
  Copy,
  ExternalLink,
  FileText,
  FileWarning,
  FolderOpen,
  ListX,
  PencilLine,
  Play,
  Trash2
} from 'lucide-react'
import type { HistoryItem, RecordingCommand, SessionSnapshot } from '@shared/types'
import { UNKNOWN_DURATION, formatDuration } from '../lib/duration'
import { formatDate, formatSize } from '../lib/fileInfo'
import { canRun } from '../lib/recordingCommandAvailability'
import { ContextMenu, type ContextMenuItem } from './ContextMenu'
import styles from './RecordingList.module.css'

type MenuEntry = Omit<ContextMenuItem, 'key'> & { key: RecordingCommand }

const MENU: readonly MenuEntry[] = [
  { key: 'play', label: 'Play', icon: Play, shortcut: 'Enter' },
  { key: 'openExternal', label: 'Open with default app', icon: ExternalLink },
  { key: 'rename', label: 'Rename', icon: PencilLine, shortcut: 'F2', separated: true },
  { key: 'duplicate', label: 'Duplicate', icon: Copy, shortcut: 'Ctrl+D' },
  { key: 'openLocation', label: 'Open file location', icon: FolderOpen, separated: true },
  { key: 'copyPath', label: 'Copy path', icon: ClipboardCopy },
  { key: 'remove', label: 'Remove from list', icon: ListX, shortcut: 'Del', separated: true },
  { key: 'delete', label: 'Delete file', icon: Trash2, shortcut: 'Shift+Del', danger: true }
]

/** Items of the context menu; each key is the `RecordingCommand` it runs. */
function menuItems(item: HistoryItem, canPlay: boolean): ContextMenuItem[] {
  return MENU.map((entry) => ({
    ...entry,
    disabled: !canRun(item, entry.key) || (entry.key === 'play' && !canPlay)
  }))
}

interface MenuState {
  id: string
  x: number
  y: number
}

interface RecordingListProps {
  items: HistoryItem[]
  selectedId?: string | null
  /** Row whose name is being edited in place. */
  editingId?: string | null
  /** File still being written, shown on top with `--:--` until it is saved. */
  recordingFile?: SessionSnapshot['file']
  onSelect?: (id: string) => void
  onOpen?: (item: HistoryItem) => void
  /** Playing is off while recording, so the menu greys Play out. */
  canPlay?: boolean
  onCommand?: (id: string, command: RecordingCommand) => void
  /** New name as typed; main keeps the extension and validates it. */
  onRename?: (id: string, name: string) => void
  onRenameEnd?: () => void
}

/** The command of a key pressed on the list, if it has one. */
function commandOfKey(event: React.KeyboardEvent): RecordingCommand | null {
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

function FileName({
  name,
  missing = false
}: {
  name: string
  missing?: boolean
}): React.JSX.Element {
  const Icon = missing ? FileWarning : FileText
  return (
    <span className={styles.name}>
      <Icon className={missing ? styles.warning : styles.icon} size={15} aria-hidden />
      <span className={styles.text}>{name}</span>
    </span>
  )
}

/** Name without its extension, which is what the user edits. */
function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

interface NameEditorProps {
  name: string
  onDone: (name: string | null) => void
}

function NameEditor({ name, onDone }: NameEditorProps): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null)
  // Enter and Esc end the edit before the blur that follows them.
  const done = useRef(false)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const finish = (value: string | null): void => {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <span className={styles.name}>
      <FileText className={styles.icon} size={15} aria-hidden />
      <input
        ref={input}
        className={styles.input}
        defaultValue={baseName(name)}
        spellCheck={false}
        aria-label="File name"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') finish(event.currentTarget.value)
          else if (event.key === 'Escape') finish(null)
        }}
        onBlur={(event) => finish(event.currentTarget.value)}
      />
    </span>
  )
}

function rowClass(item: HistoryItem, isSelected: boolean): string {
  const classes = [styles.row]
  if (isSelected) classes.push(styles.selected)
  if (!item.exists) classes.push(styles.missing)
  return classes.join(' ')
}

export function RecordingList({
  items,
  selectedId = null,
  editingId = null,
  recordingFile = null,
  onSelect,
  onOpen,
  canPlay = true,
  onCommand,
  onRename,
  onRenameEnd
}: RecordingListProps): React.JSX.Element {
  const body = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuItem = menu && items.find((item) => item.id === menu.id)

  const closeMenu = useCallback(() => {
    setMenu(null)
    body.current?.focus()
  }, [])

  /** From the keyboard the menu opens under the name of the selected row. */
  const openMenuAtRow = (id: string): void => {
    const row = body.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)
    const box = row?.getBoundingClientRect()
    if (box) setMenu({ id, x: box.left + 24, y: box.bottom })
  }

  const endEdit = (item: HistoryItem, name: string | null): void => {
    onRenameEnd?.()
    body.current?.focus()
    if (name !== null && name.trim() && name.trim() !== baseName(item.name)) {
      onRename?.(item.id, name)
    }
  }

  return (
    <div className={styles.table}>
      <div className={`${styles.row} ${styles.header}`}>
        <span>File Name</span>
        <span>Duration</span>
        <span>Date Recorded</span>
        <span>Size</span>
      </div>
      <div
        ref={body}
        className={styles.body}
        tabIndex={0}
        onKeyDown={(event) => {
          if (!selectedId) return
          if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
            event.preventDefault()
            openMenuAtRow(selectedId)
            return
          }
          const command = commandOfKey(event)
          if (command && onCommand) {
            event.preventDefault()
            onCommand(selectedId, command)
          }
        }}
      >
        {recordingFile && (
          <div className={`${styles.row} ${styles.active}`} title={recordingFile.path}>
            <FileName name={recordingFile.name} />
            <span>{UNKNOWN_DURATION}</span>
            <span />
            <span />
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            data-id={item.id}
            className={rowClass(item, item.id === selectedId)}
            title={item.exists ? item.path : `File not found: ${item.path}`}
            onClick={() => onSelect?.(item.id)}
            onDoubleClick={() => onOpen?.(item)}
            onContextMenu={(event) => {
              event.preventDefault()
              onSelect?.(item.id)
              body.current?.focus()
              setMenu({ id: item.id, x: event.clientX, y: event.clientY })
            }}
          >
            {item.id === editingId ? (
              <NameEditor name={item.name} onDone={(name) => endEdit(item, name)} />
            ) : (
              <FileName name={item.name} missing={!item.exists} />
            )}
            <span>{formatDuration(item.durationMs)}</span>
            <span>{formatDate(item.createdAt)}</span>
            <span>{formatSize(item.sizeBytes)}</span>
          </div>
        ))}
      </div>
      {menuItem && menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menuItem.name}
          items={menuItems(menuItem, canPlay)}
          onChoose={(key) => onCommand?.(menuItem.id, key as RecordingCommand)}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
