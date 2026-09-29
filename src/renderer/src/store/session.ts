/**
 * The recording session as main last reported it (spec §4.9). Main owns the
 * state machine: the buttons only ask, and the store shows what main answers
 * and every `session:state` it pushes while recording.
 */

import type { SessionSnapshot } from '@shared/types'
import { create } from 'zustand'

interface SessionStore {
  session: SessionSnapshot
  record: () => Promise<void>
  /** Pauses while recording, resumes while paused. */
  togglePause: () => Promise<void>
  stop: () => Promise<void>
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: { state: 'idle', elapsedMs: 0, file: null },

  record: async () => set({ session: await window.api.invoke('session:record') }),
  togglePause: async () => set({ session: await window.api.invoke('session:pause') }),
  stop: async () => set({ session: await window.api.invoke('session:stop') })
}))

let subscribed = false

/** Keeps the session in sync with main. Called once on mount. */
export function loadSession(): void {
  if (subscribed) return
  subscribed = true
  window.api.on('session:state', (session) => useSessionStore.setState({ session }))
}
