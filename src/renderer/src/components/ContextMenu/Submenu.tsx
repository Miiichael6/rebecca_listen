/** Submenu beside the item that opened it, on the side with room. */

import { useLayoutEffect, useRef, useState } from 'react'
import { clamp, MARGIN, SUBMENU_OFFSET_Y } from './menuNavigation'
import { MenuRow } from './MenuRow'
import type { ContextMenuItem } from './types'
import styles from './ContextMenu.module.css'

interface SubmenuProps {
  anchor: HTMLElement
  items: ContextMenuItem[]
  active: number
  onHover: (index: number) => void
  onChoose: (index: number) => void
}

export function Submenu({
  anchor,
  items,
  active,
  onHover,
  onChoose
}: SubmenuProps): React.JSX.Element {
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
