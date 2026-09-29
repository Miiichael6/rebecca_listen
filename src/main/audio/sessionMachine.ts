/**
 * The session state machine of spec §4.9, without `waiting` and `scheduled`
 * (VAS and Schedule are out of scope). Pure: a transition returns the next
 * state and the effects to run as data, and `session.ts` runs them.
 */

import type { SessionState } from '@shared/types'

export type SessionEvent =
  | { type: 'RECORD' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' }
  | { type: 'DEVICE_LOST'; reason: string }
  /** The file could not be opened, or the encoder died while recording. */
  | { type: 'FAILED'; message: string }

export type SessionEffect =
  | { type: 'openFile' }
  | { type: 'pauseFile' }
  | { type: 'resumeFile' }
  /** Finishes the file and lists it; `notice` tells the user why, when they did not ask. */
  | { type: 'closeFile'; notice?: string }
  /** Drops whatever is open, keeping the `.part`, and shows `message`. */
  | { type: 'abortFile'; message: string }

export interface Transition {
  state: SessionState
  effects: SessionEffect[]
  /** `false` when the event does not apply to the state: nothing changes. */
  valid: boolean
}

const ignored = (state: SessionState): Transition => ({ state, effects: [], valid: false })
const to = (state: SessionState, ...effects: SessionEffect[]): Transition => ({
  state,
  effects,
  valid: true
})

export function deviceLostNotice(reason: string): string {
  return `Recording stopped: the device is no longer available (${reason}). The file was saved.`
}

export function transition(state: SessionState, event: SessionEvent): Transition {
  const active = state !== 'idle'
  switch (event.type) {
    case 'RECORD':
      return state === 'idle' ? to('recording', { type: 'openFile' }) : ignored(state)
    case 'PAUSE':
      return state === 'recording' ? to('paused', { type: 'pauseFile' }) : ignored(state)
    case 'RESUME':
      return state === 'paused' ? to('recording', { type: 'resumeFile' }) : ignored(state)
    case 'STOP':
      // "any --stop--> idle": stopping while idle is not an error, it just does nothing.
      return active ? to('idle', { type: 'closeFile' }) : to('idle')
    case 'DEVICE_LOST':
      return active
        ? to('idle', { type: 'closeFile', notice: deviceLostNotice(event.reason) })
        : ignored(state)
    case 'FAILED':
      return active ? to('idle', { type: 'abortFile', message: event.message }) : ignored(state)
  }
}

/** The Pause button toggles (§4.8): pause while recording, resume while paused. */
export function pauseToggle(state: SessionState): SessionEvent {
  return state === 'paused' ? { type: 'RESUME' } : { type: 'PAUSE' }
}
