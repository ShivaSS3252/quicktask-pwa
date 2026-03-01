// src/components/NotificationSetup.jsx
import { useState, useEffect } from 'react'
import { requestNotificationPermission, onForegroundMessage } from '../firebase'

export const NotificationSetup = () => {
  const [permission, setPermission] = useState(Notification.permission)
  const [token, setToken] = useState(localStorage.getItem('fcm_token'))
  const [notification, setNotification] = useState(null)

  useEffect(() => {
  if (permission !== 'granted') return

  let unsubscribe = null

  const registerListener = async () => {
    unsubscribe = await onForegroundMessage((payload) => {
      console.log('FOREGROUND MESSAGE HIT:', payload)
      setNotification({
        title: payload.notification?.title || 'Task Reminder',
        body: payload.notification?.body || 'Check your tasks!'
      })
      setTimeout(() => setNotification(null), 5000)
    })
  }

  registerListener()

  return () => {
    if (unsubscribe) unsubscribe()
  }
}, [permission])

  const handleEnable = async () => {
    const fcmToken = await requestNotificationPermission()
    if (fcmToken) {
      setToken(fcmToken)
      setPermission('granted')
    } else {
      setPermission(Notification.permission)
    }
  }
console.log("erhjlgre",token,permission,permission === 'granted' && token,notification)
  // Already granted — show token info
  if (permission === 'granted' && token) {
    return (
      <>
        {/* In-app notification banner */}
        {notification && (
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl
                          px-4 py-3 mb-4 flex items-start gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-indigo-300 font-semibold text-sm">{notification.title}</p>
              <p className="text-gray-400 text-xs">{notification.body}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-500 hover:text-white"
            >×</button>
          </div>
        )}

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl
                        px-4 py-3 mb-4">
          <p className="text-green-400 text-xs font-medium">
            🔔 Push notifications enabled
          </p>
          <p className="text-gray-600 text-xs mt-1 break-all">
            Token: {token.slice(0, 30)}...
          </p>
        </div>
      </>
    )
  }

  // Denied
  if (permission === 'denied') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl
                      px-4 py-3 mb-4">
        <p className="text-red-400 text-xs">
          🔕 Notifications blocked — enable in browser settings
        </p>
      </div>
    )
  }

  // Default — show enable button
  return (
    <button
      onClick={handleEnable}
      className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700
                 hover:border-indigo-500 text-gray-300 text-sm rounded-xl
                 px-4 py-3 mb-4 transition-all flex items-center gap-2"
    >
      <span>🔔</span>
      <span>Enable push notifications for task reminders</span>
    </button>
  )
}