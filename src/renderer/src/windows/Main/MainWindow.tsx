/**
 * Main window (spec §4): Source, Level with the VU meter, waveform, timer,
 * status bar, recording list and transport bar, from top to bottom.
 *
 * Still static: every value comes from `sampleData` until the tasks that own
 * each strip replace it.
 */

import { LevelSlider } from '../../components/LevelSlider'
import { RecordingList } from '../../components/RecordingList'
import { SourcePicker } from '../../components/SourcePicker'
import { StatusBar } from '../../components/StatusBar'
import { Timer } from '../../components/Timer'
import { TransportBar } from '../../components/TransportBar'
import { VuMeter } from '../../components/VuMeter'
import { Waveform } from '../../components/Waveform'
import { SAMPLE } from './sampleData'
import styles from './MainWindow.module.css'

export function MainWindow(): React.JSX.Element {
  const recording = SAMPLE.state === 'recording'

  return (
    <div className={styles.window}>
      <SourcePicker value={SAMPLE.sourceLabel} disabled={recording} />
      <LevelSlider percent={SAMPLE.levelPercent} />
      <VuMeter rmsDb={SAMPLE.rmsDb} peakDb={SAMPLE.peakDb} />
      <Waveform frame={SAMPLE.wave} />
      <Timer elapsedMs={SAMPLE.elapsedMs} paused={SAMPLE.state === 'paused'} />
      <StatusBar state={SAMPLE.state} count={SAMPLE.items.length} />
      <RecordingList
        items={SAMPLE.items}
        selectedId={SAMPLE.selectedId}
        recordingId={SAMPLE.recordingId}
      />
      <TransportBar recording={recording} />
    </div>
  )
}
