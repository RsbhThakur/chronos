'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Clock, Flame, Target } from 'lucide-react';
import { Task } from '@/types';
import { useResponsive } from '@/hooks/useResponsive';

interface StatusBarProps {
  tasks: Task[];
  streak: number;
}

const formatCountdown = (deadline: Date): { text: string; urgency: 'normal' | 'amber' | 'red' } => {
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return { text: 'Overdue', urgency: 'red' };
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h < 1) return { text: `${m}m left`, urgency: 'red' };
  if (h < 6) return { text: `${h}h remaining`, urgency: 'amber' };
  return { text: `${h}h remaining`, urgency: 'normal' };
};

export const StatusBar: React.FC<StatusBarProps> = ({ tasks, streak }) => {
  const { isMobile } = useResponsive();
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
      display: isMobile ? 'grid' : 'flex',
      gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
      alignItems: 'stretch',
      gap: '0',
      background: 'rgba(8, 8, 18, 0.6)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0,
      overflowX: isMobile ? 'hidden' : 'auto',
    }}>
      {/* Rescue count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '10px 20px',
        borderRight: '1px solid var(--glass-border)',
        borderBottom: isMobile ? '1px solid var(--glass-border)' : 'none',
        flexShrink: 0,
        minWidth: 0,
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Shield size={14} style={{ color: rescueTasks.length > 0 ? 'var(--neon-pink)' : 'var(--text-tertiary)' }} />
          {rescueTasks.length > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-6px', width: '8px', height: '8px', background: 'var(--neon-pink)', borderRadius: '50%', animation: 'pulse-neon 1.5s infinite' }} />
          )}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: rescueTasks.length > 0 ? 'var(--neon-pink)' : 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {rescueTasks.length > 0 ? `${rescueTasks.length} Rescue` : 'No Rescues'}
        </span>
      </div>

      {/* Next deadline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '10px 20px',
        borderRight: isMobile ? 'none' : '1px solid var(--glass-border)',
        borderBottom: isMobile ? '1px solid var(--glass-border)' : 'none',
        flex: isMobile ? undefined : 1,
        minWidth: 0,
      }}>
        <Clock size={14} style={{ color: urgencyColor, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {nextDeadline ? (
            <>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', display: 'block', lineHeight: 1.1 }}>NEXT DUE</span>
              <span style={{ fontSize: '10px', color: urgencyColor, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {nextDeadline.title} · {countdownText}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isMobile ? 'No deadlines' : 'No deadlines 🎉'}
            </span>
          )}
        </div>
      </div>

      {/* Completed today */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '10px 20px',
        borderRight: '1px solid var(--glass-border)',
        flexShrink: 0,
        minWidth: 0,
      }}>
        <Target size={14} style={{ color: 'var(--neon-green)', flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong style={{ color: 'var(--neon-green)' }}>{completedToday}</strong> {isMobile ? 'done' : 'done today'}
        </span>
      </div>

      {/* Streak */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: isMobile ? '8px 12px' : '10px 20px',
        flexShrink: 0,
        minWidth: 0,
      }}>
        <Flame size={14} style={{ color: 'var(--neon-amber)', flexShrink: 0, animation: streak > 0 ? 'pulse-neon 1.5s infinite' : undefined }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong style={{ color: 'var(--neon-amber)' }}>{streak}</strong> {isMobile ? 'streak' : 'day streak'}
        </span>
      </div>
    </div>
  );
};

export default StatusBar;
