'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { StatusBar } from '@/components/dashboard/StatusBar';
import { ProductivityRing } from '@/components/dashboard/ProductivityRing';
import { BottleneckForecast } from '@/components/dashboard/BottleneckForecast';
import { DemoTour } from '@/components/demo/DemoTour';
import { Task, TaskPriority } from '@/types';
import {
  Plus, Shield, Sparkles, Send, X, CheckCircle2, Clock, AlertTriangle, Zap, Star, Trophy, MessageCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const priorityColors: Record<string, string> = {
  critical: 'var(--neon-pink)',
  high:     'var(--neon-amber)',
  medium:   'var(--neon-cyan)',
  low:      'var(--text-tertiary)',
};

const isToday = (date: Date) => {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isSoon = (date: Date) => {
  const ms = new Date(date).getTime() - Date.now();
  return ms > 0 && ms < 6 * 3600 * 1000;
};

// Generate 7-day forecast from tasks
const buildForecast = (tasks: Task[]) => {
  const days: { date: string; risk: 'low' | 'medium' | 'high' | 'critical'; taskCount: number }[] = [];
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const count = tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const dl = new Date(t.deadline);
      return dl.toDateString() === d.toDateString();
    }).length;
    const risk = count === 0 ? 'low' : count <= 2 ? 'medium' : count <= 4 ? 'high' : 'critical';
    days.push({ date: labels[d.getDay()], risk, taskCount: count });
  }
  return days;
};



