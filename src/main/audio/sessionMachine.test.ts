import { describe, expect, it } from 'vitest'
import type { SessionState } from '@shared/types'
import { deviceLostNotice, pauseToggle, transition, type SessionEvent } from './sessionMachine'

const STATES: SessionState[] = ['idle', 'recording', 'paused']

describe('transition', () => {
  it('records from idle', () => {
    expect(transition('idle', { type: 'RECORD' })).toEqual({
      state: 'recording',
      effects: [{ type: 'openFile' }],
      valid: true
    })
  })

  it('pauses and resumes', () => {
    expect(transition('recording', { type: 'PAUSE' })).toMatchObject({
      state: 'paused',
      effects: [{ type: 'pauseFile' }]
    })
    expect(transition('paused', { type: 'RESUME' })).toMatchObject({
      state: 'recording',
      effects: [{ type: 'resumeFile' }]
    })
  })

  it.each<[SessionState, SessionEvent]>([
    ['recording', { type: 'RECORD' }],
    ['paused', { type: 'RECORD' }],
    ['idle', { type: 'PAUSE' }],
    ['paused', { type: 'PAUSE' }],
    ['idle', { type: 'RESUME' }],
    ['recording', { type: 'RESUME' }],
    ['idle', { type: 'DEVICE_LOST', reason: 'gone' }],
    ['idle', { type: 'FAILED', message: 'broken' }]
  ])('ignores an invalid event: %s + %o', (state, event) => {
    expect(transition(state, event)).toEqual({ state, effects: [], valid: false })
  })

  it('stops from any state, closing the file only when there is one', () => {
    for (const state of STATES) {
      const next = transition(state, { type: 'STOP' })
      expect(next.state).toBe('idle')
      expect(next.valid).toBe(true)
      expect(next.effects).toEqual(state === 'idle' ? [] : [{ type: 'closeFile' }])
    }
  })

  it('saves the file and warns when the device is lost', () => {
    for (const state of ['recording', 'paused'] as const) {
      expect(transition(state, { type: 'DEVICE_LOST', reason: 'unplugged' })).toEqual({
        state: 'idle',
        effects: [{ type: 'closeFile', notice: deviceLostNotice('unplugged') }],
        valid: true
      })
    }
  })

  it('aborts the file when it fails', () => {
    expect(transition('recording', { type: 'FAILED', message: 'ffmpeg died' })).toEqual({
      state: 'idle',
      effects: [{ type: 'abortFile', message: 'ffmpeg died' }],
      valid: true
    })
  })
})

describe('pauseToggle', () => {
  it('pauses while recording and resumes while paused', () => {
    expect(pauseToggle('recording')).toEqual({ type: 'PAUSE' })
    expect(pauseToggle('paused')).toEqual({ type: 'RESUME' })
  })
})
