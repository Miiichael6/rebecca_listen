import { DEFAULT_LEVEL_PERCENT, DEFAULT_SETTINGS, LEVEL_PERCENT } from '@shared/defaults'
import { SETTINGS_VERSION, defaultStoredSettings } from '@shared/settingsSchema'
import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'

describe('migrate · a file that is not there', () => {
  it('builds the defaults from an empty file', () => {
    expect(migrate({})).toEqual(defaultStoredSettings())
  })

  it('builds the defaults from anything that is not an object', () => {
    for (const raw of [undefined, null, 'corrupt', 42, []]) {
      expect(migrate(raw)).toEqual(defaultStoredSettings())
    }
  })
})

describe('migrate · v0, written before the version field existed', () => {
  it('keeps what it can read and completes the rest', () => {
    const stored = migrate({
      settings: { files: { format: 'wav' } },
      level: 80
    })
    expect(stored.version).toBe(SETTINGS_VERSION)
    expect(stored.settings.files.format).toBe('wav')
    expect(stored.settings.files.mp3).toEqual(DEFAULT_SETTINGS.files.mp3)
    expect(stored.level).toBe(80)
    expect(stored.source).toEqual(defaultStoredSettings().source)
  })
})

describe('migrate · v1 with missing keys', () => {
  it('fills every section that is not in the file', () => {
    const stored = migrate({ version: 1, settings: { system: { alwaysOnTop: true } } })
    expect(stored.settings.system.alwaysOnTop).toBe(true)
    expect(stored.settings.files).toEqual(DEFAULT_SETTINGS.files)
    expect(stored.settings.hotkeys).toEqual(DEFAULT_SETTINGS.hotkeys)
    expect(stored.level).toBe(DEFAULT_LEVEL_PERCENT)
    expect(stored.window.bounds).toBeNull()
  })

  it('keeps a valid source, level and geometry', () => {
    const file = {
      version: 1,
      settings: DEFAULT_SETTINGS,
      source: { mode: 'device', deviceId: 'Microphone (capture)' },
      level: 150,
      window: { bounds: { x: 0, y: 0, width: 500, height: 700 } }
    }
    expect(migrate(file)).toEqual({ ...file, version: SETTINGS_VERSION })
  })
})

describe('migrate · out-of-range values', () => {
  it('clips the level to the limits of the slider', () => {
    expect(migrate({ version: 1, level: 10_000 }).level).toBe(LEVEL_PERCENT.max)
    expect(migrate({ version: 1, level: -50 }).level).toBe(LEVEL_PERCENT.min)
    expect(migrate({ version: 1, level: 'loud' }).level).toBe(DEFAULT_LEVEL_PERCENT)
  })

  it('drops a corrupt source and corrupt geometry', () => {
    const stored = migrate({
      version: 1,
      source: { mode: 'device', deviceId: 99 },
      window: { bounds: 'maximized' }
    })
    expect(stored.source).toEqual(defaultStoredSettings().source)
    expect(stored.window.bounds).toBeNull()
  })
})

describe('migrate · a file from a newer build', () => {
  it('reads what it understands and keeps the newer version number', () => {
    const stored = migrate({
      version: SETTINGS_VERSION + 5,
      settings: { files: { format: 'wav' } },
      profiles: ['Podcast'],
      level: 120
    })
    // Kept, so the newer build still recognises the file as its own.
    expect(stored.version).toBe(SETTINGS_VERSION + 5)
    expect(stored.settings.files.format).toBe('wav')
    expect(stored.level).toBe(120)
    expect(stored).not.toHaveProperty('profiles')
  })
})
