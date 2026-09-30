/**
 * Context menu drawn by the app, in its colors: an optional title, items with
 * icon and shortcut hint, separators and a `danger` tone for destructive
 * items. It opens at a point and moves in when it would leave the window.
 *
 * Keyboard: arrows, `Home` and `End` move, `Enter` or `Space` choose, `Esc`
 * and `Tab` close. A click outside, a scroll or leaving the window close it.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import styles from './ContextMenu.module.css'

export interface ContextMenuItem {
  key: string
  label: string
  icon: LucideIcon
  /** Shown on the right; the keys themselves are handled by whoever opens the menu. */
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** Draws a line above the item. */
  separated?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  title?: string
  items: ContextMenuItem[]
  onChoose: (key: string) => void
  onClose: () => void
}

/** Distance kept from the edges of the window. */
const MARGIN = 6

export function ContextMenu({
  x,
  y,
  title,
  items,
  onChoose,
  onClose
}: ContextMenuProps): React.JSX.Element {
  const menu = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })
  const enabled = items.flatMap((item, index) => (item.disabled ? [] : [index]))
  const [active, setActive] = useState(enabled[0] ?? -1)

  // Measured before paint, so it never flashes outside the window.
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect()
    if (!box) return
    const left = Math.max(MARGIN, Math.min(x, window.innerWidth - box.width - MARGIN))
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

  const choose = (index: number): void => {
    const item = items[index]
    if (!item || item.disabled) return
    onClose()
    onChoose(item.key)
  }

  const move = (step: number): void => {
    if (enabled.length === 0) return
    const at = enabled.indexOf(active)
    const next = at < 0 ? 0 : (at + step + enabled.length) % enabled.length
    setActive(enabled[next])
  }

  const onKeyDown = (event: React.KeyboardEvent): void => {
    event.stopPropagation()
    const keys: Record<string, () => void> = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(enabled[0] ?? -1),
      End: () => setActive(enabled[enabled.length - 1] ?? -1),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: onClose,
      Tab: onClose
    }
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
      {items.map((item, index) => {
        const Icon = item.icon
        const classes = [
          styles.item,
          item.danger && styles.danger,
          item.separated && styles.separated,
          index === active && styles.active
        ]
        return (
          <div
            key={item.key}
            className={classes.filter(Boolean).join(' ')}
            role="menuitem"
            aria-disabled={item.disabled}
            onMouseEnter={() => !item.disabled && setActive(index)}
            onClick={() => choose(index)}
          >
            <Icon className={styles.icon} size={15} aria-hidden />
            <span className={styles.label}>{item.label}</span>
            {item.shortcut && <kbd className={styles.shortcut}>{item.shortcut}</kbd>}
          </div>
        )
      })}
    </div>,
    document.body
  )
}
