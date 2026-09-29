/**
 * Recording list (spec §4.6): zebra rows with the file name on the left and its
 * duration on the right. The selected row gets a blue bar on its left, and the
 * file being recorded shows `--:--` in blue.
 *
 * Double click opens the file in the system player. Keyboard (`Supr`, `F2`,
 * `Enter`) arrives with task 17.
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
  onOpen?: (item: HistoryItem) => void
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
  onSelect,
  onOpen
}: RecordingListProps): React.JSX.Element {
  return (
    <div className={styles.list}>
      {items.map((item) => {
        const isRecording = item.id === recordingId
        return (
          <div
            key={item.id}
            className={rowClass(item.id === selectedId, isRecording)}
            title={item.path}
            onClick={() => onSelect?.(item.id)}
            onDoubleClick={() => !isRecording && onOpen?.(item)}
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
