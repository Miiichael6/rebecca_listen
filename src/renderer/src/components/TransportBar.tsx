/**
 * Transport bar (spec §4.8): round record button, the File / Stop / Play /
 * Pause pill, the Split button (in place of the original "Upgrade") and the
 * gear that opens Options.
 *
 * ▶ ⏸ ■ play the selected recording inside the app (■ stops the recording
 * instead while one is in progress). The round button starts a recording and,
 * while recording, stops it.
 */

import { Circle, Eject, Pause, Play, Settings, Square } from 'lucide-react'
import styles from './TransportBar.module.css'

/** Icon size of the pill buttons. */
const ICON = 14

interface TransportBarProps {
  /** Turns the round button into Stop and enables Split. */
  recording?: boolean
  onRecord?: () => void
  onFile?: () => void
  onStop?: () => void
  onPlay?: () => void
  onPause?: () => void
  onSplit?: () => void
  onOptions?: () => void
}

export function TransportBar({
  recording = false,
  onRecord,
  onFile,
  onStop,
  onPlay,
  onPause,
  onSplit,
  onOptions
}: TransportBarProps): React.JSX.Element {
  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={recording ? `${styles.record} ${styles.recording}` : styles.record}
        title={recording ? 'Stop recording' : 'Record'}
        onClick={recording ? onStop : onRecord}
      >
        {recording ? (
          <Square size={14} fill="currentColor" aria-hidden />
        ) : (
          <Circle size={18} fill="currentColor" aria-hidden />
        )}
      </button>

      <div className={styles.pill}>
        <button type="button" className={styles.pillButton} title="Open folder" onClick={onFile}>
          <Eject size={ICON} aria-hidden />
        </button>
        <button type="button" className={styles.pillButton} title="Stop" onClick={onStop}>
          <Square size={ICON} fill="currentColor" aria-hidden />
        </button>
        <button
          type="button"
          className={styles.pillButton}
          title="Play the selected recording"
          onClick={onPlay}
        >
          <Play size={ICON} fill="currentColor" aria-hidden />
        </button>
        <button type="button" className={styles.pillButton} title="Pause" onClick={onPause}>
          <Pause size={ICON} fill="currentColor" aria-hidden />
        </button>
      </div>

      <span className={styles.spacer} />

      <button
        type="button"
        className={styles.split}
        title="Start a new file without losing audio"
        disabled={!recording}
        onClick={onSplit}
      >
        Split
      </button>

      <button type="button" className={styles.gear} title="Options" onClick={onOptions}>
        <Settings size={16} aria-hidden />
      </button>
    </div>
  )
}
