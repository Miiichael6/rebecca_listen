import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'
import { loadSettings, useSettingsStore } from './store/settings'

function App(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const settings = useSettingsStore((state) => state.settings)

  useEffect(() => {
    window.api.invoke('app:info').then(setInfo)
    loadSettings()
  }, [])

  // Placeholder until task 04 builds the real layout.
  return (
    <>
      <h1>{info ? `${info.name} ${info.version}` : 'Loading…'}</h1>
      <p>{settings ? `Format: ${settings.files.format}` : 'Loading settings…'}</p>
    </>
  )
}

export default App
