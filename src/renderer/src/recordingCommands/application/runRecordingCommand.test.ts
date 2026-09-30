import { describe, expect, it, vi } from 'vitest'
import type { HistoryItem } from '@shared/types'
import type { RecordingCommandsPort } from './ports'
import { runRecordingCommand } from './runRecordingCommand'

const item = (overrides: Partial<HistoryItem> = {}): HistoryItem => ({
  id: 'a',
  name: 'a.mp3',
  path: 'C:/rec/a.mp3',
  format: 'mp3',
  exists: true,
  durationMs: 1000,
  sizeBytes: 10,
  createdAt: 0,
  source: null,
  ...overrides
})

function fakePort(
  items: HistoryItem[],
  state: { recording?: boolean; playing?: string | null } = {}
): RecordingCommandsPort {
  return {
    findItem: (id) => items.find((other) => other.id === id),
    select: vi.fn(),
    warn: vi.fn(),
    isRecording: () => state.recording ?? false,
    playingId: () => state.playing ?? null,
    play: vi.fn(),
    stopPlayback: vi.fn(),
    startRename: vi.fn(),
    openTags: vi.fn(),
    clearList: vi.fn(),
    convert: vi.fn(),
    merge: vi.fn(),
    duplicate: vi.fn(),
    remove: vi.fn(),
    deleteFile: vi.fn(),
    openPath: vi.fn(),
    showInFolder: vi.fn(),
    copyText: vi.fn()
  }
}

describe('runRecordingCommand', () => {
  it('ignores an id that is not in the list', () => {
    const port = fakePort([])
    runRecordingCommand(port, 'x', 'play')
    expect(port.select).not.toHaveBeenCalled()
  })

  it('selects the row and warns when the file is gone', () => {
    const port = fakePort([item({ exists: false })])
    runRecordingCommand(port, 'a', 'play')
    expect(port.select).toHaveBeenCalledWith('a')
    expect(port.warn).toHaveBeenCalledWith('a.mp3 no longer exists')
    expect(port.play).not.toHaveBeenCalled()
  })

  it('does not play while recording', () => {
    const port = fakePort([item()], { recording: true })
    runRecordingCommand(port, 'a', 'play')
    expect(port.play).not.toHaveBeenCalled()
  })

  it('plays when idle', () => {
    const port = fakePort([item()])
    runRecordingCommand(port, 'a', 'play')
    expect(port.play).toHaveBeenCalledWith('a')
  })

  it('stops the playback of a file before its tags, removal or deletion', () => {
    for (const command of ['tags', 'remove', 'delete'] as const) {
      const port = fakePort([item()], { playing: 'a' })
      runRecordingCommand(port, 'a', command)
      expect(port.stopPlayback).toHaveBeenCalledOnce()
    }
  })

  it('keeps playing another file when one is removed', () => {
    const port = fakePort([item()], { playing: 'b' })
    runRecordingCommand(port, 'a', 'remove')
    expect(port.stopPlayback).not.toHaveBeenCalled()
    expect(port.remove).toHaveBeenCalledWith('a')
  })

  it('routes delete and remove to their own calls', () => {
    const port = fakePort([item()])
    runRecordingCommand(port, 'a', 'delete')
    expect(port.deleteFile).toHaveBeenCalledWith('a')
    expect(port.remove).not.toHaveBeenCalled()
  })

  it('parses the format commands', () => {
    const port = fakePort([item()])
    runRecordingCommand(port, 'a', 'convert:wav')
    runRecordingCommand(port, 'a', 'merge:mp3')
    expect(port.convert).toHaveBeenCalledWith('a', 'wav')
    expect(port.merge).toHaveBeenCalledWith('mp3')
  })

  it('opens, shows and copies the path of the file', () => {
    const port = fakePort([item()])
    runRecordingCommand(port, 'a', 'openExternal')
    runRecordingCommand(port, 'a', 'openLocation')
    runRecordingCommand(port, 'a', 'copyPath')
    expect(port.openPath).toHaveBeenCalledWith('C:/rec/a.mp3')
    expect(port.showInFolder).toHaveBeenCalledWith('C:/rec/a.mp3')
    expect(port.copyText).toHaveBeenCalledWith('C:/rec/a.mp3')
  })
})
