import { describe, expect, it } from 'vitest'
import { deferredLiveSink } from './deferredSink'
import type { LiveSink } from './LiveLink'

function recordingSink(): LiveSink & { blocks: number[][]; ended: (string | null)[] } {
  const blocks: number[][] = []
  const ended: (string | null)[] = []
  return {
    blocks,
    ended,
    write: (samples) => blocks.push([...samples]),
    end: async (finalPath) => {
      ended.push(finalPath)
    }
  }
}

function later<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

describe('deferredLiveSink', () => {
  it('keeps the blocks until the sink starts, then hands them over in order', async () => {
    const real = recordingSink()
    const starting = later<LiveSink | null>()
    const sink = deferredLiveSink(starting.promise)

    const reused = new Float32Array([1, 2])
    sink.write(reused)
    reused.set([9, 9])
    sink.write(new Float32Array([3]))
    starting.resolve(real)
    await starting.promise
    await Promise.resolve()
    sink.write(new Float32Array([4]))

    expect(real.blocks).toEqual([[1, 2], [3], [4]])
    await sink.end('C:\\Rec\\a.mp3')
    expect(real.ended).toEqual(['C:\\Rec\\a.mp3'])
  })

  it('ends even when it ended before the sink had started', async () => {
    const real = recordingSink()
    const starting = later<LiveSink | null>()
    const sink = deferredLiveSink(starting.promise)
    sink.write(new Float32Array([1]))
    const ending = sink.end(null)
    starting.resolve(real)
    await ending
    expect(real.blocks).toEqual([[1]])
    expect(real.ended).toEqual([null])
  })

  it('drops everything when there is no live transcription or it failed to start', async () => {
    for (const starting of [Promise.resolve(null), Promise.reject(new Error('no exe'))]) {
      const sink = deferredLiveSink(starting)
      sink.write(new Float32Array([1]))
      await expect(sink.end('C:\\Rec\\a.mp3')).resolves.toBeUndefined()
      sink.write(new Float32Array([2]))
    }
  })
})
