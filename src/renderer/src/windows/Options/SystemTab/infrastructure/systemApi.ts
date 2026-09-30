/** What the System tab asks of main, so nothing above this file touches `window.api`. */

import type { AppInfo } from '@shared/types'

export const openLogFile = (): Promise<void> => window.api.invoke('shell:openLogFile')

export const readAppInfo = (): Promise<AppInfo> => window.api.invoke('app:info')
