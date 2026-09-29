/**
 * The audio endpoints usable right now, as main last reported them: loaded
 * once, replaced by every `devices:changed` push and refreshed on demand when
 * the Source list opens.
 */

import type { AudioDevice } from '@shared/types'
import { create } from 'zustand'
import { useRecorderStore } from './recorder'

interface DevicesStore {
  devices: AudioDevice[]
  refresh: () => Promise<void>
}

export const useDevicesStore = create<DevicesStore>((set) => ({
  devices: [],

  refresh: async () => {
    try {
      set({ devices: await window.api.invoke('devices:list') })
    } catch (error) {
      // The list stays as it was; the notice banner lives in the recorder store.
      useRecorderStore.setState({
        notice: { level: 'error', message: `Could not list devices: ${String(error)}` }
      })
    }
  }
}))

let subscribed = false

/** Loads the list and keeps it in sync with main. Called once on mount. */
export async function loadDevices(): Promise<void> {
  if (!subscribed) {
    subscribed = true
    window.api.on('devices:changed', (devices) => useDevicesStore.setState({ devices }))
  }
  await useDevicesStore.getState().refresh()
}
