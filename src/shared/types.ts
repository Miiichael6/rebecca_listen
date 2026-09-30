/**
 * Domain types shared by main, preload and renderer.
 *
 * Only types live here: every default value is in `defaults.ts` and every IPC
 * channel is in `ipc.ts`.
 */

// ---------------------------------------------------------------------------
// Devices and source (spec §3.1, §4.1)
// ---------------------------------------------------------------------------

/** `render` endpoints are captured in loopback; `capture` ones are microphones. */
export type DeviceKind = 'render' | 'capture'

/**
 * An audio endpoint usable right now. Disconnected endpoints are never listed
 * (see task 05), so there is no `state` field.
 */
export interface AudioDevice {
  /** Stable WASAPI endpoint id from cpal, e.g. `wasapi:{0.0.0.00000000}.{guid}`. */
  id: string
  /** Endpoint name without the hardware group, e.g. "Altavoces". */
  name: string
  /** Hardware group, e.g. "Realtek(R) Audio". */
  groupName: string
  kind: DeviceKind
  /** Default endpoint of its kind in Windows. */
  isDefault: boolean
  channels: number
  sampleRate: number
}

/** What is being recorded: one of the three quick modes, or a specific device. */
export type SourceSelection =
  { mode: 'system' | 'voice' | 'mixed' } | { mode: 'device'; deviceId: string }

export type SourceMode = SourceSelection['mode']

// ---------------------------------------------------------------------------
// Session (spec §4.9)
// ---------------------------------------------------------------------------

/** `waiting` and `scheduled` are out of scope (VAS and Schedule were dropped). */
export type SessionState = 'idle' | 'recording' | 'paused'

export interface SessionSnapshot {
  state: SessionState
  /** Recorded time only: it does not advance while paused. */
  elapsedMs: number
  /** File being written, or `null` when idle. */
  file: { path: string; name: string } | null
}

// ---------------------------------------------------------------------------
// Output formats (spec §9; OGG and FLAC are out of scope, see task 11)
// ---------------------------------------------------------------------------

export type AudioFormat = 'mp3' | 'wav'

export type Mp3Mode = 'cbr' | 'vbr'

export type WavBitDepth = 16 | 24 | 32

// ---------------------------------------------------------------------------
// Metering (spec §4.2, §4.3)
// ---------------------------------------------------------------------------

/** One meter tick: RMS and peak in dBFS, one entry per channel. */
export interface MeterFrame {
  rmsDb: number[]
  peakDb: number[]
}

/** Decimated waveform peaks for one tick, mirrored around the centre line. */
export interface WaveFrame {
  /** Lowest sample of each bucket, in -1..1. */
  min: number[]
  /** Highest sample of each bucket, in -1..1. */
  max: number[]
}

// ---------------------------------------------------------------------------
// Settings (spec §9.1-§9.4, §10.1, §10.2)
// ---------------------------------------------------------------------------

export interface Mp3Settings {
  sampleRate: number
  channels: number
  mode: Mp3Mode
  /** Used when `mode` is `cbr`. */
  bitrateKbps: number
  /** LAME V-level used when `mode` is `vbr`. */
  quality: number
}

export interface WavSettings {
  sampleRate: number
  channels: number
  bitDepth: WavBitDepth
}

export interface FilesSettings {
  /** Destination folder; empty means "resolve the default at runtime". */
  folder: string
  format: AudioFormat
  mp3: Mp3Settings
  wav: WavSettings
}

/** Commands that can take a global hotkey (spec §10.1). */
export type HotkeyCommand = 'file' | 'record' | 'pause' | 'play' | 'stop' | 'cut'

/** Electron accelerator per command; `null` is the "None" of the original. */
export type HotkeysSettings = Record<HotkeyCommand, string | null>

export interface SystemSettings {
  minimizeToTray: boolean
  alwaysShowTrayIcon: boolean
  alwaysOnTop: boolean
  keepHistory: boolean
  startWithWindows: boolean
  startRecordingOnLaunch: boolean
}

/**
 * All persisted settings. The core only reads `files`; `hotkeys` and `system`
 * are declared now so tasks 23, 30 and 31 do not have to change this type.
 */
export interface Settings {
  files: FilesSettings
  hotkeys: HotkeysSettings
  system: SystemSettings
}

export type SettingsSection = keyof Settings

/** A patch on one section, discriminated so the payload stays typed. */
export type SettingsUpdate = {
  [S in SettingsSection]: { section: S; patch: Partial<Settings[S]> }
}[SettingsSection]

// ---------------------------------------------------------------------------
// History (spec §13)
// ---------------------------------------------------------------------------

export interface HistoryItem {
  id: string
  path: string
  name: string
  format: AudioFormat
  durationMs: number
  sizeBytes: number
  /** Epoch milliseconds. */
  createdAt: number
  /** What was recorded; `null` for a file not recorded here (opened from disk or merged). */
  source: SourceSelection | null
  /** `false` once the file is gone from disk; checked at startup and when the window gets focus. */
  exists: boolean
}

/** An item as it is added: whether the file exists is for the history to find out. */
export type NewHistoryItem = Omit<HistoryItem, 'exists'>

/** Tags of a file shown by the Tag Editor; an empty string is a tag the file does not have. */
export interface AudioTags {
  title: string
  artist: string
  album: string
  year: string
  genre: string
  comment: string
}

/**
 * What can be done to a recording of the list: the context menu sends one,
 * and the keyboard shortcuts of the list run the same ones.
 */
export type RecordingCommand =
  | 'play'
  | 'openExternal'
  | 'tags'
  | `convert:${AudioFormat}`
  | `merge:${AudioFormat}`
  | 'clearAll'
  | 'rename'
  | 'duplicate'
  | 'openLocation'
  | 'copyPath'
  | 'remove'
  | 'delete'

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Bits of main window UI state that survive a restart. */
export interface UiState {
  /** Advanced device list of the Source dropdown ("•••" bar) expanded. */
  sourceListExpanded: boolean
}

export interface AppInfo {
  name: string
  version: string
}

/** One-off message for the renderer (device lost, write error...). */
export interface Notice {
  level: 'info' | 'warn' | 'error'
  message: string
}
