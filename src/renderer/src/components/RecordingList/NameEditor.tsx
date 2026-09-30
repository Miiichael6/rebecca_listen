/**
 * In-place rename field: `Enter` or leaving the field saves, `Esc` cancels
 * (`null`). The extension stays out of the field.
 */

import { useEffect, useRef } from 'react'
import { FileText } from 'lucide-react'
import { baseName } from './domain/listKeys'
import styles from './RecordingList.module.css'

interface NameEditorProps {
  name: string
  onDone: (name: string | null) => void
}

export function NameEditor({ name, onDone }: NameEditorProps): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null)
  // Enter and Esc end the edit before the blur that follows them.
  const done = useRef(false)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
  }, [])

  const finish = (value: string | null): void => {
    if (done.current) return
    done.current = true
    onDone(value)
  }

  return (
    <span className={styles.name}>
      <FileText className={styles.icon} size={15} aria-hidden />
      <input
        ref={input}
        className={styles.input}
        defaultValue={baseName(name)}
        spellCheck={false}
        aria-label="File name"
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter') finish(event.currentTarget.value)
          else if (event.key === 'Escape') finish(null)
        }}
        onBlur={(event) => finish(event.currentTarget.value)}
      />
    </span>
  )
}
