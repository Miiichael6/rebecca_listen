import { describe, expect, it, vi } from 'vitest'
import type { AudioDevice } from '@shared/types'
import type { AudioStream } from './engine/AudioEngine'
import { openMixedStream } from './mixedStream'

const RATE = 48_000
const CHANNELS = 2
const BLOCK_FRAMES = 480

function device(kind: AudioDevice['kind']): AudioDevice {
  const id = kind === 'render' ? 'speakers' : 'mic'
  return {
    id,
    name: id,
    groupName: id,
    kind,
    isDefault: true,
    channels: CHANNELS,
    sampleRate: RATE
  }
}

class FakeStream implements AudioStream {
  readonly sampleRate = RATE
  readonly channels = CHANNELS
  stopped = false
  private data: (samples: Float32Array) => void = () => {}
  private error: (reason: string) => void = () => {}
  onData(listener: (samples: Float32Array) => void): void {
    this.data = listener
  }
  onError(listener: (reason: string) => void): void {
    this.error = listener
  }
  async stop(): Promise<void> {
    this.stopped = true
  }
  deliver(): void {
    this.data(new Float32Array(BLOCK_FRAMES * CHANNELS).fill(0.1))
  }
  fail(reason: string): void {
    this.error(reason)
  }
}

interface Harness {
  system: FakeStream
  voice: FakeStream
  stream: AudioStream
  framesOut: () => number
  tick: (ms: number) => void
}

async function setup(): Promise<Harness> {
  let clock = 0
  const system = new FakeStream()
  const voice = new FakeStream()
  const stream = await openMixedStream(device('render'), device('capture'), {
    openStream: async (d) => {
      return d.kind === 'render' ? system : voice
    },
    log: { info: () => {}, warn: () => {} },
    now: () => clock
  })
  let frames = 0
  stream.onData((samples) => (frames += samples.length / CHANNELS))
  const tick = (ms: number): void => {
    clock += ms
  }
  return { system, voice, stream, framesOut: () => frames, tick }
}

describe('openMixedStream', () => {
  it('goes at the pace of the loopback while it plays', async () => {
    const { system, voice, framesOut, tick } = await setup()
    for (let block = 0; block < 100; block++) {
      tick(10)
      voice.deliver()
      system.deliver()
    }
    expect(framesOut()).toBe(100 * BLOCK_FRAMES)
  })

  it('keeps the mix going on the wall clock while the loopback is silent', async () => {
    const { voice, framesOut, tick } = await setup()
    for (let block = 0; block < 300; block++) {
      tick(10)
      voice.deliver()
    }
    // 3 s of wall clock, give or take the last block before the gap is noticed.
    expect(framesOut()).toBeGreaterThan(RATE * 3 - 2 * BLOCK_FRAMES)
    expect(framesOut()).toBeLessThanOrEqual(RATE * 3)
  })

  it('ends, closing the other device, when either one is lost', async () => {
    const { system, voice, stream } = await setup()
    const lost = vi.fn()
    stream.onError(lost)
    voice.fail('device_lost')
    system.fail('device_lost')
    expect(lost).toHaveBeenCalledOnce()
    expect(lost).toHaveBeenCalledWith('device_lost')
    expect(system.stopped).toBe(true)
  })

  it('closes the loopback again when the microphone cannot be opened', async () => {
    const system = new FakeStream()
    await expect(
      openMixedStream(device('render'), device('capture'), {
        openStream: async (d) => {
          if (d.kind === 'render') return system
          throw new Error('mic busy')
        },
        log: { info: () => {}, warn: () => {} }
      })
    ).rejects.toThrow('mic busy')
    expect(system.stopped).toBe(true)
  })
})
