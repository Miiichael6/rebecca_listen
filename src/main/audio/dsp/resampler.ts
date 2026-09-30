/**
 * Sample rate conversion of interleaved f32 PCM (spec §2.1), for the mixer of
 * task 16: the microphone is brought to the rate of the loopback, and
 * `setRatioAdjust` nudges the ratio by a few ppm to follow the drift between
 * the two clocks.
 *
 * Windowed sinc (Kaiser) with the filter precomputed for `PHASES` fractional
 * positions; the coefficients of a position in between are interpolated
 * linearly from the two nearest rows. The input is kept between calls (the
 * filter's history), so block edges do not click, and the read position is an
 * integer frame plus a fraction, so how the input is split into blocks does
 * not change a single sample of the output.
 */

/** The ratio can be nudged by at most this much either way. */
export const MAX_RATIO_ADJUST_PPM = 1000

/** Zero crossings of the sinc on each side: the filter spans 2 × this at the cutoff. */
const ZERO_CROSSINGS = 16
/** Kaiser window shape: higher gives more stopband rejection and a wider transition. */
const KAISER_BETA = 7
/** Cutoff as a fraction of the lower Nyquist, leaving room for the transition band. */
const ROLLOFF = 0.9
/** Fractional positions the filter is precomputed for. */
const PHASES = 512
const PPM = 1e-6

export interface ResamplerOptions {
  inRate: number
  outRate: number
  channels: number
}

/** Modified Bessel function of the first kind, order 0 (for the Kaiser window). */
function besselI0(x: number): number {
  let sum = 1
  let term = 1
  const quarterSquare = (x * x) / 4
  for (let k = 1; term > sum * 1e-12; k++) {
    term *= quarterSquare / (k * k)
    sum += term
  }
  return sum
}

/** The filter at distance `x` (in zero crossings) from its centre. */
function kernel(x: number): number {
  const ratio = x / ZERO_CROSSINGS
  if (ratio >= 1) return 0
  const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
  return (sinc * besselI0(KAISER_BETA * Math.sqrt(1 - ratio * ratio))) / besselI0(KAISER_BETA)
}

/**
 * `PHASES + 1` rows of `taps` coefficients, row `p` for a read position
 * `p / PHASES` of a frame past the newest of the taps' first half. Each row
 * sums to 1, so a constant signal comes out unchanged.
 */
function buildPhaseTable(cutoff: number, halfTaps: number): Float32Array {
  const taps = halfTaps * 2
  const table = new Float32Array((PHASES + 1) * taps)
  for (let phase = 0; phase <= PHASES; phase++) {
    const fraction = phase / PHASES
    const row = table.subarray(phase * taps, (phase + 1) * taps)
    let sum = 0
    for (let tap = 0; tap < taps; tap++) {
      // Tap 0 is `halfTaps - 1` frames before the read position's frame.
      const distance = fraction + halfTaps - 1 - tap
      row[tap] = kernel(Math.abs(distance) * cutoff)
      sum += row[tap]
    }
    for (let tap = 0; tap < taps; tap++) row[tap] /= sum
  }
  return table
}

export class Resampler {
  private readonly channels: number
  private readonly baseStep: number
  private readonly halfTaps: number
  private readonly table: Float32Array
  /** The filter interpolated for the current read position. */
  private readonly coefficients: Float32Array
  /** Input frames per output frame, with the ratio adjust applied. */
  private step: number
  /** Input not yet used up, with `halfTaps` frames of history before it. */
  private buffer = new Float32Array(0)
  private bufferedFrames = 0
  /** Read position: frame `index` of `buffer` plus `fraction` of a frame. */
  private index = 0
  private fraction = 0

  constructor({ inRate, outRate, channels }: ResamplerOptions) {
    this.channels = channels
    this.baseStep = inRate / outRate
    this.step = this.baseStep
    // Downsampling moves the cutoff to the output's Nyquist, which widens the filter.
    const cutoff = Math.min(1, outRate / inRate) * ROLLOFF
    this.halfTaps = Math.ceil(ZERO_CROSSINGS / cutoff)
    this.table = buildPhaseTable(cutoff, this.halfTaps)
    this.coefficients = new Float32Array(this.halfTaps * 2)
    this.reset()
  }

