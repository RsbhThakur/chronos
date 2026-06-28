'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Award, Flame, FlameKindling, CheckCircle2, TrendingUp } from 'lucide-react';
import { UserGamification, Badge } from '@/types';
import { GlassCard } from '../ui/GlassCard';

interface XPBarProps {
  gamification: UserGamification;
  compact?: boolean;
}

export function XPBar({ gamification, compact = false }: XPBarProps) {
  const { xp, level, streak, longestStreak, badges = [], tasksCompletedToday, totalTasksCompleted } = gamification;

  // Level XP ranges according to quadratic leveling: Level = floor(sqrt(XP / 100)) + 1
  // This means base XP for level L is 100 * (L - 1)^2
  const { currentLevelBaseXp, nextLevelBaseXp, xpProgress, xpNeededInLevel, percentage } = useMemo(() => {
    const currentBase = 100 * Math.pow(level - 1, 2);
    const nextBase = 100 * Math.pow(level, 2);
    const progress = xp - currentBase;
    const needed = nextBase - currentBase;
    const pct = Math.min(100, Math.max(0, (progress / needed) * 100));

    return {
      currentLevelBaseXp: currentBase,
      nextLevelBaseXp: nextBase,
      xpProgress: progress,
      xpNeededInLevel: needed,
      percentage: pct,
    };
  }, [xp, level]);

  const hasSuperStreak = streak >= 7;

  if (compact) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ fontWeight: 800, color: 'var(--neon-purple)', textTransform: 'uppercase' }}>Lv {level}</span>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--text-secondary)' }}>
            {xpProgress}/{xpNeededInLevel} XP
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
          <motion.div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
              boxShadow: '0 0 8px var(--neon-purple)',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  return (
    <GlassCard padding="md" glowColor="purple" animate>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Level Circular display & Streak Flames */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Pulsing circular Level container */}
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(15, 15, 25, 0.9) 100%)',
                border: '2px solid var(--neon-purple)',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <motion.div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '1px solid var(--neon-purple)',
                  opacity: 0.3,
                }}
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
              <span style={{ fontSize: 'var(--text-lg)', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {level}
              </span>
            </div>
            
            <div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
                Time Keeper Level
              </h4>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                Accumulated: {xp} total XP
              </span>
            </div>
          </div>

          {/* Active Streak Flame */}
          {streak > 0 && (
            <motion.div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: hasSuperStreak ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.05)',
                border: `1px solid ${hasSuperStreak ? 'var(--neon-amber)' : 'rgba(245, 158, 11, 0.2)'}`,
                padding: '6px 10px',
                borderRadius: 'var(--radius-md)',
                boxShadow: hasSuperStreak ? '0 0 12px rgba(245, 158, 11, 0.25)' : 'none',
              }}
              whileHover={{ scale: 1.05 }}
              animate={hasSuperStreak ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              {hasSuperStreak ? (
                <div style={{ position: 'relative', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={18} style={{ color: 'var(--neon-amber)', position: 'absolute' }} />
                  <motion.div
                    style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    animate={{ y: [-2, 0, -2], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <FlameKindling size={12} style={{ color: 'var(--neon-pink)' }} />
                  </motion.div>
                </div>
              ) : (
                <Flame size={16} style={{ color: 'var(--neon-amber)' }} />
              )}
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 800,
                  color: 'var(--neon-amber)',
                  fontFamily: 'var(--font-jetbrains-mono)',
                }}
              >
                {streak}D STREAK
              </span>
            </motion.div>
          )}
        </div>

        {/* XP Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Level Progress</span>
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', color: 'var(--text-tertiary)' }}>
              {xpProgress} / {xpNeededInLevel} <span style={{ color: 'var(--neon-purple)', fontWeight: 700 }}>XP</span>
            </span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden', padding: '1px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <motion.div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--neon-purple) 0%, var(--neon-pink) 100%)',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Mini stats cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--neon-green)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>COMPLETED TODAY</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {tasksCompletedToday} tasks
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', padding: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={16} style={{ color: 'var(--neon-cyan)' }} />
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>TOTAL COMPLETED</div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {totalTasksCompleted} tasks
              </div>
            </div>
          </div>
        </div>

        {/* Badges Drawer */}
        {badges.length > 0 && (
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Award size={14} style={{ color: 'var(--neon-cyan)' }} />
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
                Achievements & Badges ({badges.length})
              </span>
            </div>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {badges.map((badge: Badge | string) => {
                const b = typeof badge === 'string'
                  ? { id: badge, name: badge, description: 'Unlocked achievement milestone.', icon: '🏆' }
                  : badge;
                return (
                  <motion.div
                    key={b.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '30px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                    whileHover={{
                      background: 'rgba(0, 242, 254, 0.05)',
                      borderColor: 'var(--neon-cyan)',
                      boxShadow: '0 0 8px rgba(0, 242, 254, 0.2)',
                    }}
                    title={b.description}
                  >
                    <span style={{ fontSize: '12px' }}>{b.icon || '🏆'}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>{b.name}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </GlassCard>
  );
}
