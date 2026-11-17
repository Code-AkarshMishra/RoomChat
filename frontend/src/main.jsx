import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/pushNotifications.js'

// Register service worker for background push notifications
// Works on HTTPS (production Vercel) — silently skipped on plain HTTP localhost
registerServiceWorker().catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
