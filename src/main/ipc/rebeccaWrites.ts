/**
 * RebeccaWrites for the live transcription (task 46): whether it is on this
 * machine, and the picker to point at it by hand when it is not found.
 */

import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron'
import type { RebeccaWritesStatus } from '@shared/types'
import { logger } from '../log'
import { isRebeccaWritesExe, REBECCA_WRITES_EXE } from '../rebeccaWrites/exePath'
import { locateRebeccaWrites } from '../rebeccaWrites/locate'
import { settings } from '../settings'
import { broadcast, handle } from './typed'

async function status(): Promise<RebeccaWritesStatus> {
  return { exe: await locateRebeccaWrites() }
}

async function pickExe(event: IpcMainInvokeEvent): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender)
  const options = {
    title: `Localizar ${REBECCA_WRITES_EXE}`,
    filters: [{ name: REBECCA_WRITES_EXE, extensions: ['exe'] }],
    properties: ['openFile' as const]
  }
  const { canceled, filePaths } = window
    ? await dialog.showOpenDialog(window, options)
    : await dialog.showOpenDialog(options)
  return canceled ? null : (filePaths[0] ?? null)
}

async function locate(event: IpcMainInvokeEvent): Promise<RebeccaWritesStatus | null> {
  const exe = await pickExe(event)
  if (!exe) return null
  if (!isRebeccaWritesExe(exe)) {
    const message = `That is not ${REBECCA_WRITES_EXE}.`
    logger.warn(`${message} (${exe})`)
    broadcast('notice', { level: 'error', message })
    return null
  }
  settings.update({ section: 'transcription', patch: { rebeccaWritesExe: exe } })
  logger.info(`RebeccaWrites chosen: ${exe}`)
  return status()
}

export function registerRebeccaWritesIpc(): void {
  handle('rebeccaWrites:status', () => status())
  handle('rebeccaWrites:locate', (_, event) => locate(event))
}
