import { useEffect } from 'react'
import { TitleBar } from './components/TitleBar/TitleBar'
import { loadSettings } from './store/settings'
import { loadUpdates } from './store/updates'
import { MainWindow } from './windows/Main/MainWindow'
import styles from './App.module.css'

function App(): React.JSX.Element {
  useEffect(() => {
    loadSettings()
    void loadUpdates()
  }, [])

  return (
    <div className={styles.app}>
      <TitleBar />
      <div className={styles.content}>
        <MainWindow />
      </div>
    </div>
  )
}

export default App
