/** What the Files tab asks of main, so nothing above this file touches `window.api`. */

import type { NamingSettings } from '@shared/types'

/** A folder a file can be created in, not saved yet; `null` when cancelled or refused. */
export const pickFolder = (): Promise<string | null> => window.api.invoke('files:pickFolder')

/** The path the next recording would get with these settings. */
export const previewPath = (naming: NamingSettings): Promise<string> =>
  window.api.invoke('files:previewPath', naming)
