// src/hooks/useCategories.js
import { useState, useEffect, useRef } from 'react'
import {
  getCategoriesAPI, createCategoryAPI,
  updateCategoryAPI, deleteCategoryAPI,
} from '../api/categories'
import {
  saveCategories, getAllCategoriesFromDB, saveSingleCategory,
  deleteCategoryFromDB, addPendingOp,
  getAllPendingOps, deletePendingOp,
} from '../db'

const checkRealConnectivity = async () => {
  try {
    await fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-store' })
    return true
  } catch {
    return false
  }
}

const dispatchSyncToast = (message, type = 'success') => {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
}

export const useCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  // This ref tracks whether WE are currently doing a mutation (create/update/delete)
  // When true, SSE-triggered refreshes are ignored — prevents double-render
  const isMutating = useRef(false)

  useEffect(() => { loadCategories() }, [])

  useEffect(() => {
    const handleOnline = async () => {
      const reallyOnline = await checkRealConnectivity()
      if (!reallyOnline) return
      await processPendingCategoryOps()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [])

  // ── Core: fetch from API and set state ────────────────────────────────
  // Single place that updates state from server — no duplicates possible
  const fetchAndSet = async () => {
    const res = await getCategoriesAPI()
    if (!res.success) return
    // saveCategories does clear() then puts fresh list — no stale data
    await saveCategories(res.data)
    // Sort newest first
    const sorted = [...res.data].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    setCategories(sorted)
  }

  // ── Load on mount ─────────────────────────────────────────────────────
  const loadCategories = async () => {
    try {
      setLoading(true)

      // Show cache immediately for instant display
      const cached = await getAllCategoriesFromDB()
      const visible = cached
        .filter((c) => !c.isDeleted)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      if (visible.length > 0) setCategories(visible)

      const isOnline = await checkRealConnectivity()
      if (!isOnline) { setLoading(false); return }

      await fetchAndSet()
    } catch {
      console.log('Using cached categories — offline')
    } finally {
      setLoading(false)
    }
  }

  // ── Pending ops on reconnect ──────────────────────────────────────────
  const processPendingCategoryOps = async () => {
    const ops = await getAllPendingOps()
    const categoryOps = ops.filter((op) => op.entity === 'category')
    if (categoryOps.length === 0) return

    for (const op of categoryOps) {
      try {
        if (op.type === 'create') {
          const res = await createCategoryAPI({
            name: op.payload.name, color: op.payload.color,
            description: op.payload.description || '',
          })
          if (res.success) {
            await deleteCategoryFromDB(op.payload._id)
            await deletePendingOp(op.opId)
            dispatchSyncToast(`"${res.data.name}" synced to server ✅`, 'success')
          }
        }
        if (op.type === 'update') {
          const res = await updateCategoryAPI(op.payload._id, {
            name: op.payload.name, color: op.payload.color,
          })
          if (res.success) {
            await deletePendingOp(op.opId)
            dispatchSyncToast(`"${res.data.name}" update synced ✅`, 'success')
          }
        }
        if (op.type === 'delete') {
          await deleteCategoryAPI(op.payload._id)
          await deletePendingOp(op.opId)
          dispatchSyncToast('Category deletion synced ✅', 'info')
        }
      } catch (err) {
        console.error(`Category op failed (${op.type}):`, err)
      }
    }
    await fetchAndSet()
  }

  // ── CREATE ────────────────────────────────────────────────────────────
  const createCategory = async (name, color = '#6366f1', description = '') => {
    const isOnline = await checkRealConnectivity()

    if (isOnline) {
      // Mark mutating = true BEFORE the API call
      // SSE will fire NEW_CATEGORY almost immediately after — we ignore it
      isMutating.current = true
      try {
        const res = await createCategoryAPI({ name: name.trim(), color, description })
        if (res.success) {
          // fetchAndSet is the ONLY thing that updates state — no manual push
          await fetchAndSet()
          return { ...res.data, syncStatus: 'synced' }
        }
      } finally {
        // Small delay before re-enabling SSE refresh
        // to absorb the SSE event that fires right after our API call
        setTimeout(() => { isMutating.current = false }, 1500)
      }
    } else {
      const dup = categories.find(
        (c) => c.name.toLowerCase() === name.trim().toLowerCase() && !c.isDeleted
      )
      if (dup) throw new Error(`A category named "${name.trim()}" already exists`)

      const temp = {
        _id: `temp_cat_${Date.now()}`,
        name: name.trim(), color, description,
        taskCount: 0, syncStatus: 'pending',
        isTemp: true, createdAt: new Date().toISOString(),
      }
      await saveSingleCategory(temp)
      await addPendingOp({ entity: 'category', type: 'create', payload: temp })
      setCategories((prev) => {
        const merged = [temp, ...prev]
        const map = new Map(merged.map((c) => [c._id, c]))
        return Array.from(map.values()).filter((c) => !c.isDeleted)
      })
      return temp
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────────
  const updateCategory = async (id, name, color) => {
    const isOnline = await checkRealConnectivity()

    if (!isOnline) {
      const dup = categories.find(
        (c) => c._id !== id && c.name.toLowerCase() === name.trim().toLowerCase() && !c.isDeleted
      )
      if (dup) throw new Error(`A category named "${name.trim()}" already exists`)
      setCategories((prev) =>
        prev.map((c) => c._id === id ? { ...c, name, color, syncStatus: 'pending' } : c)
      )
      const all = await getAllCategoriesFromDB()
      const cat = all.find((c) => c._id === id)
      if (cat) await saveSingleCategory({ ...cat, name, color, syncStatus: 'pending' })
      await addPendingOp({ entity: 'category', type: 'update', payload: { _id: id, name, color } })
      return
    }

    isMutating.current = true
    try {
      const res = await updateCategoryAPI(id, { name: name.trim(), color })
      if (res.success) await fetchAndSet()
    } finally {
      setTimeout(() => { isMutating.current = false }, 1500)
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────
  const deleteCategory = async (id) => {
    const isOnline = await checkRealConnectivity()

    setCategories((prev) => prev.filter((c) => c._id !== id))
    await deleteCategoryFromDB(id)

    if (isOnline) {
      isMutating.current = true
      try {
        await deleteCategoryAPI(id)
        await fetchAndSet()
      } finally {
        setTimeout(() => { isMutating.current = false }, 1500)
      }
    } else {
      await addPendingOp({ entity: 'category', type: 'delete', payload: { _id: id } })
    }
  }

 // ── SSE handlers ──────────────────────────────────────────────────────
// If WE just mutated, skip SSE refresh — it's our own broadcast coming back

const addCategoryFromSSE = async (category) => {
  if (isMutating.current) return

  try {
    // Save directly to IndexedDB
    await saveSingleCategory(category)

    // Update React state
    setCategories((prev) => {
      const exists = prev.find((c) => c._id === category._id)

      if (exists) {
        return prev.map((c) => (c._id === category._id ? category : c))
      }

      const merged = [category, ...prev]
      const map = new Map(merged.map((c) => [c._id, c]))
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    })
  } catch (err) {
    console.error('SSE NEW_CATEGORY sync failed:', err)
  }
}

const updateCategoryFromSSE = async (category) => {
  if (isMutating.current) return

  try {
    // Update IndexedDB
    await saveSingleCategory(category)

    // Update React state
    setCategories((prev) =>
      prev.map((c) => (c._id === category._id ? category : c))
    )
  } catch (err) {
    console.error('SSE UPDATED_CATEGORY sync failed:', err)
  }
}

const removeCategoryFromSSE = async (id) => {
  if (isMutating.current) return

  try {
    // Remove from IndexedDB
    await deleteCategoryFromDB(id)

    // Update React state
    setCategories((prev) => prev.filter((c) => c._id !== id))
  } catch (err) {
    console.error('SSE DELETED_CATEGORY sync failed:', err)
  }
}

  return {
    categories, loading,
    createCategory, updateCategory, deleteCategory,
    addCategoryFromSSE, updateCategoryFromSSE, removeCategoryFromSSE,
  }
}