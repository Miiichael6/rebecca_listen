import { describe, expect, it } from 'vitest'
import { DRIFT_REPORT_S, MIX_FIFO_MAX_MS } from '@shared/defaults'
import { silence, sine } from './dsp/testSignals'
import { Mixer, type MixReport, type StreamFormat } from './mixer'

const BLOCK_MS = 10
const STEREO_48K: StreamFormat = { sampleRate: 48_000, channels: 2 }

function mixer(slave: StreamFormat = STEREO_48K): { mixer: Mixer; reports: MixReport[] } {
  const created = new Mixer({ master: STEREO_48K, slave, masterGain: 1, slaveGain: 1 })
  const reports: MixReport[] = []
  created.onReport((report) => reports.push(report))
  return { mixer: created, reports }
}

const masterBlock = silence(BLOCK_MS / 1000, STEREO_48K.sampleRate, STEREO_48K.channels)

/**
 * Plays `seconds` of 10 ms blocks: silence on the master, and a slave that
 * delivers `slaveRate × (1 + ppm)` frames per second of `slaveChannels`.
 */
function play(
  target: Mixer,
  seconds: number,
  { slaveRate = 48_000, slaveChannels = 2, ppm = 0 } = {}
): Float32Array[] {
  const out: Float32Array[] = []
  let owed = 0
  for (let block = 0; block < (seconds * 1000) / BLOCK_MS; block++) {
    owed += ((slaveRate * BLOCK_MS) / 1000) * (1 + ppm * 1e-6)
    const frames = Math.floor(owed)
    owed -= frames
    target.pushSlave(new Float32Array(frames * slaveChannels).fill(0.25))
    out.push(target.pushMaster(masterBlock))
  }
  return out
}

describe('Mixer', () => {
  it('measures a microphone running 150 ppm fast', () => {
    const { mixer: mix, reports } = mixer()
    play(mix, 3 * DRIFT_REPORT_S, { ppm: 150 })
    expect(reports).toHaveLength(3)
    expect(reports[0].ppm).toBeNull()
    expect(reports[2].ppm).toBeCloseTo(150, 0)
    // The queue grows with the drift instead of running dry.
    expect(reports[2].fifoMs).toBeGreaterThan(reports[0].fifoMs)
    expect(reports[2].underruns).toBe(0)
  })

  it('brings a mono 44.1 kHz microphone to the stereo 48 kHz of the loopback', () => {
    const { mixer: mix } = mixer({ sampleRate: 44_100, channels: 1 })
    const voice = sine(1000, 0.5, 1, 44_100, 1)
    const blockFrames = 441
    const out: Float32Array[] = []
    for (let at = 0; at < voice.length; at += blockFrames) {
      mix.pushSlave(voice.subarray(at, at + blockFrames))
      out.push(mix.pushMaster(masterBlock))
    }
    for (const block of out) expect(block.length).toBe(masterBlock.length)
    // Past the cushion, the voice is there, the same on both channels.
    const tail = out.at(-1)!
    expect(Math.max(...tail)).toBeGreaterThan(0.4)
    for (let i = 0; i < tail.length; i += 2) expect(tail[i]).toBeCloseTo(tail[i + 1], 6)
  })

  it('adds the two sources and keeps the sum inside full scale', () => {
    const { mixer: mix } = mixer()
    mix.pushSlave(new Float32Array(48_000).fill(0.9))
    const out = mix.pushMaster(new Float32Array(masterBlock.length).fill(0.9))
    expect(Math.max(...out)).toBeLessThanOrEqual(1)
    expect(Math.max(...out)).toBeGreaterThan(0.95)
  })

  it('fills with zeros, counts and goes on when the microphone stops', () => {
    const { mixer: mix, reports } = mixer()
    play(mix, 1)
    const out: Float32Array[] = []
    expect(() => {
      for (let block = 0; block < (DRIFT_REPORT_S * 1000) / BLOCK_MS; block++) {
        out.push(mix.pushMaster(masterBlock))
      }
    }).not.toThrow()
    expect(out.every((block) => block.length === masterBlock.length)).toBe(true)
    expect(out.at(-1)!.every((sample) => sample === 0)).toBe(true)
    expect(reports[0].underruns).toBeGreaterThan(0)
  })

  it('drops the oldest microphone and counts it when too much piles up', () => {
    const { mixer: mix, reports } = mixer()
    expect(() => {
      mix.pushSlave(new Float32Array(((48_000 * 2 * MIX_FIFO_MAX_MS) / 1000) * 3))
      play(mix, DRIFT_REPORT_S)
    }).not.toThrow()
    expect(reports[0].overruns).toBeGreaterThan(0)
    expect(reports[0].fifoMs).toBeLessThan(MIX_FIFO_MAX_MS)
  })
})
