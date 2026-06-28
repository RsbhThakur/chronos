'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { DailyAnalytics, Task } from '@/types';

// ==========================================
// SSR COMPATIBILITY WRAPPER
// ==========================================
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return (
      <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        Loading charts...
      </div>
    );
  }
  return <>{children}</>;
}

// ==========================================
// LINE CHART: DAILY PRODUCTIVITY SCORES
// ==========================================
export function ProductivityLineChart({ data }: { data: DailyAnalytics[] }) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      formattedDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  const avgScore = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.productivityScore, 0) / data.length);
  }, [data]);

  return (
    <ClientOnly>
      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--neon-cyan)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--neon-cyan)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="formattedDate"
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
              labelStyle={{ fontWeight: 700, color: 'var(--neon-cyan)', marginBottom: '4px' }}
            />
            {avgScore > 0 && (
              <ReferenceLine
                y={avgScore}
                stroke="var(--neon-cyan)"
                strokeDasharray="4 4"
                label={{
                  value: `AVG: ${avgScore}%`,
                  fill: 'var(--neon-cyan)',
                  fontSize: 9,
                  position: 'insideBottomRight',
                  dy: -4,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="productivityScore"
              name="Productivity Index"
              stroke="var(--neon-cyan)"
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--neon-cyan)' }}
              dot={{ r: 2, fill: 'var(--neon-cyan)' }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

// ==========================================
// BAR CHART: FOCUS MINUTES WITH CONDITIONAL COLORING
// ==========================================
export function FocusBarChart({ data }: { data: DailyAnalytics[] }) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      formattedDate: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  // Color constraints: <60 = Red, 60-120 = Amber, >=120 = Green
  const getBarColor = (minutes: number) => {
    if (minutes < 60) return 'var(--neon-pink)';
    if (minutes < 120) return 'var(--neon-amber)';
    return 'var(--neon-green)';
  };

  return (
    <ClientOnly>
      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="formattedDate"
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--text-tertiary)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="m"
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
              labelStyle={{ fontWeight: 700, color: 'var(--neon-purple)', marginBottom: '4px' }}
            />
            <Bar dataKey="focusMinutes" name="Focus Time" radius={[4, 4, 0, 0]} animationDuration={800}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.focusMinutes)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

// ==========================================
// DONUT CHART: TASK COMPLETION STATUS OVERLAY
// ==========================================
export function TaskDonutChart({ tasks }: { tasks: Task[] }) {
  const stats = useMemo(() => {
    const todo = tasks.filter((t) => t.status === 'todo').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => t.status === 'overdue').length;

    return [
      { name: 'Completed', value: completed, color: 'var(--neon-green)' },
      { name: 'In Progress', value: inProgress, color: 'var(--neon-cyan)' },
      { name: 'Todo', value: todo, color: 'var(--neon-amber)' },
      { name: 'Overdue', value: overdue, color: 'var(--neon-pink)' },
    ].filter((item) => entryCount(item.value));
  }, [tasks]);

  function entryCount(val: number) {
    return val > 0;
  }

  const performanceIndex = useMemo(() => {
    const total = tasks.length;
    if (total === 0) return 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }, [tasks]);

  if (stats.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
        No tasks logged in this range.
      </div>
    );
  }

  return (
    <ClientOnly>
      <div style={{ width: '100%', height: '220px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={stats}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
              animationDuration={800}
            >
              {stats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Central performance Index */}
        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-2xl, 28px)', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-jetbrains-mono)' }}>
            {performanceIndex}%
          </span>
          <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Velocity
          </span>
        </div>
      </div>
    </ClientOnly>
  );
}

