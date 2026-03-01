import { useState, useEffect } from 'react'
import { addTask, getAllTasks, updateTask, deleteTask } from '../db'
import { registerBackgroundSync } from '../sync'

// ------------------------------------------------
// Real connectivity check
// navigator.onLine is unreliable with DevTools offline toggle
// This actually tries a network request to confirm
// ------------------------------------------------
const checkRealConnectivity = async () => {
  try {
    await fetch('https://www.google.com/favicon.ico', {
      mode: 'no-cors',
      cache: 'no-store',
    })
    return true
  } catch {
    return false
  }
}

export const useTasks = () => {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  // When internet returns — update UI state
  useEffect(() => {
    const handleOnline = async () => {
      const reallyOnline = await checkRealConnectivity()
      if (!reallyOnline) return

      setTasks(prev =>
        prev.map(task =>
          task.syncStatus === 'pending'
            ? { ...task, syncStatus: 'synced' }
            : task
        )
      )
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  const loadTasks = async () => {
    try {
      const stored = await getAllTasks()
      stored.sort((a, b) => b.createdAt - a.createdAt)
      setTasks(stored)
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (text) => {
    // Real check — not navigator.onLine
    const isOnline = await checkRealConnectivity()

    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: text.trim(),
      completed: false,
      createdAt: Date.now(),
      syncStatus: isOnline ? 'synced' : 'pending',
    }

    await addTask(newTask)
    setTasks(prev => [newTask, ...prev])

    if (!isOnline) {
      await registerBackgroundSync()
    }

    return newTask
  }

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    const updated = { ...task, completed: !task.completed }
    await updateTask(updated)
    setTasks(prev => prev.map(t => t.id === id ? updated : t))
  }

  const removeTask = async (id) => {
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  return { tasks, loading, createTask, toggleTask, removeTask }
}
