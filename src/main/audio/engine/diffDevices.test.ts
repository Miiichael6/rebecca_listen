import { describe, expect, it } from 'vitest'
import type { AudioDevice } from '@shared/types'
import { describeDiff, diffDevices, hasChanges } from './diffDevices'

function device(id: string, kind: AudioDevice['kind'], isDefault = false): AudioDevice {
  return { id, name: id, groupName: id, kind, isDefault, channels: 2, sampleRate: 48000 }
}

const SPEAKERS = device('speakers', 'render', true)
const HEADPHONES = device('headphones', 'render')
const MIC = device('mic', 'capture', true)

describe('diffDevices', () => {
  it('finds nothing when the list is the same', () => {
    const diff = diffDevices([SPEAKERS, MIC], [SPEAKERS, MIC])
    expect(hasChanges(diff)).toBe(false)
  })

  it('ignores the order of the list', () => {
    expect(hasChanges(diffDevices([SPEAKERS, HEADPHONES, MIC], [MIC, HEADPHONES, SPEAKERS]))).toBe(
      false
    )
  })

  it('reports a device plugged in', () => {
    const diff = diffDevices([SPEAKERS, MIC], [SPEAKERS, HEADPHONES, MIC])
    expect(diff.added.map((d) => d.id)).toEqual(['headphones'])
    expect(diff.removed).toEqual([])
    expect(diff.defaultChanged).toBe(false)
    expect(describeDiff(diff)).toBe('+headphones (render)')
  })

  it('reports a device unplugged', () => {
    const diff = diffDevices([SPEAKERS, HEADPHONES, MIC], [SPEAKERS, MIC])
    expect(diff.removed.map((d) => d.id)).toEqual(['headphones'])
    expect(hasChanges(diff)).toBe(true)
  })

  it('reports a new default with the same devices', () => {
    const next = [{ ...SPEAKERS, isDefault: false }, { ...HEADPHONES, isDefault: true }, MIC]
    const diff = diffDevices([SPEAKERS, HEADPHONES, MIC], next)
    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
    expect(diff.defaultChanged).toBe(true)
    expect(describeDiff(diff)).toBe('default changed')
  })

  it('handles empty lists', () => {
    expect(hasChanges(diffDevices([], []))).toBe(false)
    const diff = diffDevices([SPEAKERS, MIC], [])
    expect(diff.removed).toHaveLength(2)
    expect(diff.defaultChanged).toBe(true)
  })
})
