import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import { convertArgs, mergeArgs } from './transcodeArgs'

const { mp3, wav } = DEFAULT_SETTINGS.files
const FORMATS = { mp3, wav }

const valueOf = (args: string[], flag: string): string | undefined => args[args.indexOf(flag) + 1]

describe('convertArgs', () => {
  it('encodes the audio with the Files settings, keeps the tags and never overwrites', () => {
    const args = convertArgs('a.wav', 'a.mp3', 'mp3', FORMATS)
    expect(args).toContain('-n')
    expect(valueOf(args, '-i')).toBe('a.wav')
    expect(valueOf(args, '-map_metadata')).toBe('0')
    expect(valueOf(args, '-c:a')).toBe('libmp3lame')
    expect(args).toContain('-id3v2_version')
    expect(args.slice(-1)).toEqual(['a.mp3'])
  })

  it('writes WAV with the bit depth of the settings', () => {
    const args = convertArgs('a.mp3', 'a.wav', 'wav', FORMATS)
    expect(valueOf(args, '-c:a')).toMatch(/^pcm_/)
    expect(args).not.toContain('-id3v2_version')
  })
})

describe('mergeArgs', () => {
  it('joins every input in order after bringing them to the same format', () => {
    const args = mergeArgs(['old.wav', 'new.mp3'], 'out.mp3', 'mp3', FORMATS)
    expect(args.filter((arg) => arg === '-i')).toHaveLength(2)
    expect(args.indexOf('old.wav')).toBeLessThan(args.indexOf('new.mp3'))
    const filter = valueOf(args, '-filter_complex') ?? ''
    expect(filter).toContain('[0:a:0]aformat=')
    expect(filter).toContain('[a0][a1]concat=n=2:v=0:a=1[out]')
    expect(valueOf(args, '-map')).toBe('[out]')
    expect(args.slice(-1)).toEqual(['out.mp3'])
  })
})
