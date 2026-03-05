// src/components/TaskItem.jsx
import { useState, useRef, useEffect } from 'react'

export const TaskItem = ({ task, onToggle, onDelete, onEdit, index }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task.text)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = editText.trim()
    if (!trimmed || trimmed === task.text) {
      setIsEditing(false)
      setEditText(task.text)
      return
    }
    await onEdit(task.id, trimmed)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setIsEditing(false)
      setEditText(task.text)
    }
  }

  const isPending = task.syncStatus === 'pending'

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '14px 16px',
        background: isPending
          ? 'rgba(251,191,36,0.04)'
          : task.completed
            ? 'rgba(255,255,255,0.02)'
            : 'rgba(255,255,255,0.04)',
        border: isPending
          ? '1px solid rgba(251,191,36,0.15)'
          : task.completed
            ? '1px solid rgba(255,255,255,0.04)'
            : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        transition: 'all 0.2s',
        animation: `fadeIn 0.25s ease ${Math.min(index, 8) * 0.04}s both`,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        style={{
          flexShrink: 0, marginTop: '2px',
          width: '20px', height: '20px', borderRadius: '50%',
          cursor: 'pointer', transition: 'all 0.2s',
          background: task.completed
            ? 'linear-gradient(135deg, #10b981, #059669)'
            : 'transparent',
          border: task.completed
            ? 'none'
            : '2px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: task.completed ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
        }}
      >
        {task.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '8px', padding: '4px 10px',
              color: '#fff', fontSize: '14px', fontWeight: 500,
              outline: 'none', lineHeight: '1.5',
            }}
          />
        ) : (
          <p style={{
            fontSize: '14px', fontWeight: 500, lineHeight: '1.5',
            color: task.completed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)',
            textDecoration: task.completed ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>
            {task.text}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px', flexWrap: 'wrap' }}>
          {isPending && (
            <span style={{
              fontSize: '9px', fontWeight: 800, color: '#fbbf24',
              background: 'rgba(251,191,36,0.12)', padding: '2px 7px',
              borderRadius: '999px', border: '1px solid rgba(251,191,36,0.25)',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>⏳ Pending</span>
          )}
          {task.category && (
            <span style={{
              fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.05)', padding: '2px 8px',
              borderRadius: '999px', border: '1px solid rgba(255,255,255,0.07)',
            }}>
              {typeof task.category === 'object' ? task.category.name : '📂'}
            </span>
          )}
          {task.completed && (
            <span style={{ fontSize: '10px', color: 'rgba(16,185,129,0.5)', fontWeight: 600 }}>Done</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Edit */}
        {!task.completed && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            title="Edit task"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
              color: 'rgba(165,180,252,0.6)', cursor: 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >✎</button>
        )}

        {/* Save (when editing) */}
        {isEditing && (
          <button
            onClick={handleSave}
            title="Save"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)',
              color: 'rgba(52,211,153,0.8)', cursor: 'pointer',
              fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✓</button>
        )}

        {/* Delete */}
        {!isEditing && (
          <button
            onClick={() => onDelete(task.id)}
            title="Delete task"
            style={{
              width: '28px', height: '28px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)',
              color: 'rgba(248,113,113,0.5)', cursor: 'pointer',
              fontSize: '16px', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >×</button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}