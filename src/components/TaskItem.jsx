// src/components/TaskItem.jsx

export const TaskItem = ({ task, onToggle, onDelete }) => {
  return (
    <div className="flex items-center gap-3 bg-gray-800 border border-gray-700
                    rounded-xl px-4 py-3 group transition-all">

      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors
                    ${task.completed
                      ? 'bg-indigo-500 border-indigo-500'
                      : 'border-gray-500 hover:border-indigo-400'
                    }`}
      >
        {task.completed && (
          <span className="text-white text-xs flex items-center justify-center w-full h-full">
            ✓
          </span>
        )}
      </button>

      {/* Task text */}
      <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-100'}`}>
        {task.text}
      </span>

      {/* Sync status badge */}
      {/* Real world: WhatsApp single tick = pending, double tick = synced */}
      {task.syncStatus === 'pending' && (
        <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
          pending
        </span>
      )}

      {/* Delete button */}
      <button
        onClick={() => onDelete(task.id)}
        className="text-gray-600 hover:text-red-400 transition-colors opacity-0
                   group-hover:opacity-100 text-lg leading-none"
      >
        ×
      </button>
    </div>
  )
}