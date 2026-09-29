/**
 * Every default value and every limit of the app (spec §9, §10, §14).
 *
 * Rule §1.5: no magic configuration values anywhere else. A field's limits sit
 * next to its default so validation (task 03) and the UI read the same source.
 */

import type {
  AudioFormat,
  HotkeyCommand,
  Mp3Mode,
  Settings,
  SourceSelection,
  UiState,
  WavBitDepth
} from './types'

/** Limits of a numeric field edited with a slider or a spinner. */
export interface NumericRange {
  min: number
  max: number
  step: number
}

// ---------------------------------------------------------------------------
// Source and level (spec §4.1, §4.2)
// ---------------------------------------------------------------------------

export const DEFAULT_SOURCE: SourceSelection = { mode: 'system' }

/** What a specific device that is gone records instead (§4.1). */
export const FALLBACK_SOURCE: SourceSelection = { mode: 'system' }

/** The quick modes cover the usual case, so the device list starts collapsed. */
export const DEFAULT_UI_STATE: UiState = { sourceListExpanded: false }

/** Gain of the Level slider, in percent. Double click resets it to the default. */
export const LEVEL_PERCENT: NumericRange = { min: 0, max: 200, step: 1 }
export const DEFAULT_LEVEL_PERCENT = 100

// ---------------------------------------------------------------------------
// Files (spec §9.1-§9.4)
// ---------------------------------------------------------------------------

/** Created under the user's Desktop if it does not exist (task 12). */
export const DEFAULT_FOLDER_NAME = 'Rebecca Listen Recordings'

/**
 * The only naming template of the core. The alternatives, the prefix and the
 * "Save as" dialog come back with task 22.
 */
export const DEFAULT_NAMING_TEMPLATE = '[YYYY-MM-DD][hh-mm-ss]'

/** Suffix added when the target name is taken: " (1)", " (2)"... */
export const NAME_COLLISION_SUFFIX = (n: number): string => ` (${n})`

export const AUDIO_FORMATS: readonly AudioFormat[] = ['mp3', 'wav']
export const DEFAULT_FORMAT: AudioFormat = 'mp3'

export const SAMPLE_RATES: readonly number[] = [8000, 11025, 16000, 22050, 32000, 44100, 48000]
export const DEFAULT_SAMPLE_RATE = 48000

/** 1 = Mono, 2 = Stereo. */
export const CHANNEL_COUNTS: readonly number[] = [1, 2]
export const DEFAULT_CHANNELS = 2

export const MP3_MODES: readonly Mp3Mode[] = ['cbr', 'vbr']
export const DEFAULT_MP3_MODE: Mp3Mode = 'cbr'

/** CBR bitrates offered by LAME, in kbps. */
export const MP3_BITRATES_KBPS: readonly number[] = [
  32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320
]
export const DEFAULT_MP3_BITRATE_KBPS = 192

/** LAME V-level for VBR: 0 is the best quality. */
export const MP3_VBR_QUALITY: NumericRange = { min: 0, max: 9, step: 1 }
export const DEFAULT_MP3_VBR_QUALITY = 2

export const WAV_BIT_DEPTHS: readonly WavBitDepth[] = [16, 24, 32]
export const DEFAULT_WAV_BIT_DEPTH: WavBitDepth = 16

// ---------------------------------------------------------------------------
// Hotkeys and system (spec §10.1, §10.2)
// ---------------------------------------------------------------------------

export const HOTKEY_COMMANDS: readonly HotkeyCommand[] = [
  'file',
  'record',
  'pause',
  'play',
  'stop',
  'cut'
]

// ---------------------------------------------------------------------------
// Engine constants (spec §2.1, §4.1)
// ---------------------------------------------------------------------------

/** Meter and waveform frames pushed to the renderer, per second. */
export const METER_FPS = 30

/** Quietest level main reports; silence (−Infinity dBFS) is sent as this. */
export const METER_FLOOR_DB = -90

