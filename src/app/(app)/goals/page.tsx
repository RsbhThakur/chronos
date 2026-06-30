'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Goal, Habit, Milestone } from '@/types';
import { Target, Flame, CheckCircle2, Plus, Calendar, BarChart3, TrendingUp, X, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Tab = 'goals' | 'habits';

// ─── Mini Calendar Heatmap ────────────────────────────────────────────────────
const HabitHeatmap: React.FC<{ completedDates: string[] }> = ({ completedDates }) => {
  const weeks = 12;
  const days: Date[] = [];
  const today = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return (
    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', maxWidth: '300px' }}>
      {days.map((d, i) => {
        const key = d.toISOString().split('T')[0];
        const done = completedDates.includes(key);
        return (
          <div key={i} title={key} style={{ width: '10px', height: '10px', borderRadius: '2px', background: done ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.06)', opacity: done ? 0.9 : 1 }} />
        );
      })}
    </div>
  );
};

// ─── Goals Page ───────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { user } = useAuth();
  const { goals: demoGoals, habits: demoHabits, isDemo } = useDemo();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('goals');
  const [loading, setLoading] = useState(true);

  // Lists state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);

  // Modal Open/Close
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isCreateHabitOpen, setIsCreateHabitOpen] = useState(false);

  // Goal Form Fields
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [useSmartDecompose, setUseSmartDecompose] = useState(false);
  const [submittingGoal, setSubmittingGoal] = useState(false);
  
  // Manual milestones for Goal
  const [manualMilestones, setManualMilestones] = useState<Array<{ title: string; dueDate: string }>>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  // Habit Form Fields
  const [habitTitle, setHabitTitle] = useState('');
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekly'>('daily');
  const [habitCategory, setHabitCategory] = useState('');
  const [submittingHabit, setSubmittingHabit] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchGoalsAndHabits = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const goalsRes = await fetch(`/api/goals?userId=${user.id}`);
      const goalsData = await goalsRes.json();
      if (goalsData.success) {
        setGoals(goalsData.goals || []);
      }

      const habitsRes = await fetch(`/api/goals/habits?userId=${user.id}`);
      const habitsData = await habitsRes.json();
      if (habitsData.success) {
        setHabits(habitsData.habits || []);
      }
    } catch (err) {
      console.error('Error fetching goals/habits:', err);
      showToast({ type: 'error', message: 'Failed to load goals and habits.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDemo) {
      setGoals(demoGoals);
      setHabits(demoHabits);
      setLoading(false);
    } else if (user?.id) {
      fetchGoalsAndHabits();
    }
  }, [isDemo, demoGoals, demoHabits, user?.id]);

  // Handle Complete Habit Completion log
  const handleCompleteHabit = async (habitId: string) => {
    try {
      const response = await fetch('/api/goals/habits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitId,
          userId: user?.id || 'demo-student-001',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete habit.');
      }

      showToast({ type: 'success', message: 'Habit logged! Keep the streak going 🔥' });

      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    } catch (err: any) {
      console.error('Failed to complete habit:', err);
      showToast({ type: 'error', message: err.message || 'Failed to log habit.' });
    }
  };

  // Toggle goal milestone checkbox
  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((ms) => {
      if (ms.id === milestoneId) {
        return { ...ms, completed: !ms.completed };
      }
      return ms;
    });

    // Optimistically update goals state
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === goalId) {
          const completed = updatedMilestones.filter((m) => m.completed).length;
          const progress = updatedMilestones.length > 0 
            ? Math.round((completed / updatedMilestones.length) * 100) 
            : 0;
          return { ...g, milestones: updatedMilestones, progress };
        }
        return g;
      })
    );

    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          userId: user?.id || 'demo-student-001',
          updates: {
            milestones: updatedMilestones,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update milestone.');
      }

      showToast({ type: 'success', message: 'Milestone status updated!' });

      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    } catch (err: any) {
      console.error('Failed to toggle milestone:', err);
      showToast({ type: 'error', message: err.message || 'Failed to update milestone.' });
      
      // Rollback optimistic update on error
      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    }
  };

  // Deleting a goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    try {
      const response = await fetch('/api/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          userId: user?.id || 'demo-student-001',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete goal.');
      }

      showToast({ type: 'success', message: 'Goal archived successfully.' });

      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    } catch (err: any) {
      console.error('Failed to delete goal:', err);
      showToast({ type: 'error', message: err.message || 'Failed to delete goal.' });
      
      // Rollback delete
      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    }
  };

  // Milestone adding in standard form
  const handleAddMilestone = () => {
    if (!newMilestoneTitle || !newMilestoneDate) {
      showToast({ type: 'error', message: 'Specify title and due date.' });
      return;
    }
    setManualMilestones((prev) => [
      ...prev,
      { title: newMilestoneTitle, dueDate: newMilestoneDate },
    ]);
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
  };

  // Submit Goal Form
  const handleSubmitGoal = async () => {
    if (!goalTitle || !goalDeadline) {
      showToast({ type: 'error', message: 'Title and deadline are required.' });
      return;
    }

    setSubmittingGoal(true);
    try {
      if (useSmartDecompose) {
        // AI Smart Decompose flow
        const response = await fetch('/api/ai/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: goalTitle,
            description: goalDescription,
            deadline: goalDeadline,
            userId: user?.id || 'demo-student-001',
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Smart decompose failed.');
        }

        showToast({ type: 'success', message: 'Goal decomposed successfully! Check your tasks list 🧠' });
      } else {
        // Standard goal creation
        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id || 'demo-student-001',
            title: goalTitle,
            description: goalDescription,
            deadline: goalDeadline,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to create goal.');
        }

        // If goal creation had manual milestones, add them through a PATCH
        const goalId = data.goal?.id || data.goalId;
        if (goalId && manualMilestones.length > 0) {
          const mappedMilestonesWithIds = manualMilestones.map((m) => ({
            id: 'm-' + Math.random().toString(36).substring(2, 9),
            title: m.title,
            dueDate: m.dueDate,
            completed: false,
          }));

          await fetch('/api/goals', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goalId,
              userId: user?.id || 'demo-student-001',
              updates: {
                milestones: mappedMilestonesWithIds,
              },
            }),
          });
        }

        showToast({ type: 'success', message: 'Goal created successfully!' });
      }

      // Close modal & reset fields
      setIsCreateGoalOpen(false);
      setGoalTitle('');
      setGoalDescription('');
      setGoalDeadline('');
      setUseSmartDecompose(false);
      setManualMilestones([]);

      // Reload
      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    } catch (err: any) {
      console.error('Goal creation failed:', err);
      showToast({ type: 'error', message: err.message || 'Failed to create goal.' });
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Submit Habit Form
  const handleSubmitHabit = async () => {
    if (!habitTitle) {
      showToast({ type: 'error', message: 'Habit title is required.' });
      return;
    }

    setSubmittingHabit(true);
    try {
      const response = await fetch('/api/goals/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'demo-student-001',
          title: habitTitle,
          frequency: habitFrequency,
          category: habitCategory || 'General',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create habit.');
      }

      showToast({ type: 'success', message: 'Habit created successfully! 🔥' });

      // Close modal & reset fields
      setIsCreateHabitOpen(false);
      setHabitTitle('');
      setHabitFrequency('daily');
      setHabitCategory('');

      // Reload
      if (!isDemo) {
        await fetchGoalsAndHabits();
      }
    } catch (err: any) {
      console.error('Habit creation failed:', err);
      showToast({ type: 'error', message: err.message || 'Failed to create habit.' });
    } finally {
      setSubmittingHabit(false);
    }
  };

  // Filter only active goals
  const activeGoals = goals.filter((g) => g.status === 'active');

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '90px' }}>
      
      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: 'fit-content' }}>
        {(['goals', 'habits'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 24px', border: 'none', background: tab === t ? 'rgba(0,229,255,0.1)' : 'transparent', color: tab === t ? 'var(--neon-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: tab === t ? 600 : 400, textTransform: 'capitalize', transition: 'all 0.15s ease' }}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'goals' ? (
          <motion.div key="goals" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} style={{ color: 'var(--neon-cyan)' }} /> Goals
              </h2>
              <NeonButton variant="cyan" size="sm" icon={<Plus size={13} />} onClick={() => setIsCreateGoalOpen(true)}>
                Create Goal
              </NeonButton>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>
                <div className="spinner-border animate-spin inline-block w-6 h-6 border-2 rounded-full border-t-cyan-400" />
                <p style={{ marginTop: '12px' }}>Loading goals...</p>
              </div>
            ) : activeGoals.length === 0 ? (
              <GlassCard padding="lg" hoverable={false} animate>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                  <Target size={40} style={{ margin: '0 auto 12px', color: 'var(--neon-cyan)', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No goals yet. Create your first goal!</p>
                </div>
              </GlassCard>
            ) : (
              activeGoals.map((goal) => (
                <GlassCard key={goal.id} glowColor="cyan" padding="md" animate>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{goal.title}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{goal.description}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono)' }}>{goal.progress}%</span>
                      <button 
                        onClick={() => handleDeleteGoal(goal.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px', transition: 'color 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-pink)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        title="Delete Goal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ height: '100%', width: `${goal.progress}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', transition: 'width 0.6s ease' }} />
                  </div>

                  {/* Milestone Vertical DOTS Timeline */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', paddingLeft: '8px', marginTop: '16px', marginBottom: '16px' }}>
                      {/* Vertical line connector */}
                      <div style={{ position: 'absolute', left: '11px', top: '8px', bottom: '8px', width: '2px', background: 'rgba(255,255,255,0.06)' }} />

                      {goal.milestones.map((m) => {
                        const isCompleted = m.completed;
                        return (
                          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', position: 'relative' }}>
                            
                            {/* Interactive vertical dots checkmark */}
                            <div 
                              onClick={() => handleToggleMilestone(goal.id, m.id)}
                              style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: isCompleted ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)', 
                                boxShadow: isCompleted ? '0 0 8px var(--neon-green)' : 'none',
                                border: isCompleted ? 'none' : '1px solid rgba(255,255,255,0.3)',
                                zIndex: 2, 
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                marginLeft: '1px'
                              }} 
                              title={isCompleted ? "Mark incomplete" : "Mark complete"}
                            />
                            
                            <span 
                              onClick={() => handleToggleMilestone(goal.id, m.id)}
                              style={{ 
                                fontSize: 'var(--text-xs)', 
                                color: isCompleted ? 'var(--text-tertiary)' : 'var(--text-secondary)', 
                                textDecoration: isCompleted ? 'line-through' : 'none',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              {m.title}
                            </span>
                            <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Calendar size={9} /> {new Date(m.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{goal.linkedTaskIds?.length || 0} linked tasks</span>
                    
                    {/* View tasks link filtering by goalId */}
                    <Link href={`/tasks?goalId=${goal.id}`} style={{ textDecoration: 'none' }}>
                      <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }} className="hover:underline">
                        View Tasks <ArrowRight size={10} />
                      </span>
                    </Link>

                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Calendar size={9} /> Due {new Date(goal.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </GlassCard>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="habits" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flame size={18} style={{ color: 'var(--neon-amber)' }} /> Habits
              </h2>
              <NeonButton variant="amber" size="sm" icon={<Plus size={13} />} onClick={() => setIsCreateHabitOpen(true)}>
                New Habit
              </NeonButton>
            </div>

            {/* Overall completion rate */}
            {habits.length > 0 && (
              <GlassCard padding="md" hoverable={false}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <TrendingUp size={18} style={{ color: 'var(--neon-green)' }} />
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Today's Completion Rate</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--neon-green)' }}>
                      {Math.round((habits.filter((h) => h.completedDates.includes(todayStr)).length / habits.length) * 100)}%
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>
                <div className="spinner-border animate-spin inline-block w-6 h-6 border-2 rounded-full border-t-amber-400" />
                <p style={{ marginTop: '12px' }}>Loading habits...</p>
              </div>
            ) : habits.length === 0 ? (
              <GlassCard padding="lg" hoverable={false} animate>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                  <Flame size={40} style={{ margin: '0 auto 12px', color: 'var(--neon-amber)', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No habits yet. Build your first habit!</p>
                </div>
              </GlassCard>
            ) : (
              habits.map((habit) => {
                const doneToday = habit.completedDates.includes(todayStr);
                return (
                  <GlassCard key={habit.id} glowColor={doneToday ? 'green' : 'none'} padding="md" animate>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{habit.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{habit.frequency}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--neon-amber)' }}>
                            <Flame size={11} /> {habit.streak} day streak
                          </span>
                        </div>
                      </div>
                      <NeonButton
                        variant={doneToday ? 'green' : 'cyan'}
                        size="sm"
                        icon={doneToday ? <CheckCircle2 size={12} /> : <Plus size={12} />}
                        onClick={() => !doneToday && handleCompleteHabit(habit.id)}
                        disabled={doneToday}
                      >
                        {doneToday ? 'Done!' : 'Complete Today'}
                      </NeonButton>
                    </div>
                    <HabitHeatmap completedDates={habit.completedDates} />
                  </GlassCard>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create Goal Modal ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCreateGoalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={() => setIsCreateGoalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{ width: 'min(500px, 100%)', background: 'rgba(10, 10, 20, 0.96)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} style={{ color: 'var(--neon-cyan)' }} /> Create New Goal
                </h3>
                <button onClick={() => setIsCreateGoalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Goal Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Goal Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Master React & Next.js"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                  <textarea
                    placeholder="Describe your primary objective..."
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    rows={3}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Final Deadline</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none' }}
                  />
                </div>

                {/* Smart Decompose Option */}
                <div 
                  onClick={() => setUseSmartDecompose(!useSmartDecompose)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px', 
                    background: useSmartDecompose ? 'rgba(0, 229, 255, 0.06)' : 'rgba(255,255,255,0.01)', 
                    border: `1px solid ${useSmartDecompose ? 'var(--neon-cyan)' : 'var(--glass-border)'}`, 
                    borderRadius: 'var(--radius-md)', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: useSmartDecompose ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.04)', color: useSmartDecompose ? 'var(--neon-cyan)' : 'var(--text-tertiary)' }}>
                    <Sparkles size={14} className={useSmartDecompose ? "pulse-slow" : ""} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: useSmartDecompose ? 'var(--neon-cyan)' : 'var(--text-primary)' }}>🤖 AI Smart Decompose</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Automatically break this goal into logical milestones & tasks synced with your schedule.</div>
                  </div>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${useSmartDecompose ? 'var(--neon-cyan)' : 'var(--glass-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: useSmartDecompose ? 'var(--neon-cyan)' : 'transparent' }}>
                    {useSmartDecompose && <CheckCircle2 size={10} color="#000" />}
                  </div>
                </div>

                {/* Manual Milestones list if NOT using Smart Decompose */}
                {!useSmartDecompose && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Milestones (Optional)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Milestone title..."
                        value={newMilestoneTitle}
                        onChange={(e) => setNewMilestoneTitle(e.target.value)}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', outline: 'none' }}
                      />
                      <input
                        type="date"
                        value={newMilestoneDate}
                        onChange={(e) => setNewMilestoneDate(e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', outline: 'none' }}
                      />
                      <NeonButton variant="cyan" size="sm" onClick={handleAddMilestone} style={{ padding: '0 12px' }}>Add</NeonButton>
                    </div>

                    {manualMilestones.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
                        {manualMilestones.map((ms, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{ms.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'var(--text-tertiary)' }}>{new Date(ms.dueDate).toLocaleDateString()}</span>
                              <button onClick={() => setManualMilestones(manualMilestones.filter((_, i) => i !== idx))} style={{ background: 'transparent', border: 'none', color: 'var(--neon-pink)', cursor: 'pointer' }}>
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <NeonButton 
                  variant="cyan" 
                  fullWidth 
                  loading={submittingGoal} 
                  onClick={handleSubmitGoal}
                >
                  {useSmartDecompose ? 'Decompose with AI' : 'Create Goal'}
                </NeonButton>
                <NeonButton 
                  variant="purple" 
                  onClick={() => setIsCreateGoalOpen(false)}
                >
                  Cancel
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create Habit Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCreateHabitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={() => setIsCreateHabitOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              style={{ width: 'min(450px, 100%)', background: 'rgba(10, 10, 20, 0.96)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '20px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={18} style={{ color: 'var(--neon-amber)' }} /> Build a New Habit
                </h3>
                <button onClick={() => setIsCreateHabitOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
                  <X size={16} />
                </button>
              </div>

              {/* Habit Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Habit Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Meditate daily, Read 10 pages"
                    value={habitTitle}
                    onChange={(e) => setHabitTitle(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Frequency</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['daily', 'weekly'] as const).map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setHabitFrequency(freq)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${habitFrequency === freq ? 'var(--neon-amber)' : 'var(--glass-border)'}`,
                          background: habitFrequency === freq ? 'rgba(255, 191, 0, 0.08)' : 'transparent',
                          color: habitFrequency === freq ? 'var(--neon-amber)' : 'var(--text-secondary)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: habitFrequency === freq ? 600 : 400,
                          textTransform: 'capitalize',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Health, Coding, Mindset"
                    value={habitCategory}
                    onChange={(e) => setHabitCategory(e.target.value)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--text-primary)', fontSize: 'var(--text-sm)', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <NeonButton 
                  variant="amber" 
                  fullWidth 
                  loading={submittingHabit} 
                  onClick={handleSubmitHabit}
                >
                  Create Habit
                </NeonButton>
                <NeonButton 
                  variant="purple" 
                  onClick={() => setIsCreateHabitOpen(false)}
                >
                  Cancel
                </NeonButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
