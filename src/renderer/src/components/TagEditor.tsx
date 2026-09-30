/**
 * Tag Editor of a recording: title, artist, album, year, genre and comment,
 * over the rest of the window. Main reads and writes the tags with ffmpeg; a
 * field left empty removes that tag. `Enter` saves (a new line in Comment
 * needs `Shift+Enter`), `Esc` or Cancel close without saving.
 */

import { useEffect, useRef, useState } from 'react'
import type { AudioTags, HistoryItem } from '@shared/types'
import styles from './TagEditor.module.css'

const FIELDS: readonly { key: keyof AudioTags; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'year', label: 'Year' },
  { key: 'genre', label: 'Genre' },
  { key: 'comment', label: 'Comment' }
]

interface TagEditorProps {
  item: HistoryItem
  onClose: () => void
}

export function TagEditor({ item, onClose }: TagEditorProps): React.JSX.Element {
  const form = useRef<HTMLFormElement>(null)
  const [tags, setTags] = useState<AudioTags | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let current = true
    void window.api.invoke('history:readTags', { id: item.id }).then((read) => {
      if (!current) return
      // Main has already told the user why the tags could not be read.
      if (read) setTags(read)
      else onClose()
    })
    return () => {
      current = false
    }
  }, [item.id, onClose])

  const loaded = tags !== null
  useEffect(() => {
    if (loaded) form.current?.querySelector('input')?.focus()
  }, [loaded])

  const save = async (): Promise<void> => {
    if (!tags || saving) return
    setSaving(true)
    await window.api.invoke('history:writeTags', { id: item.id, tags })
    onClose()
  }

  const field = (key: keyof AudioTags, label: string): React.JSX.Element => {
    const common = {
      id: `tag-${key}`,
      className: styles.input,
      value: tags?.[key] ?? '',
      disabled: !tags || saving,
      spellCheck: false,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        tags && setTags({ ...tags, [key]: event.target.value })
    }
    return (
      <label key={key} className={styles.field} htmlFor={common.id}>
        <span className={styles.label}>{label}</span>
        {key === 'comment' ? <textarea rows={3} {...common} /> : <input {...common} />}
      </label>
    )
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <form
        ref={form}
        className={styles.dialog}
        role="dialog"
        aria-modal
        aria-label="Tag Editor"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Escape') onClose()
          else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void save()
          }
        }}
      >
        <h2 className={styles.title}>Tag Editor</h2>
        <p className={styles.file} title={item.path}>
          {item.name}
        </p>
        {FIELDS.map(({ key, label }) => field(key, label))}
        <div className={styles.buttons}>
          <button type="button" className={styles.button} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={!tags || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
