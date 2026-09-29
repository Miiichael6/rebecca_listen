/**
 * Recording list (spec §4.6): zebra rows with the file name on the left and its
 * duration on the right. The selected row gets a blue bar on its left, and the
 * file being recorded shows `--:--` in blue.
 *
 * Double click opens the file in the system player. Keyboard (`Supr`, `F2`,
 * `Enter`) arrives with task 17.
 */

import type { HistoryItem, SessionSnapshot } from '@shared/types'
import { UNKNOWN_DURATION, formatDuration } from '../lib/duration'
import styles from './RecordingList.module.css'

interface RecordingListProps {
  items: HistoryItem[]
  selectedId?: string | null
  /** File still being written, shown on top with `--:--` until it is saved. */
  recordingFile?: SessionSnapshot['file']
  onSelect?: (id: string) => void
  onOpen?: (item: HistoryItem) => void
}

function rowClass(isSelected: boolean): string {
  return isSelected ? `${styles.row} ${styles.selected}` : styles.row
}

export function RecordingList({
  items,
  selectedId = null,
  recordingFile = null,
  onSelect,
  onOpen
}: RecordingListProps): React.JSX.Element {
  return (
    <div className={styles.list}>
      {recordingFile && (
        <div className={`${styles.row} ${styles.active}`} title={recordingFile.path}>
          <span className={styles.name}>{recordingFile.name}</span>
          <span className={styles.duration}>{UNKNOWN_DURATION}</span>
        </div>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className={rowClass(item.id === selectedId)}
          title={item.path}
          onClick={() => onSelect?.(item.id)}
          onDoubleClick={() => onOpen?.(item)}
        >
          <span className={styles.name}>{item.name}</span>
          <span className={styles.duration}>{formatDuration(item.durationMs)}</span>
        </div>
      ))}
    </div>
  )
}
