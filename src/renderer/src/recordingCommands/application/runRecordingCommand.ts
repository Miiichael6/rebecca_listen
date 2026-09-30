/**
 * Runs a `RecordingCommand` on one recording of the list. The context menu
 * and the keyboard shortcuts of the list both end here.
 */

import type { RecordingCommand } from '@shared/types'
import { canRun, parseFormatCommand } from '../domain/availability'
import type { RecordingCommandsPort } from './ports'

export function runRecordingCommand(
  port: RecordingCommandsPort,
  id: string,
  command: RecordingCommand
): void {
  const item = port.findItem(id)
  if (!item) return
  port.select(id)
  if (!canRun(item, command)) {
    port.warn(`${item.name} no longer exists`)
    return
  }

  const formatCommand = parseFormatCommand(command)
  if (formatCommand?.action === 'convert') {
    port.convert(id, formatCommand.format)
    return
  }
  if (formatCommand?.action === 'merge') {
    port.merge(formatCommand.format)
    return
  }

  switch (command) {
    case 'play':
      if (!port.isRecording()) port.play(id)
      break
    case 'openExternal':
      port.openPath(item.path)
      break
    case 'rename':
      port.startRename(id)
      break
    case 'tags':
      // Saving replaces the file, which Windows refuses while it is playing.
      if (port.playingId() === id) port.stopPlayback()
      port.openTags(id)
      break
    case 'duplicate':
      port.duplicate(id)
      break
    case 'openLocation':
      port.showInFolder(item.path)
      break
    case 'copyPath':
      port.copyText(item.path)
      break
    case 'remove':
    case 'delete':
      // Windows keeps a file in use from going to the Recycle Bin.
      if (port.playingId() === id) port.stopPlayback()
      if (command === 'remove') port.remove(id)
      else port.deleteFile(id)
      break
    case 'clearAll':
      port.clearList()
      break
  }
}
