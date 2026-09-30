/**
 * ⏏ File of the transport bar (spec §4.8): a click opens the recordings
 * folder; right click, `Shift+F10`, the menu key or `↓` open its menu with
 * Open folder, Change folder…, Open audio file… and Clear list…, under the
 * path of the folder.
 */

import { useCallback, useRef, useState } from 'react'
import { FileAudio, Folder, FolderCog, FolderOpen, ListX } from 'lucide-react'
import { ContextMenu, type ContextMenuItem } from './ContextMenu/ContextMenu'

type FileAction = 'openFolder' | 'changeFolder' | 'openAudioFile' | 'clearList'

interface FileButtonProps {
  /** Look of the round buttons of the bar. */
  className: string
  iconSize: number
  /** Clear list is greyed out on an empty list. */
  hasItems: boolean
  /** Recordings folder: the title of the menu and the tooltip. */
  folder?: string
  onOpenFolder?: () => void
  onChangeFolder?: () => void
  onOpenAudioFile?: () => void
  onClearList?: () => void
}

function menuItems(hasItems: boolean): ContextMenuItem[] {
  return [
    { key: 'openFolder', label: 'Open folder', icon: FolderOpen },
    { key: 'changeFolder', label: 'Change folder…', icon: FolderCog },
    { key: 'openAudioFile', label: 'Open audio file…', icon: FileAudio },
    { key: 'clearList', label: 'Clear list…', icon: ListX, separated: true, disabled: !hasItems }
  ]
}

export function FileButton({
  className,
  iconSize,
  hasItems,
  folder,
  onOpenFolder,
  onChangeFolder,
  onOpenAudioFile,
  onClearList
}: FileButtonProps): React.JSX.Element {
  const button = useRef<HTMLButtonElement>(null)
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null)

  const closeMenu = useCallback(() => {
    setMenuAt(null)
    button.current?.focus()
  }, [])

  /** From the keyboard the menu opens under the button. */
  const openMenuBelow = (): void => {
    const box = button.current?.getBoundingClientRect()
    if (box) setMenuAt({ x: box.left, y: box.bottom })
  }

  const actions: Record<FileAction, (() => void) | undefined> = {
    openFolder: onOpenFolder,
    changeFolder: onChangeFolder,
    openAudioFile: onOpenAudioFile,
    clearList: onClearList
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        className={className}
        title={`Open ${folder || 'folder'} (right click for more)`}
        aria-haspopup="menu"
        onClick={onOpenFolder}
        onContextMenu={(event) => {
          event.preventDefault()
          setMenuAt({ x: event.clientX, y: event.clientY })
        }}
        onKeyDown={(event) => {
          const opens =
            event.key === 'ContextMenu' ||
            event.key === 'ArrowDown' ||
            (event.shiftKey && event.key === 'F10')
          if (!opens) return
          event.preventDefault()
          openMenuBelow()
        }}
      >
        <Folder size={iconSize} aria-hidden />
      </button>
      {menuAt && (
        <ContextMenu
          x={menuAt.x}
          y={menuAt.y}
          title={folder}
          items={menuItems(hasItems)}
          onChoose={(key) => actions[key as FileAction]?.()}
          onClose={closeMenu}
        />
      )}
    </>
  )
}
