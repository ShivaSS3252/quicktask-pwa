try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js')
} catch (err) {
  console.error('importScripts failed:', err)
}

if (typeof firebase !== 'undefined') {
  firebase.initializeApp({
  apiKey: "AIzaSyCWHKZySuqVbu52sbYElBsA3jpWE2alZTU",
  authDomain: "quicktask-pwa-f9772.firebaseapp.com",
  projectId: "quicktask-pwa-f9772",
  storageBucket: "quicktask-pwa-f9772.firebasestorage.app",
  messagingSenderId: "536975548786",
  appId: "1:536975548786:web:cfaaca11a990b44651bdeb",
  measurementId: "G-HHXPVZYRT1"
  })

  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    console.log('Background message received:', payload)
    const title = payload.notification?.title || 'QuickTask Reminder'
    const body = payload.notification?.body || 'You have a pending task!'

    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'task-reminder',
      renotify: true,
      data: payload.data || {},
    })
  })
} else {
  console.error('Firebase failed to load')
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) return clientList[0].focus()
        return clients.openWindow('/')
      })
  )
})