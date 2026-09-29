import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { APP_NAME } from '@shared/appInfo'

// Custom APIs for renderer. Typed IPC channels arrive in task 02.
const api = {
  appName: APP_NAME
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type RebeccaApi = typeof api
