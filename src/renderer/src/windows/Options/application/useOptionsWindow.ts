/**
 * What the Options window does: load the settings into the draft, follow the
 * tab of the hash and run OK / Cancel / Apply. The window only lays it out.
 */

import { useEffect, useState } from 'react'
import type { OptionsTab } from '@shared/types'
import { useOptionsDraft, useDraftDirty } from '../../../store/optionsDraft'
import { loadSession, useSessionStore } from '../../../store/session'
import { loadSettings, useSettingsStore } from '../../../store/settings'
import { appliesFromNextFile, parseOptionsTab } from '../domain/draft'

export interface OptionsWindowModel {
  ready: boolean
  tab: OptionsTab
  selectTab: (tab: OptionsTab) => void
  dirty: boolean
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
    ready: draft !== null,
    tab,
    selectTab: setTab,
    dirty,
    nextFileNote: base && draft ? appliesFromNextFile(base, draft, recording) : false,
    ok: () => void apply().then(() => window.close()),
    cancel: () => window.close(),
    apply: () => void apply()
  }
}
