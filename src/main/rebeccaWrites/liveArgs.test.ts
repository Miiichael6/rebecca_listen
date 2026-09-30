import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { liveEndArgs, liveName, livePcmPath, liveStartArgs } from './liveArgs'

describe('live contract with RebeccaWrites', () => {
  it('names the PCM file after the start of the recording, under rebecca-live', () => {
    expect(livePcmPath('C:\\Temp', 1790000000000)).toBe(
      join('C:\\Temp', 'rebecca-live', '1790000000000.pcm')
    )
  })

  it('names the entry after the recording, without the extension', () => {
    expect(liveName('C:\\Rec\\reunión teams.mp3')).toBe('reunión teams')
    expect(liveName('C:\\Rec\\[2026-09-30][10-00-00].wav')).toBe('[2026-09-30][10-00-00]')
  })

  it('builds the start and end arguments, spaces and all', () => {
    const pcm = 'C:\\Temp\\rebecca-live\\1.pcm'
    expect(liveStartArgs(pcm, 'reunión teams')).toEqual([
      '--live-start',
      pcm,
      '--live-name',
      'reunión teams'
    ])
    expect(liveEndArgs(pcm, 'C:\\Rec\\reunión teams.mp3')).toEqual([
      '--live-end',
      pcm,
      '--live-media',
      'C:\\Rec\\reunión teams.mp3'
    ])
  })

  it('ends without media when the recording was aborted', () => {
    expect(liveEndArgs('C:\\Temp\\rebecca-live\\1.pcm', null)).toEqual([
      '--live-end',
      'C:\\Temp\\rebecca-live\\1.pcm'
    ])
  })
})
