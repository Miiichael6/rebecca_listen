/** Identity of the app, shared by main, preload and renderer. */
export const APP_NAME = 'Rebecca Listen'

/** Windows AppUserModelID; must match `appId` in electron-builder.yml. */
export const APP_ID = 'com.michael.rebeccalisten'

/** Main window geometry (see spec §4). */
export const MAIN_WINDOW_SIZE = {
  width: 445,
  height: 620,
  minWidth: 420,
  minHeight: 560
} as const

/**
 * Window colors painted by main before the page loads: the background and the
 * title bar overlay behind the native buttons. They match `--color-background`
 * and `--color-text` in theme.css, so the top of the window is one piece.
 */
export const WINDOW_COLORS = {
  background: '#16191d',
  symbols: '#e8eaed'
} as const

/** Height of the title bar the page draws; the native buttons take the same height. */
export const TITLE_BAR_HEIGHT = 32
