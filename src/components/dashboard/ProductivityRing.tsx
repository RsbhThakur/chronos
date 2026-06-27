'use client';

import React from 'react';

interface ProductivityRingProps {
  completed: number;
  total: number;
  xpEarned: number;
  size?: number;
}

export const ProductivityRing: React.FC<ProductivityRingProps> = ({
  completed,
  total,
  xpEarned,
  size = 120,
}) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const ringColor = percentage >= 80 ? 'var(--neon-green)' : percentage >= 50 ? 'var(--neon-cyan)' : 'var(--neon-amber)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      {/* SVG Ring */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 6px ${ringColor})` }}
          />
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: ringColor, lineHeight: 1, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {completed} <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', fontWeight: 400 }}>/ {total} tasks</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>XP Earned Today</div>
          <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--neon-purple)', lineHeight: 1.2 }}>+{xpEarned} XP</div>
        </div>
      </div>
    </div>
  );
};

export default ProductivityRing;
