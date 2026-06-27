'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { Plus, X, Award, Flame, Star, Shield, Sparkles, CheckSquare, Trash2, Calendar, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { tasks, loading, error, createTask, updateTask, deleteTask, completeTask } = useTasks(user?.id || '');
  const { gamification } = useDemo();

  // Dialog/Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Form states for creating a task
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newCategory, setNewCategory] = useState('Work');
  const [newMinutes, setNewMinutes] = useState(30);
  const [newDeadline, setNewDeadline] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
    return tomorrow.toISOString().slice(0, 16);
  });

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createTask({
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        category: newCategory,
        estimatedMinutes: newMinutes,
        deadline: new Date(newDeadline),
        tags: [],
        subtasks: [],
        status: 'todo'
      });

      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewPriority('medium');
      setNewCategory('Work');
      setNewMinutes(30);
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskClick = (task: Task) => {
    setActiveTask(task);
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks?.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    ) || [];
    const updated = await updateTask(task.id, { subtasks: updatedSubtasks });
    if (activeTask && activeTask.id === task.id) {
      setActiveTask(updated);
    }
  };

  const handleRescueTask = async (taskId: string) => {
    const updated = await updateTask(taskId, {
      rescuePlan: {
        severity: 'orange',
        totalMinutesAvailable: 120,
        totalMinutesNeeded: 90,
        feasible: true,
        plan: [
          { id: 'step-r-1', timeBlock: 'Next 30 Mins', action: 'Silence notifications and write outline', estimatedMinutes: 30, tips: 'No phone access', canBeSkipped: false, completed: false },
          { id: 'step-r-2', timeBlock: 'Next 60 Mins', action: 'Write core implementation files', estimatedMinutes: 60, tips: 'Focus on primary tests first', canBeSkipped: false, completed: false }
        ],
        sacrifices: ['Skip social check-in'],
        motivationalMessage: 'Focus. You have enough time if you move now.',
        checkpoints: [],
        activatedAt: new Date(),
        completedSteps: 0
      }
    });
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(updated);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    if (activeTask && activeTask.id === taskId) {
      setActiveTask(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
        LOADING SECURE WORKSPACE CONFIG...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: 'var(--space-6) var(--space-8)' }}>
      {/* Header Panel */}
      <header className="glass-card" style={{ padding: 'var(--space-4) var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h1 className="neon-text-cyan font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 900, letterSpacing: '2px' }}>
            CHRONOS
          </h1>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            AI Time Guardian Online • User: {user?.displayName} ({user?.mode} mode)
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button onClick={signOut} className="glow-button glow-button--purple" style={{ padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-xs)' }}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Gamification / Stats Bar */}
      <section className="dashboard-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="glass-card" style={{ padding: 'var(--space-4) var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: '32px', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={32} className="neon-text-cyan" />
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Level</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>{gamification.level}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Star size={32} className="neon-text-purple" />
            <div style={{ flex: 1, minWidth: '150px' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                <span>XP earned</span>
                <span>{gamification.xp} XP</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(gamification.xp % 100)}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', borderRadius: 'var(--radius-full)' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Flame size={32} className="neon-text-pink" style={{ animation: 'pulse-neon 1.5s infinite ease-in-out' }} />
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Streak</div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>{gamification.streak} Days</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Unlocked Badges</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {gamification.badges.length > 0 ? (
                gamification.badges.map((badge, idx) => (
                  <span key={idx} className="badge badge--purple">{badge}</span>
                ))
              ) : (
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No badges unlocked yet</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Kanban Board */}
      <section className="glass-card" style={{ padding: 'var(--space-6)', overflowX: 'auto' }}>
        {error && (
          <div style={{ background: 'var(--neon-red)', color: '#fff', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
            Error: {error}
          </div>
        )}
        <TaskKanban
          tasks={tasks}
          onTaskUpdate={async (id, updates) => { await updateTask(id, updates); }}
          onTaskClick={handleTaskClick}
          onTaskComplete={handleCompleteTask}
          onTaskDelete={handleDeleteTask}
          onTaskRescue={handleRescueTask}
          onAddTaskClick={() => setShowAddModal(true)}
        />
      </section>

      {/* --- ADD TASK MODAL OVERLAY --- */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
          <form onSubmit={handleAddTask} className="glass-card" style={{ padding: 'var(--space-6)', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--neon-cyan)', boxShadow: '0 0 20px var(--neon-cyan-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="neon-text-cyan font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>Create Guard Task</h2>
              <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Task Title</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Complete ML Homework" className="input-field" required />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Description</label>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Task outline and resources..." className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Priority</label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as TaskPriority)} className="input-field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Category</label>
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Work, Study" className="input-field" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Est. Duration (mins)</label>
                <input type="number" value={newMinutes} onChange={(e) => setNewMinutes(Number(e.target.value))} className="input-field" min="5" step="5" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1.5 }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Deadline</label>
                <input type="datetime-local" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="input-field" required />
              </div>
            </div>

            <button type="submit" className="glow-button glow-button--solid" style={{ width: '100%', marginTop: '8px' }}>
              Add to Guard Queue
            </button>
          </form>
        </div>
      )}

      {/* --- TASK DETAIL VIEW MODAL --- */}
      {activeTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ padding: 'var(--space-6)', maxWidth: '550px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--neon-purple)', boxShadow: '0 0 20px var(--neon-purple-glow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <span className="badge badge--cyan" style={{ marginBottom: '8px' }}>{activeTask.category}</span>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'bold' }}>{activeTask.title}</h2>
              </div>
              <button onClick={() => setActiveTask(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {activeTask.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: '1.6' }}>
                {activeTask.description}
              </p>
            )}

            {/* Subtasks Section */}
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CheckSquare size={16} className="neon-text-green" /> Subtasks
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeTask.subtasks && activeTask.subtasks.length > 0 ? (
                  activeTask.subtasks.map((st) => (
                    <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: 'var(--text-sm)', color: st.completed ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: st.completed ? 'line-through' : 'none', cursor: 'pointer' }}>
                      <input type="checkbox" checked={st.completed} onChange={() => handleToggleSubtask(activeTask, st.id)} style={{ accentColor: 'var(--neon-green)' }} />
                      <span>{st.title}</span>
                    </label>
                  ))
                ) : (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No subtasks created for this task</span>
                )}
              </div>
            </div>

            {/* AI Rescue Plan Details */}
            {activeTask.rescuePlan && (
              <div className="glass-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--neon-pink)', background: 'var(--neon-pink-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="neon-text-pink animate-pulse-neon" style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> AI Rescue Plan Active
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <strong>Sacrifices Required:</strong> {activeTask.rescuePlan.sacrifices.join(', ')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeTask.rescuePlan.plan.map((step, idx) => (
                    <div key={idx} style={{ fontSize: 'var(--text-xs)', display: 'flex', gap: '12px', borderLeft: '2px solid var(--neon-pink)', paddingLeft: '8px' }}>
                      <strong style={{ color: 'var(--neon-pink)' }}>{step.timeBlock}:</strong>
                      <span>{step.action} ({step.estimatedMinutes}m)</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', fontStyle: 'italic', color: 'var(--text-secondary)', borderTop: '1px solid rgba(236, 72, 153, 0.2)', paddingTop: '6px', marginTop: '4px' }}>
                  "{activeTask.rescuePlan.motivationalMessage}"
                </p>
              </div>
            )}

            {/* AI Ghost Worker Output Details */}
            {activeTask.ghostWorkerOutput && (
              <div className="glass-card" style={{ padding: 'var(--space-4)', border: '1px solid var(--neon-purple)', background: 'var(--neon-purple-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 className="neon-text-purple" style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} /> AI Ghost Worker Draft
                </h3>
                <pre style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.3)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
                  {activeTask.ghostWorkerOutput.content}
                </pre>
              </div>
            )}

            {/* Action buttons in details view */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              {activeTask.status !== 'completed' && (
                <button onClick={() => handleCompleteTask(activeTask.id)} className="glow-button glow-button--solid" style={{ flex: 1 }}>
                  Complete Task
                </button>
              )}
              {activeTask.status !== 'completed' && !activeTask.rescuePlan && (
                <button onClick={() => handleRescueTask(activeTask.id)} className="glow-button glow-button--pink" style={{ flex: 1 }}>
                  Trigger Rescue
                </button>
              )}
              <button onClick={() => handleDeleteTask(activeTask.id)} className="glow-button" style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)', background: 'rgba(239,68,68,0.05)', flex: 0.5 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
