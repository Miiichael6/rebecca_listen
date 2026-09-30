/**
 * Recording list (spec §4.6, look of plan/images/app.png): a table with File
 * Name, Duration, Date Recorded and Size under a fixed header. The selected row
 * is tinted blue, and the file being recorded shows `--:--` in blue. A file
 * gone from disk is struck through in grey with a warning icon; only Remove,
 * Copy path, Merge all to one and Clear all stay available on it. The folder
 * button after each name opens its location in the Explorer.
 *
 * Double click plays the file and right click opens its context menu. The
 * keys act on the selected row like the items of that menu: `Enter` plays,
 * `F2` renames in place (`Enter` or leaving the field saves, `Esc` cancels),
 * `Ctrl+D` duplicates, `Supr` removes from the list, `Shift+Supr` deletes the
 * file, and the menu key or `Shift+F10` opens the menu.
 */

import { useCallback, useRef, useState } from 'react'
import type { HistoryItem, RecordingCommand, SessionSnapshot } from '@shared/types'
import { UNKNOWN_DURATION, formatDuration } from '../../lib/duration'
import { formatDate, formatSize } from '../../lib/fileInfo'
import { ContextMenu } from '../ContextMenu/ContextMenu'
import { FileName } from './FileName'
import { baseName, commandOfKey, opensMenu } from './listKeys'
import { menuItems } from './menuItems'
import { NameEditor } from './NameEditor'
import styles from './RecordingList.module.css'

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
          if (opensMenu(event)) {
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
              <FileName
                name={item.name}
                missing={!item.exists}
                onOpenLocation={() => onCommand?.(item.id, 'openLocation')}
              />
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
          items={menuItems(menuItem, items, canPlay)}
          onChoose={(key) => onCommand?.(menuItem.id, key as RecordingCommand)}
          onClose={closeMenu}
        />
      )}
    </div>
  )
}
