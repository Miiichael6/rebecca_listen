/**
 * Live waveform strip (spec §4.3). The component owns the canvas and its size;
 * the drawing itself lives in `lib/waveformPainter`.
 *
 * It repaints when the frame changes: the 30 fps loop and the freeze on pause
 * come with task 10.
 */

import { useEffect, useRef } from 'react'
import type { WaveFrame } from '@shared/types'
import { paintWaveform } from '../lib/waveformPainter'
import styles from './Waveform.module.css'

interface WaveformProps {
  /** Decimated peaks, oldest first; the newest bucket is drawn at the right. */
  frame: WaveFrame
}

function readColors(element: HTMLElement): { background: string; grid: string; wave: string } {
  const style = getComputedStyle(element)
  return {
    background: style.getPropertyValue('--color-background'),
    grid: style.getPropertyValue('--color-grid'),
    wave: style.getPropertyValue('--color-primary')
  }
}

export function Waveform({ frame }: WaveformProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const paint = (): void => {
      const size = { width: canvas.clientWidth, height: canvas.clientHeight }
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(size.width * ratio)
      canvas.height = Math.round(size.height * ratio)
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      paintWaveform(context, size, frame, readColors(canvas))
    }

    paint()
    // The strip is full width, so every window resize changes the bucket count.
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [frame])

  return (
    <div className={styles.strip}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
