/**
 * Options window (spec §5, look of plan/images/05, 07 and 08): three colored
 * tabs (Files, Hotkeys, System) over a page with a bold title, and OK / Cancel /
 * Apply at the bottom. It edits a draft that is stored only on Apply or OK.
 * The contents of each tab arrive with tasks 22 and 23.
 */

import { OPTIONS_TABS, type OptionsTab } from '@shared/types'
import { useOptionsWindow } from './application/useOptionsWindow'
import styles from './OptionsWindow.module.css'

const TAB_TITLES: Record<OptionsTab, string> = {
  files: 'Files',
  hotkeys: 'Hotkeys',
  system: 'System'
}

export function OptionsWindow(): React.JSX.Element {
  const options = useOptionsWindow()
  const { tab } = options

  return (
    <div className={styles.window}>
      <div className={styles.tabs} role="tablist">
        {OPTIONS_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === tab}
            className={`${styles.tab} ${styles[id]} ${id === tab ? styles.active : ''}`}
            onClick={() => options.selectTab(id)}
          >
            {TAB_TITLES[id]}
          </button>
        ))}
      </div>

      <section className={`${styles.page} ${styles[`page_${tab}`]}`} role="tabpanel">
        <h1 className={styles.heading}>{TAB_TITLES[tab]}</h1>
        <div className={styles.body}>{options.ready ? 'TODO' : null}</div>
      </section>

      <footer className={styles.footer}>
        {options.nextFileNote && <span className={styles.note}>Applies from the next file</span>}
        <span className={styles.spacer} />
        <button type="button" className={styles.button} onClick={options.ok}>
          OK
        </button>
        <button type="button" className={styles.button} onClick={options.cancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!options.dirty}
          onClick={options.apply}
        >
          Apply
        </button>
      </footer>
    </div>
  )
}
