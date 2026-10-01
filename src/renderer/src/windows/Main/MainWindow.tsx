/**
 * Main window (spec §4, look of plan/images/app.png): a panel with Source,
 * Level, the VU meter and the RebeccaWrites link; a monitor with the timer, the waveform and the state
 * badges; the playback bar, the recording list and the transport bar.
 *
 * Everything is live: Level drives the gain in main (monitor and file), and
 * the VU meter and waveform draw its frames. Record, Pause, Stop and Split
 * drive the session in main; with no recording in progress, ▶ ⏸ ■ play the selected
 * recording inside the app and the timer shows its position. What each
 * control does is in `application/useMainWindow`; this file lays them out.
 */

import { LevelSlider } from '../../components/LevelSlider'
import { PlaybackBar } from '../../components/PlaybackBar'
import { RebeccaWritesLink } from '../../components/RebeccaWritesLink/RebeccaWritesLink'
import { RecordingList } from '../../components/RecordingList/RecordingList'
import { MicrophonePicker } from '../../components/MicrophonePicker/MicrophonePicker'
import { SourcePicker } from '../../components/SourcePicker/SourcePicker'
import { StatusBar } from '../../components/StatusBar'
import { TagEditor } from '../../components/TagEditor/TagEditor'
import { Timer } from '../../components/Timer'
import { TransportBar } from '../../components/TransportBar'
import { VuMeter } from '../../components/VuMeter'
import { Waveform } from '../../components/Waveform'
import { useMainWindow } from './application/useMainWindow'
import { onMeterFrame, onWaveFrame } from './infrastructure/mainApi'
import styles from './MainWindow.module.css'

export function MainWindow(): React.JSX.Element {
  const main = useMainWindow()
  const { recorder, devices, session, recording, playing, tagged, player } = main
  const { source, items, notice } = recorder

  return (
    <div className={styles.window}>
      {notice && (
        <button
          type="button"
          className={`${styles.notice} ${styles[notice.level]}`}
          title="Dismiss"
          onClick={recorder.dismissNotice}
        >
          {notice.message}
        </button>
      )}
      <section className={`${styles.panel} ${styles.sourcePanel}`}>
        <SourcePicker
          source={source}
          devices={devices}
          expanded={recorder.sourceListExpanded}
          disabled={recording}
          onOpen={main.refreshDevices}
          onChange={(next) => void recorder.setSource(next)}
          onExpandedChange={(expanded) => void recorder.setSourceListExpanded(expanded)}
        />
        {source?.mode === 'mixed' && (
          <MicrophonePicker
            voiceId={source.voiceId ?? ''}
            devices={devices}
            disabled={recording}
            onChange={(voiceId) =>
              void recorder.setSource(voiceId ? { mode: 'mixed', voiceId } : { mode: 'mixed' })
            }
          />
        )}
        <LevelSlider percent={recorder.level} onChange={recorder.setLevel} />
        <VuMeter subscribe={onMeterFrame} />
        <RebeccaWritesLink disabled={recording} />
      </section>
      <section className={`${styles.panel} ${styles.monitor}`}>
        <Timer elapsedMs={main.timerMs} paused={main.timerPaused} />
        <Waveform subscribe={onWaveFrame} frozen={session.state === 'paused'} />
        <StatusBar state={session.state} count={items.length} />
      </section>
      <PlaybackBar positionMs={player.positionMs} durationMs={playing?.durationMs ?? 0} />
      <RecordingList
        items={items}
        selectedId={recorder.selectedId}
        editingId={recorder.editingId}
        recordingFile={session.file}
        onSelect={recorder.select}
        onOpen={(item) => main.runRecordingCommand(item.id, 'play')}
        canPlay={!recording}
        onCommand={main.runRecordingCommand}
        onRename={(id, name) => void recorder.rename(id, name)}
        onRenameEnd={recorder.endRename}
      />
      <TransportBar
        state={session.state}
        onRecord={main.onRecord}
        onStop={main.onStop}
        onPlay={main.onPlay}
        onPause={main.onPause}
        onSplit={main.onSplit}
        splitHotkey={main.splitHotkey}
        hasItems={items.length > 0}
        folder={recorder.folder}
        onOpenFolder={main.openRecordingsFolder}
        onChangeFolder={() => void recorder.chooseFolder()}
        onOpenAudioFile={() => void recorder.importAudioFile()}
        onClearList={() => void recorder.clearList()}
        onOptions={main.openOptions}
      />
      {tagged && <TagEditor key={tagged.id} item={tagged} onClose={recorder.closeTags} />}
    </div>
  )
}
