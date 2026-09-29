import { ElectronAPI } from '@electron-toolkit/preload'
import type { RebeccaApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: RebeccaApi
  }
}
