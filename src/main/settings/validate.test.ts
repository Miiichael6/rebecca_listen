import {
  DEFAULT_SETTINGS,
  MP3_BITRATES_KBPS,
  MP3_VBR_QUALITY,
  SAMPLE_RATES,
  WAV_BIT_DEPTHS
} from '@shared/defaults'
import { MAIN_WINDOW_SIZE } from '@shared/appInfo'
import { describe, expect, it } from 'vitest'
import { validateSettings, validateSource, validateUiState, validateWindowBounds } from './validate'

const lowest = <T extends number>(values: readonly T[]): T =>
  values.reduce((min, value) => (value < min ? value : min))
const highest = <T extends number>(values: readonly T[]): T =>
  values.reduce((max, value) => (value > max ? value : max))

describe('validateSettings · files', () => {
  it('clips values above and below the limits of each field', () => {
    const above = validateSettings({
      files: {
        mp3: { sampleRate: 192000, channels: 8, bitrateKbps: 9999, quality: 99 },
        wav: { sampleRate: 192000, channels: 8, bitDepth: 64 }
      }
    })
    expect(above.files.mp3.sampleRate).toBe(highest(SAMPLE_RATES))
    expect(above.files.mp3.channels).toBe(2)
    expect(above.files.mp3.bitrateKbps).toBe(highest(MP3_BITRATES_KBPS))
    expect(above.files.mp3.quality).toBe(MP3_VBR_QUALITY.max)
    expect(above.files.wav.bitDepth).toBe(highest(WAV_BIT_DEPTHS))

    const below = validateSettings({
      files: {
        mp3: { sampleRate: 1, channels: -4, bitrateKbps: 0, quality: -99 },
        wav: { sampleRate: 1, channels: 0, bitDepth: 1 }
      }
    })
    expect(below.files.mp3.sampleRate).toBe(lowest(SAMPLE_RATES))
    expect(below.files.mp3.channels).toBe(1)
    expect(below.files.mp3.bitrateKbps).toBe(lowest(MP3_BITRATES_KBPS))
    expect(below.files.mp3.quality).toBe(MP3_VBR_QUALITY.min)
    expect(below.files.wav.bitDepth).toBe(lowest(WAV_BIT_DEPTHS))
  })

  it('keeps the naming fields only while Windows would accept them', () => {
    const fine = validateSettings({
      files: { prefix: 'Call ', template: 'counter', customPattern: '{hh}h', autoName: false }
    })
    expect(fine.files).toMatchObject({
      prefix: 'Call ',
      template: 'counter',
      customPattern: '{hh}h',
      autoName: false
    })

    const refused = validateSettings({
      files: { prefix: 'a?b', template: 'weekly', customPattern: '' }
    })
    expect(refused.files.prefix).toBe('')
    expect(refused.files.template).toBe('bracketed')
    expect(refused.files.customPattern).not.toBe('')
  })

  it('snaps a value between two options to the closest one', () => {
    const settings = validateSettings({ files: { mp3: { sampleRate: 47000, bitrateKbps: 200 } } })
    expect(settings.files.mp3.sampleRate).toBe(48000)
    expect(settings.files.mp3.bitrateKbps).toBe(192)
  })

  it('rounds a fractional value to the step of its range', () => {
    expect(validateSettings({ files: { mp3: { quality: 3.4 } } }).files.mp3.quality).toBe(3)
  })

  it('falls back on values of the wrong type or outside the list', () => {
    const settings = validateSettings({
      files: { folder: 42, format: 'ogg', mp3: { mode: 'abr' } }
    })
    expect(settings.files.folder).toBe(DEFAULT_SETTINGS.files.folder)
    expect(settings.files.format).toBe(DEFAULT_SETTINGS.files.format)
    expect(settings.files.mp3.mode).toBe(DEFAULT_SETTINGS.files.mp3.mode)
  })

  it('keeps a valid value and the fallback given for the rest', () => {
    const current = structuredClone(DEFAULT_SETTINGS)
    current.files.folder = 'D:/Recordings'
    const settings = validateSettings({ files: { format: 'wav' } }, current)
    expect(settings.files.format).toBe('wav')
    expect(settings.files.folder).toBe('D:/Recordings')
  })
})

describe('validateSettings · hotkeys and system', () => {
  it('turns anything that is not an accelerator into None', () => {
    const settings = validateSettings({
      hotkeys: { record: 'Ctrl+R', pause: '   ', play: 12, stop: null }
    })
    expect(settings.hotkeys.record).toBe('Ctrl+R')
    expect(settings.hotkeys.pause).toBeNull()
    expect(settings.hotkeys.play).toBeNull()
    expect(settings.hotkeys.stop).toBeNull()
    // Missing commands are still present, as None.
    expect(settings.hotkeys.cut).toBeNull()
  })

  it('keeps only real booleans and completes the missing checkboxes', () => {
    const settings = validateSettings({
      system: { alwaysOnTop: true, keepHistory: 'yes', minimizeToTray: 1 }
    })
    expect(settings.system.alwaysOnTop).toBe(true)
    expect(settings.system.keepHistory).toBe(DEFAULT_SETTINGS.system.keepHistory)
    expect(settings.system.minimizeToTray).toBe(DEFAULT_SETTINGS.system.minimizeToTray)
    expect(settings.system.startWithWindows).toBe(DEFAULT_SETTINGS.system.startWithWindows)
  })
})

