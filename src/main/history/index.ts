/**
 * The list of recordings (spec §4.6, §13), newest first: kept in memory,
 * written to `history.json` on every change and pushed through `onChange`.
 *
 * Only this module touches the files of the list (rename, copy); the IPC
 * layer asks it by id, never by path.
 */

import { randomUUID } from 'crypto'
import { constants, existsSync } from 'fs'
import { copyFile, rename as renameFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import type { HistoryItem, NewHistoryItem } from '@shared/types'
import { DAMAGED_SUFFIX, HistoryFile } from './file'
import { copyPath, normalizeFileName } from './fileName'

export { HISTORY_FILE_NAME } from './file'
export { copyPath, firstFreePath, normalizeFileName, withFormat } from './fileName'

type Listener = (items: HistoryItem[]) => void

/** Where the history reports what it found in its file. */
export interface HistoryLog {
  info: (message: string) => void
  warn: (message: string) => void
}

let items: HistoryItem[] = []
let file: HistoryFile | null = null
const listeners = new Set<Listener>()

/** Loads `path`, checking which files still exist. Call once before the IPC. */
export function initHistory(path: string, log: HistoryLog): void {
  file = new HistoryFile(path)
  const { entries, dropped, damaged } = file.read()
  if (damaged) {
    log.warn(`history file could not be read, set aside as ${path}${DAMAGED_SUFFIX}; list empty`)
  }
  if (dropped > 0) log.warn(`history: ${dropped} invalid entries left out of ${path}`)
  items = entries.map((entry) => ({ ...entry, exists: existsSync(entry.path) }))
  log.info(`history loaded: ${items.length} recordings from ${path}`)
}

/** Replaces the list, stores it and lets listeners know. */
function commit(next: HistoryItem[]): HistoryItem[] {
  items = next
  file?.write(items)
  for (const listener of listeners) listener(items)
  return items
}

function add(item: NewHistoryItem): void {
  commit([{ ...item, exists: true }, ...items])
}

function list(): HistoryItem[] {
  return items
}

function has(path: string): boolean {
  return items.some((item) => item.path === path)
}

function get(id: string): HistoryItem | undefined {
  return items.find((item) => item.id === id)
}

/** Windows paths ignore case. */
function findByPath(path: string): HistoryItem | undefined {
  const wanted = path.toLowerCase()
  return items.find((item) => item.path.toLowerCase() === wanted)
}

/** The item, if its file is still on disk; throws a message fit for the user otherwise. */
function existing(id: string): HistoryItem {
  const item = get(id)
  if (!item) throw new Error('The recording is no longer in the list')
  if (!existsSync(item.path)) throw new Error(`${item.name} no longer exists`)
  return item
}

/**
 * Checks again which files exist (the Explorer may have deleted or restored
 * some); only a change is stored and pushed.
 */
function checkFiles(): void {
  let changed = false
  const next = items.map((item) => {
    const exists = existsSync(item.path)
    if (exists === item.exists) return item
    changed = true
    return { ...item, exists }
  })
  if (changed) commit(next)
}

/** Renames the file on disk and in the list. Rejects when the name is taken. */
async function rename(id: string, requested: string): Promise<HistoryItem[]> {
  const item = existing(id)
  const name = normalizeFileName(requested, item.name)
  if (name === item.name) return items
  const path = join(dirname(item.path), name)
  // Windows is case-insensitive: only a change of case may target an existing path.
  if (path.toLowerCase() !== item.path.toLowerCase() && existsSync(path)) {
    throw new Error(`A file named ${name} already exists`)
  }
  await renameFile(item.path, path)
  return commit(items.map((other) => (other.id === id ? { ...other, name, path } : other)))
}

/** Stores what changed in the file of an item (its size after the Tag Editor). */
function update(id: string, patch: Partial<Pick<HistoryItem, 'sizeBytes'>>): HistoryItem[] {
  return commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
}

/** Takes the item out of the list; the file stays on disk. */
function remove(id: string): HistoryItem[] {
  return commit(items.filter((item) => item.id !== id))
}

/** Empties the list; the files stay on disk. */
function clear(): HistoryItem[] {
  return commit([])
}

/** Copies the file next to the original and adds the copy on top of the list. */
async function duplicate(id: string): Promise<HistoryItem[]> {
  const item = existing(id)
  const path = copyPath(item.path)
  // EXCL: never overwrite a file that appeared since `copyPath` looked.
  await copyFile(item.path, path, constants.COPYFILE_EXCL)
  add({ ...item, id: randomUUID(), path, name: basename(path) })
  return items
}

function onChange(listener: Listener): void {
  listeners.add(listener)
}

export const history = {
  add,
  list,
  has,
  get,
  findByPath,
  existing,
  checkFiles,
  rename,
  remove,
  clear,
  duplicate,
  update,
  onChange
}
