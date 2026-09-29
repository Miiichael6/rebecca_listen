/**
 * Stereo VU meter (spec §4.2): two rows of `VU_SEGMENTS` segments, green up to
 * -12 dBFS, yellow up to -3 dBFS and red above, plus the held peak segment.
 *
 * It only draws what it is given; the peak hold of `VU_PEAK_HOLD_MS` is
 * computed by whoever feeds `peakDb` (task 10).
 */

import { VU_SEGMENTS } from '@shared/defaults'
import { litSegments, segmentDb, zoneOf } from '../lib/vu'
import styles from './VuMeter.module.css'

/** One row per channel, in the order they are drawn. */
const CHANNEL_LABELS = ['L', 'R']

interface VuMeterProps {
  /** RMS level per channel, in dBFS. */
  rmsDb: number[]
  /** Held peak per channel, in dBFS. */
  peakDb?: number[]
}

const SEGMENT_INDEXES = Array.from({ length: VU_SEGMENTS }, (_, index) => index)

function segmentClass(index: number, lit: number, peak: number): string {
  const on = index < lit || index === peak - 1
  return on ? `${styles.segment} ${styles[zoneOf(segmentDb(index))]}` : styles.segment
}

export function VuMeter({ rmsDb, peakDb = [] }: VuMeterProps): React.JSX.Element {
  return (
    <div className={styles.meter}>
      {CHANNEL_LABELS.map((label, channel) => {
        const lit = litSegments(rmsDb[channel] ?? Number.NEGATIVE_INFINITY)
        const peak = litSegments(peakDb[channel] ?? Number.NEGATIVE_INFINITY)
        return (
          <div key={label} className={styles.row}>
            <span className={styles.channel}>{label}</span>
            <div className={styles.segments}>
              {SEGMENT_INDEXES.map((index) => (
                <span key={index} className={segmentClass(index, lit, peak)} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
