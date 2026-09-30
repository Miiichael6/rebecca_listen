/**
 * Microphone row under Source, only while "Computer Sounds & Voice" is chosen:
 * which input is mixed with the computer's sound. Empty = the Windows default.
 */

import type { AudioDevice } from '@shared/types'
import styles from './MicrophonePicker.module.css'

interface MicrophonePickerProps {
  /** Id of the chosen microphone, '' for the default one. */
  voiceId: string
  devices: AudioDevice[]
  disabled?: boolean
  onChange: (voiceId: string) => void
}

export function MicrophonePicker({
  voiceId,
  devices,
  disabled = false,
  onChange
}: MicrophonePickerProps): React.JSX.Element {
  const microphones = devices.filter((device) => device.kind === 'capture')
  // A saved microphone that is unplugged is recorded with the default one.
  const value = microphones.some((device) => device.id === voiceId) ? voiceId : ''
  return (
    <div className={styles.row}>
      <span className={styles.label}>Microphone</span>
      <select
        className={styles.select}
        value={value}
        disabled={disabled}
        aria-label="Microphone"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Default microphone</option>
        {microphones.map((device) => (
          <option key={device.id} value={device.id}>
            {device.name} ({device.groupName})
          </option>
        ))}
      </select>
    </div>
  )
}
