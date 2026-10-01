import { describe, expect, it, vi } from 'vitest'
import type { AudioDevice, NewHistoryItem, Notice } from '@shared/types'
import type { OpenRecording } from '../files/partFiles'
import type { CaptureTap } from './capture'
import type { InputPlan } from './devices'
import { sine } from './dsp/testSignals'
import type { Encoder, FinalFile, OutputSettings, PcmFormat } from './encoder/Encoder'
import type { LiveLink, LiveRecording } from './live/LiveLink'
import { RecordingSession } from './session'

const RATE = 48_000
const CHANNELS = 2
const BLOCK_MS = 10
const PATH = 'C:/rec/test.mp3'
const OUTPUT: OutputSettings = {
  format: 'mp3',
  sampleRate: RATE,
  channels: CHANNELS,
  mode: 'cbr',
  bitrateKbps: 192,
  quality: 2
}

function device(kind: AudioDevice['kind']): AudioDevice {
  return {
    id: `fake-${kind}`,
    name: 'Fake',
    groupName: 'Test',
    kind,
    isDefault: true,
    channels: CHANNELS,
    sampleRate: RATE
  }
}

/** Counts what it is given and "writes" a file of exactly that length. */
class FakeEncoder implements Encoder {
  frames = 0
  path = ''
  closed = false
  aborted = false
  discarded = false
  private input: PcmFormat = { sampleRate: RATE, channels: CHANNELS }
  private error: (error: Error) => void = () => {}

  async open(path: string, input: PcmFormat): Promise<void> {
    this.path = path
    this.input = input
  }
  async write(samples: Float32Array): Promise<void> {
    this.frames += samples.length / this.input.channels
  }
  async close(): Promise<FinalFile> {
    this.closed = true
    return { path: this.path, format: 'mp3', sizeBytes: 1234, durationMs: this.durationMs }
  }
  async abort(): Promise<void> {
    this.aborted = true
  }
  async discard(): Promise<void> {
    this.discarded = true
  }
  onProgress(): void {
    // The session does not read the progress.
  }
  onError(listener: (error: Error) => void): void {
    this.error = listener
  }
  get durationMs(): number {
    return (this.frames / this.input.sampleRate) * 1000
  }
  die(message: string): void {
    this.error(new Error(message))
  }
}

interface Harness {
  session: RecordingSession
  /** The encoder of the first file. */
  encoder: FakeEncoder
  /** One per file, in the order they were opened. */
  encoders: FakeEncoder[]
  history: NewHistoryItem[]
  notices: Notice[]
  journal: Map<string, OpenRecording>
  released: ReturnType<typeof vi.fn>
  play: (seconds: number) => void
  wait: (ms: number) => void
  lose: (reason: string) => void
}

const MIXED: InputPlan = { kind: 'mixed', system: device('render'), voice: device('capture') }

/** A capture that plays whatever the test pushes, on a clock the test moves. */
function setup(
  kind: AudioDevice['kind'] | 'mixed' = 'capture',
  openError?: Error,
  live?: LiveLink
): Harness {
  let clock = 0
  let data: (samples: Float32Array) => void = () => {}
  let lost: (reason: string) => void = () => {}
  const released = vi.fn()
  // The first one exists before recording, so the tests can hold it from the start.
  const encoders = [new FakeEncoder()]
  let opened = 0
  const history: NewHistoryItem[] = []
  const notices: Notice[] = []
  const journal = new Map<string, OpenRecording>()

  const tap: CaptureTap = {
    input: kind === 'mixed' ? MIXED : { kind: 'single', device: device(kind) },
    source: { mode: kind === 'render' ? 'system' : kind === 'mixed' ? 'mixed' : 'voice' },
    fellBack: false,
    sampleRate: RATE,
    channels: CHANNELS,
    onData: (listener) => (data = listener),
    onLost: (listener) => (lost = listener),
    release: released
  }
  const session = new RecordingSession({
    capture: { acquire: async () => tap },
    createEncoder: () => {
      if (opened === encoders.length) encoders.push(new FakeEncoder())
      return encoders[opened++]
    },
    nextFile: () => {
      if (openError) throw openError
      // Asked before each encoder is created: the first file is PATH, the splits number on.
      const path = opened === 0 ? PATH : `C:/rec/test (${opened}).mp3`
      return { path, output: OUTPUT }
    },
    addToHistory: (item) => history.push(item),
    journal: {
      add: (recording) => journal.set(recording.path, recording),
      remove: (path) => journal.delete(path)
    },
    live,
    emit: { state: () => {}, notice: (notice) => notices.push(notice) },
    log: { info: () => {}, warn: () => {} },
    now: () => clock
  })

  /** Delivers `seconds` of a 440 Hz sine in 10 ms blocks, moving the clock along. */
  const play = (seconds: number): void => {
    const signal = sine(440, 0.5, seconds, RATE, CHANNELS)
    const blockSamples = (RATE * BLOCK_MS * CHANNELS) / 1000
    for (let at = 0; at < signal.length; at += blockSamples) {
      clock += BLOCK_MS
      data(signal.subarray(at, at + blockSamples))
    }
  }
  const wait = (ms: number): void => {
    clock += ms
  }

  return {
    session,
    encoder: encoders[0],
    encoders,
    history,
    notices,
    journal,
    released,
    play,
    wait,
    lose: (r: string) => lost(r)
  }
}

