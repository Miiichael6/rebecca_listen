/**
 * "Computer Sounds & Voice" as one `AudioStream`: opens the loopback and the
 * microphone and hands out their mix (see `mixer.ts`) at the loopback's rate
 * and channels, so the monitor and the recording treat it like any other
 * stream. Losing either device ends it, and the other one is closed.
 *
 * The loopback is the clock of the mix, but WASAPI sends nothing for it while
 * the computer is silent. The microphone keeps coming, so when the loopback
 * has been quiet for `LOOPBACK_GAP_MS` each microphone block brings the
 * loopback up to the wall clock with silence (`silence.ts`). The mix is thus
 * continuous, and the session does not fill its gaps.
 */

import { LOOPBACK_GAP_MS, MIX_SYSTEM_GAIN_DB, MIX_VOICE_GAIN_DB } from '@shared/defaults'
import type { AudioDevice } from '@shared/types'
import { dbToLinear } from './dsp/gain'
import type { AudioStream } from './engine/AudioEngine'
import { Mixer, type MixReport } from './mixer'
import { addSilence, silenceBefore, startTimeline } from './silence'

export interface MixedStreamDeps {
  openStream: (device: AudioDevice) => Promise<AudioStream>
  log: { info: (message: string) => void; warn: (message: string) => void }
  now?: () => number
}

export function formatMixReport({
  elapsedS,
  driftMs,
  ppm,
  fifoMs,
  underruns,
  overruns
}: MixReport): string {
  const rate = ppm === null ? 'baseline' : `${ppm.toFixed(1)} ppm`
  return (
    `mix drift at ${Math.round(elapsedS)} s: ${driftMs.toFixed(2)} ms (${rate}), ` +
    `mic queue ${fifoMs.toFixed(1)} ms, ${underruns} underruns, ${overruns} overruns`
  )
}

/** Opens `voice` after `system`; if it fails, `system` is closed again. */
async function openBoth(
  system: AudioDevice,
  voice: AudioDevice,
  openStream: MixedStreamDeps['openStream']
): Promise<[AudioStream, AudioStream]> {
  const master = await openStream(system)
  try {
    return [master, await openStream(voice)]
  } catch (error) {
    await master.stop().catch(() => {})
    throw error
  }
}

export async function openMixedStream(
  system: AudioDevice,
  voice: AudioDevice,
  { openStream, log, now = Date.now }: MixedStreamDeps
): Promise<AudioStream> {
  const [master, slave] = await openBoth(system, voice, openStream)
  const mixer = new Mixer({
    master: { sampleRate: master.sampleRate, channels: master.channels },
    slave: { sampleRate: slave.sampleRate, channels: slave.channels },
    masterGain: dbToLinear(MIX_SYSTEM_GAIN_DB),
    slaveGain: dbToLinear(MIX_VOICE_GAIN_DB)
  })
  mixer.onReport((report) => {
    const message = formatMixReport(report)
    if (report.underruns > 0 || report.overruns > 0) log.warn(message)
    else log.info(message)
  })

  const timeline = startTimeline(master.sampleRate, now())
  let data: (samples: Float32Array) => void = () => {}
  let error: (reason: string) => void = () => {}
  let ended = false

  const fillSilence = (arrival: number, incomingFrames: number): void => {
    const frames = silenceBefore(timeline, arrival, incomingFrames)
    if (frames <= 0) return
    data(mixer.pushMaster(new Float32Array(frames * master.channels)))
    addSilence(timeline, frames)
  }

  master.onData((samples) => {
    if (ended) return
    const frames = samples.length / master.channels
    const arrival = now()
    fillSilence(arrival, frames)
    data(mixer.pushMaster(samples))
    timeline.framesWritten += frames
    timeline.lastArrivalMs = arrival
  })
  slave.onData((samples) => {
    if (ended) return
    mixer.pushSlave(samples)
    const arrival = now()
    if (arrival - timeline.lastArrivalMs >= LOOPBACK_GAP_MS) fillSilence(arrival, 0)
  })

  const endBecause = (other: AudioStream) => (reason: string) => {
    if (ended) return
    ended = true
    void other.stop().catch(() => {})
    error(reason)
  }
  master.onError(endBecause(slave))
  slave.onError(endBecause(master))

  return {
    sampleRate: master.sampleRate,
    channels: master.channels,
    onData: (listener) => {
      data = listener
    },
    onError: (listener) => {
      error = listener
    },
    stop: async () => {
      ended = true
      await Promise.all([master.stop(), slave.stop()])
    }
  }
}
