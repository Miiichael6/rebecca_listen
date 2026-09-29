/**
 * Recordings finished in this run, newest first. Kept in memory only: the
 * persistent `history.json` arrives with task 17.
 */

import type { HistoryItem } from '@shared/types'

type Listener = (items: HistoryItem[]) => void

let items: HistoryItem[] = []
const listeners = new Set<Listener>()

function add(item: HistoryItem): void {
  items = [item, ...items]
  for (const listener of listeners) listener(items)
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

function onChange(listener: Listener): void {
  listeners.add(listener)
}

export const history = { add, list, has, get, onChange }
