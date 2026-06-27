'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertCircle, Zap, CheckCircle2, Trophy, X } from 'lucide-react';
import { AppNotification } from '@/types';

interface NotificationsDropdownProps {
  onClose: () => void;
}

// Mock notifications – in production these come from Firestore
const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'deadline_approaching',
    title: 'Deadline Approaching',
    message: 'Assignment due in 2 hours. Consider activating Rescue Mode.',
    read: false,
    createdAt: new Date(Date.now() - 20 * 60 * 1000),
  },
  {
    id: '2',
    type: 'achievement',
    title: 'Badge Unlocked!',
    message: 'You earned the "Week Warrior" badge for 7 days of consistency.',
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'streak',
    title: 'Streak Active 🔥',
    message: 'You\'re on a 5-day streak. Keep going!',
    read: true,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

const iconMap: Record<string, React.ReactNode> = {
  deadline_approaching: <AlertCircle size={14} style={{ color: 'var(--neon-pink)' }} />,
  rescue_mode:         <Zap size={14} style={{ color: 'var(--neon-amber)' }} />,
  achievement:         <Trophy size={14} style={{ color: 'var(--neon-amber)' }} />,
  streak:              <CheckCircle2 size={14} style={{ color: 'var(--neon-green)' }} />,
  ghost_worker_ready:  <Zap size={14} style={{ color: 'var(--neon-cyan)' }} />,
  insight:             <Bell size={14} style={{ color: 'var(--neon-purple)' }} />,
};

const formatTime = (date: Date): string => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ onClose }) => {
  const [notifications, setNotifications] = React.useState(MOCK_NOTIFICATIONS);
  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '8px',
        width: '340px',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
        zIndex: 300,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={14} style={{ color: 'var(--neon-cyan)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
          {unread > 0 && (
            <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236,72,153,0.4)', borderRadius: 'var(--radius-full)', color: 'var(--neon-pink)' }}>
              {unread} new
            </span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)' }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            All caught up! 🎉
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
              transition: 'background 0.15s ease',
            }}>
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{iconMap[n.type] || <Bell size={14} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatTime(n.createdAt)}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{n.message}</p>
              </div>
              <button onClick={() => dismiss(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, flexShrink: 0 }}>
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsDropdown;
