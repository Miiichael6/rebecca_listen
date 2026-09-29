import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: {} }))

const { parseRange } = await import('./mediaProtocol')

describe('parseRange', () => {
  it('reads an open-ended range', () => {
    expect(parseRange('bytes=100-', 1000)).toEqual([100, 999])
  })

  it('clamps the end to the file', () => {
    expect(parseRange('bytes=0-5000', 1000)).toEqual([0, 999])
  })

  it('reads a suffix range', () => {
    expect(parseRange('bytes=-200', 1000)).toEqual([800, 999])
  })

  it('ignores missing, malformed or unsatisfiable ranges', () => {
    expect(parseRange(null, 1000)).toBeNull()
    expect(parseRange('bytes=-', 1000)).toBeNull()
    expect(parseRange('items=0-1', 1000)).toBeNull()
    expect(parseRange('bytes=2000-', 1000)).toBeNull()
  })
})
