import { join } from 'path'
import { describe, expect, it } from 'vitest'
import {
  finalPathOf,
  formatOf,
  isPartFile,
  recoveryNotice,
  remuxArgs,
  unfinishedRecordings,
  type OpenRecording
} from './partFiles'

const DIR = join('C:', 'rec')
const at = (name: string): string => join(DIR, name)
const journaled = (name: string): OpenRecording => ({
  path: at(name),
  createdAt: 1000,
  source: { mode: 'voice' }
})

describe('part file names', () => {
  it('knows a .part and its final name and format', () => {
    expect(isPartFile('a.mp3.part')).toBe(true)
    expect(isPartFile('a.mp3')).toBe(false)
    expect(finalPathOf(at('a.mp3.part'))).toBe(at('a.mp3'))
    expect(formatOf('a.WAV')).toBe('wav')
    expect(formatOf('a.flac')).toBeNull()
  })
})

describe('unfinishedRecordings', () => {
  it('merges the journal and the scan, once each, keeping what the journal knows', () => {
    const known = { createdAt: 1000, source: { mode: 'voice' } }
    const found = unfinishedRecordings(
      [journaled('a.mp3'), journaled('elsewhere.wav')],
      [at('A.mp3.part'), at('b.wav.part')]
    )
    expect(found).toEqual([
      { path: at('a.mp3'), partPath: at('a.mp3.part'), format: 'mp3', ...known },
      { path: at('elsewhere.wav'), partPath: at('elsewhere.wav.part'), format: 'wav', ...known },
      { path: at('b.wav'), partPath: at('b.wav.part'), format: 'wav' }
    ])
  })

  it('leaves out the .part files of other formats', () => {
    expect(unfinishedRecordings([], [at('video.mp4.part'), at('x.part')])).toEqual([])
  })
})

describe('remuxArgs', () => {
  it('reads each format cut short and copies it without re-encoding', () => {
    const wav = remuxArgs('wav', 'in.wav.part', 'out.wav')
    expect(wav.join(' ')).toContain('-f wav -ignore_length 1 -i in.wav.part -c copy -f wav')
    expect(remuxArgs('mp3', 'in', 'out').join(' ')).toContain('-err_detect ignore_err')
    expect(wav.at(-1)).toBe('out.wav')
  })
})

describe('recoveryNotice', () => {
  it('says nothing when there was nothing to do', () => {
    expect(recoveryNotice(0, 0)).toBeNull()
  })

  it('tells how many were recovered and how many were kept', () => {
    const kept = 'could not be repaired and'
    expect(recoveryNotice(1, 0)).toEqual({
      level: 'info',
      message: 'Recovered 1 unfinished recording'
    })
    expect(recoveryNotice(2, 1)).toEqual({
      level: 'warn',
      message: `Recovered 2 unfinished recordings; 1 ${kept} was kept as .part (see the log)`
    })
    expect(recoveryNotice(0, 2)).toEqual({
      level: 'warn',
      message: `2 unfinished recordings ${kept} were kept as .part (see the log)`
    })
  })
})
