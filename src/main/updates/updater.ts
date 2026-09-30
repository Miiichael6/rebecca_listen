/**
 * Updates through `electron-updater` (GitHub Releases, see `publish` in
 * electron-builder.yml). Main keeps the state and pushes each change on
 * `updates:changed`; the renderer only shows it and asks for the next step.
 *
 * Nothing is downloaded without the user asking. Only the packaged app can
 * update, unless `dev-app-update.yml` is next to the project (to try the flow).
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateStatus } from '@shared/types'
import { isRecording } from '../audio/appSession'
import { broadcast } from '../ipc/typed'
import { logger } from '../log'
import { updateErrorMessage } from './errorMessage'

/** Wait after the window opens before the silent check at startup. */
const AUTO_CHECK_DELAY_MS = 10_000

let status: UpdateStatus = { state: 'idle' }
let found: string | null = null
let configured = false

const devConfigPath = (): string => join(app.getAppPath(), 'dev-app-update.yml')

const canUpdate = (): boolean => app.isPackaged || existsSync(devConfigPath())

function setStatus(next: UpdateStatus): void {
  status = next
  broadcast('updates:changed', next)
}

function setup(): void {
  if (configured) return
  configured = true
  autoUpdater.autoDownload = false
  // Downloaded but not restarted: it installs when the app is closed.
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = logger
  if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    found = info.version
    setStatus({ state: 'available', version: info.version })
  })
  autoUpdater.on('update-not-available', () => {
    found = null
    setStatus({ state: 'upToDate' })
  })
  autoUpdater.on('download-progress', (progress) => {
    setStatus({ state: 'downloading', version: found ?? '', percent: Math.round(progress.percent) })
  })
  autoUpdater.on('update-downloaded', (info) =>
    setStatus({ state: 'ready', version: info.version })
  )
  autoUpdater.on('error', (error) => {
    logger.error('Updater', error)
    setStatus({ state: 'error', message: updateErrorMessage(error) })
  })
}

export const getUpdateStatus = (): UpdateStatus => status

export async function checkForUpdates(): Promise<UpdateStatus> {
  // Running from source there is no `app-update.yml`: nothing to look for.
  if (!canUpdate()) {
    setStatus({ state: 'upToDate' })
    return status
  }
  // Do not step on a download in progress or on an update that is already ready.
  if (['checking', 'downloading', 'ready'].includes(status.state)) return status
  setup()
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // The `error` event already set the state.
  }
  return status
}

export async function downloadUpdate(): Promise<UpdateStatus> {
  if (status.state !== 'available') return status
  setup()
  setStatus({ state: 'downloading', version: status.version, percent: 0 })
  try {
    await autoUpdater.downloadUpdate()
  } catch {
    // The `error` event already set the state.
  }
  return status
}

/** Quits, installs silently and reopens. Not while recording: the file would be lost. */
export function installUpdate(): { ok: boolean } {
  if (status.state !== 'ready' || isRecording()) return { ok: false }
  logger.info('Restarting to install the update')
  autoUpdater.quitAndInstall(true, true)
  return { ok: true }
}

/** Silent check a few seconds after startup. */
export function scheduleAutoCheck(): void {
  if (!canUpdate()) return
  setTimeout(() => void checkForUpdates(), AUTO_CHECK_DELAY_MS)
}
