/**
 * The update state as the renderer sees it: what main pushes on `updates:changed`.
 * The actions go to main, which answers with the state that results.
 */

import type { UpdateStatus } from '@shared/types'
import { create } from 'zustand'

interface UpdatesStore {
  status: UpdateStatus
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
}

export const useUpdatesStore = create<UpdatesStore>((set) => ({
  status: { state: 'idle' },

  check: async () => set({ status: await window.api.invoke('updates:check') }),
  download: async () => set({ status: await window.api.invoke('updates:download') }),
  install: async () => {
    await window.api.invoke('updates:install')
  }
}))

let subscribed = false

/** Loads the state and keeps it in sync with main. Called once on mount. */
export async function loadUpdates(): Promise<void> {
  if (!subscribed) {
    subscribed = true
    window.api.on('updates:changed', (status) => useUpdatesStore.setState({ status }))
  }
  useUpdatesStore.setState({ status: await window.api.invoke('updates:status') })
}
