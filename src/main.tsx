// Main_v1.0 — This section is intended to load the theme stylesheets and mount the React app into #root.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/fonts.css'
import './theme/tokens.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
