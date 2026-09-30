/**
 * Behavior of the Source combo without any markup: whether the list is open,
 * which row is active, what each key does and when a click closes it.
 *
 * The combo keeps the focus while the list is open and drives it from the
 * keyboard: arrows, Home/End, Enter or Space to choose, Esc to close. The list
 * follows `devices` live, so plugging or unplugging hardware while it is open
 * neither closes it nor loses the active row.
 */

import { useEffect, useId, useState, type RefObject } from 'react'
import type { AudioDevice, SourceSelection } from '@shared/types'
import {
  TOGGLE_KEY,
  activeKeyOf,
  comboLabel,
  groupDevices,
  keyOf,
  navigableKeys,
  selectionOf,
  stepKey
} from '../domain/sourceOptions'

/** Space kept free between the bottom of the list and the window edge. */
const MENU_MARGIN_PX = 8

const MOVES: Record<string, number> = {
  ArrowDown: 1,
  ArrowUp: -1,
  Home: -Infinity,
  End: Infinity
}

interface Options {
  /** Wraps the combo and its list, which the view owns: it places the list and tells an outside click. */
  wrap: RefObject<HTMLElement | null>
  source: SourceSelection | null
  devices: AudioDevice[]
  expanded: boolean
  disabled: boolean
  onChange: (source: SourceSelection) => void
  onExpandedChange: (expanded: boolean) => void
  /** Called when the list is about to open, to refresh the devices. */
  onOpen?: () => void
}

export interface SourcePickerBehavior {
  menuId: string
  optionId: (key: string) => string
  groups: ReturnType<typeof groupDevices>
  selectedKey: string
  activeKey: string
  label: ReturnType<typeof comboLabel>
  isOpen: boolean
  maxHeight: number
  setActive: (key: string) => void
  toggle: () => void
  choose: (key: string) => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

export function useSourcePicker({
  wrap,
  source,
  devices,
  expanded,
  disabled,
  onChange,
  onExpandedChange,
  onOpen
}: Options): SourcePickerBehavior {
  const [open, setOpen] = useState(false)
  const [wantedKey, setWantedKey] = useState<string | null>(null)
  const [maxHeight, setMaxHeight] = useState(0)
  const baseId = useId()

  const groups = groupDevices(devices)
  const keys = navigableKeys(groups, expanded)
  const selectedKey = source ? keyOf(source) : ''
  const activeKey = activeKeyOf(keys, wantedKey, selectedKey)
  const label = comboLabel(source, devices)
  const isOpen = open && !disabled

  // Clicking anywhere else, or leaving the window, closes the list.
  useEffect(() => {
    if (!isOpen) return
    const closeOutside = (event: MouseEvent): void => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false)
    }
    const close = (): void => setOpen(false)
    document.addEventListener('mousedown', closeOutside)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      window.removeEventListener('blur', close)
    }
  }, [isOpen, wrap])

  useEffect(() => {
    if (!isOpen) return
    document.getElementById(`${baseId}-${activeKey}`)?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, activeKey, baseId])

  function openMenu(): void {
    const bottom = wrap.current?.getBoundingClientRect().bottom ?? 0
    setMaxHeight(window.innerHeight - bottom - MENU_MARGIN_PX)
    setWantedKey(null)
    setOpen(true)
    onOpen?.()
  }

  function choose(key: string): void {
    if (key === TOGGLE_KEY) {
      onExpandedChange(!expanded)
      return
    }
    const next = selectionOf(key)
    // Choosing the mix again keeps the microphone that was picked for it.
    if (next?.mode === 'mixed' && source?.mode === 'mixed') onChange(source)
    else if (next) onChange(next)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }
    if (event.key in MOVES) {
      event.preventDefault()
      setWantedKey(stepKey(keys, activeKey, MOVES[event.key]))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(activeKey)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
    }
  }

  return {
    menuId: `${baseId}-menu`,
    optionId: (key: string): string => `${baseId}-${key}`,
    groups,
    selectedKey,
    activeKey,
    label,
    isOpen,
    maxHeight,
    setActive: setWantedKey,
    toggle: () => (isOpen ? setOpen(false) : openMenu()),
    choose,
    onKeyDown
  }
}
