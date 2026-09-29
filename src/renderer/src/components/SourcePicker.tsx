/**
 * Source row (spec §4.1): grey label and a combo showing the current mode.
 * Only the closed state; the dropdown with the devices arrives with task 07.
 */

import { ChevronDown } from 'lucide-react'
import styles from './SourcePicker.module.css'

interface SourcePickerProps {
  /** Label of the selected mode or device, e.g. "Computer Sounds". */
  value: string
  /** Greyed out while recording (§4.1). */
  disabled?: boolean
  onOpen?: () => void
}

export function SourcePicker({
  value,
  disabled = false,
  onOpen
}: SourcePickerProps): React.JSX.Element {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Source</span>
      <button type="button" className={styles.combo} disabled={disabled} onClick={onOpen}>
        <span className={styles.value}>{value}</span>
        <ChevronDown className={styles.chevron} size={14} aria-hidden />
      </button>
    </div>
  )
}
