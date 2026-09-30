/**
 * Stereo VU meter (spec §4.2): two gradient bars, green up to -12 dBFS, yellow
 * up to -3 dBFS and red above, plus a peak that holds for
 * `VU_PEAK_HOLD_MS` and then falls slowly. A mono source shows both rows alike.
 *
 * Frames are kept in refs and drawn on a canvas each animation frame, so the
 * 30 fps stream never re-renders React.
 */

import { useEffect, useRef } from 'react'
import { METER_STALE_MS, VU_FLOOR_DB } from '@shared/defaults'
import type { MeterFrame } from '@shared/types'
import { useCanvasPainter } from '../hooks/useCanvasPainter'
import { NO_PEAK, heldPeakDb, holdPeak, type HeldPeak } from '../lib/peakHold'
import { rowLevels } from '../lib/vu'
import { paintVu } from '../lib/vuPainter'
import styles from './VuMeter.module.css'

/** One row per channel, in the order they are drawn. */
const CHANNEL_LABELS = ['L', 'R']

const COLOR_VARS = {
  off: '--color-vu-off',
  green: '--color-vu-green',
  yellow: '--color-vu-yellow',
  red: '--color-vu-red'
}

interface VuMeterProps {
  /** Hooks the meter to its frame stream; returns the unsubscribe. */
  subscribe: (listener: (frame: MeterFrame) => void) => () => void
}

export function VuMeter({ subscribe }: VuMeterProps): React.JSX.Element {
  const rmsRef = useRef<[number, number]>([VU_FLOOR_DB, VU_FLOOR_DB])
  const peaksRef = useRef<HeldPeak[]>([NO_PEAK, NO_PEAK])
  const arrivedAtRef = useRef(-Infinity)

  useEffect(
    () =>
      subscribe((frame) => {
        const now = performance.now()
        const peaks = rowLevels(frame.peakDb)
        rmsRef.current = rowLevels(frame.rmsDb)
        peaksRef.current = peaksRef.current.map((held, row) => holdPeak(held, peaks[row], now))
        arrivedAtRef.current = now
      }),
    [subscribe]
  )

  const canvasRef = useCanvasPainter(COLOR_VARS, (context, size, colors, now) => {
    // No frames means no monitor (window just shown, source reopening): silence.
    const stale = now - arrivedAtRef.current > METER_STALE_MS
    const rows = rmsRef.current.map((rmsDb, row) => ({
      rmsDb: stale ? VU_FLOOR_DB : rmsDb,
      peakDb: heldPeakDb(peaksRef.current[row], now)
    }))
    paintVu(context, size, rows, colors)
  })

  return (
    <div className={styles.meter}>
      <div className={styles.channels}>
        {CHANNEL_LABELS.map((label) => (
          <span key={label} className={styles.channel}>
            {label}
          </span>
        ))}
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
