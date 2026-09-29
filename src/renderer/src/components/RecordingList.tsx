/**
 * Recording list (spec §4.6): zebra rows with the file name on the left and its
 * duration on the right. The selected row gets a blue bar on its left, and the
 * file being recorded shows `--:--` in blue.
 *
 * Keyboard (`Supr`, `F2`, `Enter`) and double click to play arrive with task 17.
 */

import type { HistoryItem } from '@shared/types'
import { UNKNOWN_DURATION, formatDuration } from '../lib/duration'
import styles from './RecordingList.module.css'

interface RecordingListProps {
  items: HistoryItem[]
  selectedId?: string | null
  /** Item still being written, if any. */
  recordingId?: string | null
  onSelect?: (id: string) => void
}

function rowClass(isSelected: boolean, isRecording: boolean): string {
  const classes = [styles.row]
  if (isRecording) classes.push(styles.active)
  if (isSelected) classes.push(styles.selected)
  return classes.join(' ')
}

export function RecordingList({
  items,
  selectedId = null,
  recordingId = null,
  onSelect
}: RecordingListProps): React.JSX.Element {
  return (
    <div className={styles.list}>
      {items.map((item) => {
        const isRecording = item.id === recordingId
        return (
          <div
            key={item.id}
            className={rowClass(item.id === selectedId, isRecording)}
            onClick={() => onSelect?.(item.id)}
          >
            <span className={styles.name}>{item.name}</span>
            <span className={styles.duration}>
              {isRecording ? UNKNOWN_DURATION : formatDuration(item.durationMs)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