// ==========================================
// PIE CHART: CATEGORY DISTRIBUTION
// ==========================================
export function CategoryPieChart({ tasks }: { tasks: Task[] }) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const cat = t.category || 'General';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    const colors = [
      'var(--neon-cyan)',
      'var(--neon-purple)',
      'var(--neon-amber)',
      'var(--neon-green)',
      'var(--neon-pink)',
    ];

    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }));
  }, [tasks]);

  if (chartData.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
        No categorized tasks available.
      </div>
    );
  }

  return (
    <ClientOnly>
      <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={75}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              labelLine={false}
              style={{ fontSize: '10px', fill: 'var(--text-secondary)' }}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 15, 25, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                color: 'var(--text-primary)',
                fontSize: '11px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}

// ==========================================
// STREAK HEATMAP: CUSTOM SVG 52-WEEK CALENDAR
// ==========================================
export function StreakHeatmap({ data }: { data: DailyAnalytics[] }) {
  const [hovered, setHovered] = useState<any>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map of date string -> DailyAnalytics record
  const telemetryMap = useMemo(() => {
    const map = new Map<string, DailyAnalytics>();
    data.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  // Construct a matrix of 52 columns x 7 rows representing the last 364 days
  const grid = useMemo(() => {
    const tempGrid = [];
    const today = new Date();
    // Start grid aligned to Sunday of 52 weeks ago
    const startOffset = today.getDay(); // 0-6
    const totalDays = 52 * 7;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - totalDays + 1 - startOffset);

    for (let col = 0; idxCol(col); col++) {
      const week = [];
      for (let row = 0; row < 7; row++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + (col * 7) + row);
        const dateStr = d.toISOString().split('T')[0];
        const dayTelemetry = telemetryMap.get(dateStr);

        week.push({
          date: d,
          dateString: dateStr,
          telemetry: dayTelemetry,
          score: dayTelemetry?.productivityScore || 0,
        });
      }
      tempGrid.push(week);
    }
    return tempGrid;
  }, [telemetryMap]);

  function idxCol(c: number) {
    return c < 52;
  }

  const getCellColor = (score: number) => {
    if (score === 0) return 'rgba(255, 255, 255, 0.03)';
    if (score < 30) return 'rgba(0, 242, 254, 0.15)';
    if (score < 60) return 'rgba(0, 242, 254, 0.4)';
    if (score < 85) return 'rgba(0, 242, 254, 0.7)';
    return 'rgba(0, 242, 254, 1.0)';
  };

  const handleMouseMove = (e: React.MouseEvent, cell: any) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const parentBounds = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (parentBounds) {
      setCoords({
        x: bounds.left - parentBounds.left + bounds.width / 2,
        y: bounds.top - parentBounds.top - 95,
      });
    }
    setHovered(cell);
  };

  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto', padding: '4px 0' }}>
      <div style={{ display: 'flex', gap: '8px', minWidth: '720px' }}>
        {/* Day labels column */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px 0 6px 0', height: '110px' }}>
          {dayLabels.map((lbl, i) => (
            <span key={lbl} style={{ fontSize: '9px', color: i % 2 === 1 ? 'var(--text-tertiary)' : 'transparent', height: '11px', display: 'flex', alignItems: 'center' }}>
              {lbl}
            </span>
          ))}
        </div>

        {/* 52-week columns */}
        <div style={{ flex: 1 }}>
          <svg viewBox="0 0 710 115" width="100%" height="100%" style={{ overflow: 'visible' }}>
            {grid.map((week, colIdx) => (
              <g key={`col-${colIdx}`} transform={`translate(${colIdx * 13.5}, 16)`}>
                {week.map((cell, rowIdx) => {
                  const color = getCellColor(cell.score);
                  const isToday = cell.dateString === new Date().toISOString().split('T')[0];
                  return (
                    <rect
                      key={`row-${rowIdx}`}
                      y={rowIdx * 13.5}
                      width="11"
                      height="11"
                      rx="2"
                      fill={color}
                      stroke={isToday ? 'var(--neon-pink)' : hovered?.dateString === cell.dateString ? 'rgba(255, 255, 255, 0.4)' : 'none'}
                      strokeWidth={1}
                      style={{ cursor: 'pointer', transition: 'fill 0.2s, stroke 0.1s' }}
                      onMouseMove={(e) => handleMouseMove(e, cell)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Glow scale index */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '12px', paddingRight: '8px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Zero</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[0, 20, 50, 75, 95].map((s) => (
            <div
              key={s}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '2px',
                background: getCellColor(s),
                boxShadow: s >= 85 ? '0 0 6px rgba(0, 242, 254, 0.6)' : 'none',
              }}
            />
          ))}
        </div>
        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Clutch</span>
      </div>

      {/* Floating glassmorphic tooltip card */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: coords.x,
            top: coords.y,
            transform: 'translateX(-50%)',
            background: 'rgba(15, 15, 25, 0.95)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '6px',
            padding: '8px 10px',
            pointerEvents: 'none',
            zIndex: 50,
            boxShadow: '0 4px 15px rgba(0,242,254,0.15)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            minWidth: '130px',
          }}
        >
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--neon-cyan)', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '3px', marginBottom: '2px' }}>
            {hovered.date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
            <span>Productivity:</span>
            <span style={{ fontWeight: 700, color: hovered.score > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {hovered.score > 0 ? `${hovered.score}%` : 'No data'}
            </span>
          </div>
          {hovered.telemetry && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
                <span>Focus Time:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{hovered.telemetry.focusMinutes} min</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)' }}>
                <span>Completed:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{hovered.telemetry.tasksCompleted} tasks</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
