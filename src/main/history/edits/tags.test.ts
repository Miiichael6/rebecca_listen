import { describe, expect, it } from 'vitest'
import { EMPTY_TAGS, parseTags, readTagsArgs, writeTagsArgs } from './tags'

const TAGS = { ...EMPTY_TAGS, title: ' Take one ', year: '2026', comment: '' }

describe('parseTags', () => {
  it('reads the tags of the editor, with ffmetadata escapes', () => {
    const text = [
      ';FFMETADATA1',
      'TITLE=A\\=b\\;c\\\\d',
      'artist=Someone',
      'date=2026',
      'comment=first\\',
      'second',
      'encoder=Lavf60',
      '[STREAM]',
      'album=Not the file'
    ].join('\n')
    expect(parseTags(text)).toEqual({
      ...EMPTY_TAGS,
      title: 'A=b;c\\d',
      artist: 'Someone',
      year: '2026',
      comment: 'first\nsecond'
    })
  })

  it('takes a year and a description written by other programs', () => {
    expect(parseTags(';FFMETADATA1\r\nyear=1999\r\ndescription=Notes\r\n')).toMatchObject({
      year: '1999',
      comment: 'Notes'
    })
  })

  it('reads an empty text as no tags', () => {
    expect(parseTags('')).toEqual(EMPTY_TAGS)
  })
})

describe('tag arguments', () => {
  it('reads the tags as an ffmetadata text on stdout', () => {
    expect(readTagsArgs('a.mp3').slice(-3)).toEqual(['-f', 'ffmetadata', '-'])
  })

  it('writes every field, trimmed, empty ones included so they are removed', () => {
    const args = writeTagsArgs('in.mp3', 'out.mp3', 'mp3', TAGS)
    expect(args).toContain('title=Take one')
    expect(args).toContain('date=2026')
    expect(args).toContain('comment=')
    expect(args).toContain('-id3v2_version')
    expect(args.slice(-1)).toEqual(['out.mp3'])
    expect(args[args.indexOf('-c') + 1]).toBe('copy')
  })
})
