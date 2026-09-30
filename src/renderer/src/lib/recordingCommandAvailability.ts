/** Which commands a row of the list accepts. Pure: no React, no DOM. */

import type { HistoryItem, RecordingCommand } from '@shared/types'

/** What still makes sense on a row whose file is gone from disk. */
const WITHOUT_FILE: readonly RecordingCommand[] = ['remove', 'copyPath']

/** Whether `command` can run on `item`; the menu greys out the others. */
export function canRun(item: Pick<HistoryItem, 'exists'>, command: RecordingCommand): boolean {
  return item.exists || WITHOUT_FILE.includes(command)
}
