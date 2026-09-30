import { describe, expect, it } from 'vitest'
import { buildNamedBase, expandPattern, usesCounter, validatePattern, validatePrefix } from './naming'

const now = new Date(2026, 0, 5, 7, 3, 9)

describe('expandPattern', () => {
  it('fills every token and pads the counter to three digits', () => {
    expect(expandPattern('{YYYY}{MM}{DD}_{hh}{mm}{ss}', now)).toBe('20260105_070309')
    expect(expandPattern('Recording_{n}', now, 12)).toBe('Recording_012')
  })

  it('leaves unknown tokens as they are', () => {
    expect(expandPattern('{source} {hh}', now)).toBe('{source} 07')
  })
})

describe('buildNamedBase', () => {
  it('puts the prefix before the convention', () => {
    const files = { prefix: 'Class ', template: 'time' as const, customPattern: '' }
    expect(buildNamedBase(files, now)).toBe('Class [07-03-09]')
  })
})

describe('usesCounter', () => {
  it('spots the {n} token', () => {
    expect(usesCounter('Recording_{n}')).toBe(true)
    expect(usesCounter('{hh}-{mm}')).toBe(false)
  })
})

describe('validatePrefix', () => {
  it('accepts an empty or plain prefix', () => {
    expect(validatePrefix('')).toBeNull()
    expect(validatePrefix('Meeting - ')).toBeNull()
  })

  it('refuses characters and names Windows does not allow', () => {
    for (const bad of ['a<b', 'a:b', 'a/b', 'a\\b', 'a|b', 'a?b', 'a*b', 'a"b']) {
      expect(validatePrefix(bad)).not.toBeNull()
    }
    expect(validatePrefix('CON')).not.toBeNull()
    expect(validatePrefix('lpt1')).not.toBeNull()
    expect(validatePrefix('CONTENT')).toBeNull()
  })
})

describe('validatePattern', () => {
  it('needs something to name the file with', () => {
    expect(validatePattern('')).not.toBeNull()
    expect(validatePattern('{hh}.{mm}')).toBeNull()
  })
})
