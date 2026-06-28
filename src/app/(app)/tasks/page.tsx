'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { GhostWorkerConsole } from '@/components/ghost/GhostWorkerConsole';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { Plus, Search, LayoutGrid, List, Calendar as CalendarIcon, Filter, Clock, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type ViewMode = 'board' | 'list' | 'calendar';

const priorityColors: Record<string, string> = {
  critical: 'var(--neon-pink)',
  high:     'var(--neon-amber)',
  medium:   'var(--neon-cyan)',
  low:      'var(--text-tertiary)',
};

const statusLabels: Record<TaskStatus, string> = {
  todo: 'Todo', in_progress: 'In Progress', completed: 'Completed', overdue: 'Overdue', rescued: 'Rescued',
};

// ─── Calendar View ────────────────────────────────────────────────────────────
const CalendarView: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const [month, setMonth] = useState(() => new Date());
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    const key = new Date(t.deadline).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={() => setMonth(new Date(year, monthIdx - 1))} style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
        <button onClick={() => setMonth(new Date(year, monthIdx + 1))} style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} style={{ padding: '6px', textAlign: 'center', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = new Date(year, monthIdx, day);
          const dayTasks = tasksByDate[date.toDateString()] || [];
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div key={day} style={{ padding: '6px', minHeight: '64px', background: isToday ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)', border: isToday ? '1px solid rgba(0,229,255,0.3)' : '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '11px', color: isToday ? 'var(--neon-cyan)' : 'var(--text-secondary)', fontWeight: isToday ? 700 : 400, marginBottom: '4px' }}>{day}</div>
              {dayTasks.slice(0, 3).map((t) => (
                <div key={t.id} style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', marginBottom: '2px', background: `${priorityColors[t.priority]}20`, color: priorityColors[t.priority], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </div>
              ))}
              {dayTasks.length > 3 && <div style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>+{dayTasks.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── List View ────────────────────────────────────────────────────────────────
const ListView: React.FC<{ tasks: Task[]; onComplete: (id: string) => void; onDelete: (id: string) => void }> = ({ tasks, onComplete, onDelete }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
    {/* Header */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 80px', gap: '12px', padding: '8px 14px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--glass-border)' }}>
      <span>Task</span><span>Status</span><span>Priority</span><span>Deadline</span><span>Actions</span>
    </div>
    {tasks.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No tasks found.</div>
    ) : (
      tasks.map((task, i) => (
        <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 80px', gap: '12px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', cursor: 'default' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
            {task.category && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{task.category}</div>}
          </div>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>{statusLabels[task.status]}</span>
          <span style={{ fontSize: '10px', color: priorityColors[task.priority], fontWeight: 600, textTransform: 'capitalize' }}>{task.priority}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={9} /> {new Date(task.deadline).toLocaleDateString()}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => onComplete(task.id)} title="Complete" style={{ background: 'none', border: '1px solid var(--neon-green)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: 'var(--neon-green)', fontSize: '10px' }}>✓</button>
            <button onClick={() => onDelete(task.id)} title="Delete" style={{ background: 'none', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: 'var(--neon-pink)', fontSize: '10px' }}>×</button>
          </div>
        </motion.div>
      ))
    )}
  </div>
);

// ─── Add Task Modal ───────────────────────────────────────────────────────────
const AddTaskModal: React.FC<{ onClose: () => void; onCreate: (d: Partial<Task>) => Promise<void> }> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Work');
  const [minutes, setMinutes] = useState(60);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 24 * 3600 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onCreate({ title, description, priority, deadline: new Date(deadline), estimatedMinutes: minutes, category });
      showToast({ type: 'success', message: `Task "${title}" created!` });
      onClose();
    } catch { showToast({ type: 'error', message: 'Failed to create task.' }); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(520px, 94vw)', background: 'rgba(10,10,22,0.98)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--neon-cyan)' }}>New Task</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'inherit' }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)..." rows={2} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Priority</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <button key={p} onClick={() => setPriority(p)} style={{ padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: `1px solid ${priority === p ? priorityColors[p] : 'var(--glass-border)'}`, background: priority === p ? `${priorityColors[p]}15` : 'transparent', color: priority === p ? priorityColors[p] : 'var(--text-tertiary)', fontSize: '10px', cursor: 'pointer', textTransform: 'capitalize' }}>{p}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '14px' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Deadline</label>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Est. (min)</label>
              <input type="number" value={minutes} min={5} onChange={(e) => setMinutes(Number(e.target.value))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <NeonButton variant="cyan" fullWidth loading={loading} onClick={handleCreate} icon={<Plus size={14} />}>Create Task</NeonButton>
            <NeonButton variant="purple" onClick={onClose}>Cancel</NeonButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Tasks Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, loading, createTask, updateTask, completeTask, deleteTask } = useTasks(user?.id || '');
  const { tasks: demoTasks, isDemo } = useDemo();
  const { showToast } = useToast();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeGhostTask, setActiveGhostTask] = useState<Task | null>(null);

  const allTasks = isDemo ? demoTasks : tasks;

  const filtered = allTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const handleCreate = async (data: Partial<Task>) => {
    if (isDemo) { showToast({ type: 'info', message: 'Demo mode: changes are not saved.' }); return; }
    await createTask({
      title: data.title!,
      description: data.description || '',
      status: 'todo',
      priority: data.priority || 'medium',
      deadline: data.deadline || new Date(Date.now() + 24 * 3600 * 1000),
      estimatedMinutes: data.estimatedMinutes || 60,
      category: data.category || 'General',
      tags: [],
      subtasks: [],
    });
  };

  const handleComplete = async (id: string) => {
    if (isDemo) return;
    await completeTask(id);
    showToast({ type: 'success', message: 'Task completed! +15 XP 🎉' });
  };

  const handleDelete = async (id: string) => {
    if (isDemo) return;
    await deleteTask(id);
    showToast({ type: 'info', message: 'Task deleted.' });
  };

  const viewBtns: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'board',    icon: <LayoutGrid size={14} />, label: 'Board' },
    { mode: 'list',     icon: <List size={14} />,       label: 'List' },
    { mode: 'calendar', icon: <CalendarIcon size={14} />, label: 'Calendar' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div data-tour="task-board" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0, flexWrap: 'wrap' }}>
        {/* View switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {viewBtns.map(({ mode, icon, label }) => (
            <button key={mode} onClick={() => setView(mode)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', border: 'none', borderRight: '1px solid var(--glass-border)', background: view === mode ? 'rgba(0,229,255,0.1)' : 'transparent', color: view === mode ? 'var(--neon-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: view === mode ? 600 : 400, transition: 'all 0.15s ease' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '7px 12px', flex: 1, minWidth: '180px' }}>
          <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', width: '100%', fontFamily: 'inherit' }} />
        </div>

        {/* Priority filter */}
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', outline: 'none', cursor: 'pointer' }}>
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Status filter */}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', outline: 'none', cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div style={{ marginLeft: 'auto' }}>
          <NeonButton variant="cyan" size="sm" icon={<Plus size={13} />} onClick={() => setShowAddModal(true)}>New Task</NeonButton>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {loading && !isDemo ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>Loading tasks...</div>
        ) : view === 'board' ? (
          <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px 90px' }}>
            <TaskKanban
              tasks={filtered}
              onTaskUpdate={async (id, updates) => { if (!isDemo) await updateTask(id, updates); }}
              onTaskClick={() => {}}
              onTaskEdit={() => {}}
              onTaskComplete={handleComplete}
              onTaskDelete={handleDelete}
              onTaskRescue={(id) => router.push(`/rescue/${id}`)}
              onTaskGhostWorker={(task) => setActiveGhostTask(task)}
              onAddTaskClick={() => setShowAddModal(true)}
            />
          </div>
        ) : view === 'list' ? (
          <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 90px' }}>
            <GlassCard padding="sm" hoverable={false} style={{ marginTop: '16px' }}>
              <ListView tasks={filtered} onComplete={handleComplete} onDelete={handleDelete} />
            </GlassCard>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 90px' }}>
            <GlassCard padding="md" hoverable={false}>
              <CalendarView tasks={filtered} />
            </GlassCard>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} onCreate={handleCreate} />}
      </AnimatePresence>

      <AnimatePresence>
        {activeGhostTask && (
          <GhostWorkerConsole
            task={activeGhostTask}
            isOpen={true}
            onClose={() => setActiveGhostTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
