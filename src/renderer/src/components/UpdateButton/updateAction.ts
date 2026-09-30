/**
 * What the update button says and does in each state of the updater. The
 * button only exists while there is a newer version: `null` hides it.
 */

import type { UpdateStatus } from '@shared/types'

export type UpdateStep = 'download' | 'install'

export interface UpdateAction {
  label: string
  /** The step a click runs; `null` while busy downloading. */
  step: UpdateStep | null
  title: string
}

export function updateAction(status: UpdateStatus): UpdateAction | null {
  switch (status.state) {
    case 'available':
      return {
        label: `Update to ${status.version}`,
        step: 'download',
        title: `Version ${status.version} is available. Download it`
      }
    case 'downloading':
      return {
        label: `Downloading ${status.percent}%`,
        step: null,
        title: `Downloading version ${status.version}`
      }
    case 'ready':
      return {
        label: 'Restart to update',
        step: 'install',
        title: `Version ${status.version} is ready. Restart to install it`
      }
    // Idle, checking, up to date or failed: nothing new to offer.
    default:
      return null
  }
}
