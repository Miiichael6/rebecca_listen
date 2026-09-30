/**
 * The open Source dropdown (§4.1, `01_source_dropdown_devices.png`): quick
 * modes with a green check on the selected one, the teal "•••" bar and, when
 * expanded, the devices under grey hardware headers, outputs in green and
 * inputs in red.
 *
 * Only draws: which row is active and what a click does belong to `SourcePicker`.
 */

import { Check } from 'lucide-react'
import type { AudioDevice } from '@shared/types'
import styles from './SourcePicker.module.css'
import { QUICK_MODES, TOGGLE_KEY, deviceKey, type DeviceGroup } from './sourceOptions'

const MIXED_HELP =
  'Records the default output (what the computer plays) mixed with a microphone (the default one, or the one picked below).'

/** Green check column; empty but still there, so every label lines up. */
function SelectedCheck({ selected }: { selected: boolean }): React.JSX.Element {
  return (
    <span className={styles.check}>
      {selected && <Check size={14} strokeWidth={3} aria-hidden />}
    </span>
  )
}

interface SourceMenuProps {
  id: string
  groups: DeviceGroup[]
  expanded: boolean
  selectedKey: string
  activeKey: string
  maxHeight: number
  optionId: (key: string) => string
  onActivate: (key: string) => void
  onChoose: (key: string) => void
}

export function SourceMenu(props: SourceMenuProps): React.JSX.Element {
  const { id, groups, expanded, selectedKey, activeKey, maxHeight, optionId } = props
  const { onActivate, onChoose } = props

  /** Props shared by every row the keyboard can reach. */
  const rowProps = (
    key: string
  ): React.HTMLAttributes<HTMLDivElement> & { id: string; 'data-active': boolean } => ({
    id: optionId(key),
    role: 'option',
    'data-active': key === activeKey,
    onMouseEnter: () => onActivate(key),
    // Keeps the focus on the combo, which owns the keyboard.
    onMouseDown: (event) => event.preventDefault(),
    onClick: () => onChoose(key)
  })

  const deviceRow = (device: AudioDevice): React.JSX.Element => {
    const key = deviceKey(device)
    const kindClass = device.kind === 'render' ? styles.output : styles.input
    return (
      <div
        key={key}
        className={`${styles.option} ${kindClass}`}
        aria-selected={key === selectedKey}
        title={device.kind === 'render' ? 'Output, recorded in loopback' : 'Input'}
        {...rowProps(key)}
      >
        <SelectedCheck selected={key === selectedKey} />
        <span className={styles.optionText}>{device.name}</span>
        {device.isDefault && <span className={styles.hint}>Default</span>}
      </div>
    )
  }

  return (
    <div id={id} role="listbox" className={styles.menu} style={{ maxHeight }}>
      {QUICK_MODES.map(({ mode, label }) => (
        <div
          key={mode}
          className={styles.option}
          aria-selected={mode === selectedKey}
          {...rowProps(mode)}
        >
          <SelectedCheck selected={mode === selectedKey} />
          <span className={styles.optionText}>{label}</span>
          {mode === 'mixed' && (
            <span className={styles.helpWrap}>
              <button
                type="button"
                className={styles.help}
                aria-label="What is Computer Sounds & Voice?"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              >
                ?
              </button>
              <span role="tooltip" className={styles.tooltip}>
                {MIXED_HELP}
              </span>
            </span>
          )}
        </div>
      ))}

      <div
        className={styles.toggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide devices' : 'Show devices'}
        {...rowProps(TOGGLE_KEY)}
      >
        •••
      </div>

      {expanded &&
        groups.map((group) => (
          <div key={group.name} role="group" aria-label={group.name}>
            <div className={styles.groupHeader}>{group.name}</div>
            {group.devices.map(deviceRow)}
          </div>
        ))}
      {expanded && groups.length === 0 && <div className={styles.empty}>No devices found</div>}
    </div>
  )
}
