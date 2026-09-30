/**
 * Turns the Source selection into what to open: the quick modes follow the
 * Windows defaults (Computer Sounds → default output in loopback, Voice →
 * default microphone, Computer Sounds & Voice → both, mixed).
 */

import { FALLBACK_SOURCE } from '@shared/defaults'
import type { AudioDevice, SourceSelection } from '@shared/types'

/** One device, or the default output and microphone mixed (task 16). */
export type InputPlan =
  | { kind: 'single'; device: AudioDevice }
  | { kind: 'mixed'; system: AudioDevice; voice: AudioDevice }

function defaultOf(kind: AudioDevice['kind'], devices: AudioDevice[]): AudioDevice | null {
  return devices.find((d) => d.kind === kind && d.isDefault) ?? null
}

function single(device: AudioDevice | null): InputPlan | null {
  return device ? { kind: 'single', device } : null
}

export function resolveSource(source: SourceSelection, devices: AudioDevice[]): InputPlan | null {
  switch (source.mode) {
    case 'system':
      return single(defaultOf('render', devices))
    case 'voice':
      return single(defaultOf('capture', devices))
    case 'device':
      return single(devices.find((d) => d.id === source.deviceId) ?? null)
    case 'mixed': {
      const system = defaultOf('render', devices)
      const voice = defaultOf('capture', devices)
      return system && voice ? { kind: 'mixed', system, voice } : null
    }
  }
}

export function planDevices(plan: InputPlan): AudioDevice[] {
  return plan.kind === 'single' ? [plan.device] : [plan.system, plan.voice]
}

/** Two plans with the same key open the same devices. */
export function planKey(plan: InputPlan): string {
  return planDevices(plan)
    .map((device) => device.id)
    .join('+')
}

/** The device names, for the log. */
export function describePlan(plan: InputPlan): string {
  return planDevices(plan)
    .map((device) => `"${device.name}" (${device.kind})`)
    .join(' + ')
}

/**
 * A loopback on its own sends nothing while the computer is silent, and the
 * recording fills the gaps. The mix fills them itself (`mixedStream.ts`).
 */
export function skipsSilence(plan: InputPlan): boolean {
  return plan.kind === 'single' && plan.device.kind === 'render'
}

/** What a recording actually opens, and the selection it stands for. */
export interface RecordingSource {
  input: InputPlan | null
  source: SourceSelection
  /** The chosen device is gone and Computer Sounds is recorded instead (§4.1). */
  fellBack: boolean
}

export function resolveForRecording(
  source: SourceSelection,
  devices: AudioDevice[]
): RecordingSource {
  const input = resolveSource(source, devices)
  if (input || source.mode !== 'device') return { input, source, fellBack: false }
  return {
    input: resolveSource(FALLBACK_SOURCE, devices),
    source: FALLBACK_SOURCE,
    fellBack: true
  }
}
