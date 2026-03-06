// src/hooks/useTasks.js
import { useState, useEffect, useRef, useMemo } from 'react'
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
  // ALL tasks always stored here — never filtered in state
  const [allTasks, setAllTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const isMutating = useRef(false)
  const loadGeneration = useRef(0)

  // Filter happens here — pure frontend, instant, no re-fetch
  // Switching categories never causes a flash or wrong count
  const tasks = useMemo(() => {
    const visible = allTasks.filter((t) => !t.isDeleted)
    if (!selectedCategory) return visible
    return visible.filter((t) => t.category === selectedCategory)
  }, [allTasks, selectedCategory])

  // Load ONCE on mount — not on every category change
  useEffect(() => {
    loadTasks()
  }, [])

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
    const generation = ++loadGeneration.current

    try {
      setLoading(true)

      // Step 1: Show ALL tasks from IndexedDB cache immediately
      const stored = await getAllTasks()
      const cached = stored
        .filter((t) => !t.isDeleted)
        .sort((a, b) => b.createdAt - a.createdAt)

      if (generation === loadGeneration.current && !isMutating.current) {
        setAllTasks(cached)
      }
      setLoading(false)

      // Step 2: Fetch ALL tasks from API — no category filter on API call
      const isOnline = await checkRealConnectivity()
      if (!isOnline) return

      const res = await getTasksAPI()
      if (!res.success || !res.data) return

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

      // Clean IndexedDB
      const allStored = await getAllTasks()
      for (const t of allStored) {
        const existsOnServer = serverTasks.find((s) => s.id === t.id)
        if (!existsOnServer && t.syncStatus !== 'pending') {
          await deleteTask(t.id)
        }
      }
      for (const task of serverTasks) await addTask(task)

      if (generation === loadGeneration.current && !isMutating.current) {
        const sorted = [...serverTasks].sort((a, b) => b.createdAt - a.createdAt)
        setAllTasks(sorted)
        console.log(`Loaded ${sorted.length} tasks from server ✅`)
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
        setAllTasks((prev) =>
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
          setAllTasks((prev) =>
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

    await addTask(newTask)
    // Add to allTasks — useMemo filter handles showing in right category
    setAllTasks((prev) => [newTask, ...prev.filter((t) => t.id !== newTask.id)])

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
        setAllTasks((prev) => prev.map((t) => t.id === newTask.id ? queued : t))
        await registerBackgroundSync()
      }
    } else {
      await registerBackgroundSync()
    }

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
    setAllTasks((prev) => prev.map((t) => t.id === id ? updated : t))

    if (isOnline) {
      try {
        await updateTaskAPI(id, { text: newText.trim() })
        console.log('Task edit synced ✅')
      } catch (err) {
        console.error('Edit API failed, queuing:', err)
        const queued = { ...updated, syncStatus: 'pending' }
        await updateTask(queued)
        setAllTasks((prev) => prev.map((t) => t.id === id ? queued : t))
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
    const task = allTasks.find((t) => t.id === id)
    if (!task) { isMutating.current = false; return }

    const updated = {
      ...task,
      completed: !task.completed,
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await updateTask(updated)
    setAllTasks((prev) => prev.map((t) => t.id === id ? updated : t))

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
    const stored = await getAllTasks()
    const task = stored.find((t) => t.id === id)

    setAllTasks((prev) => prev.filter((t) => t.id !== id))

    if (isOnline) {
      try {
        await deleteTaskAPI(id)
        if (task) await deleteTask(id)
        console.log('Task deleted ✅')
      } catch (err) {
        console.error('Delete API failed, queuing:', err)
        if (task) await updateTask({ ...task, isDeleted: true })
        await addPendingOp({ entity: 'task', type: 'delete', payload: { id } })
      }
    } else {
      if (task) await updateTask({ ...task, isDeleted: true })
      await addPendingOp({ entity: 'task', type: 'delete', payload: { id } })
    }

    setTimeout(() => { isMutating.current = false }, 1000)
  }

  return { tasks, loading, createTask, editTask, toggleTask, removeTask, loadTasks }
}