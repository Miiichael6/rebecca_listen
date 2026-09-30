/**
 * The single IPC contract (spec §1.4). No channel is declared anywhere else.
 *
 * `IpcInvoke` is renderer -> main request/response, `IpcEvents` is main ->
 * renderer push. The channel whitelists below are derived from those maps and
 * are what the preload allows through.
 *
 * This module must stay free of `electron` imports: the renderer bundles it.
 * The typed wrappers live in `src/main/ipc/typed.ts` and `src/preload/api.ts`.
 */

import type {
  AppInfo,
  AudioDevice,
  AudioFormat,
  AudioTags,
  HistoryItem,
  MeterFrame,
  Notice,
  SessionSnapshot,
  Settings,
  SettingsUpdate,
  SourceSelection,
  UiState,
  UpdateStatus,
  WaveFrame
} from './types'

// ---------------------------------------------------------------------------
// Request / response channels
// ---------------------------------------------------------------------------

export interface IpcInvoke {
  /** App name and version, for the window and the System tab footer. */
  'app:info': { req: void; res: AppInfo }

  'settings:get': { req: void; res: Settings }
  /** Patches one section and returns the settings as they were stored. */
  'settings:update': { req: SettingsUpdate; res: Settings }
  'settings:reset': { req: void; res: Settings }
  /** Main window UI state kept across restarts; `set` returns it as stored. */
  'ui:get': { req: void; res: UiState }
  'ui:set': { req: Partial<UiState>; res: UiState }

  /** Endpoints usable right now; disconnected ones are not listed. */
  'devices:list': { req: void; res: AudioDevice[] }

  'source:get': { req: void; res: SourceSelection }
  'source:set': { req: SourceSelection; res: void }
  /** Gain of the Level slider, in percent (see `LEVEL_PERCENT`). */
  'level:get': { req: void; res: number }
  'level:set': { req: number; res: void }

  'session:record': { req: void; res: SessionSnapshot }
  /** Pauses while recording, resumes while paused (§4.8). */
  'session:pause': { req: void; res: SessionSnapshot }
  'session:stop': { req: void; res: SessionSnapshot }
  /** Closes the current file and keeps recording into a new one. */
  'session:split': { req: void; res: SessionSnapshot }

  'history:list': { req: void; res: HistoryItem[] }
  /** Removes from the list only; the file stays on disk. */
  'history:remove': { req: { id: string }; res: HistoryItem[] }
  /** Renames the file on disk and in the list. */
  'history:rename': { req: { id: string; name: string }; res: HistoryItem[] }
  /** Asks for confirmation, then empties the list; the files stay on disk. */
  'history:clear': { req: void; res: HistoryItem[] }
  /** Copies the file next to it (`<name> - Copy`) and adds it to the list. */
  'history:duplicate': { req: { id: string }; res: HistoryItem[] }
  /** Asks for confirmation, then moves the file to the Recycle Bin and out of the list. */
  'history:delete': { req: { id: string }; res: HistoryItem[] }
  /** Encodes a copy in another format next to the file and adds it to the list. */
  'history:convert': { req: { id: string; format: AudioFormat }; res: HistoryItem[] }
  /** Joins every file of the list, oldest first, into a new file and adds it to the list. */
  'history:merge': { req: { format: AudioFormat }; res: HistoryItem[] }
  /** Tags of the file, for the Tag Editor; `null` when they cannot be read (reported as a notice). */
  'history:readTags': { req: { id: string }; res: AudioTags | null }
  /** Rewrites the tags of the file in place (the audio is copied, not encoded again). */
  'history:writeTags': { req: { id: string; tags: AudioTags }; res: HistoryItem[] }
  /**
   * Audio file picker (mp3, wav); the chosen file joins the list, or is found in
   * it when it is already there. Resolves with its id, `null` when cancelled.
   */
  'history:import': { req: void; res: string | null }

  /** Folder new recordings go to (the default one while the setting is empty). */
  'files:getFolder': { req: void; res: string }
  /** Folder picker; the chosen folder is checked and saved, `null` when cancelled or refused. */
  'files:chooseFolder': { req: void; res: string | null }

