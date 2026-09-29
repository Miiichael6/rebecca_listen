import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '@shared/types'
import {
  TOGGLE_KEY,
  activeKeyOf,
  comboLabel,
  deviceKey,
  groupDevices,
  keyOf,
  navigableKeys,
  selectionOf,
  stepKey
} from './sourceOptions'

function device(id: string, groupName: string, kind: AudioDevice['kind']): AudioDevice {
  return { id, name: id, groupName, kind, isDefault: false, channels: 2, sampleRate: 48000 }
}

const DEVICES = [
  device('Line in', 'Realtek', 'capture'),
  device('Speakers', 'Realtek', 'render'),
  device('Headphones', 'WH-1000XM4', 'render'),
  device('Headset mic', 'WH-1000XM4', 'capture'),
  device('CABLE Input', 'VB-Audio', 'render')
]

describe('keyOf / selectionOf', () => {
  it('round-trips quick modes and devices', () => {
    for (const source of [
      { mode: 'system' },
      { mode: 'voice' },
      { mode: 'mixed' },
      { mode: 'device', deviceId: 'wasapi:{0.0.1}.{guid}' }
    ] as const) {
      expect(selectionOf(keyOf(source))).toEqual(source)
    }
  })

  it('has no selection for the "•••" bar', () => {
    expect(selectionOf(TOGGLE_KEY)).toBeNull()
  })
})

describe('groupDevices', () => {
  it('keeps the hardware order and puts outputs before inputs', () => {
    const groups = groupDevices(DEVICES)
    expect(groups.map((g) => g.name)).toEqual(['Realtek', 'WH-1000XM4', 'VB-Audio'])
    expect(groups[0].devices.map((d) => d.id)).toEqual(['Speakers', 'Line in'])
  })

  it('returns no groups for no devices', () => {
    expect(groupDevices([])).toEqual([])
  })
})

describe('navigableKeys', () => {
  const groups = groupDevices(DEVICES)

  it('lists the quick modes and the bar while collapsed', () => {
    expect(navigableKeys(groups, false)).toEqual(['system', 'voice', 'mixed', TOGGLE_KEY])
  })

  it('adds every device in display order when expanded', () => {
    const keys = navigableKeys(groups, true)
    expect(keys).toHaveLength(4 + DEVICES.length)
    expect(keys[4]).toBe(deviceKey(DEVICES[1]))
  })
})

describe('stepKey', () => {
  const keys = ['a', 'b', 'c']

  it('moves and stops at both ends', () => {
    expect(stepKey(keys, 'a', 1)).toBe('b')
    expect(stepKey(keys, 'c', 1)).toBe('c')
    expect(stepKey(keys, 'a', -1)).toBe('a')
    expect(stepKey(keys, 'b', Infinity)).toBe('c')
    expect(stepKey(keys, 'b', -Infinity)).toBe('a')
  })

  it('starts from the top when the current row is gone', () => {
    expect(stepKey(keys, 'x', 1)).toBe('a')
  })
})

describe('activeKeyOf', () => {
  const keys = ['system', 'voice', 'device:mic']

  it('keeps the wanted row while it exists', () => {
    expect(activeKeyOf(keys, 'voice', 'system')).toBe('voice')
  })

  it('falls back to the selection, then to the first row', () => {
    expect(activeKeyOf(keys, 'device:gone', 'device:mic')).toBe('device:mic')
    expect(activeKeyOf(keys, null, 'device:gone')).toBe('system')
  })
})

describe('comboLabel', () => {
  it('names quick modes and devices', () => {
    expect(comboLabel({ mode: 'mixed' }, DEVICES).text).toBe('Computer Sounds & Voice')
    expect(comboLabel({ mode: 'device', deviceId: 'Headphones' }, DEVICES)).toEqual({
      text: 'Headphones (WH-1000XM4)',
      missing: false
    })
  })

  it('flags a saved device that is not connected', () => {
    expect(comboLabel({ mode: 'device', deviceId: 'USB mic' }, DEVICES).missing).toBe(true)
  })
})
