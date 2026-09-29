/**
 * The columns of the live waveform (spec §4.3), newest last, in a ring of
 * fixed size: pushing past the capacity drops the oldest ones.
 */

import type { WaveFrame } from '@shared/types'

export class WaveBuffer {
  private readonly min: Float32Array
  private readonly max: Float32Array
  /** Index where the next column goes. */
  private head = 0
  private count = 0

  constructor(readonly capacity: number) {
    this.min = new Float32Array(capacity)
    this.max = new Float32Array(capacity)
  }

  get length(): number {
    return this.count
  }

  push(frame: WaveFrame): void {
    for (let i = 0; i < frame.max.length; i++) {
      this.min[this.head] = frame.min[i]
      this.max[this.head] = frame.max[i]
      this.head = (this.head + 1) % this.capacity
      this.count = Math.min(this.count + 1, this.capacity)
    }
  }

  /** Column `age` steps back from the newest (0 is the newest). */
  column(age: number): { min: number; max: number } {
    const index = (this.head - 1 - age + this.capacity * 2) % this.capacity
    return { min: this.min[index], max: this.max[index] }
  }
}
