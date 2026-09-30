/** Which commands a row of the list accepts. Pure: no React, no DOM. */

import { AUDIO_FORMATS, MERGE_MIN_FILES } from '@shared/defaults'
import type { AudioFormat, HistoryItem, RecordingCommand } from '@shared/types'

/** What still makes sense on a row whose file is gone from disk. */
const WITHOUT_FILE: readonly RecordingCommand[] = ['remove', 'copyPath', 'clearAll']

/** A command that writes a new file in one of the formats. */
export interface FormatCommand {
  action: 'convert' | 'merge'
  format: AudioFormat
}

/** `convert:mp3` → `{ action: 'convert', format: 'mp3' }`; any other command → `null`. */
export function parseFormatCommand(command: RecordingCommand): FormatCommand | null {
  const [action, format] = command.split(':')
  if (action !== 'convert' && action !== 'merge') return null
  if (!AUDIO_FORMATS.includes(format as AudioFormat)) return null
  return { action, format: format as AudioFormat }
}

/** Merge all to one works on the whole list, not on the row it was opened on. */
export function canMerge(items: readonly Pick<HistoryItem, 'exists'>[]): boolean {
  return items.filter((item) => item.exists).length >= MERGE_MIN_FILES
}

/** Whether `command` can run on `item`; the menu greys out the others. */
export function canRun(item: Pick<HistoryItem, 'exists'>, command: RecordingCommand): boolean {
  if (item.exists || WITHOUT_FILE.includes(command)) return true
  return parseFormatCommand(command)?.action === 'merge'
}
