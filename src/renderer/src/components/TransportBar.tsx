/**
 * Transport bar (spec §4.8): round record button, the File / Stop / Play /
 * Pause pill, the Split button (in place of the original "Upgrade") and the
 * gear that opens Options.
 *
 * There is no playback progress bar: ▶ opens the file in the system player
 * (task 17). Wiring comes with task 13; here every handler is optional.
 */

import { Circle, Eject, Pause, Play, Settings, Square } from 'lucide-react'
import styles from './TransportBar.module.css'

/** Icon size of the pill buttons. */
const ICON = 14

interface TransportBarProps {
  /** Disables Split, which only makes sense while recording. */
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
      <button type="button" className={styles.record} title="Record" onClick={onRecord}>
        <Circle size={18} fill="currentColor" aria-hidden />
      </button>

      <div className={styles.pill}>
        <button type="button" className={styles.pillButton} title="Open folder" onClick={onFile}>
          <Eject size={ICON} aria-hidden />
        </button>
        <button type="button" className={styles.pillButton} title="Stop" onClick={onStop}>
          <Square size={ICON} fill="currentColor" aria-hidden />
        </button>
        <button type="button" className={styles.pillButton} title="Play" onClick={onPlay}>
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
