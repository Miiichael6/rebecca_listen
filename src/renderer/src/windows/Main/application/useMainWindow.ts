/**
 * What the main window shows and does, gathered from the stores: the view
 * model (source, list, session, playback) and the actions the controls call.
 * The window itself only lays components out and hands them these.
 */

import { useEffect } from 'react'
import type { AudioDevice, HistoryItem, RecordingCommand } from '@shared/types'
import { loadDevices, useDevicesStore } from '../../../store/devices'
import { usePlayerStore } from '../../../store/player'
import { loadRecorder, useRecorderStore } from '../../../store/recorder'
import { loadSession, useSessionStore } from '../../../store/session'
import { useSettingsStore } from '../../../store/settings'
import { runRecordingCommand } from '../../../recordingCommands/infrastructure/storesAdapter'
import { openOptions, openRecordingsFolder } from '../infrastructure/mainApi'

export interface MainWindowModel {
  recorder: ReturnType<typeof useRecorderStore.getState>
  devices: AudioDevice[]
  session: ReturnType<typeof useSessionStore.getState>['session']
  recording: boolean
  selected: HistoryItem | null
  playing: HistoryItem | null
  tagged: HistoryItem | null
  player: ReturnType<typeof usePlayerStore.getState>
  /** Elapsed time shown: the recording's, or the position of the file being played. */
  timerMs: number
  timerPaused: boolean
  /** Hotkey of Cut, for the Split tooltip. */
  splitHotkey: string | null
  refreshDevices: () => void
  runRecordingCommand: (id: string, command: RecordingCommand) => void
  openRecordingsFolder: () => void
  openOptions: () => void
  onRecord: () => void
  onStop: () => void
  onPause: () => void
  onPlay: () => void
  onSplit: () => void
}

export function useMainWindow(): MainWindowModel {
  const recorder = useRecorderStore()
  const { devices, refresh: refreshDevices } = useDevicesStore()
  const player = usePlayerStore()
  const { session, record, togglePause, stop: stopRecording, split } = useSessionStore()
  const splitHotkey = useSettingsStore((store) => store.settings?.hotkeys.cut ?? null)
  const recording = session.state !== 'idle'
  const { items, selectedId, tagsId } = recorder

  useEffect(() => {
    loadSession()
    void loadRecorder()
    void loadDevices()
  }, [])

  const selected = items.find((item) => item.id === selectedId) ?? null
  const playing = items.find((item) => item.id === player.playingId) ?? null
  const tagged = items.find((item) => item.id === tagsId) ?? null

  return {
    recorder,
    devices,
    session,
    recording,
    selected,
    playing,
    tagged,
    player,
    timerMs: !recording && player.playingId ? player.positionMs : session.elapsedMs,
    timerPaused: recording ? session.state === 'paused' : player.paused,
    splitHotkey,
    refreshDevices: () => void refreshDevices(),
    runRecordingCommand,
    openRecordingsFolder,
    openOptions,
    onRecord: () => {
      // Playing through the speakers would end up in a loopback recording.
      player.stop()
      void record()
    },
    onStop: () => (recording ? void stopRecording() : player.stop()),
    onPause: () => (recording ? void togglePause() : player.pause()),
    onPlay: () => {
      if (selected) runRecordingCommand(selected.id, 'play')
    },
    onSplit: () => void split()
  }
}
