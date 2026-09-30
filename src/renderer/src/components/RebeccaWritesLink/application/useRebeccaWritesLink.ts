/**
 * The "Vincular Transcripción con RebeccaWrites" checkbox (task 46). It only
 * stays checked while RebeccaWrites can be found: checking it looks for it,
 * and so does opening the app with it checked. When it is missing the box is
 * unchecked and the user is offered to point at it by hand.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RebeccaWritesStatus } from '@shared/types'
import { useSettingsStore } from '../../../store/settings'
import { locateRebeccaWrites, lookForRebeccaWrites } from '../infrastructure/rebeccaWritesApi'

export interface RebeccaWritesLinkState {
  linked: boolean
  /** RebeccaWrites was looked for and not found. */
  missing: boolean
  /** Looking for it right now. */
  busy: boolean
  toggle: (checked: boolean) => void
  locate: () => void
}

export function useRebeccaWritesLink(): RebeccaWritesLinkState {
  const settings = useSettingsStore((store) => store.settings)
  const update = useSettingsStore((store) => store.update)
  const linked = settings?.transcription.linkRebeccaWrites ?? false
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const checkedAtStart = useRef(false)

  const setLinked = useCallback(
    (value: boolean): Promise<void> => update('transcription', { linkRebeccaWrites: value }),
    [update]
  )

  /** Links only when RebeccaWrites is there; otherwise unlinks and says so. */
  const linkIf = useCallback(
    async ({ exe }: RebeccaWritesStatus): Promise<void> => {
      setMissing(exe === null)
      await setLinked(exe !== null)
    },
    [setLinked]
  )

  const linkIfFound = async (): Promise<void> => {
    setBusy(true)
    try {
      await linkIf(await lookForRebeccaWrites())
    } finally {
      setBusy(false)
    }
  }

  // Checked in a previous run: RebeccaWrites may have been uninstalled since.
  useEffect(() => {
    if (!settings || checkedAtStart.current) return
    checkedAtStart.current = true
    if (settings.transcription.linkRebeccaWrites) void lookForRebeccaWrites().then(linkIf)
  }, [settings, linkIf])

  const toggle = (checked: boolean): void => {
    if (checked) {
      void linkIfFound()
      return
    }
    setMissing(false)
    void setLinked(false)
  }

  const locate = (): void => {
    void locateRebeccaWrites().then(async (status) => {
      if (!status?.exe) return
      setMissing(false)
      await setLinked(true)
    })
  }

  return { linked, missing, busy, toggle, locate }
}
