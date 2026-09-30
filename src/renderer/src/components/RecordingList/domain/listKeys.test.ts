import { describe, expect, it } from 'vitest'
import type { KeyPress } from './listKeys'
import { baseName, commandOfKey, opensMenu } from './listKeys'

const press = (
  key: string,
  mods: { altKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean } = {}
): KeyPress => ({
  key,
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...mods
})

describe('commandOfKey', () => {
  it('maps the keys of the menu', () => {
    expect(commandOfKey(press('Enter'))).toBe('play')
    expect(commandOfKey(press('F2'))).toBe('rename')
    expect(commandOfKey(press('Delete'))).toBe('remove')
    expect(commandOfKey(press('Delete', { shiftKey: true }))).toBe('delete')
    expect(commandOfKey(press('D', { ctrlKey: true }))).toBe('duplicate')
  })

  it('ignores other keys and Alt', () => {
    expect(commandOfKey(press('a'))).toBeNull()
    expect(commandOfKey(press('s', { ctrlKey: true }))).toBeNull()
    expect(commandOfKey(press('Enter', { altKey: true }))).toBeNull()
  })
})

describe('opensMenu', () => {
  it('opens with the menu key and Shift+F10 only', () => {
    expect(opensMenu(press('ContextMenu'))).toBe(true)
    expect(opensMenu(press('F10', { shiftKey: true }))).toBe(true)
    expect(opensMenu(press('F10'))).toBe(false)
  })
})

describe('baseName', () => {
  it('drops only the last extension', () => {
    expect(baseName('[2026-09-29][10-00-00].mp3')).toBe('[2026-09-29][10-00-00]')
    expect(baseName('a.b.wav')).toBe('a.b')
    expect(baseName('.hidden')).toBe('.hidden')
  })
})
