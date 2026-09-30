/**
 * The System section of the Options draft: its checkboxes and language, the
 * log button and the app name and version shown at the foot of the tab.
 */

import { useEffect, useState } from 'react'
import type { AppInfo, SystemSettings } from '@shared/types'
import { useOptionsDraft } from '../../../../store/optionsDraft'
import { openLogFile, readAppInfo } from '../infrastructure/systemApi'

export interface SystemTabModel {
  system: SystemSettings
  edit: (patch: Partial<SystemSettings>) => void
  openLog: () => void
  /** `null` until main answers. */
  appInfo: AppInfo | null
}

function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null)
  useEffect(() => {
    void readAppInfo().then(setInfo)
  }, [])
  return info
}

export function useSystemTab(system: SystemSettings): SystemTabModel {
  const edit = useOptionsDraft((store) => store.edit)
  return {
    system,
    edit: (patch) => edit('system', patch),
    openLog: () => void openLogFile(),
    appInfo: useAppInfo()
  }
}
