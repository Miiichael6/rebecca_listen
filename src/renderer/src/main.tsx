import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { OptionsWindow } from './windows/Options/OptionsWindow'

// The Options window loads this same bundle, told apart by the hash (#/options).
const isOptions = location.hash.startsWith('#/options')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isOptions ? <OptionsWindow /> : <App />}</StrictMode>
)
