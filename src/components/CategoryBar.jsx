// src/components/CategoryBar.jsx
import { useState, useRef, useEffect } from 'react'
import { getAllCategoriesFromDB } from '../db'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6',
]

export const CategoryBar = ({ categories, selected, onSelect, onCreate, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const scrollRef = useRef(null)
  const addInputRef = useRef(null)
  const editInputRef = useRef(null)

  // Auto-focus add input when panel opens
  useEffect(() => {
    if (showAdd && addInputRef.current) {
      addInputRef.current.focus()
    }
  }, [showAdd])

  // Auto-focus edit input when edit panel opens
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // ── ADD ────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    setAdding(true)
    setAddError('')
    try {
      await onCreate(trimmed, newColor)
      // getAllCategoriesFromDB()
      // Reset form and close panel on success
      setNewName('')
      setNewColor('#6366f1')
      setShowAdd(false)
    } catch (err) {
      setAddError(err.message || 'Failed to create category')
    } finally {
      setAdding(false)
    }
  }

  // ── EDIT ───────────────────────────────────────────────────────────────
  const startEdit = (cat, e) => {
    e.stopPropagation()
    // Close add panel if open
    setShowAdd(false)
    setAddError('')
    setEditingId(cat._id)
    setEditName(cat.name)
    setEditColor(cat.color || '#6366f1')
    setEditError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditColor('')
    setEditError('')
    setSaving(false)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const trimmed = editName.trim()
    if (!trimmed) return
    // Don't submit if name hasn't changed AND color hasn't changed
    const original = categories.find((c) => c._id === editingId)
    if (original && original.name === trimmed && original.color === editColor) {
      cancelEdit()
      return
    }
    setSaving(true)
    setEditError('')
    try {
      await onUpdate(editingId, trimmed, editColor)
      cancelEdit()
    } catch (err) {
      setEditError(err.message || 'Failed to update')
      setSaving(false)
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────
  const handleDelete = async (id, name, e) => {
    e.stopPropagation()
    // If currently editing this category, cancel edit first
    if (editingId === id) cancelEdit()
    if (!window.confirm(`Delete category "${name}"? Tasks in this category will become uncategorized.`)) return
    try {
      await onDelete(id)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // ── DRAG SCROLL ────────────────────────────────────────────────────────
  const handleMouseDown = (e) => {
    // Don't interfere with button clicks
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SPAN') return
    const el = scrollRef.current
    if (!el) return
    el.style.cursor = 'grabbing'
    const startX = e.pageX - el.offsetLeft
    const scrollLeft = el.scrollLeft
    const onMove = (ev) => {
      el.scrollLeft = scrollLeft - (ev.pageX - el.offsetLeft - startX)
    }
    const onUp = () => {
      el.style.cursor = 'grab'
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div style={{ marginBottom: '20px' }}>

      {/* ── Pill row ─────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'visible',
          paddingBottom: '8px',
          paddingTop: '2px',
          cursor: 'grab',
          userSelect: 'none',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`::-webkit-scrollbar { display: none; }`}</style>

        {/* All Tasks */}
        <button
          onClick={() => onSelect(null)}
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            padding: '7px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
            background: selected === null
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(255,255,255,0.06)',
            color: selected === null ? '#fff' : 'rgba(255,255,255,0.4)',
            boxShadow: selected === null ? '0 4px 14px rgba(99,102,241,0.4)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }}
        >
          All Tasks
        </button>

        {/* Category pills */}
        {(categories || []).map((cat) => {
          const isSelected = selected === cat._id
          const isPending = cat.syncStatus === 'pending'

          return (
            <div
              key={cat._id}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {/* Pill button */}
              <button
                onClick={() => onSelect(isSelected ? null : cat._id)}
                style={{
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isSelected ? 'none' : `1px solid ${cat.color}40`,
                  background: isSelected ? cat.color : 'rgba(255,255,255,0.04)',
                  color: isSelected ? '#fff' : 'rgba(255,255,255,0.55)',
                  boxShadow: isSelected ? `0 4px 14px ${cat.color}50` : 'none',
                  opacity: isPending ? 0.7 : 1,
                  outline: editingId === cat._id ? `2px solid ${cat.color}` : 'none',
                  outlineOffset: '2px',
                }}
              >
                {/* Color dot */}
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: isSelected ? 'rgba(255,255,255,0.8)' : cat.color,
                  }}
                />
                {cat.name}
                {/* Task count */}
                {cat.taskCount > 0 && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      background: isSelected ? 'rgba(255,255,255,0.2)' : `${cat.color}25`,
                      color: isSelected ? '#fff' : cat.color,
                    }}
                  >
                    {cat.taskCount}
                  </span>
                )}
                {/* Pending badge */}
                {isPending && (
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#fbbf24',
                      background: 'rgba(251,191,36,0.15)',
                      padding: '1px 5px',
                      borderRadius: '999px',
                      border: '1px solid rgba(251,191,36,0.3)',
                    }}
                  >
                    ⏳
                  </span>
                )}
              </button>

              {/* Edit icon */}
              <button
                onClick={(e) => startEdit(cat, e)}
                title={`Edit ${cat.name}`}
                style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: editingId === cat._id
                    ? `1px solid ${cat.color}80`
                    : '1px solid rgba(255,255,255,0.1)',
                  background: editingId === cat._id
                    ? `${cat.color}20`
                    : 'rgba(255,255,255,0.05)',
                  color: editingId === cat._id
                    ? cat.color
                    : 'rgba(255,255,255,0.35)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                ✎
              </button>

              {/* Delete icon */}
              <button
                onClick={(e) => handleDelete(cat._id, cat.name, e)}
                title={`Delete ${cat.name}`}
                style={{
                  flexShrink: 0,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1px solid rgba(239,68,68,0.15)',
                  background: 'rgba(239,68,68,0.07)',
                  color: 'rgba(248,113,113,0.6)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                ×
              </button>
            </div>
          )
        })}

        {/* + New pill */}
        <button
          onClick={() => {
            setShowAdd((prev) => !prev)
            setAddError('')
            if (editingId) cancelEdit()
          }}
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            padding: '7px 16px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: showAdd ? 'rgba(139,92,246,0.12)' : 'transparent',
            border: showAdd
              ? '1px solid rgba(139,92,246,0.4)'
              : '1px dashed rgba(255,255,255,0.2)',
            color: showAdd ? '#a78bfa' : 'rgba(255,255,255,0.3)',
          }}
        >
          {showAdd ? '✕ Cancel' : '＋ New'}
        </button>
      </div>

      {/* ── Edit panel ────────────────────────────────────────────────── */}
      {editingId && (
        <div
          style={{
            marginTop: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <p style={{
            fontSize: '10px', fontWeight: 800,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '1px', textTransform: 'uppercase',
            marginBottom: '12px', margin: '0 0 12px',
          }}>
            Edit Category
          </p>

          <form onSubmit={handleUpdate}>
            {/* Name input */}
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
              placeholder="Category name..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />

            {/* Color swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Color
              </span>
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditColor(color)}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer',
                    flexShrink: 0, transition: 'all 0.15s',
                    transform: editColor === color ? 'scale(1.35)' : 'scale(1)',
                    boxShadow: editColor === color
                      ? `0 0 0 2px #0a0a14, 0 0 0 4px ${color}`
                      : `0 2px 6px ${color}60`,
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {editError && (
              <p style={{
                fontSize: '12px', color: '#f87171',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '8px', padding: '8px 12px',
                marginBottom: '12px',
              }}>
                ⚠️ {editError}
              </p>
            )}

            {/* Preview + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editName.trim() && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 10px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 700,
                  color: editColor,
                  background: `${editColor}18`,
                  border: `1px solid ${editColor}35`,
                  flexShrink: 0,
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: editColor }} />
                  {editName}
                </div>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: '8px 16px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim() || saving}
                  style={{
                    padding: '8px 16px', borderRadius: '10px',
                    fontSize: '12px', fontWeight: 700,
                    cursor: editName.trim() && !saving ? 'pointer' : 'not-allowed',
                    border: 'none',
                    background: editName.trim() && !saving
                      ? `linear-gradient(135deg, ${editColor}, ${editColor}bb)`
                      : 'rgba(255,255,255,0.05)',
                    color: editName.trim() && !saving ? '#fff' : 'rgba(255,255,255,0.2)',
                    boxShadow: editName.trim() && !saving ? `0 4px 12px ${editColor}40` : 'none',
                  }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Add panel ─────────────────────────────────────────────────── */}
      {showAdd && !editingId && (
        <div
          style={{
            marginTop: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '16px',
            padding: '16px',
          }}
        >
          <p style={{
            fontSize: '10px', fontWeight: 800,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: '1px', textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>
            New Category
          </p>

          <form onSubmit={handleAdd}>
            {/* Name input */}
            <input
              ref={addInputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowAdd(false); setNewName('') } }}
              placeholder="e.g. Design, Finance, Fitness..."
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />

            {/* Color swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Color
              </span>
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: color, border: 'none', cursor: 'pointer',
                    flexShrink: 0, transition: 'all 0.15s',
                    transform: newColor === color ? 'scale(1.35)' : 'scale(1)',
                    boxShadow: newColor === color
                      ? `0 0 0 2px #0a0a14, 0 0 0 4px ${color}`
                      : `0 2px 6px ${color}60`,
                  }}
                />
              ))}
            </div>

            {/* Error */}
            {addError && (
              <p style={{
                fontSize: '12px', color: '#fcd34d',
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: '8px', padding: '8px 12px',
                marginBottom: '12px',
              }}>
                ⚠️ {addError}
              </p>
            )}

            {/* Preview + button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {newName.trim() && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '4px 10px', borderRadius: '999px',
                  fontSize: '11px', fontWeight: 700,
                  color: newColor,
                  background: `${newColor}18`,
                  border: `1px solid ${newColor}35`,
                  flexShrink: 0,
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: newColor }} />
                  {newName}
                </div>
              )}
              <button
                type="submit"
                disabled={!newName.trim() || adding}
                style={{
                  marginLeft: 'auto',
                  padding: '8px 20px', borderRadius: '10px',
                  fontSize: '12px', fontWeight: 700,
                  cursor: newName.trim() && !adding ? 'pointer' : 'not-allowed',
                  border: 'none',
                  background: newName.trim() && !adding
                    ? `linear-gradient(135deg, ${newColor}, ${newColor}bb)`
                    : 'rgba(255,255,255,0.05)',
                  color: newName.trim() && !adding ? '#fff' : 'rgba(255,255,255,0.2)',
                  boxShadow: newName.trim() && !adding ? `0 4px 14px ${newColor}40` : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {adding ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}