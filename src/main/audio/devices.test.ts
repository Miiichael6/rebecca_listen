import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '@shared/types'
import { planKey, resolveForRecording, resolveSource, skipsSilence } from './devices'

function device(id: string, kind: AudioDevice['kind'], isDefault: boolean): AudioDevice {
  return { id, name: id, groupName: id, kind, isDefault, channels: 2, sampleRate: 48000 }
}

const DEVICES = [
  device('speakers', 'render', false),
  device('headphones', 'render', true),
  device('mic', 'capture', true),
  device('line', 'capture', false)
]

const single = (device: AudioDevice): { kind: 'single'; device: AudioDevice } => ({
  kind: 'single',
  device
})

describe('resolveSource', () => {
  it('maps the quick modes to the Windows defaults', () => {
    expect(resolveSource({ mode: 'system' }, DEVICES)).toEqual(single(DEVICES[1]))
    expect(resolveSource({ mode: 'voice' }, DEVICES)).toEqual(single(DEVICES[2]))
  })

  it('finds a specific device by id', () => {
    expect(resolveSource({ mode: 'device', deviceId: 'line' }, DEVICES)).toEqual(single(DEVICES[3]))
  })

  it('returns null for a device that is gone or a missing default', () => {
    expect(resolveSource({ mode: 'device', deviceId: 'usb' }, DEVICES)).toBeNull()
    expect(resolveSource({ mode: 'voice' }, [DEVICES[0]])).toBeNull()
  })

  it('mixes the default output with the default microphone', () => {
    expect(resolveSource({ mode: 'mixed' }, DEVICES)).toEqual({
      kind: 'mixed',
      system: DEVICES[1],
      voice: DEVICES[2]
    })
  })

  it('mixes the output with the microphone that was chosen, if it is still there', () => {
    const mixed = (voiceId: string): ReturnType<typeof resolveSource> => resolveSource({ mode: 'mixed', voiceId }, DEVICES)
    expect(mixed('line')).toEqual({ kind: 'mixed', system: DEVICES[1], voice: DEVICES[3] })
    // Gone, or not a microphone: back to the default one.
    expect(mixed('usb')).toEqual({ kind: 'mixed', system: DEVICES[1], voice: DEVICES[2] })
    expect(mixed('speakers')).toEqual({ kind: 'mixed', system: DEVICES[1], voice: DEVICES[2] })
  })

  it('does not mix when either default is missing', () => {
    expect(resolveSource({ mode: 'mixed' }, DEVICES.slice(0, 2))).toBeNull()
    expect(resolveSource({ mode: 'mixed' }, DEVICES.slice(2))).toBeNull()
  })
})

describe('input plans', () => {
  it('have the same key only when they open the same devices', () => {
    const mixed = resolveSource({ mode: 'mixed' }, DEVICES)!
    expect(planKey(mixed)).toBe(planKey(resolveSource({ mode: 'mixed' }, [...DEVICES])!))
    expect(planKey(mixed)).not.toBe(planKey(single(DEVICES[1])))
  })

  it('leave the silence gaps to the recording only for a loopback on its own', () => {
    expect(skipsSilence(single(DEVICES[1]))).toBe(true)
    expect(skipsSilence(single(DEVICES[2]))).toBe(false)
    expect(skipsSilence(resolveSource({ mode: 'mixed' }, DEVICES)!)).toBe(false)
  })
})

describe('resolveForRecording', () => {
  it('opens the chosen device while it is connected', () => {
    const chosen = { mode: 'device', deviceId: 'line' } as const
    expect(resolveForRecording(chosen, DEVICES)).toEqual({
      input: single(DEVICES[3]),
      source: chosen,
      fellBack: false
    })
  })

  it('falls back to Computer Sounds when the chosen device is gone', () => {
    expect(resolveForRecording({ mode: 'device', deviceId: 'usb' }, DEVICES)).toEqual({
      input: single(DEVICES[1]),
      source: { mode: 'system' },
      fellBack: true
    })
  })

  it('does not fall back for a quick mode without its default', () => {
    expect(resolveForRecording({ mode: 'voice' }, [DEVICES[0]])).toEqual({
      input: null,
      source: { mode: 'voice' },
      fellBack: false
    })
  })
})
