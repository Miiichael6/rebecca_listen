/**
 * Context menu drawn by the app, in its colors: an optional title, items with
 * icon and shortcut hint, separators, a `danger` tone for destructive items
 * and one level of submenus. It opens at a point and moves in when it would
 * leave the window; a submenu opens beside its item, on the side with room.
 *
 * Keyboard: arrows, `Home` and `End` move, `Enter` or `Space` choose, `→`
 * opens a submenu and `←` goes back from it, `Esc` closes the submenu first
 * and then the menu, `Tab` closes. A click outside, a scroll or leaving the
 * window close it.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import styles from './ContextMenu.module.css'

export interface ContextMenuItem {
  key: string
  label: string
  icon?: LucideIcon
  /** Shown on the right; the keys themselves are handled by whoever opens the menu. */
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** Draws a line above the item. */
  separated?: boolean
  /** Makes the item open a submenu instead of being chosen. */
  children?: ContextMenuItem[]
}

interface ContextMenuProps {
  x: number
  y: number
  title?: string
  items: ContextMenuItem[]
  onChoose: (key: string) => void
  onClose: () => void
}

/** The submenu shown and its active item; `active` is -1 while the keys still move the menu. */
interface OpenSubmenu {
  index: number
  active: number
  /** Row of the item that opened it, to place it beside. */
  anchor: HTMLElement
}

/** Distance kept from the edges of the window. */
const MARGIN = 6
/** A submenu lines its first item up with the item that opened it. */
const SUBMENU_OFFSET_Y = -4

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

function enabledIndexes(items: ContextMenuItem[]): number[] {
  return items.flatMap((item, index) => (item.disabled ? [] : [index]))
}

/** The enabled index `step` places away from `active`, going round at the ends. */
function stepFrom(enabled: number[], active: number, step: number): number {
  if (enabled.length === 0) return -1
  const at = enabled.indexOf(active)
  return at < 0 ? enabled[0] : enabled[(at + step + enabled.length) % enabled.length]
}

interface MenuRowProps {
  item: ContextMenuItem
  active: boolean
  rowRef?: (row: HTMLDivElement | null) => void
  onHover: () => void
  onClick: () => void
}

function MenuRow({ item, active, rowRef, onHover, onClick }: MenuRowProps): React.JSX.Element {
  const Icon = item.icon
  const classes = [
    styles.item,
    item.danger && styles.danger,
    item.separated && styles.separated,
    active && styles.active
  ]
  return (
    <div
      ref={rowRef}
      className={classes.filter(Boolean).join(' ')}
      role="menuitem"
      aria-disabled={item.disabled}
      aria-haspopup={item.children ? 'menu' : undefined}
      onMouseEnter={() => !item.disabled && onHover()}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {Icon && <Icon className={styles.icon} size={15} aria-hidden />}
      <span className={styles.label}>{item.label}</span>
      {item.shortcut && <kbd className={styles.shortcut}>{item.shortcut}</kbd>}
      {item.children && <ChevronRight className={styles.icon} size={15} aria-hidden />}
    </div>
  )
}

interface SubmenuProps {
  anchor: HTMLElement
  items: ContextMenuItem[]
  active: number
  onHover: (index: number) => void
  onChoose: (index: number) => void
}

function Submenu({ anchor, items, active, onHover, onChoose }: SubmenuProps): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })

  // Measured before paint, like the menu itself.
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect()
    if (!box) return
    const item = anchor.getBoundingClientRect()
    const fitsRight = item.right + box.width + MARGIN <= window.innerWidth
    const left = fitsRight ? item.right : item.left - box.width
    setPosition({
      left: clamp(left, MARGIN, window.innerWidth - box.width - MARGIN),
      top: clamp(item.top + SUBMENU_OFFSET_Y, MARGIN, window.innerHeight - box.height - MARGIN)
    })
  }, [anchor])

  return (
    <div ref={menu} className={`${styles.menu} ${styles.submenu}`} style={position} role="menu">
      {items.map((item, index) => (
        <MenuRow
          key={item.key}
          item={item}
          active={index === active}
          onHover={() => onHover(index)}
          onClick={() => onChoose(index)}
        />
      ))}
    </div>
  )
}

export function ContextMenu({
  x,
  y,
  title,
  items,
  onChoose,
  onClose
}: ContextMenuProps): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const [position, setPosition] = useState({ left: x, top: y })
  const enabled = enabledIndexes(items)
  const [active, setActive] = useState(enabled[0] ?? -1)
  const [submenu, setSubmenu] = useState<OpenSubmenu | null>(null)
  const children = submenu ? (items[submenu.index]?.children ?? []) : []

  // Measured before paint, so it never flashes outside the window.
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect()
    if (!box) return
    const left = clamp(x, MARGIN, window.innerWidth - box.width - MARGIN)
    // Opens upwards when there is no room below, like the menus of Windows.
    const below = y + box.height + MARGIN <= window.innerHeight
    const top = below ? y : Math.max(MARGIN, y - box.height)
    setPosition({ left, top })
  }, [x, y])

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
  }, [onClose])

  const finish = (item: ContextMenuItem | undefined): void => {
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
    const active = fromKeyboard ? (enabledIndexes(item.children)[0] ?? -1) : -1
    setSubmenu({ index, active, anchor })
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

  return createPortal(
    <div
      ref={menu}
      className={styles.menu}
      style={position}
      role="menu"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      {title && (
        <div className={styles.title} title={title}>
          {title}
        </div>
      )}
      {items.map((item, index) => (
        <MenuRow
          key={item.key}
          item={item}
          active={index === active}
          rowRef={(row) => {
            rows.current[index] = row
          }}
          onHover={() => hover(index)}
          onClick={() => choose(index)}
        />
      ))}
      {submenu && (
        <Submenu
          anchor={submenu.anchor}
          items={children}
          active={submenu.active}
          onHover={(index) => setSubmenu({ ...submenu, active: index })}
          onChoose={(index) => finish(children[index])}
        />
      )}
    </div>,
    document.body
  )
}
