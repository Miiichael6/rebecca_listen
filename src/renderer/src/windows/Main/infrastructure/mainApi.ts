/** What the main window asks of the preload API, so nothing above this file touches `window.api`. */

import type { MeterFrame, WaveFrame } from '@shared/types'

export const onMeterFrame = (listener: (frame: MeterFrame) => void): (() => void) =>
  window.api.on('meter:frame', listener)

export const onWaveFrame = (listener: (frame: WaveFrame) => void): (() => void) =>
  window.api.on('wave:frame', listener)

export const openRecordingsFolder = (): void => {
  void window.api.invoke('shell:openRecordingsFolder')
}
