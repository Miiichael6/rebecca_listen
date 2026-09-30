/**
 * Pure rules of the Options draft: which sections the user changed, whether
 * there is anything to apply and which tab a hash asks for.
 */

import { validatePattern, validatePrefix } from '@shared/naming'
import { OPTIONS_TABS, type OptionsTab, type Settings, type SettingsUpdate } from '@shared/types'

export const DEFAULT_OPTIONS_TAB: OptionsTab = 'files'

/** The tab of `#/options?tab=<id>`; the first one for anything else. */
export function parseOptionsTab(hash: string): OptionsTab {
  const query = hash.split('?')[1] ?? ''
  const tab = new URLSearchParams(query).get('tab')
  return OPTIONS_TABS.find((id) => id === tab) ?? DEFAULT_OPTIONS_TAB
}

/** One update per section that differs from `base`, ready for `settings:update`. */
export function changedSections(base: Settings, draft: Settings): SettingsUpdate[] {
  const updates: SettingsUpdate[] = []
  for (const section of Object.keys(draft) as (keyof Settings)[]) {
    if (JSON.stringify(base[section]) !== JSON.stringify(draft[section])) {
      // The pair is correlated by `SettingsUpdate`, which the loop cannot prove.
      updates.push({ section, patch: draft[section] } as SettingsUpdate)
    }
  }
  return updates
}

export function isDirty(base: Settings, draft: Settings): boolean {
  return changedSections(base, draft).length > 0
}

/** Whether the draft holds text Windows would refuse in a file name (OK and Apply wait). */
export function hasProblems(draft: Settings): boolean {
  const { prefix, template, customPattern } = draft.files
  return (
    validatePrefix(prefix) !== null ||
    (template === 'custom' && validatePattern(customPattern) !== null)
  )
}

/** Format and folder are read when a file starts, so a recording keeps the old ones. */
export function appliesFromNextFile(base: Settings, draft: Settings, recording: boolean): boolean {
  if (!recording) return false
  return base.files.format !== draft.files.format || base.files.folder !== draft.files.folder
}