describe('RecordingSession', () => {
  it('writes 7 s of a 10 s sine with a 3 s pause, and the timer says 7 s', async () => {
    const { session, encoder, history, play } = setup()
    await session.record()
    play(4)
    expect((await session.togglePause()).state).toBe('paused')
    play(3)
    expect((await session.togglePause()).state).toBe('recording')
    play(3)

    expect(session.snapshot().elapsedMs).toBeCloseTo(7000, 6)
    const done = await session.stop()

    expect(done).toEqual({ state: 'idle', elapsedMs: 0, file: null })
    expect(encoder.durationMs).toBeCloseTo(7000, 6)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ path: PATH, format: 'mp3', source: { mode: 'voice' } })
    expect(history[0].durationMs).toBeCloseTo(7000, 6)
  })

  it('does not advance the timer while paused', async () => {
    const { session, play, wait } = setup()
    await session.record()
    play(1)
    await session.togglePause()
    wait(5000)
    play(2)
    expect(session.snapshot()).toMatchObject({ state: 'paused', file: { name: 'test.mp3' } })
    expect(session.snapshot().elapsedMs).toBeCloseTo(1000, 6)
    await session.stop()
  })

  it('never fills a pause of the loopback with silence', async () => {
    const { session, encoder, play, wait } = setup('render')
    await session.record()
    play(2)
    await session.togglePause()
    wait(5000)
    await session.togglePause()
    play(2)
    await session.stop()
    expect(encoder.durationMs).toBeCloseTo(4000, 6)
  })

  it('still fills the silence of the loopback while recording', async () => {
    const { session, encoder, play, wait } = setup('render')
    await session.record()
    play(1)
    wait(2000)
    play(1)
    await session.stop()
    expect(encoder.durationMs).toBeCloseTo(4000, 0)
  })

  it('leaves the gaps of a mix alone: the mixed stream fills them itself', async () => {
    const { session, encoder, play, wait } = setup('mixed')
    await session.record()
    play(1)
    wait(2000)
    play(1)
    await session.stop()
    expect(encoder.durationMs).toBeCloseTo(2000, 6)
  })

  it('saves the file and warns when the device is lost', async () => {
    const { session, encoder, history, notices, released, play, lose } = setup()
    await session.record()
    play(2)
    lose('unplugged')
    await vi.waitFor(() => expect(session.snapshot().state).toBe('idle'))

    expect(encoder.closed).toBe(true)
    expect(history).toHaveLength(1)
    expect(released).toHaveBeenCalledOnce()
    expect(notices).toEqual([{ level: 'warn', message: expect.stringContaining('unplugged') }])
  })

  it('goes back to idle, releasing the input, when the file cannot be opened', async () => {
    const { session, notices, released } = setup('capture', new Error('Cannot write in C:/x'))
    const snapshot = await session.record()

    expect(snapshot.state).toBe('idle')
    expect(released).toHaveBeenCalledOnce()
    expect(notices).toEqual([
      { level: 'error', message: 'Could not start recording: Cannot write in C:/x' }
    ])
  })

  it('remembers the file while it is written and forgets it once saved', async () => {
    const { session, journal, wait } = setup()
    wait(500)
    await session.record()
    expect([...journal.values()]).toEqual([
      { path: PATH, createdAt: 500, source: { mode: 'voice' } }
    ])
    await session.stop()
    expect(journal.size).toBe(0)
  })

  it('aborts and keeps the .part when the encoder dies', async () => {
    const { session, encoder, history, notices, journal, play } = setup()
    await session.record()
    play(1)
    encoder.die('ffmpeg stopped while recording')
    await vi.waitFor(() => expect(session.snapshot().state).toBe('idle'))

    expect(encoder.aborted).toBe(true)
    expect(history).toHaveLength(0)
    expect(notices).toEqual([{ level: 'error', message: 'ffmpeg stopped while recording' }])
    // Left for the recovery at the next start.
    expect(journal.has(PATH)).toBe(true)
  })

  it('ignores Record while already recording and Stop while idle', async () => {
    const { session, history } = setup()
    expect((await session.stop()).state).toBe('idle')
    await session.record()
    expect((await session.record()).state).toBe('recording')
    await session.stop()
    expect(history).toHaveLength(1)
  })
})