/** Waveform columns in each `wave:frame`: 30 fps × 2 = 60 columns per second. */
export const WAVE_COLUMNS_PER_FRAME = 2

/** Device list polling interval; replaces the COM hot-plug notifications. */
export const DEVICE_POLL_MS = 2000

/**
 * A pause this long between loopback blocks means nothing was playing, and the
 * gap is filled with silence (WASAPI sends no packets for silence).
 */
export const LOOPBACK_GAP_MS = 100

/** `session:state` pushes per second while recording (§4.4). */
export const SESSION_TICK_MS = 100

/** How long main waits for an answer of the capture sidecar. */
export const SIDECAR_TIMEOUT_MS = 5000

/** A crashed sidecar is restarted at most this many times per window. */
export const SIDECAR_MAX_RESTARTS = 3
export const SIDECAR_RESTART_WINDOW_MS = 60_000

/**
 * Scheme the renderer plays recordings from: `rl-media://recording/<id>`.
 * Main serves only files of the history (see `src/main/files/mediaProtocol.ts`).
 */
export const MEDIA_SCHEME = 'rl-media'
export const mediaUrl = (id: string): string => `${MEDIA_SCHEME}://recording/${id}`

/** File size is read with `fs.stat` at this interval while recording (§3.3). */
export const FILE_PROGRESS_MS = 500

/** VU meter thresholds in dBFS: green below the first, yellow below the second. */
export const VU_GREEN_MAX_DB = -12
export const VU_YELLOW_MAX_DB = -3

/** Segments per VU row (§4.2). Two rows, L and R. */
export const VU_SEGMENTS = 40

/** Quietest level the VU meter draws; below it no segment lights up. */
export const VU_FLOOR_DB = -60

/** How long the VU peak indicator holds before it starts falling. */
export const VU_PEAK_HOLD_MS = 1000

// ---------------------------------------------------------------------------
// Logging (spec §1.8, §13)
// ---------------------------------------------------------------------------

/** `main.log` is rotated once it passes this size. */
export const LOG_MAX_SIZE_BYTES = 5 * 1024 * 1024

/** Log files kept in total: `main.log` plus its archives (5 MB x 3 of §13). */
export const LOG_MAX_FILES = 3

// ---------------------------------------------------------------------------
// Colors (spec §14). The CSS mirrors these as variables in `:root`.
// ---------------------------------------------------------------------------

export const COLORS = {
  /** Primary blue: slider, selection, waveform. */
  primary: '#1E7BC4',
  /** Recording red: record dot and "Recording" badge. */
  record: '#D9383A',
  /** Teal of the "•••" bar that expands the device list. */
  teal: '#127C8C',
  /** Output (render) endpoints in the Source dropdown. */
  outputDevice: '#3A8A1E',
  /** Input (capture) endpoints in the Source dropdown. */
  inputDevice: '#C0282D'
} as const

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Settings = {
  files: {
    // Empty: main resolves `<Desktop>/DEFAULT_FOLDER_NAME` on first use.
    folder: '',
    format: DEFAULT_FORMAT,
    mp3: {
      sampleRate: DEFAULT_SAMPLE_RATE,
      channels: DEFAULT_CHANNELS,
      mode: DEFAULT_MP3_MODE,
      bitrateKbps: DEFAULT_MP3_BITRATE_KBPS,
      quality: DEFAULT_MP3_VBR_QUALITY
    },
    wav: {
      sampleRate: DEFAULT_SAMPLE_RATE,
      channels: DEFAULT_CHANNELS,
      bitDepth: DEFAULT_WAV_BIT_DEPTH
    }
  },
  hotkeys: {
    file: null,
    record: null,
    pause: null,
    play: null,
    stop: null,
    cut: null
  },
  system: {
    minimizeToTray: false,
    alwaysShowTrayIcon: false,
    alwaysOnTop: false,
    keepHistory: true,
    startWithWindows: false,
    startRecordingOnLaunch: false
  }
}
