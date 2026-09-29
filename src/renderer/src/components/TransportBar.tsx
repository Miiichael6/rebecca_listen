/**
 * Transport bar (spec §4.8): round record button, the File / Stop / Play /
 * Pause pill, the Split button (in place of the original "Upgrade") and the
 * gear that opens Options.
 *
 * ▶ ⏸ ■ play the selected recording inside the app; while a recording is in
 * progress ■ stops it and ⏸ pauses or resumes it. The round button starts a
 * recording and, once started, stops it: a square that pulses while
 * recording and holds still while paused.
 */

import { Circle, Eject, Pause, Play, Settings, Square } from 'lucide-react'
import type { SessionState } from '@shared/types'
import styles from './TransportBar.module.css'

/** Icon size of the pill buttons. */
const ICON = 14

const PAUSE_TITLES: Record<SessionState, string> = {
  idle: 'Pause',
  recording: 'Pause recording',
  paused: 'Resume recording'
}

interface TransportBarProps {
  /** Anything but `idle` turns the round button into Stop and enables Split. */
  state?: SessionState
  onRecord?: () => void
  onFile?: () => void
  onStop?: () => void
  onPlay?: () => void
  onPause?: () => void
  onSplit?: () => void
  onOptions?: () => void
}

export function TransportBar({
  state = 'idle',
  onRecord,
  onFile,
  onStop,
  onPlay,
  onPause,
  onSplit,
  onOptions
}: TransportBarProps): React.JSX.Element {
  const recording = state !== 'idle'
  const recordClasses = [styles.record]
  if (recording) recordClasses.push(styles.stoppable)
  if (state === 'recording') recordClasses.push(styles.pulsing)

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={recordClasses.join(' ')}
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
        <button
          type="button"
          className={styles.pillButton}
          title={PAUSE_TITLES[state]}
          onClick={onPause}
        >
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
