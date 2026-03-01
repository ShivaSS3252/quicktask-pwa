// src/sync.js
// This file handles registering sync requests with the Service Worker
// and processing them when online

import { getPendingTasks, markTaskSynced } from './db'

// Register a background sync when user creates a task offline
// Real world: Like Gmail queuing an email to send later
export const registerBackgroundSync = async () => {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    // Background Sync not supported — fallback to manual sync
    console.log('Background Sync not supported, using manual sync')
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    // 'sync-tasks' is the tag name — SW listens for this exact tag
    await registration.sync.register('sync-tasks')
    console.log('Background sync registered ✅')
    return true
  } catch (err) {
    console.error('Background sync registration failed:', err)
    return false
  }
}

// This runs when internet returns — sends pending tasks to server
// Called by the Service Worker sync event
export const processPendingTasks = async () => {
  const pending = await getPendingTasks()

  if (pending.length === 0) return

  console.log(`Syncing ${pending.length} pending tasks...`)

  for (const task of pending) {
    try {
      // In a real app this would be your API endpoint
      // We simulate a successful server call here
      // Real world: This is where fetch('/api/tasks', { method: 'POST', body: task }) goes
      await simulateServerSync(task)
      await markTaskSynced(task.id)
      console.log(`Task synced: ${task.id} ✅`)
    } catch (err) {
      console.error(`Failed to sync task: ${task.id}`, err)
      throw err // Re-throw so SW knows to retry
    }
  }
}

// Simulates a server API call
// Replace this with your real fetch() call when you have a backend
const simulateServerSync = (task) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // 90% success rate simulation
      if (Math.random() > 0.1) {
        resolve({ success: true, task })
      } else {
        reject(new Error('Server error'))
      }
    }, 500)
  })
}