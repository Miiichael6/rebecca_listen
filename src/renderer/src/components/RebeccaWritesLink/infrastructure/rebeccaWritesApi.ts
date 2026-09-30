/** What the RebeccaWrites checkbox asks of the preload API. */

import type { RebeccaWritesStatus } from '@shared/types'

export const lookForRebeccaWrites = (): Promise<RebeccaWritesStatus> =>
  window.api.invoke('rebeccaWrites:status')

export const locateRebeccaWrites = (): Promise<RebeccaWritesStatus | null> =>
  window.api.invoke('rebeccaWrites:locate')
