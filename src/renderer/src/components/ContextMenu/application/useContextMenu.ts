/**
 * Behavior of the context menu without any markup: which item is active, the
 * submenu that is open, what each key does and when the menu closes on its own.
 *
 * Keyboard: arrows, `Home` and `End` move, `Enter` or `Space` choose, `→`
 * opens a submenu and `←` goes back from it, `Esc` closes the submenu first
 * and then the menu, `Tab` closes. A click outside, a scroll or leaving the
 * window close it.
 */

import { useEffect, useRef, useState } from 'react'
import { enabledIndexes, stepFrom } from '../domain/menuNavigation'
import type { MenuItem } from '../domain/types'

/** The submenu shown and its active item; `active` is -1 while the keys still move the menu. */
export interface OpenSubmenu {
  index: number
  active: number
  /** Row of the item that opened it, to place it beside. */
  anchor: HTMLElement
}

interface Options<I extends MenuItem<unknown>> {
  items: I[]
  onChoose: (key: string) => void
  onClose: () => void
  /** The element that holds the focus and the rows, to tell an outside click. */
  menu: React.RefObject<HTMLElement | null>
}

export interface ContextMenuBehavior<I> {
  active: number
  submenu: OpenSubmenu | null
  /** Items of the open submenu, empty when there is none. */
  children: I[]
  onKeyDown: (event: React.KeyboardEvent) => void
  hover: (index: number) => void
  choose: (index: number) => void
  hoverInSubmenu: (index: number) => void
  chooseInSubmenu: (index: number) => void
  rowRef: (index: number) => (row: HTMLElement | null) => void
}

export function useContextMenu<I extends MenuItem<unknown>>({
  items,
  onChoose,
  onClose,
  menu
}: Options<I>): ContextMenuBehavior<I> {
  const rows = useRef<(HTMLElement | null)[]>([])
  const enabled = enabledIndexes(items)
  const [active, setActive] = useState(enabled[0] ?? -1)
  const [submenu, setSubmenu] = useState<OpenSubmenu | null>(null)
  const children = submenu ? ((items[submenu.index]?.children ?? []) as I[]) : []

  useEffect(() => {
    menu.current?.focus()
    const closeOutside = (event: MouseEvent): void => {
      if (!menu.current?.contains(event.target as Node)) onClose()
    }
    const close = (): void => onClose()
    window.addEventListener('mousedown', closeOutside, true)
    window.addEventListener('blur', close)
    window.addEventListener('resize', close)
    window.addEventListener('wheel', close, true)
    return () => {
      window.removeEventListener('mousedown', closeOutside, true)
      window.removeEventListener('blur', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('wheel', close, true)
    }
  }, [menu, onClose])

  const finish = (item: MenuItem<unknown> | undefined): void => {
    if (!item || item.disabled) return
    onClose()
    onChoose(item.key)
  }

  /** From the keyboard the first enabled item of the submenu is active at once. */
  const openSubmenu = (index: number, fromKeyboard: boolean): void => {
    const item = items[index]
    const anchor = rows.current[index]
    if (!item?.children || item.disabled || !anchor) return
    setActive(index)
    const first = fromKeyboard ? (enabledIndexes(item.children)[0] ?? -1) : -1
    setSubmenu({ index, active: first, anchor })
  }

  const choose = (index: number): void => {
    if (items[index]?.children) openSubmenu(index, true)
    else finish(items[index])
  }

  const hover = (index: number): void => {
    setActive(index)
    if (items[index]?.children) openSubmenu(index, false)
    else setSubmenu(null)
  }

  const menuKeys: Record<string, () => void> = {
    ArrowDown: () => hover(stepFrom(enabled, active, 1)),
    ArrowUp: () => hover(stepFrom(enabled, active, -1)),
    Home: () => hover(enabled[0] ?? -1),
    End: () => hover(enabled[enabled.length - 1] ?? -1),
    ArrowRight: () => openSubmenu(active, true),
    Enter: () => choose(active),
    ' ': () => choose(active),
    Escape: onClose,
    Tab: onClose
  }

  const submenuKeys = (open: OpenSubmenu): Record<string, () => void> => {
    const inside = enabledIndexes(children)
    const moveTo = (index: number): void => setSubmenu({ ...open, active: index })
    const back = (): void => setSubmenu(null)
    return {
      ArrowDown: () => moveTo(stepFrom(inside, open.active, 1)),
      ArrowUp: () => moveTo(stepFrom(inside, open.active, -1)),
      Home: () => moveTo(inside[0] ?? -1),
      End: () => moveTo(inside[inside.length - 1] ?? -1),
      Enter: () => finish(children[open.active]),
      ' ': () => finish(children[open.active]),
      ArrowLeft: back,
      Escape: back,
      Tab: onClose
    }
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    event.stopPropagation()
    const keys = submenu && submenu.active >= 0 ? submenuKeys(submenu) : menuKeys
    const action = keys[event.key]
    if (action) {
      event.preventDefault()
      action()
    }
  }

  return {
    active,
    submenu,
    children,
    onKeyDown,
    hover,
    choose,
    hoverInSubmenu: (index: number) => {
      if (submenu) setSubmenu({ ...submenu, active: index })
    },
    chooseInSubmenu: (index: number) => finish(children[index]),
    rowRef: (index: number) => (row: HTMLElement | null) => {
      rows.current[index] = row
    }
  }
}
