import { useEffect, useState } from 'react'
import type { AppInfo } from '@shared/types'

function App(): React.JSX.Element {
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    window.api.invoke('app:info').then(setInfo)
  }, [])

  // Placeholder until task 04 builds the real layout.
  return <h1>{info ? `${info.name} ${info.version}` : 'Loading…'}</h1>
}

export default App
