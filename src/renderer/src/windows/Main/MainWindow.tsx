/**
 * Main window (spec §4, look of plan/images/app.png): a panel with Source,
 * Level and the VU meter; a monitor with the timer, the waveform and the state
 * badges; the playback bar, the recording list and the transport bar.
 *
 * Everything is live: Level drives the gain in main (monitor and file), and
 * the VU meter and waveform draw its frames. Record, Pause and Stop drive the
 * session in main; with no recording in progress, ▶ ⏸ ■ play the selected
 * recording inside the app and the timer shows its position.
 */

import { useEffect } from 'react'
import type { MeterFrame, WaveFrame } from '@shared/types'
import { LevelSlider } from '../../components/LevelSlider'
import { PlaybackBar } from '../../components/PlaybackBar'
import { RecordingList } from '../../components/RecordingList/RecordingList'
import { MicrophonePicker } from '../../components/MicrophonePicker/MicrophonePicker'
import { SourcePicker } from '../../components/SourcePicker/SourcePicker'
import { StatusBar } from '../../components/StatusBar'
import { TagEditor } from '../../components/TagEditor/TagEditor'
import { Timer } from '../../components/Timer'
import { TransportBar } from '../../components/TransportBar'
import { VuMeter } from '../../components/VuMeter'
import { Waveform } from '../../components/Waveform'
import { loadDevices, useDevicesStore } from '../../store/devices'
import { usePlayerStore } from '../../store/player'
import { loadRecorder, useRecorderStore } from '../../store/recorder'
import { runRecordingCommand } from '../../store/recordingCommands'
import { loadSession, useSessionStore } from '../../store/session'
import styles from './MainWindow.module.css'

const onMeterFrame = (listener: (frame: MeterFrame) => void): (() => void) =>
  window.api.on('meter:frame', listener)
const onWaveFrame = (listener: (frame: WaveFrame) => void): (() => void) =>
  window.api.on('wave:frame', listener)

export function MainWindow(): React.JSX.Element {
  const { source, sourceListExpanded, level, items, selectedId, editingId, tagsId, notice } =
    useRecorderStore()
  const { setSource, setSourceListExpanded, setLevel, select, rename, endRename } =
    useRecorderStore()
  const { folder, importAudioFile, clearList, chooseFolder, closeTags, dismissNotice } =
    useRecorderStore()
  const { devices, refresh: refreshDevices } = useDevicesStore()
  const { playingId, paused, positionMs, pause, stop } = usePlayerStore()
  const { session, record, togglePause, stop: stopRecording } = useSessionStore()
  const recording = session.state !== 'idle'

  useEffect(() => {
    loadSession()
    void loadRecorder()
    void loadDevices()
  }, [])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const playing = items.find((item) => item.id === playingId) ?? null
  const tagged = items.find((item) => item.id === tagsId) ?? null

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
      <section className={`${styles.panel} ${styles.sourcePanel}`}>
        <SourcePicker
          source={source}
          devices={devices}
          expanded={sourceListExpanded}
          disabled={recording}
          onOpen={() => void refreshDevices()}
          onChange={(next) => void setSource(next)}
          onExpandedChange={(expanded) => void setSourceListExpanded(expanded)}
        />
        {source?.mode === 'mixed' && (
          <MicrophonePicker
            voiceId={source.voiceId ?? ''}
            devices={devices}
            disabled={recording}
            onChange={(voiceId) =>
              void setSource(voiceId ? { mode: 'mixed', voiceId } : { mode: 'mixed' })
            }
          />
        )}
        <LevelSlider percent={level} onChange={setLevel} />
        <VuMeter subscribe={onMeterFrame} />
      </section>
      <section className={`${styles.panel} ${styles.monitor}`}>
        <Timer
          elapsedMs={!recording && playingId ? positionMs : session.elapsedMs}
          paused={recording ? session.state === 'paused' : paused}
        />
        <Waveform subscribe={onWaveFrame} frozen={session.state === 'paused'} />
        <StatusBar state={session.state} count={items.length} />
      </section>
      <PlaybackBar positionMs={positionMs} durationMs={playing?.durationMs ?? 0} />
      <RecordingList
        items={items}
        selectedId={selectedId}
        editingId={editingId}
        recordingFile={session.file}
        onSelect={select}
        onOpen={(item) => runRecordingCommand(item.id, 'play')}
        canPlay={!recording}
        onCommand={runRecordingCommand}
        onRename={(id, name) => void rename(id, name)}
        onRenameEnd={endRename}
      />
      <TransportBar
        state={session.state}
        onRecord={() => {
          // Playing through the speakers would end up in a loopback recording.
          stop()
          void record()
        }}
        onStop={() => (recording ? void stopRecording() : stop())}
        onPlay={() => selected && runRecordingCommand(selected.id, 'play')}
        onPause={() => (recording ? void togglePause() : pause())}
        hasItems={items.length > 0}
        folder={folder}
        onOpenFolder={() => void window.api.invoke('shell:openRecordingsFolder')}
        onChangeFolder={() => void chooseFolder()}
        onOpenAudioFile={() => void importAudioFile()}
        onClearList={() => void clearList()}
      />
      {tagged && <TagEditor key={tagged.id} item={tagged} onClose={closeTags} />}
    </div>
  )
}
