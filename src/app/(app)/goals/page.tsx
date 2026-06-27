'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { Goal, Habit } from '@/types';
import { Target, Flame, CheckCircle2, Plus, Calendar, BarChart3, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { goals: demoGoals, habits: demoHabits, isDemo, createGoal, createHabit, logHabitCompletion } = useDemo();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('goals');

  // Use demo data for now (real Firestore hooks would be added in stage 9)
  const goals = isDemo ? demoGoals : demoGoals;
  const habits = isDemo ? demoHabits : demoHabits;

  const todayStr = new Date().toISOString().split('T')[0];

  const handleCompleteHabit = async (habitId: string) => {
    try {
      await logHabitCompletion(habitId);
      showToast({ type: 'success', message: 'Habit logged! Keep the streak going 🔥' });
    } catch {
      showToast({ type: 'error', message: 'Failed to log habit.' });
    }
  };

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
              <NeonButton variant="cyan" size="sm" icon={<Plus size={13} />} onClick={() => showToast({ type: 'info', message: 'Smart Decompose coming in Stage 9!' })}>
                Create Goal
              </NeonButton>
            </div>

            {goals.length === 0 ? (
              <GlassCard padding="lg" hoverable={false} animate>
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                  <Target size={40} style={{ margin: '0 auto 12px', color: 'var(--neon-cyan)', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No goals yet. Create your first goal!</p>
                </div>
              </GlassCard>
            ) : (
              goals.map((goal) => (
                <GlassCard key={goal.id} glowColor="cyan" padding="md" animate>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{goal.title}</h3>
                      <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{goal.description}</p>
                    </div>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono)' }}>{goal.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '14px' }}>
                    <div style={{ height: '100%', width: `${goal.progress}%`, background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))', transition: 'width 0.6s ease' }} />
                  </div>

                  {/* Milestones */}
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {goal.milestones.slice(0, 4).map((m, i) => (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: `2px solid ${m.completed ? 'var(--neon-green)' : 'var(--glass-border)'}`, background: m.completed ? 'var(--neon-green)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {m.completed && <CheckCircle2 size={10} color="#000" />}
                          </div>
                          <span style={{ fontSize: 'var(--text-xs)', color: m.completed ? 'var(--text-tertiary)' : 'var(--text-secondary)', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.title}</span>
                          <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Calendar size={9} /> {new Date(m.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{goal.linkedTaskIds?.length || 0} linked tasks</span>
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
              <NeonButton variant="amber" size="sm" icon={<Plus size={13} />} onClick={() => showToast({ type: 'info', message: 'Habit creation coming in Stage 9!' })}>
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

            {habits.length === 0 ? (
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
    </div>
  );
}
