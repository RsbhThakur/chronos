'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';
import { TaskKanban } from '@/components/tasks/TaskKanban';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { Plus, X, Award, Flame, Star, Shield, Sparkles, CheckSquare, Trash2, Calendar, Clock, Send, ShieldOff } from 'lucide-react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { tasks, loading, error, createTask, updateTask, deleteTask, completeTask } = useTasks(user?.id || '');
  const { gamification, currentMode } = useDemo();

  // Dialog/Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  // Form states for editing a task
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editCategory, setEditCategory] = useState('Work');
  const [editMinutes, setEditMinutes] = useState(30);
  const [editDeadline, setEditDeadline] = useState('');

  // AI Chat Sidebar states
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: `Systems online. I am your Chronos AI Time Guardian for this session. Let me know if you need to optimize your task schedules.` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Welcome message refresh when persona changes
  useEffect(() => {
    const agentNames = {
      student: 'Chronos (Sprint Guard)',
      professional: 'Chronos (Sync Leader)',
      entrepreneur: 'Chronos (Hustle Pilot)'
    };
    const activeAgent = agentNames[currentMode] || 'Chronos';
    setChatMessages([
      { sender: 'ai', text: `Hello. ${activeAgent} is ready. Persona switched to ${currentMode.toUpperCase()}. Ask me to 'plan my day' or 'trigger rescue' to intervene.` }
    ]);
  }, [currentMode]);

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
    setIsEditing(false);
  };

  const handleEditClick = (task: Task) => {
    setActiveTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditCategory(task.category || 'Work');
    setEditMinutes(task.estimatedMinutes);

    const d = new Date(task.deadline);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setEditDeadline(d.toISOString().slice(0, 16));

    setIsEditing(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask || !editTitle.trim()) return;

    try {
      const updated = await updateTask(activeTask.id, {
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        category: editCategory,
        estimatedMinutes: editMinutes,
        deadline: new Date(editDeadline)
      });

      setActiveTask(updated);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
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

  const handleDeactivateRescue = async (taskId: string) => {
    const updated = await updateTask(taskId, { rescuePlan: null });
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

  // AI Chat SSE Streaming logic
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setIsTyping(true);

    // Contextual responses based on task state
    let fullReply = "I am monitoring your schedule. Focus on completing your highest priority tasks.";
    const lower = userMsg.toLowerCase();
    
    if (lower.includes('plan') || lower.includes('what') || lower.includes('do next')) {
      const todoTasks = tasks.filter(t => t.status !== 'completed');
      if (todoTasks.length > 0) {
        const topTask = todoTasks[0];
        fullReply = `Looking at your schedule, you should focus on "${topTask.title}" next. It is marked as ${topTask.priority.toUpperCase()} priority and is due soon. Let me know if you need me to draft support materials.`;
      } else {
        fullReply = "All tasks completed! Excellent work. You are ahead of schedule.";
      }
    } else if (lower.includes('rescue') || lower.includes('delay')) {
      fullReply = "If you are facing delays, select a task card and click 'Trigger Rescue' to outline a compressed recovery timeline.";
    } else if (lower.includes('hello') || lower.includes('hi')) {
      fullReply = `Hello! How can I assist you with your schedule today? I can help with task decomposition, calendar syncing, or activating Rescue Mode.`;
    }

    // Add empty message to stream into
    setChatMessages(prev => [...prev, { sender: 'ai', text: '' }]);

    const words = fullReply.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 60)); // ~60ms per word SSE streaming delay
      currentText += (i === 0 ? '' : ' ') + words[i];
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { sender: 'ai', text: currentText };
        return next;
      });
    }
    
    setIsTyping(false);
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

      {/* Main Workspace Layout: Left Content (Kanban) + Right Content (AI Chat) */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* Left Column: Kanban Board */}
        <section className="glass-card" style={{ padding: 'var(--space-6)', overflowX: 'auto', flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column' }}>
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

        {/* Right Column: AI Chat Sidebar */}
        <section className="glass-card" style={{ width: '360px', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', minHeight: '600px', maxHeight: '700px' }}>
          {/* Chat Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--glass-border)', marginBottom: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--neon-cyan)', boxShadow: '0 0 8px var(--neon-cyan-glow)' }} />
            <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>AI TIME GUARDIAN</h3>
          </div>

          {/* Messages List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '12px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: msg.sender === 'user' ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.03)', border: msg.sender === 'user' ? '1px solid rgba(0, 229, 255, 0.2)' : '1px solid var(--glass-border)', padding: '10px 14px', borderRadius: msg.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', fontSize: 'var(--text-sm)', color: msg.sender === 'user' ? 'var(--text-primary)' : 'var(--text-secondary)', lineHeight: '1.5' }}>
                {msg.text || (
                  <span style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ width: '4px', height: '4px', background: 'var(--neon-cyan)', borderRadius: '50%', animation: 'pulse-neon 1s infinite' }} />
                    <span style={{ width: '4px', height: '4px', background: 'var(--neon-cyan)', borderRadius: '50%', animation: 'pulse-neon 1s infinite 0.2s' }} />
                    <span style={{ width: '4px', height: '4px', background: 'var(--neon-cyan)', borderRadius: '50%', animation: 'pulse-neon 1s infinite 0.4s' }} />
                  </span>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={isTyping ? "Streaming response..." : "Ask guardian..."} disabled={isTyping} className="input-field" style={{ fontSize: 'var(--text-sm)', padding: '8px 12px' }} />
            <button type="submit" disabled={isTyping || !chatInput.trim()} className="glow-button glow-button--solid" style={{ padding: '0 12px', minWidth: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={14} />
            </button>
          </form>
        </section>
      </div>

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

      {/* --- TASK DETAIL / EDIT MODAL OVERLAY --- */}
      {activeTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }}>
          {isEditing ? (
            /* Editing Form Mode */
            <form onSubmit={handleSaveEdit} className="glass-card" style={{ padding: 'var(--space-6)', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid var(--neon-cyan)', boxShadow: '0 0 20px var(--neon-cyan-glow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="neon-text-cyan font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold' }}>Edit Task Details</h2>
                <button type="button" onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Task Title</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field" required />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Description</label>
                <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as TaskPriority)} className="input-field">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Category</label>
                  <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="input-field" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Est. Duration (mins)</label>
                  <input type="number" value={editMinutes} onChange={(e) => setEditMinutes(Number(e.target.value))} className="input-field" min="5" step="5" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1.5 }}>
                  <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Deadline</label>
                  <input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="input-field" required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="glow-button glow-button--solid" style={{ flex: 1 }}>
                  Save Changes
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="glow-button" style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* Read-Only Details View Mode */
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
                {activeTask.status === 'completed' ? (
                  <button onClick={() => updateTask(activeTask.id, { status: 'todo', completedAt: null })} className="glow-button glow-button--solid" style={{ flex: 1 }}>
                    Revert to Todo
                  </button>
                ) : (
                  <>
                    <button onClick={() => handleCompleteTask(activeTask.id)} className="glow-button glow-button--solid" style={{ flex: 1 }}>
                      Complete Task
                    </button>
                    {activeTask.rescuePlan ? (
                      <button onClick={() => handleDeactivateRescue(activeTask.id)} className="glow-button" style={{ borderColor: 'var(--neon-pink)', color: 'var(--neon-pink)', background: 'rgba(236,72,153,0.05)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <ShieldOff size={14} /> Disable Rescue
                      </button>
                    ) : (
                      <button onClick={() => handleRescueTask(activeTask.id)} className="glow-button glow-button--pink" style={{ flex: 1 }}>
                        Trigger Rescue
                      </button>
                    )}
                  </>
                )}
                <button type="button" onClick={() => handleEditClick(activeTask)} className="glow-button glow-button--cyan" style={{ flex: 0.5 }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteTask(activeTask.id)} className="glow-button" style={{ borderColor: 'var(--neon-red)', color: 'var(--neon-red)', background: 'rgba(239,68,68,0.05)', flex: 0.5 }}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
