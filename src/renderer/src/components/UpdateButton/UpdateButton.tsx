/**
 * Update button of the title bar: it appears only when there is a newer version
 * and walks the steps of the updater (download, restart), so nobody has to
 * download an installer again.
 */

import { useUpdatesStore } from '../../store/updates'
import { updateAction } from './updateAction'
import styles from './UpdateButton.module.css'

export function UpdateButton(): React.JSX.Element | null {
  const { status, download, install } = useUpdatesStore()
  const action = updateAction(status)
  if (!action) return null
  const { label, step, title } = action
  const run = { download, install }

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
