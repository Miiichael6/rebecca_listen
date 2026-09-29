/**
 * In-app playback of a recording: one `<audio>` element fed from
 * `rl-media://recording/<id>` (main serves only files of the history).
 */

import { mediaUrl } from '@shared/defaults'
import { create } from 'zustand'

interface PlayerStore {
  /** Recording loaded in the player, or null when stopped. */
  playingId: string | null
  paused: boolean
  positionMs: number
  play: (id: string) => void
  pause: () => void
  stop: () => void
}

const audio = new Audio()

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playingId: null,
  paused: false,
  positionMs: 0,

  // Same recording while paused resumes; another one starts from the beginning.
  play: (id) => {
    if (get().playingId !== id) {
      audio.src = mediaUrl(id)
      set({ playingId: id, positionMs: 0 })
    }
    set({ paused: false })
    audio.play().catch(() => get().stop())
  },

  pause: () => {
    if (!get().playingId) return
    audio.pause()
    set({ paused: true })
  },

  stop: () => {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    set({ playingId: null, paused: false, positionMs: 0 })
  }
}))

audio.addEventListener('timeupdate', () => {
  if (usePlayerStore.getState().playingId) {
    usePlayerStore.setState({ positionMs: audio.currentTime * 1000 })
  }
})
audio.addEventListener('ended', () => usePlayerStore.getState().stop())
