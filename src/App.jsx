// src/App.jsx
import { useState, useEffect } from 'react'
import { useTasks } from './hooks/useTasks'
import { useCategories } from './hooks/useCategories'
import { useSSE } from './hooks/useSSE'
import { TaskInput } from './components/TaskInput'
import { TaskItem } from './components/TaskItem'
import { OnlineStatus } from './components/OnlineStatus'
import { NotificationSetup } from './components/NotificationSetup'
import { CategoryBar } from './components/CategoryBar'
import { Toast } from './components/Toast'
import { SSEStatus } from './components/SSEStatus'

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => setToast({ message, type })

  // Listen for toast events dispatched by useCategories when offline ops sync
  useEffect(() => {
    const handler = (e) => showToast(e.detail.message, e.detail.type)
    window.addEventListener('show-toast', handler)
    return () => window.removeEventListener('show-toast', handler)
  }, [])

  const {
    categories, loading: catLoading,
    createCategory, updateCategory, deleteCategory,
    addCategoryFromSSE, updateCategoryFromSSE, removeCategoryFromSSE,
  } = useCategories()

  const { tasks, loading, createTask, editTask, toggleTask, removeTask } = useTasks(selectedCategory)

  // SSE — real-time events from any source (Postman, MongoDB, another browser tab)
  const { sseStatus } = useSSE({
    onNewCategory: async (category) => {
      await addCategoryFromSSE(category)
      showToast(`New category "${category.name}" synced! ✨`, 'success')
    },
    onUpdatedCategory: async (category) => {
      await updateCategoryFromSSE(category)
      showToast(`Category "${category.name}" was updated 🔄`, 'info')
    },
    onDeletedCategory: async (id) => {
      await removeCategoryFromSSE(id)
      showToast('A category was removed 🗑️', 'warning')
    },
  })

  // Category actions — with toasts for online and offline states
  const handleCreateCategory = async (name, color, description) => {
    const result = await createCategory(name, color, description)
    if (result?.syncStatus === 'pending') {
      showToast(`"${name}" saved offline — will sync when online ⏳`, 'warning')
    } else {
      showToast(`Category "${name}" created! 🎨`, 'success')
    }
    return result
  }

  const handleUpdateCategory = async (id, name, color) => {
    const isOnline = navigator.onLine
    await updateCategory(id, name, color)
    if (!isOnline) {
      showToast(`"${name}" updated offline — will sync when online ⏳`, 'warning')
    } else {
      showToast(`Category "${name}" updated ✅`, 'success')
    }
  }

  const handleDeleteCategory = async (id) => {
    const cat = categories.find((c) => c._id === id)
    const isOnline = navigator.onLine
    await deleteCategory(id)
    if (selectedCategory === id) setSelectedCategory(null)
    if (!isOnline) {
      showToast('Category deleted offline — will sync when online ⏳', 'warning')
    } else {
      showToast(`Category "${cat?.name || ''}" deleted 🗑️`, 'info')
    }
  }

  const pending = tasks.filter((t) => t.syncStatus === 'pending').length
  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-sm shadow-lg shadow-indigo-500/30">⚡</div>
            <span className="font-bold text-sm tracking-tight text-white">QuickTask</span>
          </div>
          <SSEStatus status={sseStatus} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 pb-24 relative z-10">

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-[38px] font-black tracking-tight leading-none text-white mb-1.5">
            My Tasks<span className="text-indigo-400">.</span>
          </h1>
          <p className="text-xs text-white/30 tracking-widest font-medium uppercase">
            Offline · Real-time · Always in sync
          </p>
        </div>

        <OnlineStatus />
        <NotificationSetup />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          <div className="bg-indigo-500/[0.07] ring-1 ring-indigo-500/20 rounded-2xl p-4 text-center">
            <p className="text-[28px] font-black text-indigo-400 leading-none">{total}</p>
            <p className="text-[10px] text-white/30 mt-1.5 font-bold tracking-widest uppercase">Total</p>
          </div>
          <div className="bg-emerald-500/[0.07] ring-1 ring-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-[28px] font-black text-emerald-400 leading-none">{completed}</p>
            <p className="text-[10px] text-white/30 mt-1.5 font-bold tracking-widest uppercase">Done</p>
          </div>
          <div className="bg-amber-500/[0.07] ring-1 ring-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-[28px] font-black text-amber-400 leading-none">{pending}</p>
            <p className="text-[10px] text-white/30 mt-1.5 font-bold tracking-widest uppercase">Unsynced</p>
          </div>
        </div>

        {/* Categories */}
        {!catLoading && (
          <CategoryBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            onCreate={handleCreateCategory}
            onUpdate={handleUpdateCategory}
            onDelete={handleDeleteCategory}
          />
        )}

        {/* Task input */}
        <TaskInput onAdd={(text) => createTask(text, selectedCategory)} />

        {/* Task list */}
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
            <p className="text-5xl mb-3">{selectedCategory ? '📂' : '✨'}</p>
            <p className="text-white/40 text-sm font-medium">
              {selectedCategory ? 'No tasks in this category' : 'No tasks yet'}
            </p>
            <p className="text-white/20 text-xs mt-1">Add one using the input above</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                index={index}
                onToggle={toggleTask}
                onDelete={removeTask}
                onEdit={editTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* Toast — centered at top */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default App