import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyCWHKZySuqVbu52sbYElBsA3jpWE2alZTU",
  authDomain: "quicktask-pwa-f9772.firebaseapp.com",
  projectId: "quicktask-pwa-f9772",
  storageBucket: "quicktask-pwa-f9772.firebasestorage.app",
  messagingSenderId: "536975548786",
  appId: "1:536975548786:web:cfaaca11a990b44651bdeb",
  measurementId: "G-HHXPVZYRT1"
}

const app = initializeApp(firebaseConfig)

// ✅ Don't initialize messaging at top level
let messaging = null

const getMessagingInstance = async () => {
  if (messaging) return messaging
  
  // Register Firebase SW first
  const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  
  // Now initialize messaging with that SW
  messaging = getMessaging(app)
  return messaging
}

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const msg = await getMessagingInstance()

    const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')

    const token = await getToken(msg, {
      vapidKey: 'BCSIEyqxxH2jYUq4KkVlbo7obPfnGyIS_ce7iBnWPgbTTUGa2306vYYjCkW7Kk22_caHA_blSZgFZTdHr8TkSgU',
      serviceWorkerRegistration: swReg
    })

    if (token) {
      localStorage.setItem('fcm_token', token)
      return token
    }

    return null
  } catch (err) {
    console.error('Failed to get FCM token:', err)
    return null
  }
}

export const onForegroundMessage = async (callback) => {
  const msg = await getMessagingInstance()
  return onMessage(msg, (payload) => {
    console.log('Foreground message received:', payload)
    callback(payload)
  })
}