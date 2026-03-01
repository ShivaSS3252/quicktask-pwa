// src/db.js
import { openDB } from 'idb'

// IndexedDB concept:
// Think of it like a mini browser database
// 'quicktask-db' = database name
// version 1 = schema version (increment if you change structure)

const DB_NAME = 'quicktask-db'
const DB_VERSION = 1
const STORE_NAME = 'tasks'

// Opens (or creates) the database
// Real world: Like connecting to a database on first app launch
export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Creates the 'tasks' object store (like a table in SQL)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id', // 'id' field is the primary key
        })
        // Create indexes for querying
        // Real world: Like adding a column index in SQL for faster search
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
    },
  })
}

// Add a new task
export const addTask = async (task) => {
  const db = await initDB()
  return db.put(STORE_NAME, task)
}

// Get all tasks
export const getAllTasks = async () => {
  const db = await initDB()
  return db.getAll(STORE_NAME)
}

// Update a task (toggle complete etc)
export const updateTask = async (task) => {
  const db = await initDB()
  return db.put(STORE_NAME, task)
}

// Delete a task
export const deleteTask = async (id) => {
  const db = await initDB()
  return db.delete(STORE_NAME, id)
}

// Get pending tasks (not synced to server yet)
// Real world: WhatsApp pending messages waiting to be sent
export const getPendingTasks = async () => {
  const db = await initDB()
  const all = await db.getAll(STORE_NAME)
  return all.filter(task => task.syncStatus === 'pending')
}

// Mark a task as synced after background sync completes
export const markTaskSynced = async (id) => {
  const db = await initDB()
  const task = await db.get(STORE_NAME, id)
  if (!task) return
  return db.put(STORE_NAME, { ...task, syncStatus: 'synced' })
}