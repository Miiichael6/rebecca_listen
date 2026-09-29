/**
 * Fake data that fills the static layout, so it can be compared with
 * `12_main_window_recording.png` before any audio exists.
 *
 * Everything here disappears as the real sources arrive: the source in task 07,
 * meter and waveform in task 10, session and timer in task 13, list in task 17.
 */

import type { HistoryItem, SessionState, WaveFrame } from '@shared/types'
import { columnsFor } from '../../lib/waveformPainter'

/** Destination folder the fake rows pretend to live in. */
const SAMPLE_FOLDER = String.raw`C:\Users\Me\Desktop\Rebecca Listen Recordings`

/** Width of the waveform strip in the reference window, in CSS pixels. */
const SAMPLE_WIDTH = 445

/** A calm shape with a couple of louder bursts, like the reference screenshot. */
function sampleWave(): WaveFrame {
  const columns = columnsFor(SAMPLE_WIDTH)
  const max: number[] = []
  const min: number[] = []
  for (let index = 0; index < columns; index += 1) {
    const envelope = 0.25 + 0.45 * Math.abs(Math.sin(index / 19)) * Math.abs(Math.cos(index / 7))
    const amplitude = envelope * (0.7 + 0.3 * Math.abs(Math.sin(index / 2.3)))
    max.push(amplitude)
    min.push(-amplitude)
  }
  return { max, min }
}

function item(id: string, name: string, durationMs: number, createdAt: number): HistoryItem {
  return {
    id,
    path: `${SAMPLE_FOLDER}\\${name}`,
    name,
    format: 'mp3',
    durationMs,
    sizeBytes: Math.round((durationMs / 1000) * 24_000),
    createdAt,
    source: { mode: 'system' }
  }
}

export const SAMPLE = {
  sourceLabel: 'Computer Sounds',
  levelPercent: 100,
  rmsDb: [-14, -17],
  peakDb: [-6, -9],
  wave: sampleWave(),
  elapsedMs: 29_000,
  state: 'recording' as SessionState,
  items: [
    item('a', '[2026-09-28][22-48-05].mp3', 5_000, Date.parse('2026-09-28T22:48:05')),
    item('b', '[2026-09-28][22-51-41].mp3', 0, Date.parse('2026-09-28T22:51:41'))
  ],
  selectedId: 'b',
  recordingId: 'b'
}
