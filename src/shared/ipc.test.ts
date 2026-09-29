import { describe, expect, it } from 'vitest'
import {
  EVENT_CHANNELS,
  INVOKE_CHANNELS,
  isEventChannel,
  isInvokeChannel,
  type AllEventChannelsListed,
  type AllInvokeChannelsListed
} from '@shared/ipc'

describe('ipc contract', () => {
  it('whitelists every channel of both maps', () => {
    // These only typecheck while the whitelists cover the maps.
    const invokeComplete: AllInvokeChannelsListed = true
    const eventComplete: AllEventChannelsListed = true
    expect([invokeComplete, eventComplete]).toEqual([true, true])
  })

  it('has no duplicate channels', () => {
    const all = [...INVOKE_CHANNELS, ...EVENT_CHANNELS]
    expect(new Set(all).size).toBe(all.length)
  })

  it('rejects channels outside the whitelist', () => {
    expect(isInvokeChannel('app:info')).toBe(true)
    expect(isInvokeChannel('fs:readFile')).toBe(false)
    expect(isEventChannel('meter:frame')).toBe(true)
    expect(isEventChannel('app:info')).toBe(false)
  })
})