// ─── Add Task Modal ───────────────────────────────────────────────────────────
const AddTaskModal: React.FC<{ onClose: () => void; onCreate: (data: Partial<Task>) => Promise<void> }> = ({ onClose, onCreate }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
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
      await onCreate({ title, priority, deadline: new Date(deadline) });
      showToast({ type: 'success', message: `Task "${title}" created!` });
      onClose();
    } catch {
      showToast({ type: 'error', message: 'Failed to create task.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(480px, 92vw)', background: 'rgba(10, 10, 22, 0.98)', backdropFilter: 'blur(24px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--neon-cyan)' }}>New Task</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Task title..."
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', fontFamily: 'inherit' }}
          />

          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Priority</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1, padding: '6px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${priority === p ? priorityColors[p] : 'var(--glass-border)'}`,
                    background: priority === p ? `${priorityColors[p]}15` : 'transparent',
                    color: priority === p ? priorityColors[p] : 'var(--text-tertiary)',
                    fontSize: '11px', cursor: 'pointer', textTransform: 'capitalize',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <NeonButton variant="cyan" fullWidth loading={loading} onClick={handleCreate} icon={<Plus size={14} />}>
              Create Task
            </NeonButton>
            <NeonButton variant="purple" onClick={onClose}>Cancel</NeonButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const { tasks, loading, error, createTask, completeTask, deleteTask } = useTasks(user?.id || '');
  const { gamification, isDemo, tasks: demoTasks } = useDemo();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const router = useRouter();

  // Gamification state for real or demo sessions
  const [gamificationState, setGamificationState] = useState<any>({
    level: 1,
    xp: 0,
    streak: 0,
    badges: []
  });

  useEffect(() => {
    if (isDemo) {
      setGamificationState(gamification);
    } else if (user?.id) {
      const fetchGamification = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db: clientDb } = await import('@/lib/firebase');
          const statsRef = doc(clientDb, 'users', user.id, 'gamification', 'stats');
          const statsSnap = await getDoc(statsRef);
          if (statsSnap.exists()) {
            const data = statsSnap.data();
            setGamificationState({
              level: data.level || 1,
              xp: data.xp || 0,
              streak: data.streak || 0,
              badges: data.badges || []
            });
          }
        } catch (err) {
          console.error('Failed to fetch real gamification stats:', err);
        }
      };
      fetchGamification();
    }
  }, [isDemo, user?.id, gamification]);

  // Show demo tour once per session when in demo mode
  useEffect(() => {
    if (isDemo) {
      const seen = sessionStorage.getItem('chronos_tour_seen');
      if (!seen) {
        const id = setTimeout(() => setShowTour(true), 1500);
        return () => clearTimeout(id);
      }
    }
  }, [isDemo]);

  const handleTourComplete = () => {
    sessionStorage.setItem('chronos_tour_seen', 'true');
    setShowTour(false);
  };

  const allTasks = isDemo ? demoTasks : tasks;

  // Today's tasks: due today, not completed, sorted by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const todayTasks = allTasks
    .filter((t) => t.status !== 'completed' && isToday(new Date(t.deadline)))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Rescue alerts: tasks with active rescue plan and upcoming deadline
  const rescueAlerts = allTasks.filter((t) => t.rescuePlan && isSoon(new Date(t.deadline)) && t.status !== 'completed');

  // Productivity ring data
  const completedToday = allTasks.filter((t) => t.completedAt && isToday(new Date(t.completedAt))).length;
  const totalToday = allTasks.filter((t) => isToday(new Date(t.deadline))).length;
  const xpEarned = completedToday * 15;

  const forecast = buildForecast(allTasks);

  const handleCreateTask = async (data: Partial<Task>) => {
    if (isDemo) return;
    await createTask({
      title: data.title!,
      description: '',
      status: 'todo',
      priority: data.priority || 'medium',
      deadline: data.deadline || new Date(Date.now() + 24 * 3600 * 1000),
      estimatedMinutes: 60,
      category: 'General',
      tags: [],
      subtasks: [],
    });
  };

  if (loading && !isDemo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Status Bar */}
      <StatusBar tasks={allTasks} streak={gamificationState.streak} />

      {/* Main content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-md)', padding: '12px 16px', color: 'var(--neon-pink)', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}

        {/* Row 1: Today's Focus + Productivity Ring */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

          {/* Today's Focus / Priorities */}
          <GlassCard padding="md" hoverable={false} animate data-tour="task-board">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={15} style={{ color: 'var(--neon-cyan)' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Today's Focus</span>
                {todayTasks.length > 0 && (
                  <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 'var(--radius-full)', color: 'var(--neon-cyan)' }}>
                    {todayTasks.length}
                  </span>
                )}
              </div>
              <NeonButton variant="cyan" size="sm" icon={<Plus size={12} />} onClick={() => setShowAddModal(true)}>
                Add Task
              </NeonButton>
            </div>

            {todayTasks.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--neon-green)', margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>No tasks due today! 🎉</p>
                <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)' }}>Want to plan something?</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${priorityColors[task.priority]}30`,
                      borderLeft: `3px solid ${priorityColors[task.priority]}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => {
                      if (task.rescuePlan) {
                        router.push(`/rescue/${task.id}`);
                      }
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); if (!isDemo) completeTask(task.id); }}
                      style={{ background: 'none', border: `1px solid ${priorityColors[task.priority]}`, borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {task.status === 'completed' && <CheckCircle2 size={12} style={{ color: 'var(--neon-green)' }} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: priorityColors[task.priority], textTransform: 'uppercase', fontWeight: 600 }}>{task.priority}</span>
                        {task.deadline && (
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={9} /> {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.rescuePlan && <Shield size={13} style={{ color: 'var(--neon-pink)', flexShrink: 0 }} />}
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Productivity Ring */}
          <GlassCard padding="md" hoverable={false} animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Zap size={15} style={{ color: 'var(--neon-purple)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Progress</span>
            </div>
            <ProductivityRing completed={completedToday} total={totalToday} xpEarned={xpEarned} size={110} />
          </GlassCard>
        </div>

        {/* Row 2: Rescue Alerts (conditional) */}
        <AnimatePresence>
          {rescueAlerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            >
              <GlassCard glowColor="pink" padding="md" hoverable={false}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertTriangle size={15} style={{ color: 'var(--neon-pink)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--neon-pink)' }}>Rescue Alerts</span>
                  <span style={{ animation: 'pulse-neon 1.5s infinite', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--neon-pink)', display: 'inline-block' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rescueAlerts.map((task) => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 'var(--radius-md)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{task.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--neon-pink)', marginTop: '2px' }}>
                          Due {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <NeonButton 
                        variant="pink" 
                        size="sm" 
                        icon={<Shield size={12} />}
                        onClick={() => router.push(`/rescue/${task.id}`)}
                      >
                        Rescue Mode
                      </NeonButton>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Row 3: Bottleneck Forecast + Gamification */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <GlassCard padding="md" hoverable={false} animate>
            <BottleneckForecast days={forecast} />
          </GlassCard>

          <GlassCard padding="md" hoverable={false} animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Trophy size={15} style={{ color: 'var(--neon-amber)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Achievements</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* XP Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Level {gamificationState.level}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{gamificationState.xp % 100}/100 XP</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${gamificationState.xp % 100}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', transition: 'width 0.6s ease' }} />
                </div>
              </div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {gamificationState.badges.slice(0, 6).map((badge: any, i: number) => {
                const name = typeof badge === 'string' ? badge : (badge?.name ?? '');
                const lower = name.toLowerCase();
                let cls = 'badge--purple';
                if (lower.includes('first')) cls = 'badge--cyan';
                else if (lower.includes('week') || lower.includes('warrior')) cls = 'badge--green';
                else if (lower.includes('speed') || lower.includes('demon')) cls = 'badge--amber';
                return <span key={i} className={`badge ${cls}`} style={{ fontSize: '9px', padding: '2px 8px', textTransform: 'uppercase' }}>{name}</span>;
              })}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && <AddTaskModal onClose={() => setShowAddModal(false)} onCreate={handleCreateTask} />}
      </AnimatePresence>

      {/* Floating AI Chat Bubble Trigger */}
      <button
        id="ai-chat-toggle"
        data-tour="ai-chat"
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).toggleAIChat) {
            (window as any).toggleAIChat();
          }
        }}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '52px', height: '52px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 229, 255, 0.3)',
          zIndex: 499, // below layout chat sidebar
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0, 229, 255, 0.45)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 229, 255, 0.3)'; }}
      >
        <MessageCircle size={20} color="#000" />
      </button>

      {/* Demo Tour */}
      <DemoTour isActive={showTour} onComplete={handleTourComplete} />
    </div>
  );
}
