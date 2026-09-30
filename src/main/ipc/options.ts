/** The `options:*` channels: opening the Options window. */

import { openOptionsWindow } from '../windows/options'
import { handle } from './typed'

export function registerOptionsIpc(): void {
  handle('options:open', (req, event) => openOptionsWindow(event.sender, req?.tab))
}
