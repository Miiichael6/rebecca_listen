/**
 * What the Hotkeys tab does: pick a command, capture a combination in the
 * field and assign it to the Options draft unless another command holds it.
 */

import { useState, type KeyboardEvent } from 'react'
import type { HotkeyCommand, HotkeysSettings } from '@shared/types'
import { useOptionsDraft } from '../../../../store/optionsDraft'
import { findConflict } from '../domain/hotkeyConflicts'
import { conflictMessage, MISSING_MODIFIER_MESSAGE } from '../domain/labels'
import { isClearPress, isModifierPress, toAccelerator } from '../domain/toAccelerator'

export interface HotkeysTabModel {
  hotkeys: HotkeysSettings
  selected: HotkeyCommand
  select: (command: HotkeyCommand) => void
  /** What the field shows and Assign would store; `null` is "None". */
  captured: string | null
  capture: (event: KeyboardEvent<HTMLInputElement>) => void
  assign: () => void
  /** A problem with the capture or the assignment, shown in red under the field. */
  error: string | null
  /** Windows refused to register the selected hotkey; task 30 fills it. */
  registrationError: string | null
}

/** A bare Tab keeps moving the focus instead of being captured. */
const isFocusMove = (event: KeyboardEvent): boolean =>
  event.code === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey

export function useHotkeysTab(hotkeys: HotkeysSettings): HotkeysTabModel {
  const edit = useOptionsDraft((store) => store.edit)
  const [selected, setSelected] = useState<HotkeyCommand>('file')
  const [captured, setCaptured] = useState<string | null>(hotkeys.file)
  const [error, setError] = useState<string | null>(null)

  const select = (command: HotkeyCommand): void => {
    setSelected(command)
    setCaptured(hotkeys[command])
    setError(null)
  }

  const capture = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (isFocusMove(event)) return
    event.preventDefault()
    const press = event.nativeEvent
    if (isModifierPress(press)) return
    if (isClearPress(press)) {
      setCaptured(null)
      setError(null)
      return
    }
    const accelerator = toAccelerator(press)
    if (accelerator === null) {
      setError(MISSING_MODIFIER_MESSAGE)
      return
    }
    setCaptured(accelerator)
    setError(null)
  }

  const assign = (): void => {
    const owner = findConflict(hotkeys, selected, captured)
    if (owner !== null && captured !== null) {
      setError(conflictMessage(captured, owner))
      return
    }
    edit('hotkeys', { [selected]: captured })
    setError(null)
  }

  return {
    hotkeys,
    selected,
    select,
    captured,
    capture,
    assign,
    error,
    registrationError: null
  }
}
