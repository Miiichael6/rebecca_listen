/**
 * The JSON half of the sidecar protocol (`native/PROTOCOL.md`): commands main
 * writes on stdin and events it reads from stderr.
 */

import type { AudioDevice, DeviceKind } from '@shared/types'

export type SidecarCommand =
  | { cmd: 'list' }
  | { cmd: 'open'; streamId: number; deviceId: string; kind: DeviceKind }
  | { cmd: 'stop'; streamId: number }

export type StreamErrorReason = 'open_failed' | 'device_lost' | 'stream_failed'

export type SidecarEvent =
  | { type: 'devices'; devices: AudioDevice[] }
  | { type: 'warning'; message: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'opened'; streamId: number; sampleRate: number; channels: number }
  | { type: 'stopped'; streamId: number }
  | { type: 'stream_error'; streamId: number; reason: StreamErrorReason; message: string }

/**
 * One stderr line as an event, or `null` when it is not a JSON object with a
 * `type` (a Rust panic message, for example).
 */
export function parseSidecarEvent(line: string): SidecarEvent | null {
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    return null
  }
  const isEvent =
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  return isEvent ? (value as SidecarEvent) : null
}
