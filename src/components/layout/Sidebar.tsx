'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Target, BarChart3, Settings, X, Zap, Star
} from 'lucide-react';
import { useDemo } from '@/hooks/useDemo';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { href: '/goals',     label: 'Goals',     icon: Target },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings',  label: 'Settings',  icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile, onClose, isCollapsed = false }) => {
  const pathname = usePathname();
  const { user, isDemo } = useAuth();
  const { gamification: demoGamification } = useDemo();

  const [gamification, setGamification] = useState({
    level: 1,
    xp: 0,
    streak: 0,
    badges: [] as string[],
  });

  // Sync with real-time gamification statistics
  useEffect(() => {
    if (isDemo) {
      setGamification(demoGamification);
    } else if (user?.id) {
      const statsRef = doc(db, 'users', user.id, 'gamification', 'stats');
      const unsubscribe = onSnapshot(
        statsRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setGamification({
              level: data.level || 1,
              xp: data.xp || 0,
              streak: data.streak || 0,
              badges: data.badges || [],
            });
          }
        },
        (err) => {
          console.error('Failed to listen to gamification stats:', err);
        }
      );
      return () => unsubscribe();
    }
  }, [isDemo, user?.id, demoGamification]);

  const xpPercent = gamification.xp % 100;
  const nextLevelXp = 100;

  const sidebarContent = (
    <div style={{
      width: isCollapsed ? '64px' : '240px',
      height: '100%',
      background: 'rgba(8, 8, 18, 0.95)',
      borderRight: '1px solid var(--glass-border)',
      display: 'flex',
      flexDirection: 'column',
      backdropFilter: 'blur(20px)',
      flexShrink: 0,
      transition: 'width 0.2s ease',
    }}>
      {/* Brand header (mobile only - desktop has TopBar) */}
      {isMobile && (
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
          <span className="neon-text-cyan font-display" style={{ fontSize: 'var(--text-lg)', fontWeight: 900, letterSpacing: '2px' }}>
            CHRONOS
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: isCollapsed ? '16px 8px' : '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={isMobile ? onClose : undefined}
              title={isCollapsed ? label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: isCollapsed ? '0' : '12px',
                padding: isCollapsed ? '10px 0' : '10px 14px',
                borderRadius: 'var(--radius-md)',
                borderLeft: !isCollapsed && isActive ? '3px solid var(--neon-cyan)' : '3px solid transparent',
                background: isActive ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                color: isActive ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Gamification Bar */}
      <div style={{ padding: isCollapsed ? '16px 8px' : '16px', borderTop: '1px solid var(--glass-border)' }}>
        {isCollapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }} title={`Level ${gamification.level} (${xpPercent} XP)`}>
            <Zap size={15} style={{ color: 'var(--neon-cyan)' }} />
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-primary)' }}>L{gamification.level}</span>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={14} style={{ color: 'var(--neon-cyan)' }} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Level <strong style={{ color: 'var(--text-primary)' }}>{gamification.level}</strong>
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {xpPercent}/{nextLevelXp} XP
              </span>
            </div>
            {/* XP progress bar */}
            <div style={{ height: '4px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${xpPercent}%`,
                background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
              <Star size={12} style={{ color: 'var(--neon-amber)' }} />
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {gamification.streak > 0 ? `🔥 ${gamification.streak} day streak` : 'Start your streak!'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Mobile: slide-in drawer
  if (isMobile) {
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
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                zIndex: 200, backdropFilter: 'blur(2px)',
              }}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 201, height: '100dvh' }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop: always visible
  return sidebarContent;
};

export default Sidebar;
