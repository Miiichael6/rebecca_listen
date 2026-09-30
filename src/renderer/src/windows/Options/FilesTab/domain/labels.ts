/** How the Files tab spells the values of its dropdowns. */

import type { WavBitDepth } from '@shared/types'

export const sampleRateLabel = (hz: number): string => `${hz} Hz`

export const channelsLabel = (channels: number): string => (channels === 1 ? 'Mono' : 'Stereo')

export const bitrateLabel = (kbps: number): string => `${kbps} kbps`

export const vbrQualityLabel = (level: number): string => `V${level}`

/** 32-bit WAV is written as float (spec §9.3). */
export const bitDepthLabel = (bits: WavBitDepth): string =>
  bits === 32 ? '32 bit float' : `${bits} bit`

/** Every V-level from `min` to `max`. */
export function levels(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

/** The folder part of a Windows or POSIX path. */
export function folderOf(path: string): string {
  return path.slice(0, Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')))
}
