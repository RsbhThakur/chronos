'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { GhostWorkerConsole } from '@/components/ghost/GhostWorkerConsole';
import { Task, TaskPriority, TaskStatus } from '@/types';
import { Plus, Search, LayoutGrid, List, Calendar as CalendarIcon, Filter, Clock, AlertTriangle, Check, Edit2, RotateCcw, Zap, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useResponsive } from '@/hooks/useResponsive';

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
const ListView: React.FC<{ tasks: Task[]; onComplete: (id: string) => void; onDelete: (id: string) => void; onEdit: (task: Task) => void; onTaskClick?: (task: Task) => void; isMobile?: boolean }> = ({ tasks, onComplete, onDelete, onEdit, onTaskClick, isMobile = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '2px' }}>
    {/* Header */}
    {!isMobile && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 80px', gap: '12px', padding: '8px 14px', fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--glass-border)' }}>
        <span>Task</span><span>Status</span><span>Priority</span><span>Deadline</span><span>Actions</span>
      </div>
    )}
    {tasks.length === 0 ? (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No tasks found.</div>
    ) : (
      tasks.map((task, i) => {
        if (isMobile) {
          return (
            <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
              onClick={() => onTaskClick ? onTaskClick(task) : onEdit(task)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{task.title}</div>
                  {task.category && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{task.category}</div>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} title={task.status === 'completed' ? "Restore Task" : "Complete"} style={{ background: 'none', border: task.status === 'completed' ? '1px solid var(--neon-cyan)' : '1px solid var(--neon-green)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: task.status === 'completed' ? 'var(--neon-cyan)' : 'var(--neon-green)', fontSize: '10px' }}>{task.status === 'completed' ? '↺' : '✓'}</button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} title="Delete" style={{ background: 'none', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: 'var(--neon-pink)', fontSize: '10px' }}>×</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>{statusLabels[task.status]}</span>
                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: 'var(--radius-full)', background: `${priorityColors[task.priority]}15`, color: priorityColors[task.priority], fontWeight: 600, textTransform: 'capitalize', border: `1px solid ${priorityColors[task.priority]}30` }}>{task.priority}</span>
                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto' }}>
                  <Clock size={9} /> {new Date(task.deadline).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          );
        }

        return (
          <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px 80px', gap: '12px', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => onTaskClick ? onTaskClick(task) : onEdit(task)}
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
              <button onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} title={task.status === 'completed' ? "Restore Task" : "Complete"} style={{ background: 'none', border: task.status === 'completed' ? '1px solid var(--neon-cyan)' : '1px solid var(--neon-green)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: task.status === 'completed' ? 'var(--neon-cyan)' : 'var(--neon-green)', fontSize: '10px' }}>{task.status === 'completed' ? '↺' : '✓'}</button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} title="Delete" style={{ background: 'none', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)', padding: '3px 6px', cursor: 'pointer', color: 'var(--neon-pink)', fontSize: '10px' }}>×</button>
            </div>
          </motion.div>
        );
      })
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

// ─── Edit Task Modal ──────────────────────────────────────────────────────────
const EditTaskModal: React.FC<{
  task: Task;
  onClose: () => void;
  onUpdate: (id: string, d: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}> = ({ task, onClose, onUpdate, onDelete }) => {
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(task.status || 'todo');
  const [category, setCategory] = useState(task.category || 'General');
  const [minutes, setMinutes] = useState(task.estimatedMinutes || 60);
  const [deadline, setDeadline] = useState(() => {
    const d = task.deadline ? new Date(task.deadline) : new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onUpdate(task.id, {
        title,
        description,
        priority,
        status,
        deadline: new Date(deadline),
        estimatedMinutes: minutes,
        category,
      });
      showToast({ type: 'success', message: `Task "${title}" updated!` });
      onClose();
    } catch {
      showToast({ type: 'error', message: 'Failed to update task.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      setLoading(true);
      try {
        await onDelete(task.id);
        onClose();
      } catch {
        showToast({ type: 'error', message: 'Failed to delete task.' });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(520px, 94vw)', background: 'rgba(10,10,22,0.98)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--neon-cyan)' }}>Edit Task</h2>
          <button onClick={handleDeleteClick} style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 'var(--radius-sm)', padding: '4px 10px', color: 'var(--neon-pink)', cursor: 'pointer', fontSize: 'var(--text-xs)' }}>Delete Task</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)..." rows={2} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
                <option value="todo" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Todo</option>
                <option value="in_progress" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>In Progress</option>
                <option value="completed" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Completed</option>
                <option value="overdue" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Overdue</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Est. (min)</label>
              <input type="number" value={minutes} min={5} onChange={(e) => setMinutes(Number(e.target.value))} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Deadline</label>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <NeonButton variant="cyan" fullWidth loading={loading} onClick={handleSave}>Save Changes</NeonButton>
            <NeonButton variant="purple" onClick={onClose}>Cancel</NeonButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Task Summary Modal ────────────────────────────────────────────────────────
const TaskSummaryModal: React.FC<{
  task: Task;
  onClose: () => void;
  onEditClick: (task: Task) => void;
  onCompleteToggle: (id: string) => Promise<void>;
  onUpdateSubtasks?: (id: string, subtasks: any[]) => Promise<void>;
}> = ({ task, onClose, onEditClick, onCompleteToggle, onUpdateSubtasks }) => {
  const { isMobile } = useResponsive();
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'amber' | 'red' | 'overdue'>('normal');

  useEffect(() => {
    setSubtasks(task.subtasks || []);
  }, [task.subtasks]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (task.status === 'completed') {
        setTimeLeftStr('Completed');
        setUrgency('normal');
        return;
      }

      const deadline = new Date(task.deadline);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();

      if (diffMs < 0) {
        setTimeLeftStr('OVERDUE');
        setUrgency('overdue');
        return;
      }

      const diffHrs = diffMs / (1000 * 60 * 60);
      if (diffHrs >= 24) {
        setTimeLeftStr(deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
        setUrgency('normal');
      } else {
        const totalMinutes = Math.floor(diffMs / 60000);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        setTimeLeftStr(`${hrs}h ${mins}m left`);
        setUrgency(diffHrs < 2 ? 'red' : 'amber');
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 30000);
    return () => clearInterval(interval);
  }, [task.deadline, task.status]);

  const handleSubtaskToggle = async (subtaskId: string) => {
    const updated = subtasks.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
    setSubtasks(updated);
    if (onUpdateSubtasks) {
      await onUpdateSubtasks(task.id, updated);
    }
  };

  const priorityColors: Record<string, string> = {
    critical: 'var(--neon-pink)',
    high:     'var(--neon-amber)',
    medium:   'var(--neon-cyan)',
    low:      'var(--neon-green)',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', zIndex: 750, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }} onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(600px, 94vw)',
          maxHeight: '85dvh',
          background: 'rgba(10,10,22,0.98)',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--glass-border)',
          borderLeft: `4px solid ${priorityColors[task.priority] || 'var(--glass-border)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{task.category || 'General'}</span>
            <h2 style={{ margin: '4px 0 0', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{task.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>×</button>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span className={`badge ${
            task.priority === 'critical' || task.priority === 'high' ? 'badge--pink' : task.priority === 'medium' ? 'badge--amber' : 'badge--green'
          }`} style={{ textTransform: 'capitalize' }}>
            {task.priority} Priority
          </span>
          <span className="badge badge--cyan" style={{ textTransform: 'capitalize' }}>
            {task.status.replace('_', ' ')}
          </span>
          {task.aiGenerated && (
            <span className="badge badge--cyan flex items-center gap-1">
              <Sparkles size={10} /> AI Synced
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="badge badge--purple flex items-center gap-1">
              <Clock size={10} /> {task.estimatedMinutes} min
            </span>
          )}
        </div>

        {/* Description Section */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 6px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</h4>
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: 'var(--text-sm)',
            color: task.description ? 'var(--text-secondary)' : 'var(--text-tertiary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            {task.description || 'No description provided for this task.'}
          </div>
        </div>

        {/* Real-time Countdown clock */}
        <div style={{
          background: urgency === 'overdue' ? 'rgba(236,72,153,0.06)' : urgency === 'red' ? 'rgba(239,68,68,0.06)' : 'rgba(0,229,255,0.03)',
          border: `1px solid ${urgency === 'overdue' || urgency === 'red' ? 'rgba(236,72,153,0.3)' : 'rgba(0,229,255,0.2)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: urgency === 'overdue' || urgency === 'red' ? 'var(--neon-pink)' : 'var(--neon-cyan)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>Deadline Timeline</span>
          </div>
          <span style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 700,
            color: urgency === 'overdue' || urgency === 'red' ? 'var(--neon-pink)' : task.status === 'completed' ? 'var(--neon-green)' : 'var(--neon-cyan)',
            letterSpacing: '0.5px'
          }}>
            {timeLeftStr}
          </span>
        </div>

        {/* Checklist / Subtasks */}
        {subtasks.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Checklist Subtasks</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', maxHeight: '160px', overflowY: 'auto' }}>
              {subtasks.map((st) => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)' }}>
                  <input
                    type="checkbox"
                    checked={st.completed}
                    onChange={() => handleSubtaskToggle(st.id)}
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: 'var(--neon-cyan)' }}
                  />
                  <span style={{
                    color: st.completed ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                    textDecoration: st.completed ? 'line-through' : 'none',
                    transition: 'all 0.15s ease'
                  }}>{st.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Specialized Rescue Details if Active */}
        {task.rescuePlan && task.status !== 'completed' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(236,72,153,0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            marginBottom: '20px',
            boxShadow: '0 0 15px rgba(236, 72, 153, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Zap size={14} className="animate-pulse-neon" style={{ color: 'var(--neon-pink)' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--neon-pink)', textTransform: 'uppercase', letterSpacing: '1px' }}>AI Rescue Mode Active</span>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Chronos Time Guardian has generated an auto-rescue focus list and micro-tasks for this item to resolve your time crunch.
            </p>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '16px', flexWrap: 'wrap' }}>
          <NeonButton
            variant={task.status === 'completed' ? 'cyan' : 'green'}
            onClick={async () => {
              await onCompleteToggle(task.id);
              onClose();
            }}
            icon={task.status === 'completed' ? <RotateCcw size={14} /> : <Check size={14} />}
          >
            {task.status === 'completed' ? 'Restore Task' : 'Complete Task'}
          </NeonButton>

          <NeonButton variant="purple" onClick={() => { onEditClick(task); onClose(); }} icon={<Edit2 size={14} />}>
            Edit Task
          </NeonButton>

          <div style={{ marginLeft: isMobile ? '0' : 'auto' }}>
            <NeonButton variant="purple" onClick={onClose}>Close</NeonButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Tasks Page ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const { tasks, loading, createTask, updateTask, completeTask, deleteTask } = useTasks(user?.id || '');
  const { tasks: demoTasks, isDemo } = useDemo();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalIdParam = searchParams.get('goalId');

  const [view, setView] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeGhostTask, setActiveGhostTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  const allTasks = isDemo ? demoTasks : tasks;
  const activeViewingTask = viewingTask ? allTasks.find((t) => t.id === viewingTask.id) : null;

  const filtered = allTasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (goalIdParam && t.parentGoalId !== goalIdParam) return false;
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
    const taskToToggle = allTasks.find((t) => t.id === id);
    if (taskToToggle?.status === 'completed') {
      await updateTask(id, { status: 'todo' });
      showToast({ type: 'info', message: 'Task restored to Todo.' });
    } else {
      await completeTask(id);
      showToast({ type: 'success', message: 'Task completed! +15 XP 🎉' });
    }
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
      <div data-tour="task-board" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '12px 16px' : '16px 24px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0, flexWrap: 'wrap' }}>
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
          <option value="all" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>All Priorities</option>
          <option value="critical" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Critical</option>
          <option value="high" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>High</option>
          <option value="medium" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Medium</option>
          <option value="low" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Low</option>
        </select>

        {/* Status filter */}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '7px 10px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', outline: 'none', cursor: 'pointer' }}>
          <option value="all" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>All Status</option>
          <option value="todo" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Todo</option>
          <option value="in_progress" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>In Progress</option>
          <option value="completed" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>Completed</option>
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
          <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '12px 12px 90px' : '20px 24px 90px' }}>
            <TaskKanban
              tasks={filtered}
              onTaskUpdate={async (id, updates) => { if (!isDemo) await updateTask(id, updates); }}
              onTaskClick={(task) => setViewingTask(task)}
              onTaskEdit={(task) => setEditingTask(task)}
              onTaskComplete={handleComplete}
              onTaskDelete={handleDelete}
              onTaskRescue={(id) => router.push(`/rescue/${id}`)}
              onTaskGhostWorker={(task) => setActiveGhostTask(task)}
              onAddTaskClick={() => setShowAddModal(true)}
            />
          </div>
        ) : view === 'list' ? (
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '0 12px 90px' : '0 24px 90px' }}>
            <GlassCard padding="sm" hoverable={false} style={{ marginTop: '16px' }}>
              <ListView tasks={filtered} onComplete={handleComplete} onDelete={handleDelete} onEdit={(task) => setEditingTask(task)} onTaskClick={(task) => setViewingTask(task)} isMobile={isMobile} />
            </GlassCard>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 12px 90px' : '20px 24px 90px' }}>
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
        {editingTask && (
          <EditTaskModal
            task={editingTask}
            onClose={() => setEditingTask(null)}
            onUpdate={async (id, updates) => {
              if (isDemo) {
                showToast({ type: 'info', message: 'Demo mode: changes are not saved.' });
                return;
              }
              await updateTask(id, updates);
            }}
            onDelete={async (id) => {
              if (isDemo) return;
              await deleteTask(id);
              showToast({ type: 'info', message: 'Task deleted.' });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeViewingTask && (
          <TaskSummaryModal
            task={activeViewingTask}
            onClose={() => setViewingTask(null)}
            onEditClick={(task) => setEditingTask(task)}
            onCompleteToggle={handleComplete}
            onUpdateSubtasks={async (id, subtasks) => {
              if (!isDemo) {
                await updateTask(id, { subtasks });
              }
            }}
          />
        )}
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
