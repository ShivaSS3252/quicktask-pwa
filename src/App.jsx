import { useTasks } from './hooks/useTasks'
import { TaskInput } from './components/TaskInput'
import { TaskItem } from './components/TaskItem'
import { OnlineStatus } from './components/OnlineStatus'
import { NotificationSetup } from './components/NotificationSetup'

function App() {
  const { tasks, loading, createTask, toggleTask, removeTask } = useTasks()

  const pending = tasks.filter(t => t.syncStatus === 'pending').length
  const completed = tasks.filter(t => t.completed).length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-indigo-400 mb-1">⚡ QuickTask</h1>
          <p className="text-gray-500 text-sm">Offline-first task manager</p>
        </div>

        {/* Online status banner */}
        <OnlineStatus />

        {/* Push notification setup */}
        <NotificationSetup />

        {/* Stats row */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-bold text-white">{tasks.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-bold text-green-400">{completed}</p>
            <p className="text-xs text-gray-500">Done</p>
          </div>
          <div className="flex-1 bg-gray-800 rounded-xl px-4 py-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">{pending}</p>
            <p className="text-xs text-gray-500">Pending Sync</p>
          </div>
        </div>

        {/* Input */}
        <TaskInput onAdd={createTask} />

        {/* Task list */}
        {loading ? (
          <p className="text-center text-gray-600 py-10">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-center text-gray-600 py-10">No tasks yet — add one above</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={removeTask}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default App
