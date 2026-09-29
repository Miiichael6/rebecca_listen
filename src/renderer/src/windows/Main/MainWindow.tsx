/**
 * Main window (spec §4): Source, Level with the VU meter, waveform, timer,
 * status bar, recording list and transport bar, from top to bottom.
 *
 * Source, timer, status, list and transport are live. Level, VU meter and
 * waveform stay idle until task 10. ▶ plays the selected recording inside the
 * app; while it plays the timer shows its position.
 */

import { useEffect } from 'react'
import type { HistoryItem, WaveFrame } from '@shared/types'
import { LevelSlider } from '../../components/LevelSlider'
import { RecordingList } from '../../components/RecordingList'
import { SourcePicker } from '../../components/SourcePicker/SourcePicker'
import { StatusBar } from '../../components/StatusBar'
import { Timer } from '../../components/Timer'
import { TransportBar } from '../../components/TransportBar'
import { VuMeter } from '../../components/VuMeter'
import { Waveform } from '../../components/Waveform'
import { loadDevices, useDevicesStore } from '../../store/devices'
import { usePlayerStore } from '../../store/player'
import { loadRecorder, useRecorderStore } from '../../store/recorder'
import styles from './MainWindow.module.css'

const SILENT_WAVE: WaveFrame = { min: [], max: [] }
const SILENT_DB: number[] = []

/** Id of the pseudo row of the file being written. */
const RECORDING_ROW = 'recording'

export function MainWindow(): React.JSX.Element {
  const { source, sourceListExpanded, session, items, selectedId, notice } = useRecorderStore()
  const { setSource, setSourceListExpanded, select, dismissNotice } = useRecorderStore()
  const { devices, refresh: refreshDevices } = useDevicesStore()
  const { playingId, paused, positionMs, play, pause, stop } = usePlayerStore()
  const recording = session.state !== 'idle'

  useEffect(() => {
    void loadRecorder()
    void loadDevices()
  }, [])

  // The file being written sits on top with `--:--` until it is saved.
  const rows: HistoryItem[] =
    recording && session.file
      ? [
          {
            id: RECORDING_ROW,
            path: session.file.path,
            name: session.file.name,
            format: 'wav',
            durationMs: 0,
            sizeBytes: 0,
            createdAt: 0,
            source: source ?? { mode: 'system' }
          },
          ...items
        ]
      : items

  const selected = items.find((item) => item.id === selectedId) ?? null

  return (
    <div className={styles.window}>
      {notice && (
        <button
          type="button"
          className={`${styles.notice} ${styles[notice.level]}`}
          title="Dismiss"
          onClick={dismissNotice}
        >
          {notice.message}
        </button>
      )}
      <SourcePicker
        source={source}
        devices={devices}
        expanded={sourceListExpanded}
        disabled={recording}
        onOpen={() => void refreshDevices()}
        onChange={(next) => void setSource(next)}
        onExpandedChange={(expanded) => void setSourceListExpanded(expanded)}
      />
      <LevelSlider percent={100} />
      <VuMeter rmsDb={SILENT_DB} peakDb={SILENT_DB} />
      <Waveform frame={SILENT_WAVE} />
      <Timer
        elapsedMs={!recording && playingId ? positionMs : session.elapsedMs}
        paused={recording ? session.state === 'paused' : paused}
      />
      <StatusBar state={session.state} count={items.length} />
      <RecordingList
        items={rows}
        selectedId={selectedId}
        recordingId={recording ? RECORDING_ROW : null}
        onSelect={select}
        onOpen={(item) => play(item.id)}
      />
      <TransportBar
        recording={recording}
        onRecord={() => {
          // Playing through the speakers would end up in a loopback recording.
          stop()
          void window.api.invoke('session:record')
        }}
        onStop={() => (recording ? void window.api.invoke('session:stop') : stop())}
        onPlay={() => selected && play(selected.id)}
        onPause={pause}
        onFile={() => void window.api.invoke('shell:openRecordingsFolder')}
      />
    </div>
  )
}
