// src/components/Toast.jsx
import { useEffect } from 'react'

export const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const config = {
    success: {
      icon: '✅',
      bg: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.25)',
      color: '#6ee7b7',
      glow: 'rgba(16,185,129,0.2)',
    },
    warning: {
      icon: '⏳',
      bg: 'rgba(251,191,36,0.1)',
      border: 'rgba(251,191,36,0.25)',
      color: '#fcd34d',
      glow: 'rgba(251,191,36,0.2)',
    },
    info: {
      icon: '🔔',
      bg: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.25)',
      color: '#a5b4fc',
      glow: 'rgba(99,102,241,0.2)',
    },
    error: {
      icon: '❌',
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.25)',
      color: '#fca5a5',
      glow: 'rgba(239,68,68,0.2)',
    },
  }

  const { icon, bg, border, color, glow } = config[type] || config.info

  return (
    // Fixed — centered at top of screen
    <div style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: '100%',
      maxWidth: '420px',
      padding: '0 16px',
      pointerEvents: 'none',
    }}>
      <div style={{
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', gap: '10px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '16px',
        padding: '13px 16px',
        boxShadow: `0 8px 32px ${glow}, 0 2px 8px rgba(0,0,0,0.4)`,
        backdropFilter: 'blur(20px)',
        animation: 'toastIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
        <p style={{
          flex: 1, fontSize: '13px', fontWeight: 600,
          color, lineHeight: '1.4', margin: 0,
        }}>
          {message}
        </p>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, background: 'transparent', border: 'none',
            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
            fontSize: '20px', lineHeight: 1, padding: '0 2px',
            display: 'flex', alignItems: 'center',
          }}
        >×</button>
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}