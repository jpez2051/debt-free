import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import SettingsCenter from './SettingsCenter'
import AdaptiveNav from './AdaptiveNav'
import './styles.css'
import './v041.css'
import './v043.css'
import './v050.css'
import './v051.css'
import './v052.css'
import './v053.css'
import './v055.css'
import './v056.css'
import './v057.css'
import './v058.css'
import './v059.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <SettingsCenter />
    <AdaptiveNav />
  </React.StrictMode>,
)
