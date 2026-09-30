/**
 * Auto Name panel (spec §9.1, plan/images/05): Enable, destination folder,
 * prefix, naming convention, format and the live "For example" path.
 */

import { AUDIO_FORMATS, NAMING_TEMPLATE_IDS, NAMING_TEMPLATES } from '@shared/defaults'
import { validatePattern, validatePrefix } from '@shared/naming'
import type { NamingTemplate } from '@shared/types'
import { truncateMiddle } from '../../../lib/truncateMiddle'
import type { FilesDraft } from './application/useFilesDraft'
import { folderOf } from './domain/labels'
import { Choice, Section } from './Section'
import styles from './FilesTab.module.css'

/** Characters of the example path that fit the panel on one line. */
const EXAMPLE_MAX_CHARS = 40
const CUSTOM_HELP = '{YYYY} {MM} {DD} {hh} {mm} {ss} · {n} = counter 001, 002…'

const templateLabel = (template: NamingTemplate): string =>
  template === 'custom' ? 'Custom…' : NAMING_TEMPLATES[template].label

export function AutoNameSection({ draft }: { draft: FilesDraft }): React.JSX.Element {
  const { files, edit } = draft
  const prefixProblem = validatePrefix(files.prefix)
  const patternProblem = files.template === 'custom' ? validatePattern(files.customPattern) : null

  return (
    <Section title="Auto Name" subtitle="Specify output filenames automatically.">
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={files.autoName}
          onChange={(event) => edit({ autoName: event.target.checked })}
        />
        Enable
      </label>
      {!files.autoName && (
        <p className={styles.hint}>Recording asks for the file name first (Save as).</p>
      )}

      <div className={styles.field}>
        <span className={styles.label}>Specify the destination folder</span>
        <div className={styles.inline}>
          <input
            className={styles.input}
            value={files.folder || folderOf(draft.example)}
            readOnly
          />
          <button type="button" className={styles.browse} onClick={draft.chooseFolder}>
            …
          </button>
        </div>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Specify prefix for the file name</span>
        <input
          className={`${styles.input} ${prefixProblem ? styles.invalid : ''}`}
          value={files.prefix}
          placeholder="(Optional)"
          onChange={(event) => edit({ prefix: event.target.value })}
        />
        {prefixProblem && <span className={styles.error}>{prefixProblem}</span>}
      </label>

      <div className={styles.inline}>
        <Choice
          label="Specify the naming convention"
          value={files.template}
          options={NAMING_TEMPLATE_IDS}
          describe={templateLabel}
          onChange={(template) => edit({ template })}
        />
        <Choice
          label="Format"
          value={files.format}
          options={AUDIO_FORMATS}
          describe={(format) => `.${format}`}
          onChange={(format) => edit({ format })}
        />
      </div>

      {files.template === 'custom' && (
        <label className={styles.field}>
          <input
            className={`${styles.input} ${patternProblem ? styles.invalid : ''}`}
            value={files.customPattern}
            onChange={(event) => edit({ customPattern: event.target.value })}
          />
          <span className={patternProblem ? styles.error : styles.hint}>
            {patternProblem ?? CUSTOM_HELP}
          </span>
        </label>
      )}

      <div className={styles.field}>
        <span className={styles.label}>For example</span>
        <span className={styles.example} title={draft.example}>
          {truncateMiddle(draft.example, EXAMPLE_MAX_CHARS)}
        </span>
      </div>
    </Section>
  )
}
