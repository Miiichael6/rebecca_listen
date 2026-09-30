/**
 * Hotkeys tab of Options (spec §10.1, plan/images/07): the Commands | Key table
 * and the field that captures a new combination for the selected command.
 * Assign writes to the Options draft; global registration comes with task 30.
 */

import { useRef } from 'react'
import { HOTKEY_COMMANDS } from '@shared/defaults'
import type { HotkeyCommand, HotkeysSettings } from '@shared/types'
import { useHotkeysTab } from './application/useHotkeysTab'
import { COMMAND_LABELS, describeHotkey } from './domain/labels'
import styles from './HotkeysTab.module.css'

export function HotkeysTab({ hotkeys }: { hotkeys: HotkeysSettings }): React.JSX.Element {
  const tab = useHotkeysTab(hotkeys)
  const field = useRef<HTMLInputElement>(null)
  const problem = tab.error ?? tab.registrationError

  // Choosing a row puts the field in capture mode.
  const choose = (command: HotkeyCommand): void => {
    tab.select(command)
    field.current?.focus()
  }

  return (
    <div className={styles.tab}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Commands</th>
            <th>Key</th>
          </tr>
        </thead>
        <tbody>
          {HOTKEY_COMMANDS.map((command) => (
            <tr
              key={command}
              className={command === tab.selected ? styles.selected : undefined}
              aria-selected={command === tab.selected}
              onClick={() => choose(command)}
            >
              <td>{COMMAND_LABELS[command]}</td>
              <td>{describeHotkey(tab.hotkeys[command])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <label className={styles.field}>
        <span>Press (new) hot key for selected command:</span>
        <span className={styles.capture}>
          <input
            ref={field}
            className={`${styles.input} ${problem ? styles.invalid : ''}`}
            value={describeHotkey(tab.captured)}
            onKeyDown={tab.capture}
            readOnly
          />
          <button type="button" className={styles.assign} onClick={tab.assign}>
            Assign
          </button>
        </span>
        {problem && <span className={styles.error}>{problem}</span>}
      </label>
    </div>
  )
}
