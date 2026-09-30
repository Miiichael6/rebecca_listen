import { describe, expect, it } from 'vitest'
import { bitDepthLabel, channelsLabel, folderOf, levels } from './labels'

describe('labels', () => {
  it('spells channels and bit depths', () => {
    expect(channelsLabel(1)).toBe('Mono')
    expect(channelsLabel(2)).toBe('Stereo')
    expect(bitDepthLabel(24)).toBe('24 bit')
    expect(bitDepthLabel(32)).toBe('32 bit float')
  })

  it('lists every level of a range', () => {
    expect(levels(0, 3)).toEqual([0, 1, 2, 3])
  })

  it('takes the folder of a path', () => {
    expect(folderOf('C:\\Users\\me\\a.mp3')).toBe('C:\\Users\\me')
    expect(folderOf('/home/me/a.wav')).toBe('/home/me')
  })
})
