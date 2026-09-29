import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '@shared/types'
import { resolveForRecording, resolveSource } from './devices'

function device(id: string, kind: AudioDevice['kind'], isDefault: boolean): AudioDevice {
  return { id, name: id, groupName: id, kind, isDefault, channels: 2, sampleRate: 48000 }
}

const DEVICES = [
  device('speakers', 'render', false),
  device('headphones', 'render', true),
  device('mic', 'capture', true),
  device('line', 'capture', false)
]

describe('resolveSource', () => {
  it('maps the quick modes to the Windows defaults', () => {
    expect(resolveSource({ mode: 'system' }, DEVICES)?.id).toBe('headphones')
    expect(resolveSource({ mode: 'voice' }, DEVICES)?.id).toBe('mic')
  })

  it('finds a specific device by id', () => {
    expect(resolveSource({ mode: 'device', deviceId: 'line' }, DEVICES)?.id).toBe('line')
  })

  it('returns null for a device that is gone or a missing default', () => {
    expect(resolveSource({ mode: 'device', deviceId: 'usb' }, DEVICES)).toBeNull()
    expect(resolveSource({ mode: 'voice' }, [DEVICES[0]])).toBeNull()
  })

  it('does not resolve the mixed mode yet', () => {
    expect(resolveSource({ mode: 'mixed' }, DEVICES)).toBeNull()
  })
})

describe('resolveForRecording', () => {
  it('opens the chosen device while it is connected', () => {
    const chosen = { mode: 'device', deviceId: 'line' } as const
    expect(resolveForRecording(chosen, DEVICES)).toEqual({
      device: DEVICES[3],
      source: chosen,
      fellBack: false
    })
  })

  it('falls back to Computer Sounds when the chosen device is gone', () => {
    expect(resolveForRecording({ mode: 'device', deviceId: 'usb' }, DEVICES)).toEqual({
      device: DEVICES[1],
      source: { mode: 'system' },
      fellBack: true
    })
  })

  it('does not fall back for a quick mode without its default', () => {
    expect(resolveForRecording({ mode: 'voice' }, [DEVICES[0]])).toEqual({
      device: null,
      source: { mode: 'voice' },
      fellBack: false
    })
  })
})
