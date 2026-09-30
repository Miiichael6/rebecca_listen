/**
 * System tab of Options (spec §10.2, plan/images/08): window and history
 * checkboxes, the Info note, Open Log File, the launch extras and language,
 * and the app version at the foot. What each option does arrives with task 31.
 */

import { APP_LANGUAGES } from '@shared/defaults'
import type { SystemSettings } from '@shared/types'
import { useSystemTab, type SystemTabModel } from './application/useSystemTab'
import {
  HISTORY_CHECKBOX,
  HISTORY_INFO,
  LANGUAGE_LABELS,
  LAUNCH_CHECKBOXES,
  WINDOW_CHECKBOXES,
  type CheckboxRow
} from './domain/labels'
import styles from './SystemTab.module.css'

function Checkbox({ row, tab }: { row: CheckboxRow; tab: SystemTabModel }): React.JSX.Element {
  return (
    <label className={styles.check}>
      <input
        type="checkbox"
        checked={tab.system[row.key]}
        onChange={(event) => tab.edit({ [row.key]: event.target.checked })}
      />
      {row.label}
    </label>
  )
}

export function SystemTab({ system }: { system: SystemSettings }): React.JSX.Element {
  const tab = useSystemTab(system)

  return (
    <div className={styles.tab}>
      <div className={styles.group}>
        {WINDOW_CHECKBOXES.map((row) => (
          <Checkbox key={row.key} row={row} tab={tab} />
        ))}
      </div>

      <div className={styles.group}>
        <Checkbox row={HISTORY_CHECKBOX} tab={tab} />
        <p className={styles.info}>
          <span className={styles.badge}>Info</span>
          <span>{HISTORY_INFO}</span>
        </p>
        <button type="button" className={styles.button} onClick={tab.openLog}>
          Open Log File
        </button>
      </div>

      <div className={styles.group}>
        {LAUNCH_CHECKBOXES.map((row) => (
          <Checkbox key={row.key} row={row} tab={tab} />
        ))}
        <label className={styles.language}>
          Language
          <select
            className={styles.select}
            value={system.language}
            onChange={(event) => {
              const language = APP_LANGUAGES.find((id) => id === event.target.value)
              if (language) tab.edit({ language })
            }}
          >
            {APP_LANGUAGES.map((id) => (
              <option key={id} value={id}>
                {LANGUAGE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tab.appInfo && (
        <p className={styles.version}>
          {tab.appInfo.name} · Version {tab.appInfo.version}
        </p>
      )}
    </div>
  )
}
