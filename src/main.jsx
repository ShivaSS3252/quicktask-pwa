import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

const updateSW = registerSW({
  onNeedRefresh() {
    // In production you'd show a "Update available" toast
    console.log('New content available, refresh to update')
    updateSW(true) // auto update for now
  },
  onOfflineReady() {
    console.log('App is ready to work offline!')
  },
  onRegistered(registration) {
    console.log('SW registered:', registration)
  },
  onRegisterError(error) {
    console.error('SW registration failed:', error)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)