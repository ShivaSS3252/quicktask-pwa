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

    for (const task of tasks) {
      try {
        // Replace with real API call in production
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        }).catch(() => {
          // No real API — just mark as synced for demo
          console.log('SW: No API endpoint, marking as synced for demo')
        })

        await markSyncedInDB(db, task.id)
        console.log(`SW: Task ${task.id} synced ✅`)
      } catch (err) {
        console.error(`SW: Failed to sync task ${task.id}`, err)
        throw err
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
    const request = indexedDB.open('quicktask-db', 1)
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
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/offline.html'))
    )
  }
})
