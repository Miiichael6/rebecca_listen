import type { RebeccaApi } from '@shared/ipc'

declare global {
  interface Window {
    api: RebeccaApi
  }
}
