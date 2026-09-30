/**
 * Update button of the title bar: one control that walks the steps of the
 * updater (check, download, restart), so nobody has to download an installer again.
 */

import { useUpdatesStore } from '../../store/updates'
import { updateAction } from './updateAction'
import styles from './UpdateButton.module.css'

export function UpdateButton(): React.JSX.Element {
  const { status, check, download, install } = useUpdatesStore()
  const { label, step, title } = updateAction(status)
  const run = { check, download, install }

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[status.state]}`}
      title={title}
      disabled={step === null}
      onClick={() => step && void run[step]()}
    >
      {label}
    </button>
  )
}
