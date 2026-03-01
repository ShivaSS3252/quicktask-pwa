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
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                   text-white placeholder-gray-500 focus:outline-none
                   focus:border-indigo-500 transition-colors"
      />
      <button
        type="submit"
        className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold
                   px-5 py-3 rounded-xl transition-colors"
      >
        Add
      </button>
    </form>
  )
}