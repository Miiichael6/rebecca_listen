/** The `settings:*` and `ui:*` channels: a thin bridge over the settings service. */

import { settings } from '../settings'
import { broadcast, handle } from './typed'

export function registerSettingsIpc(): void {
  handle('settings:get', () => settings.get())
  handle('settings:update', (change) => settings.update(change))
  handle('settings:reset', () => settings.reset())
  handle('ui:get', () => settings.getUi())
  handle('ui:set', (patch) => settings.setUi(patch))

  // A change made anywhere in main (Options, a reset, task 12 resolving the
  // destination folder) reaches every open window through the same event.
  settings.onChange((next) => broadcast('settings:changed', next))
}
