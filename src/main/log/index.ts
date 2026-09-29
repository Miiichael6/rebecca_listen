/**
 * The app log (spec §1.8, §13): `userData/logs/main.log`, rotated at
 * `LOG_MAX_SIZE_BYTES` keeping `LOG_MAX_FILES` files.
 *
 * Every module of main logs through the `logger` exported here, so the transport
 * is already configured before the first line is written.
 */

import { app } from 'electron'
import electronLog from 'electron-log/main'
import { join } from 'path'
import { APP_NAME } from '@shared/appInfo'
import { LOG_MAX_FILES, LOG_MAX_SIZE_BYTES } from '@shared/defaults'
import { rotateLogFiles } from './rotation'

const LOG_DIR_NAME = 'logs'
const LOG_BASE_NAME = 'main'
const LOG_FILE_NAME = `${LOG_BASE_NAME}.log`

/** The configured `electron-log` singleton. */
export const logger = electronLog

function logDir(): string {
  return join(app.getPath('userData'), LOG_DIR_NAME)
}

/** Path of the current log file, for `shell:openLogFile` (task 23). */
export function getLogFilePath(): string {
  return join(logDir(), LOG_FILE_NAME)
}

function rotate(full: { path: string }): void {
  try {
    rotateLogFiles(logDir(), LOG_BASE_NAME, full.path, LOG_MAX_FILES)
  } catch (error) {
    // Rotation must never take the app down: keep writing to the same file.
    electronLog.warn('log rotation failed', error)
  }
}

/** Configures the log and starts catching unhandled errors. Called once. */
export function initLog(): void {
  // `preload: false`: the renderer has its own sandboxed preload (§1.3) and does
  // not log through electron-log, so its bridge is not needed.
  electronLog.initialize({ preload: false })

  const file = electronLog.transports.file
  file.fileName = LOG_FILE_NAME
  file.resolvePathFn = () => getLogFilePath()
  file.maxSize = LOG_MAX_SIZE_BYTES
  file.archiveLogFn = rotate

  electronLog.errorHandler.startCatching({ showDialog: false })

  electronLog.info(
    `${APP_NAME} ${app.getVersion()} starting (electron ${process.versions.electron})`
  )
  app.on('will-quit', () => {
    electronLog.info(`${APP_NAME} quitting`)
  })
}
