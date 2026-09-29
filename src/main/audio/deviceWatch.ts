/**
 * Watches the devices only while the main window can be seen: hidden or
 * minimized, nobody looks at the Source list, so the sidecar is not polled.
 * Showing the window again checks at once.
 */

import type { BrowserWindow } from 'electron'
import { onVisibilityChange } from '../windowVisibility'
import { audioEngine } from './engine/SidecarAudioEngine'

export function watchDevicesWhileVisible(window: BrowserWindow): void {
  onVisibilityChange(window, (visible) => audioEngine.setWatchingDevices(visible))
}
