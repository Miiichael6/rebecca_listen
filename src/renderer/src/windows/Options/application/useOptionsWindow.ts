/**
 * What the Options window does: load the settings into the draft, follow the
 * tab of the hash and run OK / Cancel / Apply. The window only lays it out.
 */

import { useEffect, useState } from 'react'
import type { OptionsTab, Settings } from '@shared/types'
import { useOptionsDraft, useDraftDirty } from '../../../store/optionsDraft'
import { loadSession, useSessionStore } from '../../../store/session'
import { loadSettings, useSettingsStore } from '../../../store/settings'
import { appliesFromNextFile, hasProblems, parseOptionsTab } from '../domain/draft'

export interface OptionsWindowModel {
  /** `null` until the settings arrive. */
  draft: Settings | null
  tab: OptionsTab
  selectTab: (tab: OptionsTab) => void
  dirty: boolean
  /** A field holds a value that cannot be stored: OK and Apply wait for a fix. */
  problems: boolean
  /** Format or folder changed while recording: they take effect on the next file. */
  nextFileNote: boolean
  ok: () => void
  cancel: () => void
  apply: () => void
}

export function useOptionsWindow(): OptionsWindowModel {
  const settings = useSettingsStore((store) => store.settings)
  const { base, draft, open, apply } = useOptionsDraft()
  const recording = useSessionStore((store) => store.session.state !== 'idle')
  const dirty = useDraftDirty()
  const [tab, setTab] = useState<OptionsTab>(() => parseOptionsTab(location.hash))

  useEffect(() => {
    void loadSettings()
    loadSession()
    // Main asks for another tab by changing the hash of the open window.
    const onHash = (): void => setTab(parseOptionsTab(location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // The draft starts once, from the first settings that arrive.
  useEffect(() => {
    if (settings && !base) open(settings)
  }, [settings, base, open])

  return {
    draft,
    tab,
    selectTab: setTab,
    dirty,
    problems: draft ? hasProblems(draft) : false,
    nextFileNote: base && draft ? appliesFromNextFile(base, draft, recording) : false,
    ok: () => void apply().then(() => window.close()),
    cancel: () => window.close(),
    apply: () => void apply()
  }
}
