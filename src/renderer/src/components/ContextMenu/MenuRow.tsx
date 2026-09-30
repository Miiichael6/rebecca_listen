/** One item of the context menu: icon, label, shortcut hint and submenu arrow. */

import { ChevronRight } from 'lucide-react'
import type { ContextMenuItem } from './types'
import styles from './ContextMenu.module.css'

interface MenuRowProps {
  item: ContextMenuItem
  active: boolean
  rowRef?: (row: HTMLDivElement | null) => void
  onHover: () => void
  onClick: () => void
}

export function MenuRow({
  item,
  active,
  rowRef,
  onHover,
  onClick
}: MenuRowProps): React.JSX.Element {
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