  /** Opens a file or folder with the system default app. */
  'shell:openPath': { req: { path: string }; res: void }
  /** Opens the Explorer with the file selected (only files of the list). */
  'shell:showItemInFolder': { req: { path: string }; res: void }
  /** Opens the recordings folder, creating it if it does not exist yet. */
  'shell:openRecordingsFolder': { req: void; res: void }
  /** Opens the current log file (System tab, "Open Log File"). */
  'shell:openLogFile': { req: void; res: void }

  'updates:status': { req: void; res: UpdateStatus }
  /** Looks for a newer release; the result also arrives on `updates:changed`. */
  'updates:check': { req: void; res: UpdateStatus }
  /** Downloads the release found by `updates:check`. */
  'updates:download': { req: void; res: UpdateStatus }
  /** Quits, installs the downloaded release and reopens the app; refused while recording. */
  'updates:install': { req: void; res: { ok: boolean } }
}

// ---------------------------------------------------------------------------
// Push channels (main -> renderer)
// ---------------------------------------------------------------------------

export interface IpcEvents {
  'devices:changed': AudioDevice[]
  'session:state': SessionSnapshot
  'meter:frame': MeterFrame
  'wave:frame': WaveFrame
  'history:changed': HistoryItem[]
  'settings:changed': Settings
  'updates:changed': UpdateStatus
  notice: Notice
}

// ---------------------------------------------------------------------------
// Types derived from the maps
// ---------------------------------------------------------------------------

export type InvokeChannel = keyof IpcInvoke
export type InvokeReq<C extends InvokeChannel> = IpcInvoke[C]['req']
export type InvokeRes<C extends InvokeChannel> = IpcInvoke[C]['res']

export type EventChannel = keyof IpcEvents
export type EventPayload<C extends EventChannel> = IpcEvents[C]

/** `[]` for channels without a request, `[req]` for the rest. */
export type InvokeArgs<C extends InvokeChannel> =
  InvokeReq<C> extends void ? [] : [req: InvokeReq<C>]

/** The surface exposed as `window.api`. */
export interface RebeccaApi {
  invoke<C extends InvokeChannel>(channel: C, ...args: InvokeArgs<C>): Promise<InvokeRes<C>>
  /** Subscribes to a push channel and returns the unsubscribe function. */
  on<C extends EventChannel>(channel: C, listener: (payload: EventPayload<C>) => void): () => void
}

// ---------------------------------------------------------------------------
// Whitelists used by the preload
// ---------------------------------------------------------------------------

export const INVOKE_CHANNELS = [
  'app:info',
  'settings:get',
  'settings:update',
  'settings:reset',
  'ui:get',
  'ui:set',
  'devices:list',
  'source:get',
  'source:set',
  'level:get',
  'level:set',
  'session:record',
  'session:pause',
  'session:stop',
  'session:split',
  'history:list',
  'history:remove',
  'history:rename',
  'history:clear',
  'history:duplicate',
  'history:delete',
  'history:import',
  'history:convert',
  'history:merge',
  'history:readTags',
  'history:writeTags',
  'files:getFolder',
  'files:chooseFolder',
  'shell:openPath',
  'shell:showItemInFolder',
  'shell:openRecordingsFolder',
  'shell:openLogFile',
  'updates:status',
  'updates:check',
  'updates:download',
  'updates:install'
] as const satisfies readonly InvokeChannel[]

export const EVENT_CHANNELS = [
  'devices:changed',
  'session:state',
  'meter:frame',
  'wave:frame',
  'history:changed',
  'settings:changed',
  'updates:changed',
  'notice'
] as const satisfies readonly EventChannel[]

/**
 * Compile-time proof that the whitelists cover the maps: these resolve to
 * `true`, or to a tuple naming the channels left out.
 */
export type AllInvokeChannelsListed = [
  Exclude<InvokeChannel, (typeof INVOKE_CHANNELS)[number]>
] extends [never]
  ? true
  : ['missing invoke channels', Exclude<InvokeChannel, (typeof INVOKE_CHANNELS)[number]>]

export type AllEventChannelsListed = [
  Exclude<EventChannel, (typeof EVENT_CHANNELS)[number]>
] extends [never]
  ? true
  : ['missing event channels', Exclude<EventChannel, (typeof EVENT_CHANNELS)[number]>]

export function isInvokeChannel(channel: string): channel is InvokeChannel {
  return (INVOKE_CHANNELS as readonly string[]).includes(channel)
}

export function isEventChannel(channel: string): channel is EventChannel {
  return (EVENT_CHANNELS as readonly string[]).includes(channel)
}
