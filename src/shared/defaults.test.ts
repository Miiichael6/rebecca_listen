import { describe, expect, it } from 'vitest'
import {
  AUDIO_FORMATS,
  CHANNEL_COUNTS,
  COLORS,
  DEFAULT_CHANNELS,
  DEFAULT_FORMAT,
  DEFAULT_LEVEL_PERCENT,
  DEFAULT_MP3_BITRATE_KBPS,
  DEFAULT_MP3_MODE,
  DEFAULT_MP3_VBR_QUALITY,
  DEFAULT_NAMING_TEMPLATE,
  NAMING_TEMPLATES,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_SETTINGS,
  DEFAULT_WAV_BIT_DEPTH,
  DEVICE_POLL_MS,
  HOTKEY_COMMANDS,
  LEVEL_PERCENT,
  METER_FPS,
  MP3_BITRATES_KBPS,
  MP3_MODES,
  MP3_VBR_QUALITY,
  NAME_COLLISION_SUFFIX,
  SAMPLE_RATES,
  VU_GREEN_MAX_DB,
  VU_PEAK_HOLD_MS,
  VU_YELLOW_MAX_DB,
  WAV_BIT_DEPTHS,
  type NumericRange
} from '@shared/defaults'

function expectInRange(value: number, range: NumericRange): void {
  expect(value).toBeGreaterThanOrEqual(range.min)
  expect(value).toBeLessThanOrEqual(range.max)
  expect((value - range.min) % range.step).toBe(0)
}

describe('defaults are inside their own limits', () => {
  it('level', () => {
    expectInRange(DEFAULT_LEVEL_PERCENT, LEVEL_PERCENT)
  })

  it('mp3', () => {
    expect(MP3_MODES).toContain(DEFAULT_MP3_MODE)
    expect(MP3_BITRATES_KBPS).toContain(DEFAULT_MP3_BITRATE_KBPS)
    expectInRange(DEFAULT_MP3_VBR_QUALITY, MP3_VBR_QUALITY)
  })

  it('wav', () => {
    expect(WAV_BIT_DEPTHS).toContain(DEFAULT_WAV_BIT_DEPTH)
  })

  it('format, sample rate and channels', () => {
    expect(AUDIO_FORMATS).toContain(DEFAULT_FORMAT)
    expect(SAMPLE_RATES).toContain(DEFAULT_SAMPLE_RATE)
    expect(CHANNEL_COUNTS).toContain(DEFAULT_CHANNELS)
  })
})

describe('DEFAULT_SETTINGS', () => {
  const { files, hotkeys, system } = DEFAULT_SETTINGS

  it('uses the defaults of each field', () => {
    expect(files.format).toBe(DEFAULT_FORMAT)
    expect(files.mp3.bitrateKbps).toBe(DEFAULT_MP3_BITRATE_KBPS)
    expect(files.mp3.mode).toBe(DEFAULT_MP3_MODE)
    expect(files.wav.bitDepth).toBe(DEFAULT_WAV_BIT_DEPTH)
    // Resolved to `<Desktop>/Rebecca Listen Recordings` on first use (task 12).
    expect(files.folder).toBe('')
  })

  it('keeps every value inside its limits', () => {
    for (const section of [files.mp3, files.wav]) {
      expect(SAMPLE_RATES).toContain(section.sampleRate)
      expect(CHANNEL_COUNTS).toContain(section.channels)
    }
    expect(MP3_BITRATES_KBPS).toContain(files.mp3.bitrateKbps)
    expectInRange(files.mp3.quality, MP3_VBR_QUALITY)
    expect(WAV_BIT_DEPTHS).toContain(files.wav.bitDepth)
  })

  it('has every hotkey command set to None', () => {
    expect(Object.keys(hotkeys).sort()).toEqual([...HOTKEY_COMMANDS].sort())
    expect(Object.values(hotkeys).every((key) => key === null)).toBe(true)
  })

  it('matches the System tab checkboxes of the spec', () => {
    expect(system.keepHistory).toBe(true)
    expect(system.minimizeToTray).toBe(false)
    expect(system.alwaysShowTrayIcon).toBe(false)
    expect(system.alwaysOnTop).toBe(false)
    expect(system.startWithWindows).toBe(false)
    expect(system.startRecordingOnLaunch).toBe(false)
  })
})

describe('engine constants and style', () => {
  it('are usable values', () => {
    expect(METER_FPS).toBeGreaterThan(0)
    expect(DEVICE_POLL_MS).toBeGreaterThan(0)
    expect(VU_PEAK_HOLD_MS).toBeGreaterThan(0)
    expect(VU_GREEN_MAX_DB).toBeLessThan(VU_YELLOW_MAX_DB)
    expect(VU_YELLOW_MAX_DB).toBeLessThan(0)
  })

  it('names files and collisions as the spec says', () => {
    expect(NAMING_TEMPLATES[DEFAULT_NAMING_TEMPLATE].label).toBe('[YYYY-MM-DD][hh-mm-ss]')
    expect(NAME_COLLISION_SUFFIX(1)).toBe(' (1)')
  })

  it('exposes the colors of the spec as hex', () => {
    for (const color of Object.values(COLORS)) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/)
    }
  })
})
