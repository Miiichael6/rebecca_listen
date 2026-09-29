/**
 * Source row (spec §4.1): grey label and a combo with the quick modes and every
 * device usable right now, outputs (recorded in loopback) and inputs.
 *
 * For now the list is a native `<select>` laid invisibly over the combo, so it
 * keeps the look of the closed state; the custom dropdown of the reference
 * screenshot, with groups and colours, arrives with task 07.
 */

import { ChevronDown } from 'lucide-react'
import type { AudioDevice, SourceSelection } from '@shared/types'
import styles from './SourcePicker.module.css'

const QUICK_MODES = [
  { key: 'system', label: 'Computer Sounds' },
  { key: 'voice', label: 'Voice' }
] as const

function keyOf(source: SourceSelection): string {
  return source.mode === 'device' ? `device:${source.deviceId}` : source.mode
}

function selectionOf(key: string): SourceSelection {
  if (key.startsWith('device:')) return { mode: 'device', deviceId: key.slice('device:'.length) }
  return { mode: key as 'system' | 'voice' }
}

function deviceLabel(device: AudioDevice): string {
  const name =
    device.name === device.groupName ? device.name : `${device.name} (${device.groupName})`
  return device.isDefault ? `${name} — default` : name
}

/** What the closed combo shows. */
function labelOf(source: SourceSelection | null, devices: AudioDevice[]): string {
  if (!source) return ''
  if (source.mode !== 'device') {
    return QUICK_MODES.find((mode) => mode.key === source.mode)?.label ?? 'Computer Sounds & Voice'
  }
  const device = devices.find((d) => d.id === source.deviceId)
  return device ? deviceLabel(device) : 'Device not connected'
}

interface SourcePickerProps {
  source: SourceSelection | null
  devices: AudioDevice[]
  /** Greyed out while recording (§4.1). */
  disabled?: boolean
  onChange: (source: SourceSelection) => void
  /** Called when the list is about to open, to refresh the devices. */
  onOpen?: () => void
}

export function SourcePicker({
  source,
  devices,
  disabled = false,
  onChange,
  onOpen
}: SourcePickerProps): React.JSX.Element {
  const outputs = devices.filter((d) => d.kind === 'render')
  const inputs = devices.filter((d) => d.kind === 'capture')
  const current = source ? keyOf(source) : ''
  const known =
    current === '' ||
    !current.startsWith('device:') ||
    devices.some((d) => `device:${d.id}` === current)

  return (
    <div className={styles.row}>
      <span className={styles.label}>Source</span>
      <div className={styles.comboWrap}>
        <div className={disabled ? `${styles.combo} ${styles.disabled}` : styles.combo}>
          <span className={styles.value}>{labelOf(source, devices)}</span>
          <ChevronDown className={styles.chevron} size={14} aria-hidden />
        </div>
        <select
          className={styles.native}
          aria-label="Source"
          value={current}
          disabled={disabled}
          onMouseDown={onOpen}
          onChange={(event) => onChange(selectionOf(event.target.value))}
        >
          {QUICK_MODES.map((mode) => (
            <option key={mode.key} value={mode.key}>
              {mode.label}
            </option>
          ))}
          {!known && <option value={current}>Device not connected</option>}
          <optgroup label="Outputs (what the computer plays)">
            {outputs.map((device) => (
              <option key={device.id} value={`device:${device.id}`}>
                {deviceLabel(device)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Inputs (microphones)">
            {inputs.map((device) => (
              <option key={device.id} value={`device:${device.id}`}>
                {deviceLabel(device)}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </div>
  )
}
