/**
 * Runs a `RecordingCommand` on one recording of the list. The context menu
 * and the keyboard shortcuts of the list both end here.
 */

import type { RecordingCommand } from '@shared/types'
import { canRun, parseFormatCommand } from '../lib/recordingCommandAvailability'
import { usePlayerStore } from './player'
import { useRecorderStore } from './recorder'
import { useSessionStore } from './session'

export function runRecordingCommand(id: string, command: RecordingCommand): void {
  const recorder = useRecorderStore.getState()
  const player = usePlayerStore.getState()
  const item = recorder.items.find((other) => other.id === id)
  if (!item) return
  recorder.select(id)
  if (!canRun(item, command)) {
    useRecorderStore.setState({
      notice: { level: 'warn', message: `${item.name} no longer exists` }
    })
    return
  }

  const formatCommand = parseFormatCommand(command)
  if (formatCommand?.action === 'convert') {
    void window.api.invoke('history:convert', { id, format: formatCommand.format })
    return
  }
  if (formatCommand?.action === 'merge') {
    void window.api.invoke('history:merge', { format: formatCommand.format })
    return
  }

  switch (command) {
    case 'play':
      // Playing through the speakers would end up in a loopback recording.
      if (useSessionStore.getState().session.state === 'idle') player.play(id)
      break
    case 'openExternal':
      void window.api.invoke('shell:openPath', { path: item.path })
      break
    case 'rename':
      recorder.startRename(id)
      break
    case 'tags':
      // Saving replaces the file, which Windows refuses while it is playing.
      if (player.playingId === id) player.stop()
      recorder.openTags(id)
      break
    case 'duplicate':
      void window.api.invoke('history:duplicate', { id })
      break
    case 'openLocation':
      void window.api.invoke('shell:showItemInFolder', { path: item.path })
      break
    case 'copyPath':
      void navigator.clipboard.writeText(item.path)
      break
    case 'remove':
    case 'delete':
      // Windows keeps a file in use from going to the Recycle Bin.
      if (player.playingId === id) player.stop()
      void window.api.invoke(command === 'remove' ? 'history:remove' : 'history:delete', { id })
      break
    case 'clearAll':
      void recorder.clearList()
      break
  }
}
