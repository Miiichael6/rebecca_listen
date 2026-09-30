import { describe, expect, it } from 'vitest'
import { updateAction } from './updateAction'

describe('updateAction', () => {
  it('hides the button when there is no newer version', () => {
    expect(updateAction({ state: 'idle' })).toBeNull()
    expect(updateAction({ state: 'checking' })).toBeNull()
    expect(updateAction({ state: 'upToDate' })).toBeNull()
    expect(updateAction({ state: 'error', message: 'No internet connection' })).toBeNull()
  })

  it('walks download then install', () => {
    expect(updateAction({ state: 'available', version: '1.1.0' })).toMatchObject({
      label: 'Update to 1.1.0',
      step: 'download'
    })
    expect(updateAction({ state: 'ready', version: '1.1.0' })?.step).toBe('install')
  })

  it('does nothing while downloading', () => {
    expect(updateAction({ state: 'downloading', version: '1.1.0', percent: 40 })).toMatchObject({
      label: 'Downloading 40%',
      step: null
    })
  })
})
