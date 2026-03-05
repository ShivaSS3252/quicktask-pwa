// src/components/NotificationSetup.jsx
import { useState, useEffect } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '../firebase'

export const NotificationSetup = () => {
  const [permission, setPermission] = useState(Notification.permission)
  const [token, setToken] = useState(localStorage.getItem('fcm_token'))
  const [notification, setNotification] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (permission !== 'granted') return

    const unsubscribe = onForegroundMessage((payload) => {
      showBanner(payload.notification?.title, payload.notification?.body)
    })

    const handleSWMessage = (event) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        const { title, body } = event.data.payload.notification
        showBanner(title, body)
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }
  }, [permission])

  const showBanner = (title, body) => {
    setNotification({ title, body })
    setTimeout(() => setNotification(null), 5000)
  }

  const handleEnable = async () => {
    setLoading(true)
    const fcmToken = await requestNotificationPermission()
    if (fcmToken) { setToken(fcmToken); setPermission('granted') }
    else setPermission(Notification.permission)
    setLoading(false)
  }

  // In-app push banner
  const InAppBanner = () => notification ? (
    <div className="flex items-start gap-3 bg-indigo-500/[0.08] border border-indigo-500/20 rounded-xl px-4 py-3 mb-3">
      <span className="text-lg flex-shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-indigo-400">{notification.title}</p>
        <p className="text-xs text-white/40 mt-0.5 leading-snug">{notification.body}</p>
      </div>
      <button onClick={() => setNotification(null)}
        className="text-white/30 hover:text-white text-lg leading-none flex-shrink-0">×</button>
    </div>
  ) : null

  // Granted state
  if (permission === 'granted' && token) {
    return (
      <>
        <InAppBanner />
        <div className="flex items-center gap-3 bg-emerald-500/[0.06] border border-emerald-500/15 rounded-xl px-4 py-2.5 mb-4">
          <span className="text-sm">🔔</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400">Push notifications enabled</p>
            <p className="text-[10px] text-white/20 mt-0.5 font-mono truncate">{token.slice(0, 28)}...</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 shadow-sm shadow-emerald-400/50" />
        </div>
      </>
    )
  }

  // Denied state
  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 bg-red-500/[0.06] border border-red-500/15 rounded-xl px-4 py-2.5 mb-4">
        <span className="text-sm">🔕</span>
        <p className="text-xs text-red-400 font-medium">
          Notifications blocked — enable in browser settings
        </p>
      </div>
    )
  }

  // Default — prompt to enable
  return (
    <button
      onClick={handleEnable}
      disabled={loading}
      className="w-full flex items-center gap-3 bg-transparent hover:bg-white/[0.03] border border-dashed border-white/10 hover:border-indigo-500/30 rounded-xl px-4 py-3 mb-4 transition-all duration-200 group cursor-pointer text-left"
    >
      <span className="text-base">{loading ? '⏳' : '🔔'}</span>
      <span className="text-xs font-medium text-white/35 group-hover:text-white/60 transition-colors flex-1">
        {loading ? 'Setting up notifications...' : 'Enable push notifications for reminders'}
      </span>
      {!loading && (
        <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-400 px-2.5 py-1 rounded-full flex-shrink-0">
          Recommended
        </span>
      )}
    </button>
  )
}