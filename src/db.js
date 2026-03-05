// src/db.js
import { openDB } from 'idb'

const DB_NAME = 'quicktask-db'
const DB_VERSION = 3
const TASKS_STORE = 'tasks'
const CATEGORIES_STORE = 'categories'
const PENDING_OPS_STORE = 'pending_ops'

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(TASKS_STORE)) {
          const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' })
          store.createIndex('status', 'status')
          store.createIndex('createdAt', 'createdAt')
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
          const catStore = db.createObjectStore(CATEGORIES_STORE, { keyPath: '_id' })
          catStore.createIndex('name', 'name')
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains(PENDING_OPS_STORE)) {
          const opsStore = db.createObjectStore(PENDING_OPS_STORE, { keyPath: 'opId' })
          opsStore.createIndex('entity', 'entity')
          opsStore.createIndex('createdAt', 'createdAt')
        }
      }
    },
  })
}

// ─── Task helpers ───────────────────────────────────────────────────────
export const addTask = async (task) => {
  const db = await initDB()
  return db.put(TASKS_STORE, task)
}

export const getAllTasks = async () => {
  const db = await initDB()
  return db.getAll(TASKS_STORE)
}

export const updateTask = async (task) => {
  const db = await initDB()
  return db.put(TASKS_STORE, task)
}

export const deleteTask = async (id) => {
  const db = await initDB()
  return db.delete(TASKS_STORE, id)
}

export const getPendingTasks = async () => {
  const db = await initDB()
  const all = await db.getAll(TASKS_STORE)
  return all.filter((t) => t.syncStatus === 'pending' && !t.isDeleted)
}

export const markTaskSynced = async (id) => {
  const db = await initDB()
  const task = await db.get(TASKS_STORE, id)
  if (!task) return
  return db.put(TASKS_STORE, { ...task, syncStatus: 'synced' })
}

// ─── Category helpers ───────────────────────────────────────────────────

export const getAllCategoriesFromDB = async () => {
  const db = await initDB()
  return db.getAll(CATEGORIES_STORE)
}

// Save single category (upsert by _id)
export const saveSingleCategory = async (category) => {
  const db = await initDB()
  return db.put(CATEGORIES_STORE, category)
}

export const deleteCategoryFromDB = async (id) => {
  const db = await initDB()
  return db.delete(CATEGORIES_STORE, id)
}

// Save ALL categories — clears existing first to prevent stale data
// This is what gets called on API refresh so IndexedDB mirrors server exactly
export const saveCategories = async (categories) => {
  const db = await initDB()
  const tx = db.transaction(CATEGORIES_STORE, 'readwrite')

  // Step 1: Clear all existing categories
  await tx.store.clear()

  // Step 2: Write the fresh list
  for (const c of categories) {
    await tx.store.put(c)
  }

  await tx.done
}

// ─── Pending Operations Queue ───────────────────────────────────────────
export const addPendingOp = async (op) => {
  const db = await initDB()
  const pendingOp = {
    opId: `op_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    ...op,
  }
  await db.put(PENDING_OPS_STORE, pendingOp)
  return pendingOp
}

export const getAllPendingOps = async () => {
  const db = await initDB()
  const all = await db.getAll(PENDING_OPS_STORE)
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export const deletePendingOp = async (opId) => {
  const db = await initDB()
  return db.delete(PENDING_OPS_STORE, opId)
}

export const getPendingOpsByEntity = async (entity) => {
  const db = await initDB()
  const all = await db.getAll(PENDING_OPS_STORE)
  return all.filter((op) => op.entity === entity)
}