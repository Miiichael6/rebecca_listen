/**
 * Recording time (spec §4.4): large centred `MM:SS`, `H:MM:SS` past the hour.
 * It blinks softly while paused.
 */

import { formatDuration } from '../lib/duration'
import styles from './Timer.module.css'

interface TimerProps {
  /** Recorded time only: it does not advance while paused. */
  elapsedMs: number
  paused?: boolean
}

export function Timer({ elapsedMs, paused = false }: TimerProps): React.JSX.Element {
  return (
    <div className={paused ? `${styles.timer} ${styles.paused}` : styles.timer}>
      {formatDuration(elapsedMs)}
    </div>
  )
}
