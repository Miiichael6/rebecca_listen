/**
 * The main window (spec §4): creation, security flags and the geometry that is
 * remembered between runs.
 */

import { is } from '@electron-toolkit/utils'
import { BrowserWindow, nativeTheme, screen, shell, type Rectangle } from 'electron'
import { join } from 'path'
import { APP_NAME, MAIN_WINDOW_SIZE } from '@shared/appInfo'
import type { WindowBounds } from '@shared/settingsSchema'
import { settings } from './settings'
import icon from '../../resources/icon.png?asset'

function overlaps(area: Rectangle, bounds: WindowBounds): boolean {
  return (
    bounds.x < area.x + area.width &&
    bounds.x + bounds.width > area.x &&
    bounds.y < area.y + area.height &&
    bounds.y + bounds.height > area.y
  )
}

/**
 * The saved geometry, or only its size when the stored position falls outside
 * every screen — otherwise unplugging a monitor hides the window for good.
 */
function restoredBounds(): Partial<WindowBounds> {
  const bounds = settings.getWindowBounds()
  if (!bounds) return {}
  const onScreen = screen.getAllDisplays().some((display) => overlaps(display.workArea, bounds))
  return onScreen ? bounds : { width: bounds.width, height: bounds.height }
}

/** Maximized and minimized states are not restored, so they are not stored. */
function rememberBounds(window: BrowserWindow): void {
  if (window.isDestroyed() || window.isMinimized() || window.isMaximized()) return
  settings.setWindowBounds(window.getNormalBounds())
}

/** Window background before the page paints; matches `--color-background` in theme.css. */
const BACKGROUND_COLOR = '#16191d'

export function createMainWindow(): BrowserWindow {
  // The UI is dark only, so the native title bar follows it.
  nativeTheme.themeSource = 'dark'
  const window = new BrowserWindow({
    ...MAIN_WINDOW_SIZE,
    ...restoredBounds(),
    title: APP_NAME,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: BACKGROUND_COLOR,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  // `resized` and `moved` fire once the drag ends, so no debounce is needed.
  window.on('resized', () => rememberBounds(window))
  window.on('moved', () => rememberBounds(window))
  window.on('close', () => rememberBounds(window))

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for the renderer in development, the built file in production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
