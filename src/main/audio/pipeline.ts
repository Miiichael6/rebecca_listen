/**
 * The processing chain of spec §2.1 for one stream:
 * `stream → gain → meter → waveform`. Blocks go through `push()` as they
 * arrive; `tick()` is called `METER_FPS` times per second and hands out one
 * meter frame and one waveform frame.
 *
 * While recording, the gained samples also go to the sink (`setSink`), so the
 * file hears the Level slider. The resampler (task 15) and the mixer (task 16)
 * plug in at the marked point, before the gain.
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
  private sink: ((samples: Float32Array) => void) | null = null

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

  /** Where the gained samples go besides the meter; `null` stops sending them. */
  setSink(sink: ((samples: Float32Array) => void) | null): void {
    this.sink = sink
  }

  push(samples: Float32Array): void {
    // Resampler (15) and mixer (16) go here, before the gain.
    const gained = this.gain.process(samples, this.channels)
    this.sink?.(gained)
    this.meter.add(gained)
    this.wave.add(gained)
  }

  tick(): void {
    this.output.meter(this.meter.take())
    this.output.wave(this.wave.take())
  }
}
