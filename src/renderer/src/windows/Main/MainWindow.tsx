/**
 * Main window (spec §4): Source, Level with the VU meter, waveform, timer,
 * status bar, recording list and transport bar, from top to bottom.
 *
 * Everything is live: Level drives the gain in main (monitor and file), and
 * the VU meter and waveform draw its frames. Record, Pause and Stop drive the
 * session in main; with no recording in progress, ▶ ⏸ ■ play the selected
 * recording inside the app and the timer shows its position.
 */

import { useEffect } from 'react'
import type { MeterFrame, WaveFrame } from '@shared/types'
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
import { loadSession, useSessionStore } from '../../store/session'
import styles from './MainWindow.module.css'

const onMeterFrame = (listener: (frame: MeterFrame) => void): (() => void) =>
  window.api.on('meter:frame', listener)
const onWaveFrame = (listener: (frame: WaveFrame) => void): (() => void) =>
  window.api.on('wave:frame', listener)

export function MainWindow(): React.JSX.Element {
  const { source, sourceListExpanded, level, items, selectedId, notice } = useRecorderStore()
  const { setSource, setSourceListExpanded, setLevel, select, dismissNotice } = useRecorderStore()
  const { devices, refresh: refreshDevices } = useDevicesStore()
  const { playingId, paused, positionMs, play, pause, stop } = usePlayerStore()
  const { session, record, togglePause, stop: stopRecording } = useSessionStore()
  const recording = session.state !== 'idle'

  useEffect(() => {
    loadSession()
    void loadRecorder()
    void loadDevices()
  }, [])

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
      <LevelSlider percent={level} onChange={setLevel} />
      <VuMeter subscribe={onMeterFrame} />
      <Waveform subscribe={onWaveFrame} frozen={session.state === 'paused'} />
      <Timer
        elapsedMs={!recording && playingId ? positionMs : session.elapsedMs}
        paused={recording ? session.state === 'paused' : paused}
      />
      <StatusBar state={session.state} count={items.length} />
      <RecordingList
        items={items}
        selectedId={selectedId}
        recordingFile={session.file}
        onSelect={select}
        onOpen={(item) => play(item.id)}
      />
      <TransportBar
        state={session.state}
        onRecord={() => {
          // Playing through the speakers would end up in a loopback recording.
          stop()
          void record()
        }}
        onStop={() => (recording ? void stopRecording() : stop())}
        onPlay={() => !recording && selected && play(selected.id)}
        onPause={() => (recording ? void togglePause() : pause())}
        onFile={() => void window.api.invoke('shell:openRecordingsFolder')}
      />
    </div>
  )
}
