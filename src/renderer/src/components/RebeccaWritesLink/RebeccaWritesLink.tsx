/**
 * Row under Source and Level: "Vincular Transcripción con RebeccaWrites"
 * (task 46). While checked, recording also sends the audio to RebeccaWrites,
 * which transcribes it live; no text is shown here. What the checkbox does is
 * in `application/useRebeccaWritesLink`.
 */

import { useRebeccaWritesLink } from './application/useRebeccaWritesLink'
import styles from './RebeccaWritesLink.module.css'

interface RebeccaWritesLinkProps {
  /** The setting is read when a recording starts: it cannot change during one. */
  disabled?: boolean
}

export function RebeccaWritesLink({ disabled = false }: RebeccaWritesLinkProps): React.JSX.Element {
  const { linked, missing, busy, toggle, locate } = useRebeccaWritesLink()

  return (
    <div className={styles.row}>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={linked}
          disabled={disabled || busy}
          onChange={(event) => toggle(event.target.checked)}
        />
        Vincular Transcripción con RebeccaWrites
      </label>
      {missing && (
        <>
          <span className={styles.missing}>RebeccaWrites no encontrada</span>
          <button type="button" className={styles.locate} disabled={disabled} onClick={locate}>
            Localizar RebeccaWrites…
          </button>
        </>
      )}
    </div>
  )
}
