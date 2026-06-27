'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Clock, Flame, Target } from 'lucide-react';
import { Task } from '@/types';

interface StatusBarProps {
  tasks: Task[];
  streak: number;
}

const formatCountdown = (deadline: Date): { text: string; urgency: 'normal' | 'amber' | 'red' } => {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return { text: 'Overdue', urgency: 'red' };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h < 1) return { text: `${m}m remaining`, urgency: 'red' };
  if (h < 6) return { text: `${h}h ${m}m remaining`, urgency: 'amber' };
  return { text: `${h}h ${m}m remaining`, urgency: 'normal' };
};

export const StatusBar: React.FC<StatusBarProps> = ({ tasks, streak }) => {
  const [, setTick] = useState(0);

  // Re-render every minute to keep countdown live
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const rescueTasks = tasks.filter((t) => t.rescuePlan && t.status !== 'completed');
  const upcoming = tasks
    .filter((t) => t.status !== 'completed' && t.deadline)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const nextDeadline = upcoming[0];
  const { text: countdownText, urgency } = nextDeadline
    ? formatCountdown(new Date(nextDeadline.deadline))
    : { text: 'No upcoming deadlines', urgency: 'normal' as const };

  const urgencyColor = { normal: 'var(--neon-cyan)', amber: 'var(--neon-amber)', red: 'var(--neon-pink)' }[urgency];

  const completedToday = tasks.filter((t) => {
    if (!t.completedAt) return false;
    const d = new Date(t.completedAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      background: 'rgba(8, 8, 18, 0.6)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {/* Rescue count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRight: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <Shield size={15} style={{ color: rescueTasks.length > 0 ? 'var(--neon-pink)' : 'var(--text-tertiary)' }} />
          {rescueTasks.length > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-6px', width: '8px', height: '8px', background: 'var(--neon-pink)', borderRadius: '50%', animation: 'pulse-neon 1.5s infinite' }} />
          )}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: rescueTasks.length > 0 ? 'var(--neon-pink)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
          {rescueTasks.length > 0 ? `${rescueTasks.length} Rescue Active` : 'No Rescues'}
        </span>
      </div>

      {/* Next deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRight: '1px solid var(--glass-border)', flex: 1, minWidth: 0 }}>
        <Clock size={15} style={{ color: urgencyColor, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          {nextDeadline ? (
            <>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block' }}>NEXT DEADLINE</span>
              <span style={{ fontSize: 'var(--text-xs)', color: urgencyColor, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {nextDeadline.title} · {countdownText}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>No upcoming deadlines 🎉</span>
          )}
        </div>
      </div>

      {/* Completed today */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRight: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <Target size={15} style={{ color: 'var(--neon-green)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          <strong style={{ color: 'var(--neon-green)' }}>{completedToday}</strong> done today
        </span>
      </div>

      {/* Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', flexShrink: 0 }}>
        <Flame size={15} style={{ color: 'var(--neon-amber)', animation: streak > 0 ? 'pulse-neon 1.5s infinite' : undefined }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          <strong style={{ color: 'var(--neon-amber)' }}>{streak}</strong> day streak
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
