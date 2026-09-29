/**
 * The `window.api` implementation: typed `invoke` / `on` restricted to the
 * channels declared in `@shared/ipc`. Anything else is rejected here, so the
 * renderer cannot reach an arbitrary channel even if it tries.
 */

import { ipcRenderer, type IpcRendererEvent } from 'electron'
import {
  isEventChannel,
  isInvokeChannel,
  type EventChannel,
  type EventPayload,
  type InvokeArgs,
  type InvokeChannel,
  type InvokeRes,
  type RebeccaApi
} from '@shared/ipc'

export const api: RebeccaApi = {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>): Promise<InvokeRes<C>> {
    if (!isInvokeChannel(channel)) {
      return Promise.reject(new Error(`Blocked IPC channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, args[0]) as Promise<InvokeRes<C>>
  },

  on<C extends EventChannel>(channel: C, listener: (payload: EventPayload<C>) => void): () => void {
    if (!isEventChannel(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`)
    }
    const forward = (_event: IpcRendererEvent, payload: EventPayload<C>): void => listener(payload)
    ipcRenderer.on(channel, forward)
    return () => {
      ipcRenderer.removeListener(channel, forward)
    }
  }
}
