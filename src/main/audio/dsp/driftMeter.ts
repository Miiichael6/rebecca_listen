/**
 * Measures the clock drift between two streams (task 16, step 2): the master
 * (loopback) and the slave (microphone). Each counts its frames against its
 * nominal rate; after every master block the difference between the two, in
 * seconds, is sampled.
 *
 * Blocks arrive in ~10 ms steps, so a single sample jitters by a block. The
 * samples are averaged over a window of master audio, and the drift is how
 * much that average moved since the first window: the startup latency and
 * the block jitter cancel out, and what is left grows with the clock
 * difference.
 */

const MS_PER_S = 1000
const PPM_PER_UNIT = 1e6

export interface DriftReport {
  /** Master audio counted so far, in seconds. */
  elapsedS: number
  /** How far the slave moved from the master since the first window, in ms (positive: ahead). */
  driftMs: number
  /** Clock difference it implies: positive when the slave runs fast. `null` for the first window. */
  ppm: number | null
}

/** Running average of the offset over the current window. */
interface Window {
  offsetSum: number
  timeSum: number
  samples: number
}

export class DriftMeter {
  private masterFrames = 0
  private slaveFrames = 0
  private window: Window = { offsetSum: 0, timeSum: 0, samples: 0 }
  private windowEndS: number
  /** Average offset and time of the first window, the zero of the drift. */
  private baseline: { offsetS: number; timeS: number } | null = null

  constructor(
    private readonly masterRate: number,
    private readonly slaveRate: number,
    private readonly windowS: number
  ) {
    this.windowEndS = windowS
  }

  addSlave(frames: number): void {
    this.slaveFrames += frames
  }

  /** Counts a master block; returns a report when it closes a window. */
  addMaster(frames: number): DriftReport | null {
    this.masterFrames += frames
    const masterS = this.masterFrames / this.masterRate
    const offsetS = this.slaveFrames / this.slaveRate - masterS
    this.window.offsetSum += offsetS
    this.window.timeSum += masterS
    this.window.samples++
    if (masterS < this.windowEndS) return null
    this.windowEndS += this.windowS
    return this.closeWindow(masterS)
  }

  private closeWindow(elapsedS: number): DriftReport {
    const { offsetSum, timeSum, samples } = this.window
    const offsetS = offsetSum / samples
    const timeS = timeSum / samples
    this.window = { offsetSum: 0, timeSum: 0, samples: 0 }
    if (!this.baseline) {
      this.baseline = { offsetS, timeS }
      return { elapsedS, driftMs: 0, ppm: null }
    }
    const driftS = offsetS - this.baseline.offsetS
    return {
      elapsedS,
      driftMs: driftS * MS_PER_S,
      ppm: (driftS / (timeS - this.baseline.timeS)) * PPM_PER_UNIT
    }
  }
}
