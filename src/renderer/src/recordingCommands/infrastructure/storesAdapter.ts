/**
 * Plugs `RecordingCommandsPort` into the real world: the Zustand stores, the
 * preload API and the clipboard.
 */

import type { RecordingCommand } from '@shared/types'
import { usePlayerStore } from '../../store/player'
import { useRecorderStore } from '../../store/recorder'
import { useSessionStore } from '../../store/session'
import type { RecordingCommandsPort } from '../application/ports'
import { runRecordingCommand as run } from '../application/runRecordingCommand'

const storesPort: RecordingCommandsPort = {
  findItem: (id) => useRecorderStore.getState().items.find((item) => item.id === id),
  select: (id) => useRecorderStore.getState().select(id),
  warn: (message) => useRecorderStore.setState({ notice: { level: 'warn', message } }),
  isRecording: () => useSessionStore.getState().session.state !== 'idle',

  playingId: () => usePlayerStore.getState().playingId,
  play: (id) => usePlayerStore.getState().play(id),
  stopPlayback: () => usePlayerStore.getState().stop(),

  startRename: (id) => useRecorderStore.getState().startRename(id),
  openTags: (id) => useRecorderStore.getState().openTags(id),
  clearList: () => void useRecorderStore.getState().clearList(),

  convert: (id, format) => void window.api.invoke('history:convert', { id, format }),
  merge: (format) => void window.api.invoke('history:merge', { format }),
  duplicate: (id) => void window.api.invoke('history:duplicate', { id }),
  remove: (id) => void window.api.invoke('history:remove', { id }),
  deleteFile: (id) => void window.api.invoke('history:delete', { id }),

  openPath: (path) => void window.api.invoke('shell:openPath', { path }),
  showInFolder: (path) => void window.api.invoke('shell:showItemInFolder', { path }),
  copyText: (text) => void navigator.clipboard.writeText(text)
}

export function runRecordingCommand(id: string, command: RecordingCommand): void {
  run(storesPort, id, command)
}
