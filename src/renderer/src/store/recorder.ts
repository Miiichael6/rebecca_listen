/**
 * Everything the main window shows about recording: the selected source, the
 * session and the list (the devices are in `devices.ts`). Main owns all of it;
 * this is a copy kept in sync by the push events.
 */

import type { HistoryItem, Notice, SessionSnapshot, SourceSelection } from '@shared/types'
import { create } from 'zustand'

interface RecorderStore {
  source: SourceSelection | null
  /** Device list of the Source dropdown expanded ("•••" bar). */
  sourceListExpanded: boolean
  session: SessionSnapshot
  items: HistoryItem[]
  selectedId: string | null
  notice: Notice | null
  setSource: (source: SourceSelection) => Promise<void>
  setSourceListExpanded: (expanded: boolean) => Promise<void>
  select: (id: string) => void
  dismissNotice: () => void
}

export const useRecorderStore = create<RecorderStore>((set) => ({
  source: null,
  sourceListExpanded: false,
  session: { state: 'idle', elapsedMs: 0, file: null },
  items: [],
  selectedId: null,
  notice: null,

  setSource: async (source) => {
    await window.api.invoke('source:set', source)
    set({ source })
  },

  setSourceListExpanded: async (expanded) => {
    set({ sourceListExpanded: expanded })
    const ui = await window.api.invoke('ui:set', { sourceListExpanded: expanded })
    set({ sourceListExpanded: ui.sourceListExpanded })
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
  const [source, ui, items] = await Promise.all([
    window.api.invoke('source:get'),
    window.api.invoke('ui:get'),
    window.api.invoke('history:list')
  ])
  useRecorderStore.setState({ source, sourceListExpanded: ui.sourceListExpanded, items })
}
