// src/hooks/useTasks.js
import { useState, useEffect, useRef } from 'react'
import {
  addTask, getAllTasks, updateTask, deleteTask,
  getPendingTasks, addPendingOp, getAllPendingOps, deletePendingOp,
} from '../db'
import { registerBackgroundSync } from '../sync'
import {
  createTaskAPI, getTasksAPI,
  updateTaskAPI, deleteTaskAPI, syncTasksAPI,
} from '../api/tasks'

const checkRealConnectivity = async () => {
  try {
    await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

export const useTasks = (selectedCategory = null) => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  // Tracks if a mutation (create/edit/toggle/delete) is in progress
  // loadTasks will skip its final setTasks if this is true
  // — prevents race where loadTasks overwrites a just-created task
  const isMutating = useRef(false)

  // Tracks the latest loadTasks call so stale ones don't overwrite fresh state
  const loadGeneration = useRef(0)

  useEffect(() => {
    loadTasks()
  }, [selectedCategory])

  useEffect(() => {
    const handleOnline = async () => {
      const reallyOnline = await checkRealConnectivity()
      if (!reallyOnline) return
      await processPendingTaskOps()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────
  const loadTasks = async () => {
    // Each call gets a generation number
    // If a newer call starts, the old one won't overwrite state
    const generation = ++loadGeneration.current

    try {
      setLoading(true)

      // Step 1: Show IndexedDB cache immediately
      const stored = await getAllTasks()
      let cached = stored.filter((t) => !t.isDeleted)
      if (selectedCategory) cached = cached.filter((t) => t.category === selectedCategory)
      cached.sort((a, b) => b.createdAt - a.createdAt)

      // Only set if this is still the latest call and no mutation happening
      if (generation === loadGeneration.current && !isMutating.current) {
        setTasks(cached)
      }
      setLoading(false)

      // Step 2: Fetch from API
      const isOnline = await checkRealConnectivity()
      if (!isOnline) return

      const res = await getTasksAPI()
      if (!res.success || !res.data) return

      // If a mutation happened while we were fetching — skip overwriting state
      // The mutation already has the correct fresh data
      if (generation !== loadGeneration.current || isMutating.current) {
        console.log('loadTasks: skipping stale update')
        return
      }

      const serverTasks = res.data.map((t) => ({
        id: t.clientId,
        text: t.text,
        completed: t.completed,
        category: t.category?._id || t.category || null,
        categoryData: t.category || null,
        priority: t.priority || 'medium',
        createdAt: t.clientCreatedAt
          ? new Date(t.clientCreatedAt).getTime()
          : new Date(t.createdAt).getTime(),
        syncStatus: 'synced',
        isDeleted: false,
      }))

      // Clean up IndexedDB — remove tasks deleted on server
      const allStored = await getAllTasks()
      for (const t of allStored) {
        const existsOnServer = serverTasks.find((s) => s.id === t.id)
        if (!existsOnServer && !t.syncStatus === 'pending') {
          await deleteTask(t.id)
        }
      }
      for (const task of serverTasks) await addTask(task)

      // Final check before overwriting state
      if (generation === loadGeneration.current && !isMutating.current) {
        let refreshed = serverTasks
        if (selectedCategory) refreshed = refreshed.filter((t) => t.category === selectedCategory)
        refreshed.sort((a, b) => b.createdAt - a.createdAt)
        setTasks(refreshed)
        console.log(`Loaded ${refreshed.length} tasks from server ✅`)
      }

    } catch (err) {
      console.error('loadTasks error:', err)
      setLoading(false)
    }
  }

  // ── Process pending ops on reconnect ──────────────────────────────────
  const processPendingTaskOps = async () => {
    const pendingCreates = await getPendingTasks()
    if (pendingCreates.length > 0) {
      const tasksToSync = pendingCreates.map((t) => ({
        clientId: t.id,
        text: t.text,
        completed: t.completed,
        category: t.category || null,
        priority: t.priority || 'medium',
        syncStatus: 'synced',
        clientCreatedAt: new Date(t.createdAt).toISOString(),
      }))
      try {
        const result = await syncTasksAPI(tasksToSync)
        console.log(`Synced ${result.synced} pending creates ✅`)
        for (const t of pendingCreates) await updateTask({ ...t, syncStatus: 'synced' })
        setTasks((prev) =>
          prev.map((t) => t.syncStatus === 'pending' ? { ...t, syncStatus: 'synced' } : t)
        )
      } catch (err) {
        console.error('Bulk sync failed:', err)
      }
    }

    const allOps = await getAllPendingOps()
    const taskOps = allOps.filter((op) => op.entity === 'task')

    for (const op of taskOps) {
      try {
        if (op.type === 'update') {
          await updateTaskAPI(op.payload.id, op.payload.updates)
          const stored = await getAllTasks()
          const existing = stored.find((t) => t.id === op.payload.id)
          if (existing) await updateTask({ ...existing, ...op.payload.updates, syncStatus: 'synced' })
          setTasks((prev) =>
            prev.map((t) =>
              t.id === op.payload.id
                ? { ...t, ...op.payload.updates, syncStatus: 'synced' }
                : t
            )
          )
          await deletePendingOp(op.opId)
        }
        if (op.type === 'delete') {
          await deleteTaskAPI(op.payload.id)
          await deleteTask(op.payload.id)
          await deletePendingOp(op.opId)
        }
      } catch (err) {
        console.error(`Task op ${op.type} failed:`, err)
      }
    }
  }

  // ── CREATE ─────────────────────────────────────────────────────────────
  const createTask = async (text, category = null) => {
    if (!text.trim()) return

    isMutating.current = true

    const isOnline = await checkRealConnectivity()

    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: text.trim(),
      completed: false,
      category,
      priority: 'medium',
      createdAt: Date.now(),
      syncStatus: isOnline ? 'synced' : 'pending',
      isDeleted: false,
    }

    // Save to IndexedDB and update UI immediately
    await addTask(newTask)
    setTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)])

    if (isOnline) {
      try {
        await createTaskAPI({
          clientId: newTask.id,
          text: newTask.text,
          completed: newTask.completed,
          category: newTask.category,
          priority: newTask.priority,
          syncStatus: 'synced',
          clientCreatedAt: new Date(newTask.createdAt).toISOString(),
        })
        console.log('Task synced to MongoDB ✅')
      } catch (err) {
        console.error('API failed, queuing:', err)
        const queued = { ...newTask, syncStatus: 'pending' }
        await updateTask(queued)
        setTasks((prev) => prev.map((t) => t.id === newTask.id ? queued : t))
        await registerBackgroundSync()
      }
    } else {
      await registerBackgroundSync()
    }

    // Release mutation lock after a short delay
    // so any in-flight loadTasks doesn't overwrite this new task
    setTimeout(() => { isMutating.current = false }, 1000)

    return newTask
  }

  // ── EDIT ───────────────────────────────────────────────────────────────
  const editTask = async (id, newText) => {
    if (!newText.trim()) return

    isMutating.current = true

    const isOnline = await checkRealConnectivity()
    const stored = await getAllTasks()
    const existing = stored.find((t) => t.id === id)
    if (!existing) { isMutating.current = false; return }

    const updated = {
      ...existing,
      text: newText.trim(),
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await updateTask(updated)
    setTasks((prev) => prev.map((t) => t.id === id ? updated : t))

    if (isOnline) {
      try {
        await updateTaskAPI(id, { text: newText.trim() })
        console.log('Task edit synced ✅')
      } catch (err) {
        console.error('Edit API failed, queuing:', err)
        const queued = { ...updated, syncStatus: 'pending' }
        await updateTask(queued)
        setTasks((prev) => prev.map((t) => t.id === id ? queued : t))
        await addPendingOp({
          entity: 'task', type: 'update',
          payload: { id, updates: { text: newText.trim() } },
        })
      }
    } else {
      await addPendingOp({
        entity: 'task', type: 'update',
        payload: { id, updates: { text: newText.trim() } },
      })
    }

    setTimeout(() => { isMutating.current = false }, 1000)
  }

  // ── TOGGLE ─────────────────────────────────────────────────────────────
  const toggleTask = async (id) => {
    isMutating.current = true

    const isOnline = await checkRealConnectivity()
    const task = tasks.find((t) => t.id === id)
    if (!task) { isMutating.current = false; return }

    const updated = {
      ...task,
      completed: !task.completed,
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await updateTask(updated)
    setTasks((prev) => prev.map((t) => t.id === id ? updated : t))

    if (isOnline) {
      try {
        await updateTaskAPI(id, { completed: updated.completed })
        console.log('Toggle synced ✅')
      } catch (err) {
        console.error('Toggle API failed, queuing:', err)
        await addPendingOp({
          entity: 'task', type: 'update',
          payload: { id, updates: { completed: updated.completed } },
        })
      }
    } else {
      await addPendingOp({
        entity: 'task', type: 'update',
        payload: { id, updates: { completed: updated.completed } },
      })
    }

    setTimeout(() => { isMutating.current = false }, 1000)
  }

  // ── DELETE ─────────────────────────────────────────────────────────────
  const removeTask = async (id) => {
    isMutating.current = true

    const isOnline = await checkRealConnectivity()

    // Read from IndexedDB — not stale React state
    const stored = await getAllTasks()
    const task = stored.find((t) => t.id === id)

    // Remove from UI immediately
    setTasks((prev) => prev.filter((t) => t.id !== id))

    if (isOnline) {
      try {
        await deleteTaskAPI(id)
        if (task) await deleteTask(id)   // fully remove from IndexedDB
        console.log('Task deleted ✅')
      } catch (err) {
        console.error('Delete API failed, queuing:', err)
        if (task) await updateTask({ ...task, isDeleted: true })
        await addPendingOp({ entity: 'task', type: 'delete', payload: { id } })
      }
    } else {
      // Keep in IndexedDB as isDeleted:true so sync can delete on server later
      if (task) await updateTask({ ...task, isDeleted: true })
      await addPendingOp({ entity: 'task', type: 'delete', payload: { id } })
    }

    setTimeout(() => { isMutating.current = false }, 1000)
  }

  return { tasks, loading, createTask, editTask, toggleTask, removeTask, loadTasks }
}