/**
 * Where a file ends and the next one starts inside a block of interleaved
 * samples (spec §12.2, Smart Split). Pure: no copies, both halves are views
 * of the same block, so together they hold every sample exactly once.
 */

/**
 * Splits `samples` at frame `atFrame` into what goes before the cut and what
 * goes after it. A frame outside the block is clamped to its start or end.
 */
export function splitBlock(
  samples: Float32Array,
  channels: number,
  atFrame: number
): [before: Float32Array, after: Float32Array] {
  const frames = samples.length / channels
  const cut = Math.min(Math.max(Math.round(atFrame), 0), frames) * channels
  return [samples.subarray(0, cut), samples.subarray(cut)]
}
