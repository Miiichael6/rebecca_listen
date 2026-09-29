/**
 * What main needs from the capture backend (spec §3.1). Nothing here is
 * specific to Windows: `SidecarAudioEngine` is the WASAPI implementation.
 */

import type { AudioDevice } from '@shared/types'

export interface AudioStream {
  readonly sampleRate: number
  readonly channels: number
  /** Interleaved f32 samples, as they arrive. */
  onData(listener: (samples: Float32Array) => void): void
  /** The stream ended on its own (device lost, backend gone...). */
  onError(listener: (reason: string) => void): void
  stop(): Promise<void>
}

export interface AudioEngine {
  /** Endpoints usable right now, fresh from the backend. */
  listDevices(): Promise<AudioDevice[]>
  /**
   * Called with the whole list when a device appears or goes, or a default
   * changes. Returns the unsubscribe function.
   */
  onDevicesChanged(listener: (devices: AudioDevice[]) => void): () => void
  /** Pauses the change detection (window hidden) or resumes it with a fresh check. */
  setWatchingDevices(watching: boolean): void
  openStream(device: AudioDevice): Promise<AudioStream>
  dispose(): void
}
