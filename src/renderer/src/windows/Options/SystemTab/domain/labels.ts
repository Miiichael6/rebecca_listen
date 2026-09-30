/** Texts of the System tab (spec §10.2, plan/images/08). */

import type { AppLanguage, SystemSettings } from '@shared/types'

type Checkbox = keyof Omit<SystemSettings, 'language'>

export interface CheckboxRow {
  key: Checkbox
  label: string
}

/** The window group at the top of the tab. */
export const WINDOW_CHECKBOXES: readonly CheckboxRow[] = [
  { key: 'minimizeToTray', label: 'Minimize to tray' },
  { key: 'alwaysShowTrayIcon', label: 'Always show tray icon' },
  { key: 'alwaysOnTop', label: 'Always on top' }
]

export const HISTORY_CHECKBOX: CheckboxRow = {
  key: 'keepHistory',
  label: 'Keep recording history'
}

/** Extras the spec adds below a separator. */
export const LAUNCH_CHECKBOXES: readonly CheckboxRow[] = [
  { key: 'startWithWindows', label: 'Start with Windows' },
  { key: 'startRecordingOnLaunch', label: 'Start recording on launch' }
]

export const HISTORY_INFO =
  'The app does not manage your files. If you move, rename, or remove a file outside the app, ' +
  'the list will not update automatically. File storage and management remain your responsibility.'

/** Each language written in itself, as language pickers do. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  es: 'Español'
}