describe('validateSettings · transcription', () => {
  it('starts unlinked and without a chosen RebeccaWrites', () => {
    // A file written before task 46 has no `transcription` section at all.
    const settings = validateSettings({ files: {} })
    expect(settings.transcription).toEqual({ linkRebeccaWrites: false, rebeccaWritesExe: null })
  })

  it('keeps the checkbox and the chosen path', () => {
    const exe = 'D:\\Apps\\RebeccaWrites\\RebeccaWrites.exe'
    const settings = validateSettings({
      transcription: { linkRebeccaWrites: true, rebeccaWritesExe: exe }
    })
    expect(settings.transcription).toEqual({ linkRebeccaWrites: true, rebeccaWritesExe: exe })
  })

  it('treats an empty or broken path as not chosen', () => {
    const fallback = {
      ...DEFAULT_SETTINGS,
      transcription: { linkRebeccaWrites: false, rebeccaWritesExe: 'C:\\old.exe' }
    }
    const blank = validateSettings({ transcription: { rebeccaWritesExe: '  ' } }, fallback)
    expect(blank.transcription.rebeccaWritesExe).toBeNull()
    const cleared = validateSettings({ transcription: { rebeccaWritesExe: null } }, fallback)
    expect(cleared.transcription.rebeccaWritesExe).toBeNull()
    const broken = validateSettings(
      { transcription: { linkRebeccaWrites: 'yes', rebeccaWritesExe: 3 } },
      fallback
    )
    expect(broken.transcription).toEqual(fallback.transcription)
  })
})

describe('validateSettings · shape', () => {
  it('returns the defaults for anything that is not an object', () => {
    for (const raw of [undefined, null, 7, 'settings', [], {}]) {
      expect(validateSettings(raw)).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('drops unknown keys', () => {
    const settings = validateSettings({ files: { legacyOgg: true }, effects: { agc: true } })
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })
})

describe('validateSource', () => {
  const fallback = { mode: 'system' } as const

  it('keeps the three quick modes', () => {
    for (const mode of ['system', 'voice', 'mixed'] as const) {
      expect(validateSource({ mode }, fallback)).toEqual({ mode })
    }
  })

  it('keeps the microphone chosen for the mix, if it has an id', () => {
    expect(validateSource({ mode: 'mixed', voiceId: 'Mic (capture)' }, fallback)).toEqual({
      mode: 'mixed',
      voiceId: 'Mic (capture)'
    })
    expect(validateSource({ mode: 'mixed', voiceId: '' }, fallback)).toEqual({ mode: 'mixed' })
  })

  it('keeps a device selection only with an id', () => {
    expect(validateSource({ mode: 'device', deviceId: 'Speakers (render)' }, fallback)).toEqual({
      mode: 'device',
      deviceId: 'Speakers (render)'
    })
    expect(validateSource({ mode: 'device' }, fallback)).toEqual(fallback)
    expect(validateSource({ mode: 'device', deviceId: '' }, fallback)).toEqual(fallback)
  })

  it('drops an unknown mode and anything that is not an object', () => {
    expect(validateSource({ mode: 'loopback' }, fallback)).toEqual(fallback)
    expect(validateSource(null, fallback)).toEqual(fallback)
  })

  it('drops the device id of a non-device mode', () => {
    expect(validateSource({ mode: 'voice', deviceId: 'Mic' }, fallback)).toEqual({ mode: 'voice' })
  })
})

describe('validateUiState', () => {
  const fallback = { sourceListExpanded: false }

  it('keeps a boolean and falls back on anything else', () => {
    expect(validateUiState({ sourceListExpanded: true }, fallback)).toEqual({
      sourceListExpanded: true
    })
    expect(validateUiState({ sourceListExpanded: 1 }, fallback)).toEqual(fallback)
    expect(validateUiState(undefined, fallback)).toEqual(fallback)
  })
})

describe('validateWindowBounds', () => {
  it('rounds the geometry and never goes below the minimum size', () => {
    expect(validateWindowBounds({ x: 10.6, y: -4.2, width: 10, height: 10 })).toEqual({
      x: 11,
      y: -4,
      width: MAIN_WINDOW_SIZE.minWidth,
      height: MAIN_WINDOW_SIZE.minHeight
    })
  })

  it('keeps a valid rectangle as it is', () => {
    const bounds = { x: 100, y: 200, width: 500, height: 700 }
    expect(validateWindowBounds(bounds)).toEqual(bounds)
  })

  it('returns null when the rectangle is incomplete or not a rectangle', () => {
    for (const raw of [undefined, null, {}, { x: 1, y: 2 }, { width: 500, height: 700 }]) {
      expect(validateWindowBounds(raw)).toBeNull()
    }
  })
})
