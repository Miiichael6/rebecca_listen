/**
 * Completing and clipping what was read from `settings.json`.
 *
 * Every missing key is filled from `defaults.ts` and every out-of-range value is
 * clipped to the limits declared next to its default (§1.5), so the rest of main
 * and the whole renderer can treat the settings as always valid.
 *
 * Pure logic, no IO: unit tested in `validate.test.ts`.
 */

import { MAIN_WINDOW_SIZE } from '@shared/appInfo'
import {
  AUDIO_FORMATS,
  CHANNEL_COUNTS,
  DEFAULT_SETTINGS,
  HOTKEY_COMMANDS,
  MP3_BITRATES_KBPS,
  MP3_MODES,
  MP3_VBR_QUALITY,
  SAMPLE_RATES,
  WAV_BIT_DEPTHS
} from '@shared/defaults'
import type { WindowBounds } from '@shared/settingsSchema'
import type {
  FilesSettings,
  HotkeysSettings,
  Mp3Settings,
  Settings,
  SourceMode,
  SourceSelection,
  SystemSettings,
  UiState,
  WavSettings
} from '@shared/types'
import {
  booleanOr,
  clampToRange,
  closestOf,
  integerOr,
  isRaw,
  oneOf,
  rawAt,
  stringOr
} from './coerce'

// ---------------------------------------------------------------------------
// Settings (spec §9, §10)
// ---------------------------------------------------------------------------

function validateMp3(raw: unknown, fallback: Mp3Settings): Mp3Settings {
  return {
    sampleRate: closestOf(rawAt(raw, 'sampleRate'), SAMPLE_RATES, fallback.sampleRate),
    channels: closestOf(rawAt(raw, 'channels'), CHANNEL_COUNTS, fallback.channels),
    mode: oneOf(rawAt(raw, 'mode'), MP3_MODES, fallback.mode),
    bitrateKbps: closestOf(rawAt(raw, 'bitrateKbps'), MP3_BITRATES_KBPS, fallback.bitrateKbps),
    quality: clampToRange(rawAt(raw, 'quality'), MP3_VBR_QUALITY, fallback.quality)
  }
}

function validateWav(raw: unknown, fallback: WavSettings): WavSettings {
  return {
    sampleRate: closestOf(rawAt(raw, 'sampleRate'), SAMPLE_RATES, fallback.sampleRate),
    channels: closestOf(rawAt(raw, 'channels'), CHANNEL_COUNTS, fallback.channels),
    bitDepth: closestOf(rawAt(raw, 'bitDepth'), WAV_BIT_DEPTHS, fallback.bitDepth)
  }
}

function validateFiles(raw: unknown, fallback: FilesSettings): FilesSettings {
  return {
    // An empty folder means "resolve the default destination at runtime" (task 12).
    folder: stringOr(rawAt(raw, 'folder'), fallback.folder),
    format: oneOf(rawAt(raw, 'format'), AUDIO_FORMATS, fallback.format),
    mp3: validateMp3(rawAt(raw, 'mp3'), fallback.mp3),
    wav: validateWav(rawAt(raw, 'wav'), fallback.wav)
  }
}

function validateHotkeys(raw: unknown, fallback: HotkeysSettings): HotkeysSettings {
  const hotkeys = {} as HotkeysSettings
  for (const command of HOTKEY_COMMANDS) {
    const accelerator = rawAt(raw, command)
    // Anything that is not a non-empty accelerator means "None", as in the original.
    if (typeof accelerator === 'string') {
      hotkeys[command] = accelerator.trim() === '' ? null : accelerator
    } else {
      hotkeys[command] = accelerator === null ? null : fallback[command]
    }
  }
  return hotkeys
}

function validateSystem(raw: unknown, fallback: SystemSettings): SystemSettings {
  return {
    minimizeToTray: booleanOr(rawAt(raw, 'minimizeToTray'), fallback.minimizeToTray),
    alwaysShowTrayIcon: booleanOr(rawAt(raw, 'alwaysShowTrayIcon'), fallback.alwaysShowTrayIcon),
    alwaysOnTop: booleanOr(rawAt(raw, 'alwaysOnTop'), fallback.alwaysOnTop),
    keepHistory: booleanOr(rawAt(raw, 'keepHistory'), fallback.keepHistory),
    startWithWindows: booleanOr(rawAt(raw, 'startWithWindows'), fallback.startWithWindows),
    startRecordingOnLaunch: booleanOr(
      rawAt(raw, 'startRecordingOnLaunch'),
      fallback.startRecordingOnLaunch
    )
  }
}

/**
 * One complete and valid `Settings`. Unknown keys are dropped; invalid ones fall
 * back to `fallback`, which is `DEFAULT_SETTINGS` when reading a file and the
 * current settings when applying a patch.
 */
export function validateSettings(raw: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  return {
    files: validateFiles(rawAt(raw, 'files'), fallback.files),
    hotkeys: validateHotkeys(rawAt(raw, 'hotkeys'), fallback.hotkeys),
    system: validateSystem(rawAt(raw, 'system'), fallback.system)
  }
}

// ---------------------------------------------------------------------------
// Source, UI state and window geometry (spec §4.1, §13)
// ---------------------------------------------------------------------------

const SOURCE_MODES: readonly SourceMode[] = ['system', 'voice', 'mixed', 'device']

export function validateSource(raw: unknown, fallback: SourceSelection): SourceSelection {
  const mode = rawAt(raw, 'mode')
  if (!SOURCE_MODES.includes(mode as SourceMode)) return fallback
  if (mode === 'mixed') {
    const voiceId = rawAt(raw, 'voiceId')
    return typeof voiceId === 'string' && voiceId !== '' ? { mode, voiceId } : { mode }
  }
  if (mode !== 'device') return { mode: mode as 'system' | 'voice' }

  const deviceId = rawAt(raw, 'deviceId')
  // A device selection without an id is unusable. The device may also be gone by
  // now, which task 07 handles when it fills the dropdown.
  if (typeof deviceId !== 'string' || deviceId === '') return fallback
  return { mode: 'device', deviceId }
}

export function validateUiState(raw: unknown, fallback: UiState): UiState {
  return {
    sourceListExpanded: booleanOr(rawAt(raw, 'sourceListExpanded'), fallback.sourceListExpanded)
  }
}

/** `null` while the file has no usable geometry, so the defaults of §4 apply. */
export function validateWindowBounds(raw: unknown): WindowBounds | null {
  if (!isRaw(raw)) return null
  const width = integerOr(raw.width, 0)
  const height = integerOr(raw.height, 0)
  if (width === 0 || height === 0) return null
  if (typeof raw.x !== 'number' || typeof raw.y !== 'number') return null

  return {
    x: integerOr(raw.x, 0),
    y: integerOr(raw.y, 0),
    // Never restore a window smaller than the minimum of the layout (§4).
    width: Math.max(MAIN_WINDOW_SIZE.minWidth, width),
    height: Math.max(MAIN_WINDOW_SIZE.minHeight, height)
  }
}
