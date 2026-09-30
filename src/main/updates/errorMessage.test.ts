import { describe, expect, it } from 'vitest'
import { updateErrorMessage } from './errorMessage'

describe('updateErrorMessage', () => {
  it('reports a missing connection', () => {
    expect(updateErrorMessage(Object.assign(new Error('x'), { code: 'ENOTFOUND' }))).toBe(
      'No internet connection'
    )
    expect(updateErrorMessage(new Error('net::ERR_INTERNET_DISCONNECTED'))).toBe(
      'No internet connection'
    )
  })

  it('reports a full disk', () => {
    expect(updateErrorMessage(Object.assign(new Error('x'), { code: 'ENOSPC' }))).toMatch(/disk/)
  })

  it('falls back to a generic message', () => {
    expect(updateErrorMessage(new Error('404'))).toBe('The update could not be completed')
    expect(updateErrorMessage(undefined)).toBe('The update could not be completed')
  })
})
