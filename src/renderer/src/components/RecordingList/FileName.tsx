/**
 * Name cell of a row: file icon (a warning when the file is gone), the name and
 * the folder button that opens its location.
 */

import { FileText, FileWarning, FolderOpen } from 'lucide-react'
import styles from './RecordingList.module.css'

interface FileNameProps {
  name: string
  missing?: boolean
  /** Adds the folder button; the file being recorded has none. */
  onOpenLocation?: () => void
}

export function FileName({
  name,
  missing = false,
  onOpenLocation
}: FileNameProps): React.JSX.Element {
  const Icon = missing ? FileWarning : FileText
  return (
    <span className={styles.name}>
      <Icon className={missing ? styles.warning : styles.icon} size={15} aria-hidden />
      <span className={styles.text}>{name}</span>
      {onOpenLocation && (
        <button
          type="button"
          className={styles.locate}
          title="Open file location"
          aria-label="Open file location"
          tabIndex={-1}
          disabled={missing}
          onClick={(event) => {
            event.stopPropagation()
            onOpenLocation()
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <FolderOpen size={14} aria-hidden />
        </button>
      )}
    </span>
  )
}
