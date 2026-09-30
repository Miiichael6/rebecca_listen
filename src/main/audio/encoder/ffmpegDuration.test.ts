import { describe, expect, it } from 'vitest'
import { parseDurationMs } from './ffmpegDuration'

describe('parseDurationMs', () => {
  it('reads the Duration line of ffmpeg -i', () => {
    expect(parseDurationMs('  Duration: 00:00:03.78, bitrate: 1536 kb/s')).toBe(3780)
    expect(parseDurationMs('Duration: 01:02:03.5, start: 0.011021')).toBe(3_723_500)
  })

  it('gives null when ffmpeg could not tell', () => {
    expect(parseDurationMs('  Duration: N/A, bitrate: N/A')).toBeNull()
    expect(parseDurationMs('Invalid data found when processing input')).toBeNull()
  })
})
