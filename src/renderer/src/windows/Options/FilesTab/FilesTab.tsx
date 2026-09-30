/**
 * Files tab of Options (spec §9, plan/images/05 and 06): a blue side list of
 * panels (Auto Name, MP3, WAV) and the chosen panel beside it. Edits go to the
 * Options draft; nothing is stored until Apply or OK.
 */

import { useState } from 'react'
import type { FilesSettings } from '@shared/types'
import { useFilesDraft } from './application/useFilesDraft'
import { AutoNameSection } from './AutoNameSection'
import { Mp3Section } from './Mp3Section'
import { WavSection } from './WavSection'
import styles from './FilesTab.module.css'

type Panel = 'autoName' | 'mp3' | 'wav'

const PANELS: readonly Panel[] = ['autoName', 'mp3', 'wav']

const PANEL_TITLES: Record<Panel, string> = {
  autoName: 'Auto Name',
  mp3: 'MP3',
  wav: 'WAV'
}

export function FilesTab({ files }: { files: FilesSettings }): React.JSX.Element {
  const [panel, setPanel] = useState<Panel>('autoName')
  const draft = useFilesDraft(files)

  return (
    <div className={styles.tab}>
      <nav className={styles.nav}>
        {PANELS.map((id) => (
          <button
            key={id}
            type="button"
            className={`${styles.navItem} ${id === panel ? styles.navActive : ''}`}
            onClick={() => setPanel(id)}
          >
            {PANEL_TITLES[id]}
          </button>
        ))}
      </nav>
      <div className={styles.panel}>
        {panel === 'autoName' && <AutoNameSection draft={draft} />}
        {panel === 'mp3' && <Mp3Section draft={draft} />}
        {panel === 'wav' && <WavSection draft={draft} />}
      </div>
    </div>
  )
}
