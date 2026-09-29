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
