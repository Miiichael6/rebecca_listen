/**
 * Live waveform strip (spec §4.3): the columns of each `wave:frame` slide in
 * from the right over one frame period, so the strip scrolls continuously at
 * the display rate while the data arrives at `METER_FPS`.
 *
 * `frozen` (pause, task 13) stops the scroll and ignores new frames.
 */

import { useEffect, useRef, useState } from 'react'
import { METER_FPS, WAVE_COLUMNS_PER_FRAME, WAVE_HISTORY_COLUMNS } from '@shared/defaults'
import type { WaveFrame } from '@shared/types'
import { useCanvasPainter } from '../hooks/useCanvasPainter'
import { WaveBuffer } from '../lib/waveBuffer'
import { COLUMN_PX, paintWaveform } from '../lib/waveformPainter'
import styles from './Waveform.module.css'

const FRAME_MS = 1000 / METER_FPS
const FRAME_PX = WAVE_COLUMNS_PER_FRAME * COLUMN_PX

const COLOR_VARS = {
  background: '--color-monitor',
  grid: '--color-grid',
  wave: '--color-wave'
}

interface WaveformProps {
  /** Hooks the strip to its frame stream; returns the unsubscribe. */
  subscribe: (listener: (frame: WaveFrame) => void) => () => void
  frozen?: boolean
}

export function Waveform({ subscribe, frozen = false }: WaveformProps): React.JSX.Element {
  const [buffer] = useState(() => new WaveBuffer(WAVE_HISTORY_COLUMNS))
  const arrivedAtRef = useRef(-Infinity)
  const frozenRef = useRef(frozen)
  useEffect(() => {
    frozenRef.current = frozen
  }, [frozen])

  useEffect(
    () =>
      subscribe((frame) => {
        if (frozenRef.current) return
        buffer.push(frame)
        arrivedAtRef.current = performance.now()
      }),
    [subscribe, buffer]
  )

  const canvasRef = useCanvasPainter(COLOR_VARS, (context, size, colors, now) => {
    const progress = frozenRef.current
      ? 1
      : Math.min(1, Math.max(0, (now - arrivedAtRef.current) / FRAME_MS))
    paintWaveform(context, size, buffer, (1 - progress) * FRAME_PX, colors)
  })

  return (
    <div className={styles.strip}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
