import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@shared/defaults'
import type { Settings } from '@shared/types'
import { appliesFromNextFile, changedSections, isDirty, parseOptionsTab } from './draft'

function copy(): Settings {
  return structuredClone(DEFAULT_SETTINGS)
}

describe('parseOptionsTab', () => {
  it('reads the tab of the hash', () => {
    expect(parseOptionsTab('#/options?tab=hotkeys')).toBe('hotkeys')
    expect(parseOptionsTab('#/options?tab=system')).toBe('system')
  })

  it('falls back to Files for a missing or unknown tab', () => {
    expect(parseOptionsTab('#/options')).toBe('files')
    expect(parseOptionsTab('#/options?tab=about')).toBe('files')
  })
})

describe('changedSections', () => {
  it('is empty for an untouched draft', () => {
    expect(changedSections(DEFAULT_SETTINGS, copy())).toEqual([])
    expect(isDirty(DEFAULT_SETTINGS, copy())).toBe(false)
  })

  it('names only the sections that differ', () => {
    const draft = copy()
    draft.system.alwaysOnTop = !draft.system.alwaysOnTop
    const updates = changedSections(DEFAULT_SETTINGS, draft)
    expect(updates).toEqual([{ section: 'system', patch: draft.system }])
    expect(isDirty(DEFAULT_SETTINGS, draft)).toBe(true)
  })
})

describe('appliesFromNextFile', () => {
  it('needs a recording and a change of format or folder', () => {
    const draft = copy()
    draft.files.folder = 'D:/audio'
    expect(appliesFromNextFile(DEFAULT_SETTINGS, draft, true)).toBe(true)
    expect(appliesFromNextFile(DEFAULT_SETTINGS, draft, false)).toBe(false)
    expect(appliesFromNextFile(DEFAULT_SETTINGS, copy(), true)).toBe(false)
  })
})
