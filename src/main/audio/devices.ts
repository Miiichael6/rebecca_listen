/**
 * Turns the Source selection into the device to open: the quick modes follow
 * the Windows defaults (Computer Sounds → default output in loopback, Voice →
 * default microphone).
 */

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