  /**
   * Nudges the ratio: `+100` gives 100 ppm more output frames for the same
   * input. Clamped to ±`MAX_RATIO_ADJUST_PPM`; applies from the next frame.
   */
  setRatioAdjust(ppm: number): void {
    const clamped = Math.max(-MAX_RATIO_ADJUST_PPM, Math.min(MAX_RATIO_ADJUST_PPM, ppm))
    this.step = this.baseStep / (1 + clamped * PPM)
  }

  /** Converts the next block. Some output waits for the input after it (the filter's reach). */
  process(input: Float32Array): Float32Array {
    this.append(input)
    let out: Float32Array
    if (this.passesThrough()) {
      out = input.slice()
      this.index = this.bufferedFrames
    } else {
      out = this.convert()
    }
    this.dropUsedInput()
    return out
  }

  /** The output still waiting for input that will not come; the resampler starts over after it. */
  flush(): Float32Array {
    const out = this.passesThrough()
      ? new Float32Array(0)
      : this.process(new Float32Array(this.halfTaps * this.channels))
    this.reset()
    return out
  }

  /** Silence before the first frame, so the output starts in step with the input. */
  private reset(): void {
    this.bufferedFrames = this.halfTaps
    this.buffer = new Float32Array(this.bufferedFrames * this.channels)
    this.index = this.halfTaps
    this.fraction = 0
  }

  /** Same rates and no nudge: the samples are copied, and the history kept for a later nudge. */
  private passesThrough(): boolean {
    return this.step === 1 && this.fraction === 0
  }

  private append(input: Float32Array): void {
    const needed = this.bufferedFrames * this.channels + input.length
    if (needed > this.buffer.length) {
      const grown = new Float32Array(Math.max(needed, this.buffer.length * 2))
      grown.set(this.buffer.subarray(0, this.bufferedFrames * this.channels))
      this.buffer = grown
    }
    this.buffer.set(input, this.bufferedFrames * this.channels)
    this.bufferedFrames += input.length / this.channels
  }

  private convert(): Float32Array {
    const { channels, halfTaps, table, buffer, step, coefficients } = this
    const taps = halfTaps * 2
    const lastIndex = this.bufferedFrames - halfTaps
    const available = Math.max(0, Math.ceil((lastIndex - this.index - this.fraction) / step) + 1)
    const out = new Float32Array(available * channels)
    const stepFrames = Math.floor(step)
    const stepFraction = step - stepFrames
    let index = this.index
    let fraction = this.fraction
    let frames = 0

    while (index < lastIndex) {
      const phase = fraction * PHASES
      const row = Math.floor(phase)
      const blend = phase - row
      const row0 = row * taps
      // The coefficients for this position, shared by every channel.
      for (let tap = 0; tap < taps; tap++) {
        const low = table[row0 + tap]
        coefficients[tap] = low + blend * (table[row0 + taps + tap] - low)
      }
      const first = (index - halfTaps + 1) * channels
      for (let channel = 0; channel < channels; channel++) {
        let sum = 0
        for (let tap = 0, at = first + channel; tap < taps; tap++, at += channels) {
          sum += coefficients[tap] * buffer[at]
        }
        out[frames * channels + channel] = sum
      }
      frames++
      index += stepFrames
      fraction += stepFraction
      if (fraction >= 1) {
        fraction -= 1
        index++
      }
    }
    this.index = index
    this.fraction = fraction
    return out.subarray(0, frames * channels)
  }

  /** Keeps only the history the next output frame reads. */
  private dropUsedInput(): void {
    const drop = Math.min(this.index - this.halfTaps, this.bufferedFrames)
    if (drop <= 0) return
    this.buffer.copyWithin(0, drop * this.channels, this.bufferedFrames * this.channels)
    this.bufferedFrames -= drop
    this.index -= drop
  }
}
