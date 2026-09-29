/**
 * Everything the main window shows about recording: devices, the selected
 * source, the session and the list. Main owns all of it; this is a copy kept
 * in sync by the push events.
 */

import type {
  AudioDevice,
  HistoryItem,
  Notice,
  SessionSnapshot,
  SourceSelection
} from '@shared/types'
import { create } from 'zustand'

interface RecorderStore {
  devices: AudioDevice[]
  source: SourceSelection | null
  session: SessionSnapshot
  items: HistoryItem[]
  selectedId: string | null
  notice: Notice | null
  refreshDevices: () => Promise<void>
  setSource: (source: SourceSelection) => Promise<void>
  select: (id: string) => void
  dismissNotice: () => void
}

export const useRecorderStore = create<RecorderStore>((set) => ({
  devices: [],
  source: null,
  session: { state: 'idle', elapsedMs: 0, file: null },
  items: [],
  selectedId: null,
  notice: null,

  refreshDevices: async () => {
    try {
      set({ devices: await window.api.invoke('devices:list') })
    } catch (error) {
      set({ notice: { level: 'error', message: `Could not list devices: ${String(error)}` } })
    }
  },

  setSource: async (source) => {
    await window.api.invoke('source:set', source)
    set({ source })
  },

  select: (id) => set({ selectedId: id }),

  dismissNotice: () => set({ notice: null })
}))

let subscribed = false

/** Loads the initial state and subscribes to main. Called once on mount. */
export async function loadRecorder(): Promise<void> {
  if (!subscribed) {
    subscribed = true
    window.api.on('session:state', (session) => useRecorderStore.setState({ session }))
    window.api.on('history:changed', (items) =>
      // The newest recording is selected, so ▶ plays what was just recorded.
      useRecorderStore.setState({ items, selectedId: items[0]?.id ?? null })
    )
    window.api.on('notice', (notice) => useRecorderStore.setState({ notice }))
  }
  const [source, items] = await Promise.all([
    window.api.invoke('source:get'),
    window.api.invoke('history:list')
  ])
  useRecorderStore.setState({ source, items })
  await useRecorderStore.getState().refreshDevices()
}
