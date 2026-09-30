import { describe, expect, it } from 'vitest'
import { updateAction } from './updateAction'

describe('updateAction', () => {
  it('offers to check when idle, up to date or after an error', () => {
    expect(updateAction({ state: 'idle' }).step).toBe('check')
    expect(updateAction({ state: 'upToDate' }).step).toBe('check')
    expect(updateAction({ state: 'error', message: 'No internet connection' })).toMatchObject({
      step: 'check',
      title: 'No internet connection'
    })
  })

  it('walks download then install', () => {
    expect(updateAction({ state: 'available', version: '1.1.0' })).toMatchObject({
      label: 'Update to 1.1.0',
      step: 'download'
    })
    expect(updateAction({ state: 'ready', version: '1.1.0' }).step).toBe('install')
  })

  it('does nothing while busy', () => {
    expect(updateAction({ state: 'checking' }).step).toBeNull()
    expect(updateAction({ state: 'downloading', version: '1.1.0', percent: 40 })).toMatchObject({
      label: 'Downloading 40%',
      step: null
    })
  })
})
