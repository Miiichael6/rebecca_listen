/**
 * Transport bar (spec §4.8, look of plan/images/app.png): red record button,
 * round Folder / Stop / Play / Pause buttons, the Split pill (in place of the
 * original "Upgrade") and the round gear that opens Options.
 *
 * ▶ ⏸ ■ play the selected recording inside the app; while a recording is in
 * progress ■ stops it and ⏸ pauses or resumes it. The folder button opens the
 * recordings folder, and its menu (right click) opens a file or clears the list. The round button starts a
 * recording and, once started, stops it: a square that pulses while
 * recording and holds still while paused.
 */

import { Pause, Play, Scissors, Settings, Square } from 'lucide-react'
import type { SessionState } from '@shared/types'
import { FileButton } from './FileButton'
import styles from './TransportBar.module.css'

/** Icon size of the round buttons. */
const ICON = 18

const PAUSE_TITLES: Record<SessionState, string> = {
  idle: 'Pause',
  recording: 'Pause recording',
  paused: 'Resume recording'
}

interface TransportBarProps {
  /** Anything but `idle` turns the round button into Stop and enables Split. */
  state?: SessionState
  /** Clear list… is greyed out on an empty list. */
  hasItems?: boolean
  onRecord?: () => void
  /** Recordings folder, shown on the File button. */
  folder?: string
  onOpenFolder?: () => void
  onChangeFolder?: () => void
  onOpenAudioFile?: () => void
  onClearList?: () => void
  onStop?: () => void
  onPlay?: () => void
  onPause?: () => void
  onSplit?: () => void
  onOptions?: () => void
}

export function TransportBar({
  state = 'idle',
  hasItems = false,
  onRecord,
  folder,
  onOpenFolder,
  onChangeFolder,
  onOpenAudioFile,
  onClearList,
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
        <span className={styles.recordMark} aria-hidden />
      </button>

      <FileButton
        className={styles.round}
        iconSize={ICON}
        hasItems={hasItems}
        folder={folder}
        onOpenFolder={onOpenFolder}
        onChangeFolder={onChangeFolder}
        onOpenAudioFile={onOpenAudioFile}
        onClearList={onClearList}
      />
      <button type="button" className={styles.round} title="Stop" onClick={onStop}>
        <Square size={ICON - 2} fill="currentColor" aria-hidden />
      </button>
      <button
        type="button"
        className={styles.round}
        title="Play the selected recording"
        onClick={onPlay}
      >
        <Play size={ICON} fill="currentColor" aria-hidden />
      </button>
      <button type="button" className={styles.round} title={PAUSE_TITLES[state]} onClick={onPause}>
        <Pause size={ICON} fill="currentColor" aria-hidden />
      </button>

      <span className={styles.spacer} />

      <button
        type="button"
        className={styles.split}
        title="Start a new file without losing audio"
        disabled={!recording}
        onClick={onSplit}
      >
        <Scissors size={ICON} aria-hidden />
        Split
      </button>

      <button type="button" className={styles.round} title="Options" onClick={onOptions}>
        <Settings size={ICON + 2} aria-hidden />
      </button>
    </div>
  )
}
