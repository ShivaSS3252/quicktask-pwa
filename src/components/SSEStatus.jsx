// src/components/SSEStatus.jsx
export const SSEStatus = ({ status }) => {
  const config = {
    connected:    { dot: 'bg-emerald-400', label: 'Live',           show: false },
    reconnecting: { dot: 'bg-amber-400',   label: 'Reconnecting',   show: true  },
    disconnected: { dot: 'bg-red-400',     label: 'Disconnected',   show: true  },
    offline:      { dot: 'bg-white/20',    label: 'Offline',        show: false },
  }

  const { dot, label, show } = config[status] || config.disconnected
  if (!show) return null

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">{label}</span>
    </div>
  )
}