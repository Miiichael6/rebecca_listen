/** Pieces the panels of the Files tab share: the titled page and a labelled dropdown. */

import type { ReactNode } from 'react'
import styles from './FilesTab.module.css'

interface SectionProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function Section({ title, subtitle, children }: SectionProps): React.JSX.Element {
  return (
    <div className={styles.section}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </header>
      <div className={styles.fields}>{children}</div>
    </div>
  )
}

interface ChoiceProps<T extends string | number> {
  label: string
  value: T
  options: readonly T[]
  /** How each option reads in the list; the value itself by default. */
  describe?: (option: T) => string
  onChange: (value: T) => void
}

export function Choice<T extends string | number>({
  label,
  value,
  options,
  describe = String,
  onChange
}: ChoiceProps<T>): React.JSX.Element {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        value={String(value)}
        onChange={(event) => {
          const chosen = options.find((option) => String(option) === event.target.value)
          if (chosen !== undefined) onChange(chosen)
        }}
      >
        {options.map((option) => (
          <option key={option} value={String(option)}>
            {describe(option)}
          </option>
        ))}
      </select>
    </label>
  )
}
