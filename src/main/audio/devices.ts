/**
 * Turns the Source selection into the device to open: the quick modes follow
 * the Windows defaults (Computer Sounds → default output in loopback, Voice →
 * default microphone).
 */

import { FALLBACK_SOURCE } from '@shared/defaults'
import type { AudioDevice, SourceSelection } from '@shared/types'

export function resolveSource(source: SourceSelection, devices: AudioDevice[]): AudioDevice | null {
  switch (source.mode) {
    case 'system':
      return devices.find((d) => d.kind === 'render' && d.isDefault) ?? null
    case 'voice':
      return devices.find((d) => d.kind === 'capture' && d.isDefault) ?? null
    case 'device':
      return devices.find((d) => d.id === source.deviceId) ?? null
    case 'mixed':
      // System + microphone needs the mixer of task 16.
      return null
  }
}

/** What a recording actually opens, and the selection it stands for. */
export interface RecordingSource {
  device: AudioDevice | null
  source: SourceSelection
  /** The chosen device is gone and Computer Sounds is recorded instead (§4.1). */
  fellBack: boolean
}

export function resolveForRecording(
  source: SourceSelection,
  devices: AudioDevice[]
): RecordingSource {
  const device = resolveSource(source, devices)
  if (device || source.mode !== 'device') return { device, source, fellBack: false }
  return {
    device: resolveSource(FALLBACK_SOURCE, devices),
    source: FALLBACK_SOURCE,
    fellBack: true
  }
}
