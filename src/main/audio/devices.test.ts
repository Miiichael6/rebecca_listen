import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '@shared/types'
import { resolveSource } from './devices'

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
