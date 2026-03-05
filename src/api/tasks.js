// src/api/tasks.js
const BASE_URL = import.meta.env.VITE_API_URL

// GET all tasks from MongoDB
// Called on every page load — keeps UI fresh
export const getTasksAPI = async (filters = {}) => {
  const params = new URLSearchParams(filters).toString()
  const res = await fetch(`${BASE_URL}/api/tasks${params ? `?${params}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  return res.json()
}

// POST — create task
export const createTaskAPI = async (task) => {
  const res = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!res.ok) throw new Error('Failed to create task')
  return res.json()
}

// PATCH — update task
export const updateTaskAPI = async (clientId, updates) => {
  const res = await fetch(`${BASE_URL}/api/tasks/${clientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update task')
  return res.json()
}

// DELETE — soft delete task
export const deleteTaskAPI = async (clientId) => {
  const res = await fetch(`${BASE_URL}/api/tasks/${clientId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete task')
  return res.json()
}

// POST — bulk sync offline tasks
export const syncTasksAPI = async (tasks) => {
  console.log('Sending to sync API:', tasks)
  const res = await fetch(`${BASE_URL}/api/tasks/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  })
  if (!res.ok) {
    const err = await res.json()
    console.error('Sync API error:', err)
    throw new Error('Failed to sync tasks')
  }
  return res.json()
}