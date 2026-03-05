// src/components/TaskInput.jsx
import { useState } from 'react'

export const TaskInput = ({ onAdd }) => {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="mb-5">
      <div className={`flex items-center gap-2 bg-white/[0.04] border rounded-2xl p-2 pl-4 transition-all duration-200 ${text ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-white/[0.08]'}`}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-white/25 font-medium py-2.5"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
            ${text.trim()
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 cursor-pointer'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
        >
          Add Task
        </button>
      </div>
    </form>
  )
}