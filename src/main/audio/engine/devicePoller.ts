/**
 * Asks for the device list on a timer and tells its listeners only when
 * something changed (spec §4.1: the list updates live). It replaces the COM
 * hot-plug notifications, which the sidecar does not implement.
 *
 * It also keeps the last list it saw, so a check after a pause (window hidden)
 * reports what changed in the meantime.
 */

import type { AudioDevice } from '@shared/types'
import { diffDevices, hasChanges, type DeviceDiff } from './diffDevices'

type ChangeListener = (devices: AudioDevice[], diff: DeviceDiff) => void

export class DevicePoller {
  private timer: NodeJS.Timeout | null = null
  private last: AudioDevice[] | null = null
  private inFlight = false
  private failing = false
  private readonly listeners = new Set<ChangeListener>()

  constructor(
    private readonly listDevices: () => Promise<AudioDevice[]>,
    private readonly intervalMs: number,
    /** Called once per run of failures, not on every tick. */
    private readonly onFailure: (error: Error) => void
  ) {}

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Checks now and then every `intervalMs`. Does nothing if already running. */
  start(): void {
    if (this.timer) return
    void this.check()
    this.timer = setInterval(() => void this.check(), this.intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async check(): Promise<void> {
    // A slow answer must not pile up requests behind it.
    if (this.inFlight) return
    this.inFlight = true
    try {
      const next = await this.listDevices()
      this.failing = false
      const previous = this.last
      this.last = next
      // The first list is the baseline: the renderer already asked for it.
      if (!previous) return
      const diff = diffDevices(previous, next)
      if (hasChanges(diff)) for (const listener of this.listeners) listener(next, diff)
    } catch (error) {
      if (!this.failing) this.onFailure(error as Error)
      this.failing = true
    } finally {
      this.inFlight = false
    }
  }
}
