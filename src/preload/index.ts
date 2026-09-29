import { contextBridge } from 'electron'
import { api } from './api'

// The renderer reaches main only through `window.api` (spec §1.3): the default
// `electronAPI` bridge of @electron-toolkit is not exposed, because it would
// open `ipcRenderer` to any channel.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (defined in index.d.ts)
  window.api = api
}
