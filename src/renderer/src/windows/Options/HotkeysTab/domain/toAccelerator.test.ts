import { describe, expect, it } from 'vitest'
import { isClearPress, isModifierPress, toAccelerator, type KeyPress } from './toAccelerator'

const press = (code: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...modifiers
})

describe('toAccelerator', () => {
  it('waits while only modifiers are held', () => {
    expect(toAccelerator(press('ControlLeft', { ctrlKey: true }))).toBeNull()
    expect(toAccelerator(press('AltLeft', { altKey: true, ctrlKey: true }))).toBeNull()
    expect(toAccelerator(press('ShiftRight', { shiftKey: true }))).toBeNull()
    expect(toAccelerator(press('MetaLeft', { metaKey: true }))).toBeNull()
  })

  it('writes the modifiers in a fixed order before the key', () => {
    expect(toAccelerator(press('KeyR', { ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+R')
    expect(
      toAccelerator(press('KeyS', { metaKey: true, shiftKey: true, ctrlKey: true, altKey: true }))
    ).toBe('Ctrl+Alt+Shift+Super+S')
  })

  it('takes F-keys with or without modifiers', () => {
    expect(toAccelerator(press('F9'))).toBe('F9')
    expect(toAccelerator(press('F12', { shiftKey: true }))).toBe('Shift+F12')
    expect(toAccelerator(press('F24'))).toBe('F24')
  })

  it('reads number keys by position, so Shift does not turn 1 into !', () => {
    expect(toAccelerator(press('Digit1', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+1')
    expect(toAccelerator(press('Numpad5', { altKey: true }))).toBe('Alt+num5')
  })

  it('refuses a bare key or Shift plus a key outside the F-keys', () => {
    expect(toAccelerator(press('KeyR'))).toBeNull()
    expect(toAccelerator(press('KeyR', { shiftKey: true }))).toBeNull()
    expect(toAccelerator(press('Digit7'))).toBeNull()
  })

  it('stores AltGr as the Ctrl+Alt Windows reports for it', () => {
    // AltGr+Q on a Spanish layout types "@": the browser sees Ctrl and Alt down.
    expect(toAccelerator(press('KeyQ', { ctrlKey: true, altKey: true }))).toBe('Ctrl+Alt+Q')
    expect(toAccelerator(press('AltRight', { ctrlKey: true, altKey: true }))).toBeNull()
  })

  it('names punctuation, arrows and the numeric pad operators', () => {
    expect(toAccelerator(press('ArrowUp', { ctrlKey: true }))).toBe('Ctrl+Up')
    expect(toAccelerator(press('Minus', { ctrlKey: true }))).toBe('Ctrl+-')
    expect(toAccelerator(press('NumpadAdd', { altKey: true }))).toBe('Alt+numadd')
    expect(toAccelerator(press('Space', { ctrlKey: true }))).toBe('Ctrl+Space')
  })

  it('ignores keys it cannot register', () => {
    expect(toAccelerator(press('CapsLock', { ctrlKey: true }))).toBeNull()
    expect(toAccelerator(press('ContextMenu', { ctrlKey: true }))).toBeNull()
  })
})

describe('isClearPress', () => {
  it('clears with a bare Backspace or Delete only', () => {
    expect(isClearPress(press('Backspace'))).toBe(true)
    expect(isClearPress(press('Delete'))).toBe(true)
    expect(isClearPress(press('Delete', { ctrlKey: true }))).toBe(false)
    expect(isClearPress(press('KeyD'))).toBe(false)
  })
})

describe('isModifierPress', () => {
  it('tells a lone modifier from a key', () => {
    expect(isModifierPress(press('ControlRight', { ctrlKey: true }))).toBe(true)
    expect(isModifierPress(press('MetaLeft', { metaKey: true }))).toBe(true)
    expect(isModifierPress(press('KeyR', { ctrlKey: true }))).toBe(false)
  })
})
