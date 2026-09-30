/**
 * What running a recording command needs from the outside world. The use case
 * talks to this, never to the stores, `window.api` or the clipboard; the
 * adapter in `../infrastructure` is what plugs the real ones in.
 */

import type { AudioFormat, HistoryItem } from '@shared/types'

export interface RecordingCommandsPort {
  findItem(id: string): HistoryItem | undefined
  select(id: string): void
  /** Tells the user something did not go through. */
  warn(message: string): void
  /** Playing is off while recording: through the speakers it would end up in a loopback file. */
  isRecording(): boolean

  playingId(): string | null
  play(id: string): void
  stopPlayback(): void

  startRename(id: string): void
  openTags(id: string): void
  clearList(): void

  convert(id: string, format: AudioFormat): void
  merge(format: AudioFormat): void
  duplicate(id: string): void
  remove(id: string): void
  deleteFile(id: string): void

  openPath(path: string): void
  showInFolder(path: string): void
  copyText(text: string): void
}
