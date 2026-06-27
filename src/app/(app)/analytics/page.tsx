'use client';

import React from 'react';
import { useDemo } from '@/hooks/useDemo';
import { GlassCard } from '@/components/ui/GlassCard';
import { BarChart3, TrendingUp, Target, Zap, Clock, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const { analytics, gamification, tasks } = useDemo();

  const totalCompleted = tasks.filter((t) => t.status === 'completed').length;
  const avgProductivity = analytics.length > 0
    ? Math.round(analytics.reduce((sum, d) => sum + d.productivityScore, 0) / analytics.length)
    : 72;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const last7 = analytics.slice(-7);

  const statCards = [
    { label: 'Tasks Completed',    value: totalCompleted, icon: <CheckCircle2 size={18} />, color: 'var(--neon-green)' },
    { label: 'Avg Productivity',   value: `${avgProductivity}%`, icon: <TrendingUp size={18} />, color: 'var(--neon-cyan)' },
    { label: 'Current Level',      value: `Lv ${gamification.level}`, icon: <Zap size={18} />, color: 'var(--neon-purple)' },
    { label: 'Total XP',           value: `${gamification.xp} XP`, icon: <Target size={18} />, color: 'var(--neon-amber)' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '90px' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BarChart3 size={20} style={{ color: 'var(--neon-cyan)' }} /> Analytics
      </h2>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {statCards.map(({ label, value, icon, color }) => (
          <GlassCard key={label} glowColor="none" padding="md" animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color, padding: '10px', background: `${color}15`, borderRadius: 'var(--radius-md)' }}>{icon}</div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: 'var(--text-xl, 24px)', fontWeight: 800, color, lineHeight: 1.2, fontFamily: 'var(--font-jetbrains-mono)' }}>{value}</div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Productivity chart */}
      <GlassCard padding="md" hoverable={false} animate>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <TrendingUp size={15} style={{ color: 'var(--neon-cyan)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Productivity Score — Last 7 Days</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '100px' }}>
          {weekDays.map((day, i) => {
            const score = last7[i]?.productivityScore ?? Math.floor(50 + Math.random() * 40);
            const color = score >= 80 ? 'var(--neon-green)' : score >= 60 ? 'var(--neon-cyan)' : 'var(--neon-amber)';
            return (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color }}>{score}%</span>
                <div style={{ width: '100%', height: `${score}%`, background: color, borderRadius: '4px 4px 2px 2px', opacity: 0.8, boxShadow: `0 0 8px ${color}40` }} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{day}</span>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Tasks completed chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <GlassCard padding="md" hoverable={false} animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--neon-green)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Tasks by Status</span>
          </div>
          {[
            { label: 'Completed', count: tasks.filter((t) => t.status === 'completed').length, color: 'var(--neon-green)' },
            { label: 'In Progress', count: tasks.filter((t) => t.status === 'in_progress').length, color: 'var(--neon-cyan)' },
            { label: 'Todo', count: tasks.filter((t) => t.status === 'todo').length, color: 'var(--neon-amber)' },
            { label: 'Overdue', count: tasks.filter((t) => t.status === 'overdue').length, color: 'var(--neon-pink)' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color, fontFamily: 'var(--font-jetbrains-mono)' }}>{count}</span>
            </div>
          ))}
        </GlassCard>

        <GlassCard padding="md" hoverable={false} animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={15} style={{ color: 'var(--neon-purple)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Gamification Stats</span>
          </div>
          {[
            { label: 'Level', value: gamification.level, color: 'var(--neon-cyan)' },
            { label: 'Total XP', value: gamification.xp, color: 'var(--neon-purple)' },
            { label: 'Streak', value: `${gamification.streak}d`, color: 'var(--neon-amber)' },
            { label: 'Badges', value: gamification.badges.length, color: 'var(--neon-green)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color, fontFamily: 'var(--font-jetbrains-mono)' }}>{value}</span>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
