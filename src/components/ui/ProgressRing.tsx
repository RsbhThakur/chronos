'use client';

import React, { useId } from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  gradientStart?: string;
  gradientEnd?: string;
  colorPreset?: 'cyan' | 'purple' | 'amber' | 'pink' | 'green';
  centerContent?: React.ReactNode;
  animate?: boolean;
}

const PRESETS = {
  cyan: { start: '#00F2FE', end: '#4FACFE' },
  purple: { start: '#D946EF', end: '#8B5CF6' },
  amber: { start: '#F59E0B', end: '#EF4444' },
  pink: { start: '#EC4899', end: '#F43F5E' },
  green: { start: '#10B981', end: '#059669' },
};

export function ProgressRing({
  percentage,
  radius = 45,
  strokeWidth = 8,
  gradientStart,
  gradientEnd,
  colorPreset = 'cyan',
  centerContent,
  animate = true,
}: ProgressRingProps) {
  const uniqueId = useId();
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));

  const preset = PRESETS[colorPreset];
  const startColor = gradientStart || preset.start;
  const endColor = gradientEnd || preset.end;

  const size = (radius + strokeWidth) * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          <linearGradient id={`progress-ring-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
        />

        {/* Dynamic Animated Progress Track */}
        {animate ? (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#progress-ring-grad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            strokeLinecap="round"
          />
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#progress-ring-grad-${uniqueId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Center Label Overlay */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {centerContent !== undefined ? (
          centerContent
        ) : (
          <span
            style={{
              fontSize: `${radius * 0.4}px`,
              fontWeight: 800,
              fontFamily: 'var(--font-jetbrains-mono)',
              color: 'var(--text-primary)',
            }}
          >
            {Math.round(normalizedPercentage)}%
          </span>
        )}
      </div>
    </div>
  );
}
