'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useResponsive } from '@/hooks/useResponsive';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { XPBar } from '@/components/gamification/XPBar';
import {
  ProductivityLineChart,
  FocusBarChart,
  TaskDonutChart,
  CategoryPieChart,
  StreakHeatmap,
} from '@/components/analytics/ProductivityChart';
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Clock,
  CheckCircle2,
  Download,
  Printer,
  Brain,
  ShieldAlert,
  Sparkles,
  Award,
  Calendar,
  Layers,
} from 'lucide-react';
import { DailyAnalytics, Task, UserGamification } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

export default function AnalyticsPage() {
  const { user, isDemo: authDemo } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const demoContext = useDemo();

  const isDemo = authDemo || demoContext.isDemo;

  const [activePeriod, setActivePeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [gamification, setGamification] = useState<UserGamification>({
    xp: 0,
    level: 1,
    streak: 0,
    longestStreak: 0,
    badges: [],
    tasksCompletedToday: 0,
    totalTasksCompleted: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);

  // Time Warp AI state
  const [timeWarpForecasts, setTimeWarpForecasts] = useState<any[]>([]);
  const [timeWarpInsights, setTimeWarpInsights] = useState<any[]>([]);
  const [timeWarpReport, setTimeWarpReport] = useState<string>('');
  const [loadingReport, setLoadingReport] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // 1. Date calculation depending on Period
  const dateRange = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (activePeriod === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (activePeriod === 'week') {
      const start = new Date();
      start.setDate(today.getDate() - 6);
      return { start: start.toISOString().split('T')[0], end: todayStr };
    }
    if (activePeriod === 'month') {
      const start = new Date();
      start.setDate(today.getDate() - 29);
      return { start: start.toISOString().split('T')[0], end: todayStr };
    }
    return { start: '', end: '' }; // All Time
  }, [activePeriod]);

  // 2. Fetch Telemetry Data & Gamification
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      setLoadingData(true);

      try {
        if (isDemo) {
          // ====== DEMO MODE SYNC ======
          setTasks(demoContext.tasks);
          const demoGamification = demoContext.gamification as any;
          setGamification({
            xp: demoGamification?.xp || 0,
            level: demoGamification?.level || 1,
            streak: demoGamification?.streak || 0,
            longestStreak: demoGamification?.longestStreak || 0,
            badges: (demoGamification?.badges || []).map((b: any) =>
              typeof b === 'string'
                ? { id: b, name: b, description: 'Unlocked achievement milestone.', icon: '🏆' }
                : b
            ),
            tasksCompletedToday: demoGamification?.tasksCompletedToday || 0,
            totalTasksCompleted: demoGamification?.totalTasksCompleted || 0,
          });

          // Get analytics array from demo state and filter manually
          let filteredAnalytics = [...demoContext.analytics];
          if (dateRange.start) {
            filteredAnalytics = filteredAnalytics.filter((d) => d.date >= dateRange.start);
          }
          if (dateRange.end) {
            filteredAnalytics = filteredAnalytics.filter((d) => d.date <= dateRange.end);
          }
          setAnalytics(filteredAnalytics);
        } else {
          // ====== REAL MODE BACKEND API CALLS ======
          // Fetch tasks
          const tasksResponse = await fetch(`/api/tasks?userId=${user.id}`);
          const tasksData = await tasksResponse.json();
          if (tasksData.success) {
            setTasks(tasksData.tasks || []);
          }

          // Fetch Analytics logs
          let analyticsUrl = `/api/analytics?userId=${user.id}`;
          if (dateRange.start) analyticsUrl += `&startDate=${dateRange.start}`;
          if (dateRange.end) analyticsUrl += `&endDate=${dateRange.end}`;
          const analyticsResponse = await fetch(analyticsUrl);
          const analyticsData = await analyticsResponse.json();
          if (analyticsData.success) {
            setAnalytics(analyticsData.analytics || []);
          }

          // Fetch Gamification stats document directly from Firestore
          const statsRef = doc(clientDb, 'users', user.id, 'gamification', 'stats');
          const statsSnap = await getDoc(statsRef);
          if (statsSnap.exists()) {
            setGamification(statsSnap.data() as UserGamification);
          }
        }
      } catch (err) {
        console.error('Error fetching analytics page details:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user?.id, activePeriod, isDemo, dateRange, demoContext.tasks, demoContext.gamification, demoContext.analytics]);

  // 3. Trigger Time Warp AI Predictions
  useEffect(() => {
    const triggerTimeWarp = async () => {
      if (!user?.id) return;
      setLoadingReport(true);
      try {
        const response = await fetch(`/api/ai/analyze?userId=${user.id}`);
        const data = await response.json();
        if (data.success) {
          setTimeWarpForecasts(data.forecasts || []);
          setTimeWarpInsights(data.insights || []);
          setTimeWarpReport(data.weeklyReport || '');
        }
      } catch (err) {
        console.error('Error triggering AI Time Warp Analysis:', err);
      } finally {
        setLoadingReport(false);
      }
    };

    triggerTimeWarp();
  }, [user?.id, isDemo]);

  // 4. Calculate stats KPI from active records
  const kpis = useMemo(() => {
    const totalCompleted = analytics.reduce((sum, d) => sum + (d.tasksCompleted || 0), 0);
    const avgProductivity = analytics.length > 0
      ? Math.round(analytics.reduce((sum, d) => sum + d.productivityScore, 0) / analytics.length)
      : 0;
    const totalFocusMinutes = analytics.reduce((sum, d) => sum + (d.focusMinutes || 0), 0);
    const focusHours = (totalFocusMinutes / 60).toFixed(1);

    return {
      totalCompleted,
      avgProductivity,
      focusHours,
    };
  }, [analytics]);

  // Export JSON Link Trigger
  const handleExportJson = () => {
    if (!user?.id) return;
    window.open(`/api/analytics/export?userId=${user.id}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper custom Markdown parser for Time Warp Weekly text
  const parseMarkdown = (md: string) => {
    if (!md) return null;
    return md.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3
            key={idx}
            style={{
              color: 'var(--neon-cyan)',
              fontSize: '12px',
              fontWeight: 800,
              margin: '16px 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {line.replace('### ', '')}
          </h3>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h4
            key={idx}
            style={{
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontWeight: 700,
              margin: '12px 0 6px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {line.replace('#### ', '')}
          </h4>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <li
            key={idx}
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginLeft: '14px',
              marginBottom: '4px',
              lineHeight: 1.5,
            }}
          >
            {line.substring(2)}
          </li>
        );
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '8px' }} />;
      }
      return (
        <p
          key={idx}
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: '4px 0',
          }}
        >
          {line}
        </p>
      );
    });
  };

  // Get risk colored label style
  const getRiskStyles = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return { color: 'var(--neon-green)', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)' };
      case 'medium':
        return { color: 'var(--neon-cyan)', bg: 'rgba(6, 182, 212, 0.08)', border: 'rgba(6, 182, 212, 0.15)' };
      case 'high':
        return { color: 'var(--neon-amber)', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.15)' };
      case 'critical':
        return { color: 'var(--neon-pink)', bg: 'rgba(244, 63, 94, 0.08)', border: 'rgba(244, 63, 94, 0.15)' };
      default:
        return { color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.03)', border: 'rgba(255,255,255,0.05)' };
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'achievement':
        return <Award size={14} style={{ color: 'var(--neon-green)' }} />;
      case 'warning':
        return <ShieldAlert size={14} style={{ color: 'var(--neon-pink)' }} />;
      case 'recommendation':
        return <Brain size={14} style={{ color: 'var(--neon-cyan)' }} />;
      default:
        return <Sparkles size={14} style={{ color: 'var(--neon-purple)' }} />;
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        padding: isMobile ? '16px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        paddingBottom: '100px',
      }}
    >
      {/* 1. Header Section */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <BarChart3 size={24} style={{ color: 'var(--neon-cyan)' }} />
            Analytics Action Center
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Real-time visual telemetry, historical telemetry analysis, and predictive workload forecasting.
          </p>
        </div>

        {/* Toolbar switches & Exporters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Range Selector Switch */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              padding: '2px',
              display: 'flex',
              gap: '2px',
            }}
          >
            {(['today', 'week', 'month', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setActivePeriod(period)}
                style={{
                  background: activePeriod === period ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activePeriod === period ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: activePeriod === period ? '0 0 8px rgba(0, 242, 254, 0.15)' : 'none',
                }}
              >
                {period}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <button
            onClick={handleExportJson}
            title="Download full analytics logs as JSON"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Download size={14} /> EXPORT JSON
          </button>

          <button
            onClick={handlePrint}
            title="Print dashboard layout report"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--neon-cyan)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <Printer size={14} /> PRINT PDF
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Tiles Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <GlassCard glowColor="green" padding="md" animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                color: 'var(--neon-green)',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.1)',
              }}
            >
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Tasks Completed ({activePeriod})
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--neon-green)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {loadingData ? '...' : kpis.totalCompleted}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="cyan" padding="md" animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                color: 'var(--neon-cyan)',
                padding: '12px',
                background: 'rgba(6, 182, 212, 0.08)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)',
              }}
            >
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Avg Productivity Index
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {loadingData ? '...' : `${kpis.avgProductivity}%`}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="amber" padding="md" animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                color: 'var(--neon-amber)',
                padding: '12px',
                background: 'rgba(245, 158, 11, 0.08)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.1)',
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Cumulative Focus Hours
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--neon-amber)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {loadingData ? '...' : `${kpis.focusHours}h`}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard glowColor="purple" padding="md" animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                color: 'var(--neon-purple)',
                padding: '12px',
                background: 'rgba(139, 92, 246, 0.08)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.1)',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Daily Streak
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--neon-purple)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                {loadingData ? '...' : `${gamification.streak} days`}
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 3. Primary Charts Column & AI Forecast Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile || isTablet ? '1fr' : '1.4fr 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
        className="analytics-grid"
      >
        {/* Left Column: Heatmap, Lines & Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* A. STREAK HEATMAP PANEL */}
          <GlassCard padding="md" hoverable={false} animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Calendar size={16} style={{ color: 'var(--neon-cyan)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Productivity Streak Heatmap — 365 Days
              </span>
            </div>
            {loadingData ? (
              <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                Loading activity canvas...
              </div>
            ) : (
              <StreakHeatmap data={demoContext.analytics} />
            )}
          </GlassCard>

          {/* B. PRODUCTIVITY SCORES LINE CHART */}
          <GlassCard padding="md" hoverable={false} animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingUp size={16} style={{ color: 'var(--neon-cyan)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Productivity Index Index Fluctuations
              </span>
            </div>
            {loadingData ? (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                Compiling scores telemetry...
              </div>
            ) : (
              <ProductivityLineChart data={analytics} />
            )}
          </GlassCard>

          {/* C. FOCUS MINUTES BAR CHART */}
          <GlassCard padding="md" hoverable={false} animate>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Clock size={16} style={{ color: 'var(--neon-purple)' }} />
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Daily Focus Minutes Allocation
              </span>
            </div>
            {loadingData ? (
              <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                Compiling timer telemetry...
              </div>
            ) : (
              <FocusBarChart data={analytics} />
            )}
          </GlassCard>

          {/* D. LOWER TWO CHARTS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }} className="lower-charts-row">
            <GlassCard padding="md" hoverable={false} animate>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Layers size={16} style={{ color: 'var(--neon-green)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Task Status Donut
                </span>
              </div>
              <TaskDonutChart tasks={tasks} />
            </GlassCard>

            <GlassCard padding="md" hoverable={false} animate>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Target size={16} style={{ color: 'var(--neon-amber)' }} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Syllabus Categories Pie
                </span>
              </div>
              <CategoryPieChart tasks={tasks} />
            </GlassCard>
          </div>

        </div>

        {/* Right Column: Time Warp AI Insights Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Gamification progress panel embedded right in analytics */}
          <XPBar gamification={gamification} />

          {/* TIME WARP PANEL CONTAINER */}
          <GlassCard
            glowColor="purple"
            padding="md"
            hoverable={false}
            animate
            style={{
              background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.08), rgba(15, 15, 25, 0.95))',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              boxShadow: '0 8px 32px rgba(139, 92, 246, 0.1)',
            }}
          >
            {/* Panel Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    color: 'var(--neon-purple)',
                    padding: '8px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <Brain size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Chronos Time Warp AI
                  </h3>
                  <span style={{ fontSize: '9px', color: 'var(--neon-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Predictive Analytics Engine
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid var(--neon-purple)',
                  borderRadius: '30px',
                  padding: '3px 8px',
                  fontSize: '9px',
                  fontWeight: 800,
                  color: 'var(--neon-purple)',
                  boxShadow: '0 0 8px rgba(139, 92, 246, 0.2)',
                }}
              >
                GEMINI ACTIVE
              </div>
            </div>

            {/* Time Warp Loader */}
            {loadingReport ? (
              <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                  {/* Glowing spinner */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '3px solid transparent',
                      borderTopColor: 'var(--neon-purple)',
                      borderRightColor: 'var(--neon-pink)',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-jetbrains-mono)' }}>
                    Interrogating Calendar Telemetry...
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Calculating 7-day risk vectors & performance patterns
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. 7-Day Risk Timeline Forecast */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    7-Day Load & Bottleneck Forecast
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {timeWarpForecasts.map((f, i) => {
                      const styles = getRiskStyles(f.riskLevel);
                      const dayName = new Date(f.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                      return (
                        <div
                          key={f.date}
                          style={{
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            borderRadius: 'var(--radius-md)',
                            padding: '8px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-primary)' }}>
                              {dayName}
                            </span>
                            <div
                              style={{
                                background: styles.bg,
                                border: `1px solid ${styles.border}`,
                                color: styles.color,
                                padding: '2px 8px',
                                borderRadius: '30px',
                                fontSize: '9px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                boxShadow: f.riskLevel === 'critical' ? '0 0 8px rgba(244, 63, 94, 0.2)' : 'none',
                              }}
                            >
                              {f.riskLevel} RISK ({f.taskCount} tasks)
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {f.reason}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>ACTION:</span>
                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>{f.recommendedAction}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Structured Tailored Bulletins */}
                {timeWarpInsights.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Diagnostic Bulletins
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                      {timeWarpInsights.map((ins, i) => (
                        <div
                          key={i}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderLeft: `2px solid ${
                              ins.type === 'achievement'
                                ? 'var(--neon-green)'
                                : ins.type === 'warning'
                                ? 'var(--neon-pink)'
                                : ins.type === 'recommendation'
                                ? 'var(--neon-cyan)'
                                : 'var(--neon-purple)'
                            }`,
                            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                            padding: '10px 12px',
                            display: 'flex',
                            gap: '10px',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div style={{ marginTop: '2px' }}>{getInsightIcon(ins.type)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {ins.title}
                              </span>
                              {ins.metric !== undefined && (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono)' }}>
                                  {ins.metric}%
                                </span>
                              )}
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {ins.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Narrative Time Warp Report */}
                {timeWarpReport && (
                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '16px',
                    }}
                  >
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Diagnostic Narrative Summary
                    </h4>
                    <div
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                      }}
                    >
                      {parseMarkdown(timeWarpReport)}
                    </div>
                  </div>
                )}

              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Inject custom spin animation for loaders */}
      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @media print {
          .no-print,
          nav,
          sidebar,
          header,
          button,
          .analytics-toolbar {
            display: none !important;
          }
          body,
          .analytics-grid,
          .lower-charts-row {
            display: block !important;
            background: white !important;
            color: black !important;
          }
          rect {
            stroke: #ddd !important;
          }
        }
      `}</style>
    </div>
  );
}
