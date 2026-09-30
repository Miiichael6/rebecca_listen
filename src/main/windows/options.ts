/**
 * The Options window (spec §5): modal over the main window, fixed size, one at
 * a time. It loads the same renderer bundle as the main window, told apart by
 * the hash (`#/options?tab=<id>`), so a tab can be opened directly.
 */

import { is } from '@electron-toolkit/utils'
import { BrowserWindow, type WebContents } from 'electron'
import { join } from 'path'
import { OPTIONS_WINDOW_SIZE, WINDOW_COLORS } from '@shared/appInfo'
import type { OptionsTab } from '@shared/types'
import icon from '../../../resources/icon.png?asset'

let options: BrowserWindow | null = null

function optionsHash(tab: OptionsTab | undefined): string {
  return tab ? `/options?tab=${tab}` : '/options'
}

/** Opens Options over the window that asked, or brings the open one to the front. */
export function openOptionsWindow(opener: WebContents, tab?: OptionsTab): void {
  if (options && !options.isDestroyed()) {
    // Another tab was asked for: the page listens for the hash change.
    if (tab) void options.webContents.executeJavaScript(`location.hash = '${optionsHash(tab)}'`)
    options.focus()
    return
  }

  const parent = BrowserWindow.fromWebContents(opener) ?? undefined
  const window = new BrowserWindow({
    ...OPTIONS_WINDOW_SIZE,
    title: 'Options',
    parent,
    modal: parent !== undefined,
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: WINDOW_COLORS.background,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  options = window
  window.removeMenu()
  window.on('ready-to-show', () => window.show())
  window.on('closed', () => {
    options = null
  })

  const hash = optionsHash(tab)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hash}`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}
