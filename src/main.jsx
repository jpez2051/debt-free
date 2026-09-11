import React from 'react'
import { createRoot } from 'react-dom/client'
import CloudApp from './CloudApp'
import SettingsCenter from './SettingsCenter'
import AdaptiveNav from './AdaptiveNav'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CloudApp />
    <SettingsCenter />
    <AdaptiveNav />
  </React.StrictMode>,
)
