/**
 * What changed between two device lists. The order of the lists does not
 * matter: devices are matched by `id`.
 */

import type { AudioDevice } from '@shared/types'

export interface DeviceDiff {
  added: AudioDevice[]
  removed: AudioDevice[]
  /** The Windows default output or microphone is a different device. */
  defaultChanged: boolean
}

function defaultIds(devices: AudioDevice[]): string {
  return devices
    .filter((device) => device.isDefault)
    .map((device) => `${device.kind}:${device.id}`)
    .sort()
    .join('|')
}

export function diffDevices(previous: AudioDevice[], next: AudioDevice[]): DeviceDiff {
  const previousIds = new Set(previous.map((device) => device.id))
  const nextIds = new Set(next.map((device) => device.id))
  return {
    added: next.filter((device) => !previousIds.has(device.id)),
    removed: previous.filter((device) => !nextIds.has(device.id)),
    defaultChanged: defaultIds(previous) !== defaultIds(next)
  }
}

export function hasChanges(diff: DeviceDiff): boolean {
  return diff.added.length > 0 || diff.removed.length > 0 || diff.defaultChanged
}

/** One log line, e.g. `+Altavoces (render), -Micrófono (capture), default changed`. */
export function describeDiff(diff: DeviceDiff): string {
  const label = (device: AudioDevice): string => `${device.name} (${device.kind})`
  return [
    ...diff.added.map((device) => `+${label(device)}`),
    ...diff.removed.map((device) => `-${label(device)}`),
    ...(diff.defaultChanged ? ['default changed'] : [])
  ].join(', ')
}
