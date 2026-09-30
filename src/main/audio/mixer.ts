/**
 * "Computer Sounds & Voice" (spec §2.1, §4.1): the loopback and the
 * microphone added into one stream. The loopback is the master clock: every
 * block of it takes the same number of frames of microphone and goes out
 * mixed. The microphone is brought to the loopback's rate and channels and
 * waits in a FIFO in between.
 *
 * A FIFO that runs dry is filled with zeros; one that runs over drops its
 * oldest frames. Either way it goes back to `MIX_FIFO_TARGET_MS`, and both are
 * counted for the report the drift meter makes every `DRIFT_REPORT_S`.
 *
 * Pure logic: `mixedStream.ts` wires it to the two real streams.
 */

import { DRIFT_REPORT_S, MIX_FIFO_MAX_MS, MIX_FIFO_TARGET_MS } from '@shared/defaults'
import { remapChannels } from './dsp/channelMap'
import { DriftMeter, type DriftReport } from './dsp/driftMeter'
import { SampleFifo } from './dsp/fifo'
import { softLimitInPlace } from './dsp/limiter'
import { Resampler } from './dsp/resampler'

const MS_PER_S = 1000

export interface StreamFormat {
  sampleRate: number
  channels: number
}

export interface MixerOptions {
  master: StreamFormat
  slave: StreamFormat
  /** Linear gain of each source (1 = unchanged). */
  masterGain: number
  slaveGain: number
}

export interface MixReport extends DriftReport {
  /** Average microphone waiting in the FIFO over the window, in ms. */
  fifoMs: number
  /** Times the FIFO ran dry / over during the window. */
  underruns: number
  overruns: number
}

export class Mixer {
  private readonly master: StreamFormat
  private readonly slave: StreamFormat
  private readonly masterGain: number
  private readonly slaveGain: number
  private readonly resampler: Resampler
  private readonly fifo: SampleFifo
  private readonly drift: DriftMeter
  private readonly targetFrames: number
  private scratch = new Float32Array(0)
  /** No microphone yet: the mix is the loopback alone and nothing counts as a dry FIFO. */
  private primed = false
  private window = { fifoFramesSum: 0, blocks: 0, underruns: 0, overruns: 0 }
  private report: (report: MixReport) => void = () => {}

  constructor({ master, slave, masterGain, slaveGain }: MixerOptions) {
    this.master = master
    this.slave = slave
    this.masterGain = masterGain
    this.slaveGain = slaveGain
    this.resampler = new Resampler({
      inRate: slave.sampleRate,
      outRate: master.sampleRate,
      channels: slave.channels
    })
    this.targetFrames = this.msToFrames(MIX_FIFO_TARGET_MS)
    this.fifo = new SampleFifo(master.channels, this.msToFrames(MIX_FIFO_MAX_MS))
    this.drift = new DriftMeter(master.sampleRate, slave.sampleRate, DRIFT_REPORT_S)
  }

  /** Called with the drift and FIFO figures every `DRIFT_REPORT_S` of master audio. */
  onReport(listener: (report: MixReport) => void): void {
    this.report = listener
  }

  /** Nudges the microphone's resampling, to follow the drift (task 16, step 4). */
  setRatioAdjust(ppm: number): void {
    this.resampler.setRatioAdjust(ppm)
  }

  /** A block of microphone: converted and queued for the next master blocks. */
  pushSlave(samples: Float32Array): void {
    this.drift.addSlave(samples.length / this.slave.channels)
    const converted = remapChannels(
      this.resampler.process(samples),
      this.slave.channels,
      this.master.channels
    )
    if (!this.primed) {
      this.primed = true
      this.prefill()
    }
    if (this.fifo.write(converted) > 0) {
      this.window.overruns++
      this.fifo.discard(this.fifo.frames - this.targetFrames)
    }
  }

  /** A block of loopback: comes back mixed with as much microphone, same length. */
  pushMaster(samples: Float32Array): Float32Array {
    const frames = samples.length / this.master.channels
    const voice = this.takeSlave(samples.length)
    const out = new Float32Array(samples.length)
    for (let i = 0; i < out.length; i++) {
      out[i] = samples[i] * this.masterGain + voice[i] * this.slaveGain
    }
    softLimitInPlace(out)
    this.window.fifoFramesSum += this.fifo.frames
    this.window.blocks++
    const drift = this.drift.addMaster(frames)
    if (drift) this.closeWindow(drift)
    return out
  }

  /** The next `length` samples of microphone, zeros where there are none. */
  private takeSlave(length: number): Float32Array {
    if (this.scratch.length !== length) this.scratch = new Float32Array(length)
    const missing = this.fifo.read(this.scratch)
    if (missing > 0 && this.primed) {
      this.window.underruns++
      this.prefill()
    }
    return this.scratch
  }

  /** Silence ahead of the microphone up to the target, as a cushion against uneven blocks. */
  private prefill(): void {
    const frames = this.targetFrames - this.fifo.frames
    if (frames > 0) this.fifo.write(new Float32Array(frames * this.master.channels))
  }

  private closeWindow(drift: DriftReport): void {
    const { fifoFramesSum, blocks, underruns, overruns } = this.window
    this.window = { fifoFramesSum: 0, blocks: 0, underruns: 0, overruns: 0 }
    const fifoMs = ((fifoFramesSum / blocks) * MS_PER_S) / this.master.sampleRate
    this.report({ ...drift, fifoMs, underruns, overruns })
  }

  private msToFrames(ms: number): number {
    return Math.round((ms / MS_PER_S) * this.master.sampleRate)
  }
}
