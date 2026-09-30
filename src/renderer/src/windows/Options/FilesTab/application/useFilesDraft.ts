/**
 * The Files section of the Options draft: its values, the edits the panels
 * make and the live "For example" path, which main computes so it matches the
 * name a recording really gets (counter and collisions included).
 */

import { useEffect, useState } from 'react'
import type { FilesSettings, Mp3Settings, WavSettings } from '@shared/types'
import { useOptionsDraft } from '../../../../store/optionsDraft'
import { pickFolder, previewPath } from '../infrastructure/filesApi'

export interface FilesDraft {
  files: FilesSettings
  edit: (patch: Partial<FilesSettings>) => void
  editMp3: (patch: Partial<Mp3Settings>) => void
  editWav: (patch: Partial<WavSettings>) => void
  chooseFolder: () => void
  /** Empty until main answers. */
  example: string
}

function useExamplePath(files: FilesSettings): string {
  const [example, setExample] = useState('')
  const { folder, prefix, template, customPattern, format } = files

  useEffect(() => {
    let current = true
    void previewPath({ folder, prefix, template, customPattern, format }).then((path) => {
      if (current) setExample(path)
    })
    return () => {
      current = false
    }
  }, [folder, prefix, template, customPattern, format])

  return example
}

export function useFilesDraft(files: FilesSettings): FilesDraft {
  const edit = useOptionsDraft((store) => store.edit)
  const example = useExamplePath(files)

  return {
    files,
    edit: (patch) => edit('files', patch),
    editMp3: (patch) => edit('files', { mp3: { ...files.mp3, ...patch } }),
    editWav: (patch) => edit('files', { wav: { ...files.wav, ...patch } }),
    chooseFolder: () =>
      void pickFolder().then((folder) => {
        if (folder) edit('files', { folder })
      }),
    example
  }
}
