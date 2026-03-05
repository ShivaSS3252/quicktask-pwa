// src/sw.js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// ------------------------------------------------
// 1. PRECACHING — Cache First (Static Assets)
// ------------------------------------------------
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ------------------------------------------------
// 2. CACHE FIRST — Images & Icons
// ------------------------------------------------
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      })
    ]
  })
)

// ------------------------------------------------
// 3. NETWORK FIRST — Task Data
// ------------------------------------------------
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/tasks'),
  new NetworkFirst({
    cacheName: 'tasks-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60,
      })
    ]
  })
)

// ------------------------------------------------
// 4. STALE WHILE REVALIDATE — User Profile
// ------------------------------------------------
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/user'),
  new StaleWhileRevalidate({
    cacheName: 'user-profile-cache',
  })
)

// ------------------------------------------------
// 5. BACKGROUND SYNC
// ------------------------------------------------
// Browser fires this event when internet returns
// Real world: This is what sends WhatsApp pending messages automatically
self.addEventListener('sync', async (event) => {
  console.log('SW sync event fired:', event.tag)

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks())
  }
})

// Reads pending tasks from IndexedDB and syncs them
// We inline the DB logic here because SW can't import from src/db.js directly
const syncPendingTasks = async () => {
  try {
    const db = await openDB()
    const tasks = await getAllPendingFromDB(db)

    console.log(`SW: Found ${tasks.length} pending tasks to sync`)

    if (tasks.length === 0) return

    // Map to API structure — id becomes clientId
    const tasksToSync = tasks.map((task) => ({
      clientId: task.id,
      text: task.text,
      completed: task.completed || false,
      category: task.category || null,
      priority: task.priority || 'medium',
      syncStatus: 'synced',
      clientCreatedAt: new Date(task.createdAt).toISOString(),
    }))

    // Use bulk sync endpoint
    const apiUrl = self.location.origin.includes('localhost')
      ? 'http://localhost:5000'
      : 'https://your-railway-url.com' // update after deploy

    const response = await fetch(`${apiUrl}/api/tasks/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: tasksToSync }),
    })

    if (response.ok) {
      const result = await response.json()
      console.log(`SW: Synced ${result.synced} tasks ✅`)

      // Mark all as synced in IndexedDB
      for (const task of tasks) {
        await markSyncedInDB(db, task.id)
      }
    }
  } catch (err) {
    console.error('SW: syncPendingTasks failed', err)
    throw err
  }
}


// ------------------------------------------------
// IndexedDB helpers inside SW
// (SW runs in separate context, can't use idb npm package easily)
// ------------------------------------------------
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('quicktask-db', 2)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const getAllPendingFromDB = (db) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readonly')
    const store = tx.objectStore('tasks')
    const request = store.getAll()
    request.onsuccess = () => {
      const pending = request.result.filter(t => t.syncStatus === 'pending')
      resolve(pending)
    }
    request.onerror = () => reject(request.error)
  })
}

const markSyncedInDB = (db, id) => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tasks', 'readwrite')
    const store = tx.objectStore('tasks')
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const task = getReq.result
      if (!task) return resolve()
      task.syncStatus = 'synced'
      const putReq = store.put(task)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

// ------------------------------------------------
// 6. OFFLINE FALLBACK
// ------------------------------------------------
self.addEventListener('fetch', (event) => {
  // Only handle navigation (page load) requests
  if (event.request.mode !== 'navigate') return

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Try cached offline.html first
        return caches.match('/offline.html')
          .then((cached) => cached || caches.match('/index.html'))
      })
  )
})


self.addEventListener('push', (event) => {
  console.log('Push received in main SW ✅', event)

  let payload = {}
  try {
    payload = event.data?.json() || {}
  } catch {
    payload = { notification: { title: 'QuickTask', body: event.data?.text() } }
  }

  const title = payload.notification?.title || 'QuickTask Reminder'
  const options = {
    body: payload.notification?.body || 'You have a pending task!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'task-reminder',
    renotify: true,
    data: payload.data || {},
  }

  event.waitUntil(
    Promise.all([
      // 1. Always show system notification
      self.registration.showNotification(title, options),

      // 2. Also notify all open app windows
      // So in-app banner can show when app is open
      // Real world: Slack shows both system + in-app notification
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              payload: {
                notification: {
                  title,
                  body: options.body,
                }
              }
            })
          })
        })
    ])
  )
})

// Handle notification click
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