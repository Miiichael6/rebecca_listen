/**
 * Turns a key press into an Electron `Accelerator` (`Ctrl+Alt+R`) for the
 * Hotkeys tab (spec §10.1). Keys are read by their physical `code`, so Shift or
 * the keyboard layout do not change what is stored: AltGr+R reaches the browser
 * as Ctrl+Alt+R, which is also what Windows registers for it.
 */

/** The fields of a `KeyboardEvent` the capture reads. */
export type KeyPress = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>

/** Keys whose accelerator name is not derived from the code by a pattern. */
const NAMED_KEYS: Readonly<Record<string, string>> = {
  Space: 'Space',
  Tab: 'Tab',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Escape: 'Esc',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  PrintScreen: 'PrintScreen',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  NumpadAdd: 'numadd',
  NumpadSubtract: 'numsub',
  NumpadMultiply: 'nummult',
  NumpadDivide: 'numdiv',
  NumpadDecimal: 'numdec'
}

const LETTER = /^Key([A-Z])$/
const DIGIT = /^Digit(\d)$/
const NUMPAD_DIGIT = /^Numpad(\d)$/
const FUNCTION_KEY = /^F([1-9]|1\d|2[0-4])$/

const MODIFIER_CODE = /^(Control|Alt|Shift|Meta)(Left|Right)$/

/** Backspace and Delete with no modifier clear the field ("None"). */
const CLEAR_CODES: readonly string[] = ['Backspace', 'Delete']

/** The accelerator name of the key alone, or `null` for modifiers and keys it cannot take. */
function keyName(code: string): string | null {
  const letter = LETTER.exec(code)
  if (letter) return letter[1]
  const digit = DIGIT.exec(code)
  if (digit) return digit[1]
  const numpad = NUMPAD_DIGIT.exec(code)
  if (numpad) return `num${numpad[1]}`
  if (FUNCTION_KEY.test(code)) return code
  return NAMED_KEYS[code] ?? null
}

function hasModifier(press: KeyPress): boolean {
  return press.ctrlKey || press.altKey || press.shiftKey || press.metaKey
}

/**
 * The accelerator of the combination, or `null` while only modifiers are held
 * or the key cannot be registered. Outside the F-keys a global hotkey needs
 * Ctrl, Alt or Win: a bare letter, or Shift plus one, would take over typing.
 */
export function toAccelerator(press: KeyPress): string | null {
  const key = keyName(press.code)
  if (key === null) return null
  const needsModifier = !FUNCTION_KEY.test(press.code)
  if (needsModifier && !(press.ctrlKey || press.altKey || press.metaKey)) return null

  const parts: string[] = []
  if (press.ctrlKey) parts.push('Ctrl')
  if (press.altKey) parts.push('Alt')
  if (press.shiftKey) parts.push('Shift')
  if (press.metaKey) parts.push('Super')
  parts.push(key)
  return parts.join('+')
}

/** Whether the press asks to leave the command without a hotkey. */
export function isClearPress(press: KeyPress): boolean {
  return CLEAR_CODES.includes(press.code) && !hasModifier(press)
}

/** Whether the press is a modifier alone, i.e. the combination is still being built. */
export function isModifierPress(press: KeyPress): boolean {
  return MODIFIER_CODE.test(press.code)
}
