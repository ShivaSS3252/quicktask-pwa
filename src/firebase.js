import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyCWHKZySuqVbu52sbYElBsA3jpWE2alZTU",
  authDomain: "quicktask-pwa-f9772.firebaseapp.com",
  projectId: "quicktask-pwa-f9772",
  storageBucket: "quicktask-pwa-f9772.firebasestorage.app",
  messagingSenderId: "536975548786",
  appId: "1:536975548786:web:cfaaca11a990b44651bdeb"
}

const app = initializeApp(firebaseConfig)
let messaging = null

const getMessagingInstance = () => {
  if (!messaging) messaging = getMessaging(app)
  return messaging
}

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    const msg = getMessagingInstance()

    // Use main SW instead of separate Firebase SW
    // This avoids scope conflict
    const swReg = await navigator.serviceWorker.ready
    console.log('Using SW:', swReg.active?.scriptURL)

    try {
      await deleteToken(msg)
    } catch {
      // no existing token
    }

    const token = await getToken(msg, {
      vapidKey: 'BCSIEyqxxH2jYUq4KkVlbo7obPfnGyIS_ce7iBnWPgbTTUGa2306vYYjCkW7Kk22_caHA_blSZgFZTdHr8TkSgU',
      serviceWorkerRegistration: swReg, // main SW handles everything
    })

    if (token) {
      console.log('Fresh FCM Token:', token)
      localStorage.setItem('fcm_token', token)
      return token
    }

    return null
  } catch (err) {
    console.error('FCM setup failed:', err)
    return null
  }
}

export const onForegroundMessage = (callback) => {
  const msg = getMessagingInstance()
  return onMessage(msg, (payload) => {
    console.log('Foreground message:', payload)
    callback(payload)
  })
}