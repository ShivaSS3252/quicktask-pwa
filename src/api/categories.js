// src/api/categories.js
const BASE_URL = import.meta.env.VITE_API_URL

// Parse error message from response body properly
// So "A category named X already exists" surfaces in UI
const parseError = async (res) => {
  try {
    const data = await res.json()
    return data.error || `Request failed with status ${res.status}`
  } catch {
    return `Request failed with status ${res.status}`
  }
}

export const getCategoriesAPI = async () => {
  const res = await fetch(`${BASE_URL}/api/categories`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export const createCategoryAPI = async (category) => {
  const res = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export const updateCategoryAPI = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export const deleteCategoryAPI = async (id) => {
  const res = await fetch(`${BASE_URL}/api/categories/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}