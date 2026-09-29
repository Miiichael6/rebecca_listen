/**
 * Level row (spec §4.2): horizontal blue slider, 0-200 %, that applies gain to
 * the recorded audio. Double click resets it to the default.
 */

import { LEVEL_PERCENT, DEFAULT_LEVEL_PERCENT } from '@shared/defaults'
import styles from './LevelSlider.module.css'

interface LevelSliderProps {
  /** Gain in percent, within `LEVEL_PERCENT`. */
  percent: number
  disabled?: boolean
  onChange?: (percent: number) => void
}

function filledRatio(percent: number): string {
  const { min, max } = LEVEL_PERCENT
  return `${((percent - min) / (max - min)) * 100}%`
}

export function LevelSlider({
  percent,
  disabled = false,
  onChange
}: LevelSliderProps): React.JSX.Element {
  return (
    <div className={styles.row}>
      <span className={styles.label}>Level</span>
      <input
        type="range"
        className={styles.slider}
        style={{ '--filled': filledRatio(percent) } as React.CSSProperties}
        min={LEVEL_PERCENT.min}
        max={LEVEL_PERCENT.max}
        step={LEVEL_PERCENT.step}
        value={percent}
        disabled={disabled}
        aria-label="Level"
        onChange={(event) => onChange?.(event.target.valueAsNumber)}
        onDoubleClick={() => onChange?.(DEFAULT_LEVEL_PERCENT)}
      />
    </div>
  )
}
