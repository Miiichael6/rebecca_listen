/**
 * Context menu drawn by the app, in its colors: an optional title, items with
 * icon and shortcut hint, separators, a `danger` tone for destructive items
 * and one level of submenus. It opens at a point and moves in when it would
 * leave the window; a submenu opens beside its item, on the side with room.
 *
 * The behavior (keys, active item, submenu, closing) is in
 * `application/useContextMenu`; this file only places and draws it.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useContextMenu } from './application/useContextMenu'
import { clamp, MARGIN } from './domain/menuNavigation'
import { MenuRow } from './MenuRow'
import { Submenu } from './Submenu'
import type { ContextMenuItem } from './types'
import styles from './ContextMenu.module.css'

export type { ContextMenuItem }

interface ContextMenuProps {
  x: number
  y: number
  title?: string
  items: ContextMenuItem[]
  onChoose: (key: string) => void
  onClose: () => void
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
  const [position, setPosition] = useState({ left: x, top: y })
  const behavior = useContextMenu({ items, onChoose, onClose, menu })
  const { submenu } = behavior

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

  return createPortal(
    <div
      ref={menu}
      className={styles.menu}
      style={position}
      role="menu"
      tabIndex={-1}
      onKeyDown={behavior.onKeyDown}
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
          active={index === behavior.active}
          rowRef={behavior.rowRef(index)}
          onHover={() => behavior.hover(index)}
          onClick={() => behavior.choose(index)}
        />
      ))}
      {submenu && (
        <Submenu
          anchor={submenu.anchor}
          items={behavior.children}
          active={submenu.active}
          onHover={behavior.hoverInSubmenu}
          onChoose={behavior.chooseInSubmenu}
        />
      )}
    </div>,
    document.body
  )
}
