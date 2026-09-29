import { describe, expect, it } from 'vitest'
import type { OutputSettings } from './Encoder'
import { ffmpegArgs } from './ffmpegArgs'

const INPUT = { sampleRate: 48000, channels: 2 }
const MP3 = { sampleRate: 44100, channels: 2, bitrateKbps: 192, quality: 2 } as const

/** The value that follows `flag` in the argument list. */
function valueOf(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag)
  return index < 0 ? undefined : args[index + 1]
}

/** The arguments after `-i pipe:0`, which describe the output. */
function outputArgs(args: string[]): string[] {
  return args.slice(args.indexOf('pipe:0') + 1)
}

describe('ffmpegArgs', () => {
  it('reads raw f32le from stdin at the input format', () => {
    const args = ffmpegArgs(INPUT, { format: 'mp3', mode: 'cbr', ...MP3 }, 'a.mp3.part')
    const input = args.slice(0, args.indexOf('pipe:0'))
    expect(valueOf(input, '-f')).toBe('f32le')
    expect(valueOf(input, '-ar')).toBe('48000')
    expect(valueOf(input, '-ac')).toBe('2')
    expect(valueOf(args, '-i')).toBe('pipe:0')
    expect(args.at(-1)).toBe('a.mp3.part')
  })

  it('encodes MP3 CBR with a bitrate and VBR with a quality', () => {
    const cbr = ffmpegArgs(INPUT, { format: 'mp3', mode: 'cbr', ...MP3 }, 'a.part')
    expect(valueOf(cbr, '-c:a')).toBe('libmp3lame')
    expect(valueOf(cbr, '-b:a')).toBe('192k')
    expect(cbr).not.toContain('-q:a')

    const vbr = ffmpegArgs(INPUT, { format: 'mp3', mode: 'vbr', ...MP3 }, 'a.part')
    expect(valueOf(vbr, '-c:a')).toBe('libmp3lame')
    expect(valueOf(vbr, '-q:a')).toBe('2')
    expect(vbr).not.toContain('-b:a')
  })

  it.each([
    [16, 'pcm_s16le'],
    [24, 'pcm_s24le'],
    [32, 'pcm_f32le']
  ] as const)('encodes WAV at %i bits with %s', (bitDepth, codec) => {
    const wav: OutputSettings = { format: 'wav', sampleRate: 48000, channels: 2, bitDepth }
    expect(valueOf(ffmpegArgs(INPUT, wav, 'a.part'), '-c:a')).toBe(codec)
  })

  it('names the muxer, since a .part extension tells ffmpeg nothing', () => {
    const mp3 = ffmpegArgs(INPUT, { format: 'mp3', mode: 'cbr', ...MP3 }, 'a.part')
    const wav = ffmpegArgs(INPUT, { format: 'wav', ...MP3, bitDepth: 16 }, 'a.part')
    expect(valueOf(outputArgs(mp3), '-f')).toBe('mp3')
    expect(valueOf(outputArgs(wav), '-f')).toBe('wav')
  })

  it.each([1, 2])('writes the output sample rate and %i channel(s)', (channels) => {
    const wav: OutputSettings = { format: 'wav', sampleRate: 22050, channels, bitDepth: 16 }
    const output = outputArgs(ffmpegArgs(INPUT, wav, 'a.part'))
    expect(valueOf(output, '-ar')).toBe('22050')
    expect(valueOf(output, '-ac')).toBe(String(channels))
  })

  it('rejects an unknown format', () => {
    const ogg = { format: 'ogg', sampleRate: 48000, channels: 2 } as unknown as OutputSettings
    expect(() => ffmpegArgs(INPUT, ogg, 'a.part')).toThrow(/Unknown audio format: ogg/)
  })
})
