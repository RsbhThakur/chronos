'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertCircle, Zap, CheckCircle2, Trophy, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, ChronosNotification } from '@/hooks/useNotifications';
import { useRouter } from 'next/navigation';

interface NotificationsDropdownProps {
  onClose: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  deadline_approaching: <AlertCircle size={14} style={{ color: 'var(--neon-pink)' }} />,
  rescue_mode:         <Zap size={14} style={{ color: 'var(--neon-amber)' }} />,
  achievement:         <Trophy size={14} style={{ color: 'var(--neon-amber)' }} />,
  streak:              <CheckCircle2 size={14} style={{ color: 'var(--neon-green)' }} />,
  ghost_worker_ready:  <Zap size={14} style={{ color: 'var(--neon-cyan)' }} />,
  insight:             <Bell size={14} style={{ color: 'var(--neon-purple)' }} />,
  
  // Handled from database notification check
  urgent:              <AlertCircle size={14} style={{ color: 'var(--neon-pink)' }} />,
  warning:             <AlertCircle size={14} style={{ color: 'var(--neon-amber)' }} />,
  reminder:            <Bell size={14} style={{ color: 'var(--neon-cyan)' }} />,
};

const formatTime = (date: any): string => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? new Date(date) : (date.toDate ? date.toDate() : new Date(date));
  const mins = Math.floor((Date.now() - parsedDate.getTime()) / 60000);
  if (mins < 0) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ onClose }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id || '');
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));

  const markAllRead = async () => {
    const unreadNotifs = notifications.filter((n) => !n.read);
    for (const n of unreadNotifs) {
      await markAsRead(n.id);
    }
  };

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    await markAsRead(id);
  };

  const handleNotificationClick = async (n: any) => {
    await markAsRead(n.id);
    if (n.taskId) {
      router.push(`/rescue/${n.taskId}`);
    } else if (n.actionUrl) {
      router.push(n.actionUrl);
    }
    onClose();
  };

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
        background: 'rgba(14, 14, 24, 0.96)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        zIndex: 300,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={14} style={{ color: 'var(--neon-cyan)' }} />
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ fontSize: '10px', padding: '1px 6px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236,72,153,0.4)', borderRadius: 'var(--radius-full)', color: 'var(--neon-pink)' }}>
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-xs)', color: 'var(--neon-cyan)' }}>
            Mark all read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {visibleNotifications.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
            All caught up! 🎉
          </div>
        ) : (
          visibleNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                background: n.read ? 'transparent' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.02)';
              }}
            >
              <div style={{ marginTop: '2px', flexShrink: 0 }}>{iconMap[n.type] || <Bell size={14} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{n.title}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{formatTime(n.createdAt)}</span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{n.body || (n as any).message}</p>
              </div>
              <button onClick={(e) => dismiss(e, n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, flexShrink: 0 }}>
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

