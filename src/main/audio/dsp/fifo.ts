/**
 * First-in first-out buffer of interleaved f32 frames, for the microphone
 * waiting to be mixed with the loopback (task 16). Fixed capacity: it never
 * grows, so a microphone that runs ahead costs its oldest frames, not memory.
 */

export class SampleFifo {
  private readonly ring: Float32Array
  private readonly capacity: number
  /** Frame where the next read starts. */
  private head = 0
  private size = 0

  constructor(
    private readonly channels: number,
    capacityFrames: number
  ) {
    this.capacity = capacityFrames
    this.ring = new Float32Array(capacityFrames * channels)
  }

  /** Frames waiting to be read. */
  get frames(): number {
    return this.size
  }

  /**
   * Appends `samples`. What does not fit pushes out the oldest frames first;
   * returns how many were dropped.
   */
  write(samples: Float32Array): number {
    let incoming = samples.length / this.channels
    let from = 0
    let dropped = 0
    if (incoming > this.capacity) {
      // Only the newest `capacity` frames of the block can stay.
      dropped += incoming - this.capacity
      from = dropped * this.channels
      incoming = this.capacity
    }
    const overflow = this.size + incoming - this.capacity
    if (overflow > 0) {
      this.discard(overflow)
      dropped += overflow
    }
    this.copyIn(samples, from, incoming)
    return dropped
  }

  /** Drops the `frames` oldest frames (or all of them, if there are fewer). */
  discard(frames: number): void {
    const count = Math.min(frames, this.size)
    this.head = (this.head + count) % this.capacity
    this.size -= count
  }

  /**
   * Fills `out` with the next frames. When fewer are waiting, the rest of
   * `out` is zeros; returns how many frames were missing.
   */
  read(out: Float32Array): number {
    const wanted = out.length / this.channels
    const available = Math.min(wanted, this.size)
    const firstPart = Math.min(available, this.capacity - this.head)
    const { channels } = this
    out.set(this.ring.subarray(this.head * channels, (this.head + firstPart) * channels), 0)
    out.set(this.ring.subarray(0, (available - firstPart) * channels), firstPart * channels)
    out.fill(0, available * channels)
    this.discard(available)
    return wanted - available
  }

  private copyIn(samples: Float32Array, from: number, frames: number): void {
    const { channels } = this
    const tail = (this.head + this.size) % this.capacity
    const firstPart = Math.min(frames, this.capacity - tail)
    this.ring.set(samples.subarray(from, from + firstPart * channels), tail * channels)
    this.ring.set(samples.subarray(from + firstPart * channels, from + frames * channels), 0)
    this.size += frames
  }
}
