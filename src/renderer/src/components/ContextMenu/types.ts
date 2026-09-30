import type { LucideIcon } from 'lucide-react'

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
