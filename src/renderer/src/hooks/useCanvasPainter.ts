/**
 * Drives a canvas with requestAnimationFrame: the backing store follows the
 * element size times devicePixelRatio, and `paint` runs every frame in CSS
 * pixels. React renders the canvas once; the frames never touch React state.
 */

import { useEffect, useRef } from 'react'

export interface CanvasSize {
  width: number
  height: number
}

/** CSS custom properties to read, keyed by the name the painter uses. */
export type ColorVars<K extends string> = Record<K, string>

export type CanvasPaint<K extends string> = (
  context: CanvasRenderingContext2D,
  size: CanvasSize,
  colors: Record<K, string>,
  nowMs: number
) => void

function readColors<K extends string>(element: Element, vars: ColorVars<K>): Record<K, string> {
  const style = getComputedStyle(element)
  const colors = {} as Record<K, string>
  for (const key of Object.keys(vars) as K[]) colors[key] = style.getPropertyValue(vars[key])
  return colors
}

export function useCanvasPainter<K extends string>(
  colorVars: ColorVars<K>,
  paint: CanvasPaint<K>
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The loop always calls the latest callback without restarting.
  const paintRef = useRef(paint)
  useEffect(() => {
    paintRef.current = paint
  })
  const varsRef = useRef(colorVars)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let size: CanvasSize = { width: 0, height: 0 }
    let colors = readColors(canvas, varsRef.current)

    // Resizing the backing store clears it, so it only happens on a real change.
    const resize = (): void => {
      const ratio = window.devicePixelRatio || 1
      size = { width: canvas.clientWidth, height: canvas.clientHeight }
      canvas.width = Math.round(size.width * ratio)
      canvas.height = Math.round(size.height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      colors = readColors(canvas, varsRef.current)
    }

    let frame = 0
    const loop = (nowMs: number): void => {
      paintRef.current(context, size, colors, nowMs)
      frame = requestAnimationFrame(loop)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    frame = requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return canvasRef
}
