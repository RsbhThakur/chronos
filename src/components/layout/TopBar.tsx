'use client';

import React from 'react';
import { Menu, Search, Bell, LogOut, Cpu, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsDropdown } from './NotificationsDropdown';

interface TopBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
  isMobile?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick, onSearchClick, isMobile = false }) => {
  const { user, signOut, isDemo } = useAuth();
  const { gamification } = useDemo();
  const { unreadCount, requestPermission } = useNotifications(user?.id || '');
  const [showNotifs, setShowNotifs] = React.useState(false);
  const notifsRef = React.useRef<HTMLDivElement>(null);

  // Request notification permissions and register FCM service worker automatically
  React.useEffect(() => {
    if (user?.id) {
      requestPermission(true);
    }
  }, [user?.id]);

  // Close notifications on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '12px',
      padding: isMobile ? '0 12px' : '0 20px',
      background: 'rgba(8, 8, 18, 0.95)',
      borderBottom: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      flexShrink: 0,
      zIndex: 100,
      position: 'relative',
    }}>
      {/* Hamburger */}
      <button
        id="topbar-menu-btn"
        onClick={onMenuClick}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', borderRadius: 'var(--radius-sm)', display: 'flex' }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <Menu size={20} />
      </button>

      {/* Logo */}
      <span className="neon-text-cyan font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 900, letterSpacing: '2px', flexShrink: 0 }}>
        CHRONOS
      </span>
      {!isMobile && (
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginLeft: '2px' }}>
          AI Time Guardian
        </span>
      )}

      {/* Demo badge */}
      {isDemo && (
        <span style={{
          marginLeft: isMobile ? '2px' : '8px',
          fontSize: '9px', padding: '2px 8px',
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: 'var(--radius-full)',
          color: 'var(--neon-purple)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
        }}>
          DEMO
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Cmd+K Search */}
      <button
        id="topbar-search-btn"
        onClick={onSearchClick}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: isMobile ? '6px' : '6px 12px',
          background: isMobile ? 'none' : 'rgba(255,255,255,0.04)',
          border: isMobile ? 'none' : '1px solid var(--glass-border)',
          borderRadius: isMobile ? '50%' : 'var(--radius-md)',
          cursor: 'pointer', color: 'var(--text-tertiary)',
          fontSize: 'var(--text-xs)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!isMobile) {
            e.currentTarget.style.borderColor = 'var(--neon-cyan)';
          } else {
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
          } else {
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }
        }}
      >
        <Search size={isMobile ? 18 : 13} />
        {!isMobile && (
          <>
            <span>Search</span>
            <kbd style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)',
              borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: 'var(--text-tertiary)',
            }}>⌘K</kbd>
          </>
        )}
      </button>

      {/* AI Chat Button */}
      <button
        id="topbar-chat-btn"
        onClick={() => {
          if (typeof window !== 'undefined' && (window as any).toggleAIChat) {
            (window as any).toggleAIChat();
          }
        }}
        style={{
          background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px',
          borderRadius: 'var(--radius-sm)', display: 'flex',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        title="Toggle AI Guardian Chat"
      >
        <MessageSquare size={18} />
      </button>

      {/* Notification Bell */}
      <div ref={notifsRef} style={{ position: 'relative' }}>
        <button
          id="topbar-notif-btn"
          onClick={() => setShowNotifs((v) => !v)}
          style={{
            position: 'relative', background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px',
            borderRadius: 'var(--radius-sm)', display: 'flex',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <Bell size={18} />
          {/* Unread badge */}
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px',
              width: '8px', height: '8px',
              background: 'var(--neon-pink)',
              borderRadius: '50%',
              border: '1px solid var(--bg-primary)',
            }} />
          )}
        </button>
        {showNotifs && <NotificationsDropdown onClose={() => setShowNotifs(false)} />}
      </div>


      {/* User avatar + sign out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--glass-border)' }} />
        ) : (
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(0, 229, 255, 0.15)',
            border: '1px solid var(--neon-cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Cpu size={14} style={{ color: 'var(--neon-cyan)' }} />
          </div>
        )}
        <button
          onClick={() => signOut()}
          title="Sign Out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: '4px',
            display: 'flex', transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-pink)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
