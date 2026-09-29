import { describe, expect, it, vi } from 'vitest'
import type { AudioDevice, HistoryItem, Notice } from '@shared/types'
import type { CaptureTap } from './capture'
import { sine } from './dsp/testSignals'
import type { Encoder, FinalFile, OutputSettings, PcmFormat } from './encoder/Encoder'
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
  closed = false
  aborted = false
  private input: PcmFormat = { sampleRate: RATE, channels: CHANNELS }
  private error: (error: Error) => void = () => {}

  async open(_path: string, input: PcmFormat): Promise<void> {
    this.input = input
  }
  async write(samples: Float32Array): Promise<void> {
    this.frames += samples.length / this.input.channels
  }
  async close(): Promise<FinalFile> {
    this.closed = true
    return { path: PATH, format: 'mp3', sizeBytes: 1234, durationMs: this.durationMs }
  }
  async abort(): Promise<void> {
    this.aborted = true
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
  encoder: FakeEncoder
  history: HistoryItem[]
  notices: Notice[]
  released: ReturnType<typeof vi.fn>
  play: (seconds: number) => void
  wait: (ms: number) => void
  lose: (reason: string) => void
}

/** A capture that plays whatever the test pushes, on a clock the test moves. */
function setup(kind: AudioDevice['kind'] = 'capture', openError?: Error): Harness {
  let clock = 0
  let data: (samples: Float32Array) => void = () => {}
  let lost: (reason: string) => void = () => {}
  const released = vi.fn()
  const encoder = new FakeEncoder()
  const history: HistoryItem[] = []
  const notices: Notice[] = []

  const tap: CaptureTap = {
    device: device(kind),
    source: { mode: kind === 'render' ? 'system' : 'voice' },
    fellBack: false,
    sampleRate: RATE,
    channels: CHANNELS,
    onData: (listener) => (data = listener),
    onLost: (listener) => (lost = listener),
    release: released
  }
  const session = new RecordingSession({
    capture: { acquire: async () => tap },
    createEncoder: () => encoder,
    nextFile: () => {
      if (openError) throw openError
      return { path: PATH, output: OUTPUT }
    },
    addToHistory: (item) => history.push(item),
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

  return { session, encoder, history, notices, released, play, wait, lose: (r: string) => lost(r) }
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

  it('aborts and keeps the .part when the encoder dies', async () => {
    const { session, encoder, history, notices, play } = setup()
    await session.record()
    play(1)
    encoder.die('ffmpeg stopped while recording')
    await vi.waitFor(() => expect(session.snapshot().state).toBe('idle'))

    expect(encoder.aborted).toBe(true)
    expect(history).toHaveLength(0)
    expect(notices).toEqual([{ level: 'error', message: 'ffmpeg stopped while recording' }])
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
