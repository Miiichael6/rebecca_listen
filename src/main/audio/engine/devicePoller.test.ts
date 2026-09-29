import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AudioDevice } from '@shared/types'
import { DevicePoller } from './devicePoller'

const INTERVAL_MS = 2000

function device(id: string): AudioDevice {
  return {
    id,
    name: id,
    groupName: id,
    kind: 'render',
    isDefault: false,
    channels: 2,
    sampleRate: 48000
  }
}

/** A poller whose answers come from `lists`, one per check (the last one repeats). */
function setup(lists: Array<AudioDevice[] | Error>): {
  poller: DevicePoller
  changes: string[][]
  failures: Error[]
} {
  let call = 0
  const list = async (): Promise<AudioDevice[]> => {
    const answer = lists[Math.min(call, lists.length - 1)]
    call += 1
    if (answer instanceof Error) throw answer
    return answer
  }
  const changes: string[][] = []
  const failures: Error[] = []
  const poller = new DevicePoller(list, INTERVAL_MS, (error) => failures.push(error))
  poller.onChange((devices) => changes.push(devices.map((d) => d.id)))
  return { poller, changes, failures }
}

describe('DevicePoller', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('takes the first list as the baseline and reports only real changes', async () => {
    const a = device('a')
    const b = device('b')
    const { poller, changes } = setup([[a], [a], [a, b], [a, b]])
    poller.start()
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3)
    expect(changes).toEqual([['a', 'b']])
    poller.stop()
  })

  it('does not check while stopped and catches up when started again', async () => {
    const a = device('a')
    const { poller, changes } = setup([[a], []])
    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    poller.stop()
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 5)
    expect(changes).toEqual([])
    poller.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(changes).toEqual([[]])
    poller.stop()
  })

  it('reports a run of failures once', async () => {
    const { poller, failures } = setup([[], new Error('gone'), new Error('gone'), []])
    poller.start()
    await vi.advanceTimersByTimeAsync(INTERVAL_MS * 3)
    expect(failures).toHaveLength(1)
    poller.stop()
  })
})
