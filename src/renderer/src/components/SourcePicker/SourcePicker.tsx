/**
 * Source row (spec §4.1): grey label and a combo that opens `SourceMenu`.
 *
 * The combo keeps the focus while the list is open and drives it from the
 * keyboard: arrows, Home/End, Enter or Space to choose, Esc to close. The list
 * follows `devices` live, so plugging or unplugging hardware while it is open
 * neither closes it nor loses the active row.
 */

import { AlertTriangle, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { AudioDevice, SourceSelection } from '@shared/types'
import { SourceMenu } from './SourceMenu'
import styles from './SourcePicker.module.css'
import {
  TOGGLE_KEY,
  activeKeyOf,
  comboLabel,
  groupDevices,
  keyOf,
  navigableKeys,
  selectionOf,
  stepKey
} from './sourceOptions'

/** Space kept free between the bottom of the list and the window edge. */
const MENU_MARGIN_PX = 8

const MISSING_HELP = 'The saved device is not connected. Recording will use Computer Sounds.'

interface SourcePickerProps {
  source: SourceSelection | null
  devices: AudioDevice[]
  /** Advanced device list shown under the "•••" bar. */
  expanded: boolean
  /** Greyed out while recording (§4.1). */
  disabled?: boolean
  onChange: (source: SourceSelection) => void
  onExpandedChange: (expanded: boolean) => void
  /** Called when the list is about to open, to refresh the devices. */
  onOpen?: () => void
}

export function SourcePicker({
  source,
  devices,
  expanded,
  disabled = false,
  onChange,
  onExpandedChange,
  onOpen
}: SourcePickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [wantedKey, setWantedKey] = useState<string | null>(null)
  const [maxHeight, setMaxHeight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  const groups = groupDevices(devices)
  const keys = navigableKeys(groups, expanded)
  const selectedKey = source ? keyOf(source) : ''
  const activeKey = activeKeyOf(keys, wantedKey, selectedKey)
  const label = comboLabel(source, devices)
  const isOpen = open && !disabled
  const optionId = (key: string): string => `${baseId}-${key}`

  // Clicking anywhere else, or leaving the window, closes the list.
  useEffect(() => {
    if (!isOpen) return
    const closeOutside = (event: MouseEvent): void => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const close = (): void => setOpen(false)
    document.addEventListener('mousedown', closeOutside)
    window.addEventListener('blur', close)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      window.removeEventListener('blur', close)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    document.getElementById(`${baseId}-${activeKey}`)?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, activeKey, baseId])

  function openMenu(): void {
    const bottom = wrapRef.current?.getBoundingClientRect().bottom ?? 0
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
    if (next) onChange(next)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    const moves: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      Home: -Infinity,
      End: Infinity
    }
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openMenu()
      }
      return
    }
    if (event.key in moves) {
      event.preventDefault()
      setWantedKey(stepKey(keys, activeKey, moves[event.key]))
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(activeKey)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      setOpen(false)
    }
  }

  const comboClasses = [styles.combo]
  if (disabled) comboClasses.push(styles.disabled)
  if (label.missing) comboClasses.push(styles.missing)

  return (
    <div className={styles.row}>
      <span className={styles.label}>Source</span>
      <div className={styles.comboWrap} ref={wrapRef}>
        <button
          type="button"
          role="combobox"
          className={comboClasses.join(' ')}
          disabled={disabled}
          aria-label="Source"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${baseId}-menu` : undefined}
          aria-activedescendant={isOpen ? optionId(activeKey) : undefined}
          title={label.missing ? MISSING_HELP : undefined}
          onClick={() => (isOpen ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
        >
          {label.missing && <AlertTriangle className={styles.warning} size={13} aria-hidden />}
          <span className={styles.value}>{label.text}</span>
          <ChevronDown className={styles.chevron} size={14} aria-hidden />
        </button>
        {isOpen && (
          <SourceMenu
            id={`${baseId}-menu`}
            groups={groups}
            expanded={expanded}
            selectedKey={selectedKey}
            activeKey={activeKey}
            maxHeight={maxHeight}
            optionId={optionId}
            onActivate={setWantedKey}
            onChoose={choose}
          />
        )}
      </div>
    </div>
  )
}
