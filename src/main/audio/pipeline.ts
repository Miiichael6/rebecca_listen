/**
 * The processing chain of spec §2.1 for one stream:
 * `stream → gain → meter → waveform`. Blocks go through `push()` as they
 * arrive; `tick()` is called `METER_FPS` times per second and hands out one
 * meter frame and one waveform frame.
 *
 * Later stages plug in at the marked points: the resampler (task 15) and the
 * mixer (task 16) before the gain, the encoder (task 13) after it.
 */

import { WAVE_COLUMNS_PER_FRAME } from '@shared/defaults'
import type { MeterFrame, WaveFrame } from '@shared/types'
import { GainStage, percentToLinear } from './dsp/gain'
import { MeterAccumulator } from './dsp/meter'
import { WaveformAccumulator } from './dsp/waveform'

export interface PipelineOutput {
  meter: (frame: MeterFrame) => void
  wave: (frame: WaveFrame) => void
}

export class Pipeline {
  private readonly gain: GainStage
  private readonly meter: MeterAccumulator
  private readonly wave: WaveformAccumulator

  constructor(
    private readonly channels: number,
    levelPercent: number,
    private readonly output: PipelineOutput
  ) {
    this.gain = new GainStage(percentToLinear(levelPercent))
    this.meter = new MeterAccumulator(channels)
    this.wave = new WaveformAccumulator(channels, WAVE_COLUMNS_PER_FRAME)
  }

  setLevel(percent: number): void {
    this.gain.set(percentToLinear(percent))
  }

  push(samples: Float32Array): void {
    // Resampler (15) and mixer (16) go here, before the gain.
    const gained = this.gain.process(samples, this.channels)
    // The encoder (13) takes `gained` here.
    this.meter.add(gained)
    this.wave.add(gained)
  }

  tick(): void {
    this.output.meter(this.meter.take())
    this.output.wave(this.wave.take())
  }
}
