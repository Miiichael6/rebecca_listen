/**
 * An item of a context menu. The icon type is a parameter: the domain does not
 * know how icons are drawn, the view that fills it in does.
 */
export interface MenuItem<Icon = never> {
  key: string
  label: string
  icon?: Icon
  /** Shown on the right; the keys themselves are handled by whoever opens the menu. */
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  /** Draws a line above the item. */
  separated?: boolean
  /** Makes the item open a submenu instead of being chosen. */
  children?: MenuItem<Icon>[]
}
