/**
 * What the Source dropdown lists and how the keyboard moves through it (§4.1):
 * the three quick modes, the "•••" bar and the devices grouped by hardware.
 *
 * Pure logic, no React: unit tested in `sourceOptions.test.ts`.
 */

import type { AudioDevice, SourceSelection } from '@shared/types'

export type QuickMode = Exclude<SourceSelection['mode'], 'device'>

export const QUICK_MODES: readonly { mode: QuickMode; label: string }[] = [
  { mode: 'system', label: 'Computer Sounds' },
  { mode: 'voice', label: 'Voice' },
  { mode: 'mixed', label: 'Computer Sounds & Voice' }
]

/** Key of the "•••" bar, which the keyboard can reach like any row. */
export const TOGGLE_KEY = 'toggle'

const DEVICE_PREFIX = 'device:'

/** One hardware group of the advanced list, with its endpoints. */
export interface DeviceGroup {
  name: string
  devices: AudioDevice[]
}

/** Stable key of a selection, used for the check, the active row and the DOM ids. */
export function keyOf(source: SourceSelection): string {
  return source.mode === 'device' ? `${DEVICE_PREFIX}${source.deviceId}` : source.mode
}

export function deviceKey(device: AudioDevice): string {
  return keyOf({ mode: 'device', deviceId: device.id })
}

/** The selection a row stands for; `null` for the "•••" bar. */
export function selectionOf(key: string): SourceSelection | null {
  if (key.startsWith(DEVICE_PREFIX)) {
    return { mode: 'device', deviceId: key.slice(DEVICE_PREFIX.length) }
  }
  const quick = QUICK_MODES.find((option) => option.mode === key)
  return quick ? { mode: quick.mode } : null
}

/**
 * Groups in the order the hardware first appears, outputs before inputs inside
 * each group, as in the reference screenshot.
 */
export function groupDevices(devices: AudioDevice[]): DeviceGroup[] {
  const groups = new Map<string, AudioDevice[]>()
  for (const device of devices) {
    const group = groups.get(device.groupName)
    if (group) group.push(device)
    else groups.set(device.groupName, [device])
  }
  return [...groups].map(([name, members]) => ({
    name,
    devices: [
      ...members.filter((d) => d.kind === 'render'),
      ...members.filter((d) => d.kind === 'capture')
    ]
  }))
}

/** Every row the keyboard can land on, top to bottom. */
export function navigableKeys(groups: DeviceGroup[], expanded: boolean): string[] {
  const keys = [...QUICK_MODES.map((option) => option.mode as string), TOGGLE_KEY]
  if (!expanded) return keys
  return [...keys, ...groups.flatMap((group) => group.devices.map(deviceKey))]
}

/** Moves `delta` rows from `current`, stopping at both ends. */
export function stepKey(keys: string[], current: string, delta: number): string {
  const index = keys.indexOf(current)
  if (index === -1) return keys[0]
  return keys[Math.min(keys.length - 1, Math.max(0, index + delta))]
}

/**
 * The row the keyboard points at: `wanted` while it is still listed, otherwise
 * the selected one, otherwise the first. Keeps the dropdown usable when a
 * device disappears while it is open.
 */
export function activeKeyOf(keys: string[], wanted: string | null, selected: string): string {
  if (wanted !== null && keys.includes(wanted)) return wanted
  return keys.includes(selected) ? selected : keys[0]
}

/** What the closed combo shows. `missing` is a saved device that is not connected. */
export function comboLabel(
  source: SourceSelection | null,
  devices: AudioDevice[]
): { text: string; missing: boolean } {
  if (!source) return { text: '', missing: false }
  if (source.mode !== 'device') {
    const quick = QUICK_MODES.find((option) => option.mode === source.mode)
    return { text: quick?.label ?? '', missing: false }
  }
  const device = devices.find((d) => d.id === source.deviceId)
  if (!device) return { text: 'Device not connected', missing: true }
  return { text: `${device.name} (${device.groupName})`, missing: false }
}
