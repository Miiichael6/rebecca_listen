/** Icon of each item of the recording menu; the menu itself is built without them. */

import {
  ArrowRightLeft,
  ClipboardCopy,
  Combine,
  Copy,
  Eraser,
  ExternalLink,
  FileAudio,
  FolderOpen,
  ListX,
  PencilLine,
  Play,
  Tags,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import type { MenuItem } from '../ContextMenu/domain/types'
import type { ContextMenuItem } from '../ContextMenu/types'

const ICONS: Record<string, LucideIcon> = {
  play: Play,
  openExternal: ExternalLink,
  rename: PencilLine,
  tags: Tags,
  duplicate: Copy,
  convert: ArrowRightLeft,
  merge: Combine,
  openLocation: FolderOpen,
  copyPath: ClipboardCopy,
  remove: ListX,
  delete: Trash2,
  clearAll: Eraser
}

/** Items of a submenu are the formats, all with the same icon. */
export function withIcons(items: MenuItem[], inSubmenu = false): ContextMenuItem[] {
  return items.map((item) => ({
    ...item,
    icon: inSubmenu ? FileAudio : ICONS[item.key],
    children: item.children && withIcons(item.children, true)
  }))
}
