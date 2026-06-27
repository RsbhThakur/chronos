'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, CheckSquare, Target, BarChart3, Settings, Plus, LogOut, ArrowRight, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useDemo } from '@/hooks/useDemo';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTask?: () => void;
}

interface PaletteItem {
  id: string;
  type: 'page' | 'task' | 'action';
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNewTask }) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tasks } = useTasks(user?.id || '');
  const { tasks: demoTasks, isDemo } = useDemo();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTasks = isDemo ? demoTasks : tasks;

  const navigate = useCallback((href: string) => { router.push(href); onClose(); }, [router, onClose]);

  // Static items: pages + actions
  const staticItems: PaletteItem[] = [
    { id: 'pg-dash',      type: 'page',   label: 'Dashboard',     sublabel: 'Overview & today\'s priorities', icon: <LayoutDashboard size={14} />, action: () => navigate('/dashboard'), keywords: 'home overview' },
    { id: 'pg-tasks',     type: 'page',   label: 'Tasks',         sublabel: 'Board, list, calendar views',    icon: <CheckSquare size={14} />,     action: () => navigate('/tasks'),     keywords: 'kanban board' },
    { id: 'pg-goals',     type: 'page',   label: 'Goals & Habits',sublabel: 'Track goals and daily habits',   icon: <Target size={14} />,          action: () => navigate('/goals'),     keywords: 'habits tracker' },
    { id: 'pg-analytics', type: 'page',   label: 'Analytics',     sublabel: 'Productivity insights',          icon: <BarChart3 size={14} />,       action: () => navigate('/analytics'), keywords: 'stats charts' },
    { id: 'pg-settings',  type: 'page',   label: 'Settings',      sublabel: 'Profile, preferences, integrations', icon: <Settings size={14} />,  action: () => navigate('/settings'),  keywords: 'profile account' },
    { id: 'act-new',      type: 'action', label: 'New Task',       sublabel: 'Create a new task',              icon: <Plus size={14} />,            action: () => { onNewTask?.(); onClose(); }, keywords: 'create add' },
    { id: 'act-signout',  type: 'action', label: 'Sign Out',       sublabel: 'End your session',               icon: <LogOut size={14} />,          action: () => { signOut(); onClose(); }, keywords: 'logout exit' },
  ];

  // Dynamic task items from real/demo data
  const taskItems: PaletteItem[] = allTasks.slice(0, 20).map((t) => ({
    id: `task-${t.id}`,
    type: 'task' as const,
    label: t.title,
    sublabel: `${t.status} · ${t.priority} priority`,
    icon: <Zap size={14} style={{ color: 'var(--neon-cyan)' }} />,
    action: () => navigate('/tasks'),
    keywords: t.title + ' ' + t.category + ' ' + t.tags.join(' '),
  }));

  const allItems = [...staticItems, ...taskItems];

  // Filter
  const filtered = query.trim()
    ? allItems.filter((item) =>
        (item.label + ' ' + (item.sublabel || '') + ' ' + (item.keywords || ''))
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : staticItems;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep selected in bounds
  useEffect(() => {
    setSelected((s) => Math.min(s, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action(); }
    if (e.key === 'Escape') onClose();
  };

  const typeColor: Record<string, string> = {
    page:   'var(--neon-cyan)',
    action: 'var(--neon-purple)',
    task:   'var(--neon-amber)',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 500 }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(600px, 92vw)',
              background: 'rgba(10, 10, 22, 0.97)',
              backdropFilter: 'blur(24px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
              zIndex: 501,
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', borderBottom: '1px solid var(--glass-border)' }}>
              <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKey}
                placeholder="Search tasks, pages, actions..."
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
                  fontFamily: 'inherit',
                }}
              />
              <kbd style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--text-tertiary)' }}>ESC</kbd>
            </div>

            {/* Results */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '6px' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                  No results for "{query}"
                </div>
              ) : (
                filtered.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelected(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: idx === selected ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                      transition: 'background 0.1s ease',
                    }}
                  >
                    <div style={{ color: typeColor[item.type], flexShrink: 0 }}>{item.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', color: idx === selected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: idx === selected ? 500 : 400 }}>
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                    {idx === selected && <ArrowRight size={13} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 18px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[['↑↓', 'Navigate'], ['↵', 'Select'], ['ESC', 'Close']].map(([key, label]) => (
                <span key={key} style={{ display: 'flex', gap: '5px', alignItems: 'center', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                  <kbd style={{ padding: '1px 5px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: '3px' }}>{key}</kbd>
                  {label}
                </span>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
