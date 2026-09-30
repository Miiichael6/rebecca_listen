/**
 * Source row (spec §4.1): grey label and a combo that opens `SourceMenu`.
 * What the combo does (keys, open list, choosing) is in
 * `application/useSourcePicker`; this file draws it.
 */

import { AlertTriangle, ChevronDown, FileAudio } from 'lucide-react'
import { useRef } from 'react'
import type { AudioDevice, SourceSelection } from '@shared/types'
import { useSourcePicker } from './application/useSourcePicker'
import { SourceMenu } from './SourceMenu'
import styles from './SourcePicker.module.css'

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
  const wrap = useRef<HTMLDivElement>(null)
  const picker = useSourcePicker({
    wrap,
    source,
    devices,
    expanded,
    disabled,
    onChange,
    onExpandedChange,
    onOpen
  })
  const { label, isOpen } = picker

  const comboClasses = [styles.combo]
  if (disabled) comboClasses.push(styles.disabled)
  if (label.missing) comboClasses.push(styles.missing)

  return (
    <div className={styles.row}>
      <span className={styles.label}>Source</span>
      <div className={styles.comboWrap} ref={wrap}>
        <button
          type="button"
          role="combobox"
          className={comboClasses.join(' ')}
          disabled={disabled}
          aria-label="Source"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? picker.menuId : undefined}
          aria-activedescendant={isOpen ? picker.optionId(picker.activeKey) : undefined}
          title={label.missing ? MISSING_HELP : undefined}
          onClick={picker.toggle}
          onKeyDown={picker.onKeyDown}
        >
          {label.missing ? (
            <AlertTriangle className={styles.warning} size={16} aria-hidden />
          ) : (
            <FileAudio className={styles.icon} size={16} aria-hidden />
          )}
          <span className={styles.value}>{label.text}</span>
          <ChevronDown className={styles.chevron} size={14} aria-hidden />
        </button>
        {isOpen && (
          <SourceMenu
            id={picker.menuId}
            groups={picker.groups}
            expanded={expanded}
            selectedKey={picker.selectedKey}
            activeKey={picker.activeKey}
            maxHeight={picker.maxHeight}
            optionId={picker.optionId}
            onActivate={picker.setActive}
            onChoose={picker.choose}
          />
        )}
      </div>
    </div>
  )
}
