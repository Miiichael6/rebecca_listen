import { describe, expect, it } from 'vitest'
import { DriftMeter, type DriftReport } from './driftMeter'

const RATE = 48_000
const BLOCK = 480
const WINDOW_S = 60

/**
 * `seconds` of 10 ms master blocks, with the slave running `ppm` fast and its
 * blocks arriving `jitter` blocks early or late at random (seeded).
 */
function run(ppm: number, seconds: number, jitter = 0): DriftReport[] {
  const meter = new DriftMeter(RATE, RATE, WINDOW_S)
  const reports: DriftReport[] = []
  let owed = 0
  let seed = 7
  const random = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  for (let block = 0; block < seconds * 100; block++) {
    owed += BLOCK * (1 + ppm * 1e-6)
    const early = jitter > 0 ? Math.round((random() * 2 - 1) * jitter * BLOCK) : 0
    const frames = Math.max(0, Math.floor(owed) + early)
    meter.addSlave(frames)
    owed -= frames
    const report = meter.addMaster(BLOCK)
    if (report) reports.push(report)
  }
  return reports
}

describe('DriftMeter', () => {
  it('reports once per window, the first one as the baseline', () => {
    const reports = run(0, 180)
    expect(reports.map((r) => Math.round(r.elapsedS))).toEqual([60, 120, 180])
    expect(reports[0]).toEqual({ elapsedS: 60, driftMs: 0, ppm: null })
  })

  it('finds a slave 150 ppm fast', () => {
    const last = run(150, 180).at(-1)!
    expect(last.ppm).toBeCloseTo(150, 0)
    // 150 ppm over the 120 s between the first and the last window centre.
    expect(last.driftMs).toBeCloseTo(18, 0)
  })

  it('finds a slave running slow as negative', () => {
    expect(run(-40, 180).at(-1)!.ppm).toBeCloseTo(-40, 0)
  })

  it('is not thrown off by blocks arriving a block early or late', () => {
    const last = run(150, 600, 1).at(-1)!
    expect(Math.abs(last.ppm! - 150)).toBeLessThan(5)
  })
})
