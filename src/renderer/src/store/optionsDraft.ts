/**
 * The copy of the settings the Options window edits. Nothing reaches main until
 * `apply`: Cancel and the window's X just drop the draft with the window.
 */

import type { Settings, SettingsSection } from '@shared/types'
import { create } from 'zustand'
import { changedSections, isDirty } from '../windows/Options/domain/draft'

interface OptionsDraftStore {
  /** What main has stored; the draft is compared against it. */
  base: Settings | null
  draft: Settings | null
  /** Deep-copies `settings` as the new draft, dropping any unapplied change. */
  open: (settings: Settings) => void
  edit: <S extends SettingsSection>(section: S, patch: Partial<Settings[S]>) => void
  /** Sends the changed sections to main and makes the result the new base. */
  apply: () => Promise<void>
  /** Drops the changes and goes back to the base. */
  reset: () => void
}

export const useOptionsDraft = create<OptionsDraftStore>((set, get) => ({
  base: null,
  draft: null,

  open: (settings) => set({ base: structuredClone(settings), draft: structuredClone(settings) }),

  edit: (section, patch) =>
    set(({ draft }) =>
      draft ? { draft: { ...draft, [section]: { ...draft[section], ...patch } } } : {}
    ),

  apply: async () => {
    const { base, draft } = get()
    if (!base || !draft) return
    let stored = base
    for (const change of changedSections(base, draft)) {
      stored = await window.api.invoke('settings:update', change)
    }
    // Main clips what it stores, so the draft takes its answer back.
    set({ base: structuredClone(stored), draft: structuredClone(stored) })
  },

  reset: () => set(({ base }) => (base ? { draft: structuredClone(base) } : {}))
}))

/** `true` while the draft differs from what is stored. */
export function useDraftDirty(): boolean {
  return useOptionsDraft(({ base, draft }) => (base && draft ? isDirty(base, draft) : false))
}
