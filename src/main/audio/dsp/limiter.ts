/**
 * Soft limiter for the sum of two sources (task 16): below the knee the
 * samples pass untouched; above it they bend smoothly (tanh) towards full
 * scale and never reach past it. No state, so it cannot click between blocks.
 */

/** Level where the curve starts to bend: about −1.9 dBFS. */
const KNEE = 0.8
const HEADROOM = 1 - KNEE

export function softLimit(sample: number): number {
  const magnitude = Math.abs(sample)
  if (magnitude <= KNEE) return sample
  const bent = KNEE + HEADROOM * Math.tanh((magnitude - KNEE) / HEADROOM)
  return sample < 0 ? -bent : bent
}

/** Applies `softLimit` to every sample of `samples`, in place. */
export function softLimitInPlace(samples: Float32Array): void {
  for (let i = 0; i < samples.length; i++) samples[i] = softLimit(samples[i])
}
