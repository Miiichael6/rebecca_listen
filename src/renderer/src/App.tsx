import { useEffect } from 'react'
import { loadSettings } from './store/settings'
import { MainWindow } from './windows/Main/MainWindow'

function App(): React.JSX.Element {
  useEffect(() => {
    loadSettings()
  }, [])

  return <MainWindow />
}

export default App
