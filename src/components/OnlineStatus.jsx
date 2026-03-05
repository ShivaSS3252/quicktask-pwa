// src/components/OnlineStatus.jsx
import { useState, useEffect } from 'react'

export const OnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setJustReconnected(true)
      setTimeout(() => setJustReconnected(false), 3500)
    }
    const handleOffline = () => { setIsOnline(false); setJustReconnected(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !justReconnected) return null

  return (
    <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-3 text-sm font-medium border
      ${isOnline
        ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-400'
        : 'bg-amber-500/[0.08] border-amber-500/20 text-amber-400'
      }`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse
        ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {isOnline
        ? 'Back online — syncing your tasks...'
        : "You're offline — tasks save locally"
      }
    </div>
  )
}