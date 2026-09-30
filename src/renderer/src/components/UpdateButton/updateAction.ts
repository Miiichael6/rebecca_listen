/** What the update button says and does in each state of the updater. */

import type { UpdateStatus } from '@shared/types'

export type UpdateStep = 'check' | 'download' | 'install'

export interface UpdateAction {
  label: string
  /** The step a click runs; `null` while there is nothing to do (busy or up to date). */
  step: UpdateStep | null
  title: string
}

export function updateAction(status: UpdateStatus): UpdateAction {
  switch (status.state) {
    case 'checking':
      return { label: 'Checking…', step: null, title: 'Looking for updates' }
    case 'upToDate':
      return {
        label: 'Up to date',
        step: 'check',
        title: 'You have the latest version. Check again'
      }
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
    case 'error':
      return { label: 'Retry update', step: 'check', title: status.message }
    case 'idle':
      return { label: 'Check for updates', step: 'check', title: 'Look for a newer version' }
  }
}
