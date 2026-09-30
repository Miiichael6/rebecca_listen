/**
 * Everything the main window shows about recording: the selected source, the
 * level and the list (the devices are in `devices.ts`, the session in `session.ts`). Main owns all of it;
 * this is a copy kept in sync by the push events.
 */

import { DEFAULT_LEVEL_PERCENT, LEVEL_SEND_MS } from '@shared/defaults'
import type { HistoryItem, Notice, SourceSelection } from '@shared/types'
import { create } from 'zustand'
import { throttle } from '../lib/throttle'

interface RecorderStore {
  source: SourceSelection | null
  /** Device list of the Source dropdown expanded ("•••" bar). */
  sourceListExpanded: boolean
  /** Level slider, in percent. */
  level: number
  items: HistoryItem[]
  selectedId: string | null
  /** Row whose name is being edited in place (F2 or Rename). */
  editingId: string | null
  notice: Notice | null
  setSource: (source: SourceSelection) => Promise<void>
  setSourceListExpanded: (expanded: boolean) => Promise<void>
  setLevel: (percent: number) => void
  select: (id: string) => void
  /** Renames the file on disk; main reports a refused name as a notice. */
  rename: (id: string, name: string) => Promise<void>
  startRename: (id: string) => void
  endRename: () => void
  /** File picker in main; the chosen file joins the list (if new) and is selected. */
  importAudioFile: () => Promise<void>
  /** Main asks for confirmation; the files stay on disk. */
  clearList: () => Promise<void>
  dismissNotice: () => void
}

// A drag fires far more input events than the meter can show: main gets at
// most one per meter frame, and always the last one.
const sendLevel = throttle((percent: number) => {
  void window.api.invoke('level:set', percent)
}, LEVEL_SEND_MS)

export const useRecorderStore = create<RecorderStore>((set) => ({
  source: null,
  sourceListExpanded: false,
  level: DEFAULT_LEVEL_PERCENT,
  items: [],
  selectedId: null,
  editingId: null,
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

  setLevel: (percent) => {
    set({ level: percent })
    sendLevel(percent)
  },

  select: (id) => set({ selectedId: id }),

  rename: async (id, name) => {
    const items = await window.api.invoke('history:rename', { id, name })
    set({ items })
  },

  startRename: (id) => set({ selectedId: id, editingId: id }),
  endRename: () => set({ editingId: null }),

  importAudioFile: async () => {
    const id = await window.api.invoke('history:import')
    if (id) set({ selectedId: id })
  },

  clearList: async () => {
    const items = await window.api.invoke('history:clear')
    set({ items })
  },

  dismissNotice: () => set({ notice: null })
}))

let subscribed = false

/** Loads the initial state and subscribes to main. Called once on mount. */
export async function loadRecorder(): Promise<void> {
  if (!subscribed) {
    subscribed = true
    window.api.on('history:changed', (items) => {
      // A new recording is selected, so ▶ plays what was just recorded; any
      // other change (a rename) keeps the selection.
      const { items: previous, selectedId } = useRecorderStore.getState()
      const added = items[0] && items[0].id !== previous[0]?.id
      const kept = !added && items.some((item) => item.id === selectedId)
      useRecorderStore.setState({ items, selectedId: kept ? selectedId : (items[0]?.id ?? null) })
    })
    window.api.on('notice', (notice) => useRecorderStore.setState({ notice }))
  }
  const [source, ui, level, items] = await Promise.all([
    window.api.invoke('source:get'),
    window.api.invoke('ui:get'),
    window.api.invoke('level:get'),
    window.api.invoke('history:list')
  ])
  useRecorderStore.setState({ source, sourceListExpanded: ui.sourceListExpanded, level, items })
}
