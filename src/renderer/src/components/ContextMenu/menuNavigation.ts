/**
 * Placement and keyboard movement of the context menu. Pure: no React, no DOM.
 */

import type { ContextMenuItem } from './types'

/** Distance kept from the edges of the window. */
export const MARGIN = 6
/** A submenu lines its first item up with the item that opened it. */
export const SUBMENU_OFFSET_Y = -4

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max))

export function enabledIndexes(items: ContextMenuItem[]): number[] {
  return items.flatMap((item, index) => (item.disabled ? [] : [index]))
}

/** The enabled index `step` places away from `active`, going round at the ends. */
export function stepFrom(enabled: number[], active: number, step: number): number {
  if (enabled.length === 0) return -1
  const at = enabled.indexOf(active)
  return at < 0 ? enabled[0] : enabled[(at + step + enabled.length) % enabled.length]
}
