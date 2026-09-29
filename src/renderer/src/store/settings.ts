/**
 * The settings as the renderer sees them: a copy of what main has, loaded once
 * at startup and refreshed by the `settings:changed` event.
 *
 * Nothing is written here: `update` and `reset` go to main and the store waits
 * for the value it stored back, so both processes never disagree.
 */

import type { Settings, SettingsSection, SettingsUpdate } from '@shared/types'
import { create } from 'zustand'

interface SettingsStore {
  /** `null` until the first load finishes. */
  settings: Settings | null
  update: <S extends SettingsSection>(section: S, patch: Partial<Settings[S]>) => Promise<void>
  reset: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,

  update: async (section, patch) => {
    // The pair is correlated by `SettingsUpdate`, which the generic cannot prove.
    const change = { section, patch } as SettingsUpdate
    set({ settings: await window.api.invoke('settings:update', change) })
  },

  reset: async () => {
    set({ settings: await window.api.invoke('settings:reset') })
  }
}))

let subscribed = false

/** Loads the settings and keeps them in sync with main. Called once on mount. */
export async function loadSettings(): Promise<void> {
  if (!subscribed) {
    subscribed = true
    window.api.on('settings:changed', (settings) => useSettingsStore.setState({ settings }))
  }
  useSettingsStore.setState({ settings: await window.api.invoke('settings:get') })
}
