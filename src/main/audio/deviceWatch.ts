/**
 * Watches the devices only while the main window can be seen: hidden or
 * minimized, nobody looks at the Source list, so the sidecar is not polled.
 * Showing the window again checks at once.
 */

import type { BrowserWindow } from 'electron'
import { audioEngine } from './engine/SidecarAudioEngine'

export function watchDevicesWhileVisible(window: BrowserWindow): void {
  const sync = (): void =>
    audioEngine.setWatchingDevices(
      !window.isDestroyed() && window.isVisible() && !window.isMinimized()
    )
  window.on('show', sync)
  window.on('hide', sync)
  window.on('minimize', sync)
  window.on('restore', sync)
  window.on('closed', () => audioEngine.setWatchingDevices(false))
  sync()
}
