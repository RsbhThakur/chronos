'use client';

import React from 'react';
import { BarChart3, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ForecastDay {
  date: string;   // e.g. "Mon", "Tue"
  risk: 'low' | 'medium' | 'high' | 'critical';
  taskCount: number;
}

interface BottleneckForecastProps {
  days: ForecastDay[];
}

const riskColor: Record<string, string> = {
  low:      'var(--neon-green)',
  medium:   'var(--neon-cyan)',
  high:     'var(--neon-amber)',
  critical: 'var(--neon-pink)',
};

const riskLabel: Record<string, string> = {
  low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical',
};

export const BottleneckForecast: React.FC<BottleneckForecastProps> = ({ days }) => {
  const maxCount = Math.max(...days.map((d) => d.taskCount), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={15} style={{ color: 'var(--neon-purple)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>7-Day Forecast</span>
        </div>
        <Link href="/analytics" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)', textDecoration: 'none' }}>
          Details <ArrowRight size={11} />
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '64px' }}>
        {days.map((day, i) => {
          const heightPct = maxCount > 0 ? (day.taskCount / maxCount) * 100 : 0;
          const color = riskColor[day.risk];
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div
                title={`${day.date}: ${day.taskCount} tasks · ${riskLabel[day.risk]} risk`}
                style={{
                  width: '100%',
                  height: `${Math.max(heightPct, 8)}%`,
                  background: color,
                  borderRadius: '3px 3px 2px 2px',
                  opacity: 0.85,
                  transition: 'height 0.5s ease',
                  boxShadow: `0 0 8px ${color}40`,
                  cursor: 'default',
                }}
              />
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center' }}>{day.date}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
        {Object.entries(riskLabel).map(([key, label]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: riskColor[key] }} />
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BottleneckForecast;
