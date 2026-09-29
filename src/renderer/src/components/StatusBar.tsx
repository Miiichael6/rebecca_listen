/**
 * Status bar of the list (spec §4.5): state badge and round counter.
 *
 * The AGC · NS · VAS · FLL · Schedule columns of the original are not here:
 * those features are out of the project's scope.
 */

import type { SessionState } from '@shared/types'
import styles from './StatusBar.module.css'

const STATE_LABELS: Record<SessionState, string> = {
  idle: 'Ready',
  recording: 'Recording',
  paused: 'Paused'
}

interface StatusBarProps {
  state: SessionState
  /** Recordings currently in the list. */
  count: number
}

export function StatusBar({ state, count }: StatusBarProps): React.JSX.Element {
  return (
    <div className={styles.bar}>
      <span className={`${styles.state} ${styles[state]}`}>{STATE_LABELS[state]}</span>
      <span className={styles.count}>{count}</span>
    </div>
  )
}
