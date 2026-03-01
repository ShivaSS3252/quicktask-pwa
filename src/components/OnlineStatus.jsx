// src/components/OnlineStatus.jsx
// Real world: Like the "connecting..." banner in WhatsApp or Google Docs
import { useState, useEffect } from 'react'

export const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null // Don't show anything when online

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400
                    text-sm text-center py-2 px-4 rounded-xl mb-4">
      📡 You're offline — tasks are saved locally and will sync when you reconnect
    </div>
  )
}