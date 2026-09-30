/**
 * Behavior of the recording list without any markup: the context menu that is
 * open, what the keys of the body do, and when a typed name is worth saving.
 * Everything it does to a recording goes out through `onCommand`, `onRename`
 * and `onSelect`; it knows nothing about stores or `window.api`.
 *
 * The keys act on the selected row like the items of the menu: `Enter` plays,
 * `F2` renames in place, `Ctrl+D` duplicates, `Supr` removes from the list,
 * `Shift+Supr` deletes the file, and the menu key or `Shift+F10` opens the menu.
 */

import { useCallback, useState, type RefObject } from 'react'
import type { HistoryItem, RecordingCommand } from '@shared/types'
import type { MenuItem } from '../../ContextMenu/domain/types'
import { baseName, commandOfKey, opensMenu } from '../domain/listKeys'
import { menuItems } from './menuItems'

export interface MenuState {
  id: string
  x: number
  y: number
}

interface Options {
  /** The scrollable body of the list, which the view owns; it holds the focus. */
  body: RefObject<HTMLDivElement | null>
  items: HistoryItem[]
  selectedId: string | null
  canPlay: boolean
  onSelect?: (id: string) => void
  onCommand?: (id: string, command: RecordingCommand) => void
  onRename?: (id: string, name: string) => void
  onRenameEnd?: () => void
}

export interface RecordingListBehavior {
  menu: MenuState | null
  menuItem: HistoryItem | null | undefined
  /** Items of the open menu, without icons. */
  menuEntries: MenuItem[]
  closeMenu: () => void
  endEdit: (item: HistoryItem, name: string | null) => void
  onKeyDown: (event: React.KeyboardEvent) => void
  onRowContextMenu: (event: React.MouseEvent, item: HistoryItem) => void
}

export function useRecordingList({
  body,
  items,
  selectedId,
  canPlay,
  onSelect,
  onCommand,
  onRename,
  onRenameEnd
}: Options): RecordingListBehavior {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const menuItem = menu && items.find((item) => item.id === menu.id)

  const closeMenu = useCallback(() => {
    setMenu(null)
    body.current?.focus()
  }, [body])

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

  const onKeyDown = (event: React.KeyboardEvent): void => {
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
  }

  const onRowContextMenu = (event: React.MouseEvent, item: HistoryItem): void => {
    event.preventDefault()
    onSelect?.(item.id)
    body.current?.focus()
    setMenu({ id: item.id, x: event.clientX, y: event.clientY })
  }

  return {
    menu,
    menuItem,
    menuEntries: menuItem ? menuItems(menuItem, items, canPlay) : [],
    closeMenu,
    endEdit,
    onKeyDown,
    onRowContextMenu
  }
}
