import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { HotkeysSettings } from '@shared/types'
import { findConflict } from './hotkeyConflicts'

const hotkeys = (assigned: Partial<HotkeysSettings>): HotkeysSettings => ({
  ...DEFAULT_SETTINGS.hotkeys,
  ...assigned
})

describe('findConflict', () => {
  it('names the command that already uses the combination', () => {
    const map = hotkeys({ record: 'Ctrl+Alt+R' })
    expect(findConflict(map, 'stop', 'Ctrl+Alt+R')).toBe('record')
  })

  it('compares without caring about case', () => {
    const map = hotkeys({ pause: 'ctrl+alt+p' })
    expect(findConflict(map, 'play', 'Ctrl+Alt+P')).toBe('pause')
  })

  it('lets a command keep or re-take its own hotkey', () => {
    const map = hotkeys({ record: 'Ctrl+Alt+R' })
    expect(findConflict(map, 'record', 'Ctrl+Alt+R')).toBeNull()
  })

  it('never reports a conflict for None or a free combination', () => {
    const map = hotkeys({ record: 'Ctrl+Alt+R' })
    expect(findConflict(map, 'stop', null)).toBeNull()
    expect(findConflict(map, 'stop', 'Ctrl+Alt+S')).toBeNull()
    expect(findConflict(DEFAULT_SETTINGS.hotkeys, 'cut', 'F9')).toBeNull()
  })
})
