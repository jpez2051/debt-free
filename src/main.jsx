import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import DataSafety from './DataSafety'
import './styles.css'
import './v041.css'
import './v043.css'
import './v050.css'
import './v051.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <DataSafety />
  </React.StrictMode>,
)
