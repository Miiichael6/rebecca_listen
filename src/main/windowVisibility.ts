/**
 * Whether a window can be seen: shown and not minimized. Work that only feeds
 * the window (device polling, level monitoring) follows it to save CPU while
 * the app sits hidden.
 */

import type { BrowserWindow } from 'electron'

/** Calls `listener` now and on every change; a closed window counts as hidden. */
export function onVisibilityChange(
  window: BrowserWindow,
  listener: (visible: boolean) => void
): void {
  const sync = (): void =>
    listener(!window.isDestroyed() && window.isVisible() && !window.isMinimized())
  window.on('show', sync)
  window.on('hide', sync)
  window.on('minimize', sync)
  window.on('restore', sync)
  window.on('closed', () => listener(false))
  sync()
}
