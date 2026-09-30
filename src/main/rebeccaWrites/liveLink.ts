/**
 * The live transcription in RebeccaWrites, wired to the real pieces (task 46):
 * the checkbox in the settings, the exe found on this machine, the growing PCM
 * file and the `--live-start` / `--live-end` launches.
 *
 * Nothing that goes wrong here stops the recording: it is reported as a
 * warning and the recording carries on without the live side.
 */

import { tmpdir } from 'os'
import { LiveFeed } from '../audio/live/LiveFeed'
import type { LiveLink, LiveRecording, LiveSink } from '../audio/live/LiveLink'
import { settings } from '../settings'
import { launchRebeccaWrites } from './launch'
import { liveEndArgs, liveName, livePcmPath, liveStartArgs } from './liveArgs'
import { locateRebeccaWrites } from './locate'

export interface LiveLinkDeps {
  /** Shown in the StatusBar and logged. */
  warn: (message: string) => void
  info: (message: string) => void
}

const NOT_FOUND = 'RebeccaWrites not found: recording without live transcription.'

export function createRebeccaWritesLink({ warn, info }: LiveLinkDeps): LiveLink {
  const report =
    (what: string) =>
    (error: Error): void =>
      warn(`${what}: ${error.message}`)

  async function start(recording: LiveRecording): Promise<LiveSink | null> {
    if (!settings.get().transcription.linkRebeccaWrites) return null
    const exe = await locateRebeccaWrites()
    if (!exe) {
      warn(NOT_FOUND)
      return null
    }

    let feed: LiveFeed
    try {
      feed = await LiveFeed.open({
        path: livePcmPath(tmpdir(), recording.startedAt),
        sampleRate: recording.sampleRate,
        channels: recording.channels,
        onError: report('Live transcription stopped')
      })
    } catch (error) {
      report('Could not start the live transcription')(error as Error)
      return null
    }

    try {
      await launchRebeccaWrites(exe, liveStartArgs(feed.path, liveName(recording.path)))
    } catch (error) {
      report('Could not open RebeccaWrites')(error as Error)
      await feed.discard().catch(() => undefined)
      return null
    }
    info(`live transcription: ${feed.path} -> ${exe}`)

    return {
      write: (samples) => feed.write(samples),
      end: async (finalPath) => {
        await feed.close().catch(report('Could not finish the live audio'))
        await launchRebeccaWrites(exe, liveEndArgs(feed.path, finalPath)).catch(
          report('Could not tell RebeccaWrites the recording ended')
        )
      }
    }
  }

  return { start }
}
