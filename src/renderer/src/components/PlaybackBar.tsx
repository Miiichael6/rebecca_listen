/**
 * Slim bar between the monitor and the list: how far the in-app player is
 * through the recording it plays. Empty while nothing plays.
 */

import { formatDuration } from '../lib/duration'
import styles from './PlaybackBar.module.css'

interface PlaybackBarProps {
  positionMs: number
  /** Length of the recording being played; 0 when nothing plays. */
  durationMs: number
}

export function PlaybackBar({ positionMs, durationMs }: PlaybackBarProps): React.JSX.Element {
  const ratio = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0
  return (
    <div
      className={styles.bar}
      title={durationMs > 0 ? `${formatDuration(positionMs)} / ${formatDuration(durationMs)}` : ''}
    >
      <div className={styles.fill} style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}
