/**
 * Typed wrappers over `ipcMain`, derived from the maps in `@shared/ipc`.
 * Handlers get their request and response types from the channel name.
 */

import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { EventChannel, EventPayload, InvokeChannel, InvokeReq, InvokeRes } from '@shared/ipc'

export type InvokeHandler<C extends InvokeChannel> = (
  req: InvokeReq<C>,
  event: IpcMainInvokeEvent
) => InvokeRes<C> | Promise<InvokeRes<C>>

/** Registers the handler of one request/response channel. */
export function handle<C extends InvokeChannel>(channel: C, handler: InvokeHandler<C>): void {
  ipcMain.handle(channel, (event, req) => handler(req as InvokeReq<C>, event))
}

/** Pushes an event to one window. */
export function emit<C extends EventChannel>(
  window: BrowserWindow,
  channel: C,
  payload: EventPayload<C>
): void {
  if (window.isDestroyed()) return
  window.webContents.send(channel, payload)
}

/** Pushes an event to every open window. */
export function broadcast<C extends EventChannel>(channel: C, payload: EventPayload<C>): void {
  for (const window of BrowserWindow.getAllWindows()) emit(window, channel, payload)
}
