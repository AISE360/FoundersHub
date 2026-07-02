import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getPriorityColor } from '@/lib/utils'
import { Plus } from 'lucide-react'
import type { Task } from '@/types'

type ProjectOption = { id: string; name: string }
import TaskModal from '@/components/tasks/TaskModal'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'todo', label: 'TODO', color: 'bg-gray-100 text-gray-700' },
  { id: 'in-progress', label: 'IN PROGRESS', color: 'bg-blue-100 text-blue-700' },
  { id: 'testing', label: 'TESTING', color: 'bg-purple-100 text-purple-700' },
  { id: 'done', label: 'DONE', color: 'bg-green-100 text-green-700' },
]

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${isDragging ? 'opacity-40' : ''}`}
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
      {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
      <div className="flex items-center justify-between">
        <span className={`badge text-xs ${getPriorityColor(task.priority)}`}>{task.priority}</span>
        {(task as any).assignee && (
          <span className="text-xs text-gray-500">{(task as any).assignee.full_name}</span>
        )}
      </div>
    </div>
  )
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [selectedProject, setSelectedProject] = useState('all')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const load = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('tasks').select('*, assignee:profiles(*)').order('created_at'),
      supabase.from('projects').select('id, name'),
    ])
    setTasks((t as any) ?? [])
    setProjects(p ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = selectedProject === 'all'
    ? tasks
    : tasks.filter(t => t.project_id === selectedProject)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === event.active.id) ?? null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as Task['status']

    if (COLUMNS.some(c => c.id === newStatus)) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
      await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-4 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
        <div className="flex gap-3">
          <select className="input w-auto" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Task
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 h-full">
          {COLUMNS.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id)
            return (
              <div key={col.id} className="flex flex-col min-h-96">
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${col.color}`}>
                  <span className="text-xs font-bold tracking-wide">{col.label}</span>
                  <span className="text-xs font-medium bg-white/50 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <SortableContext items={colTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div
                    id={col.id}
                    className="flex-1 space-y-2 p-2 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 min-h-32"
                  >
                    {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
                    {colTasks.length === 0 && (
                      <p className="text-xs text-gray-400 text-center pt-8">Drop here</p>
                    )}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white rounded-lg border border-brand-300 p-3 shadow-xl rotate-2 opacity-90">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {showModal && (
        <TaskModal
          projectId={selectedProject !== 'all' ? selectedProject : (projects[0]?.id ?? '')}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