/** A live link that counts the frames it gets and how it ended. */
function fakeLive(fails = false): LiveLink & {
  started: LiveRecording[]
  frames: number
  ended: (string | null)[]
} {
  const live = {
    started: [] as LiveRecording[],
    frames: 0,
    ended: [] as (string | null)[],
    start: async (recording: LiveRecording) => {
      live.started.push(recording)
      if (fails) throw new Error('RebeccaWrites is gone')
      return {
        write: (samples: Float32Array) => {
          live.frames += samples.length / recording.channels
        },
        end: async (finalPath: string | null) => {
          live.ended.push(finalPath)
        }
      }
    }
  }
  return live
}

describe('RecordingSession · live transcription', () => {
  it('sends the live side exactly what the file gets, silence fills included and pauses left out', async () => {
    const live = fakeLive()
    const { session, encoder, play, wait } = setup('render', undefined, live)
    await session.record()
    play(1)
    wait(2000)
    play(1)
    await session.togglePause()
    play(3)
    await session.togglePause()
    play(1)
    await session.stop()

    expect(live.started).toEqual([
      { path: PATH, startedAt: expect.any(Number), sampleRate: RATE, channels: CHANNELS }
    ])
    expect(live.frames).toBe(encoder.frames)
    expect(live.ended).toEqual([PATH])
  })

  it('ends the live side without media when the recording is aborted', async () => {
    const live = fakeLive()
    const { session, encoder, play } = setup('capture', undefined, live)
    await session.record()
    play(1)
    encoder.die('ffmpeg stopped while recording')
    await vi.waitFor(() => expect(live.ended).toEqual([null]))
  })

  it('records as usual when the live side cannot start', async () => {
    const live = fakeLive(true)
    const { session, encoder, history, notices, play } = setup('capture', undefined, live)
    await session.record()
    play(2)
    await session.stop()
    expect(encoder.durationMs).toBeCloseTo(2000, 6)
    expect(history).toHaveLength(1)
    expect(notices).toEqual([])
  })
})

const SPLIT_PATH = 'C:/rec/test (1).mp3'
const framesOf = (seconds: number): number => seconds * RATE

describe('RecordingSession · split', () => {
  it('goes on in a new file at the next block, losing nothing, while the timer keeps counting', async () => {
    const { session, encoders, history, play } = setup()
    await session.record()
    play(2)
    expect((await session.split()).file?.path).toBe(PATH)
    play(3)

    expect(session.snapshot()).toMatchObject({ state: 'recording', file: { path: SPLIT_PATH } })
    expect(session.snapshot().elapsedMs).toBeCloseTo(5000, 6)
    await session.stop()

    expect(encoders.map((encoder) => encoder.frames)).toEqual([framesOf(2), framesOf(3)])
    expect(history.map((item) => item.path)).toEqual([PATH, SPLIT_PATH])
    expect(history.map((item) => Math.round(item.durationMs))).toEqual([2000, 3000])
  })

  it('cuts inside the next block at the frame given', async () => {
    const { session, encoders, play } = setup()
    await session.record()
    play(1)
    await session.split(100)
    play(1)
    await session.stop()
    expect(encoders.map((encoder) => encoder.frames)).toEqual([
      framesOf(1) + 100,
      framesOf(1) - 100
    ])
  })

  it('cuts at the pause when no block came in between', async () => {
    const { session, encoders, play } = setup()
    await session.record()
    play(1)
    await session.split()
    await session.togglePause()
    expect(session.snapshot().file?.path).toBe(SPLIT_PATH)
    await session.togglePause()
    play(2)
    await session.stop()
    expect(encoders.map((encoder) => encoder.frames)).toEqual([framesOf(1), framesOf(2)])
  })

  it('drops the next file when Stop comes before any block reached it', async () => {
    const { session, encoders, history, journal, play } = setup()
    await session.record()
    play(1)
    await session.split()
    await session.stop()
    expect(encoders[1].discarded).toBe(true)
    expect(history.map((item) => item.path)).toEqual([PATH])
    expect(journal.size).toBe(0)
  })

  it('only splits while recording', async () => {
    const { session, encoders, play } = setup()
    expect((await session.split()).state).toBe('idle')
    await session.record()
    play(1)
    await session.togglePause()
    await session.split()
    await session.stop()
    expect(encoders).toHaveLength(1)
  })

  it('gives each file its own live transcription', async () => {
    const live = fakeLive()
    const { session, encoders, play } = setup('capture', undefined, live)
    await session.record()
    play(1)
    await session.split()
    play(1)
    await session.stop()
    expect(live.started.map((recording) => recording.path)).toEqual([PATH, SPLIT_PATH])
    expect(live.ended).toEqual([PATH, SPLIT_PATH])
    expect(live.frames).toBe(encoders[0].frames + encoders[1].frames)
  })
})
