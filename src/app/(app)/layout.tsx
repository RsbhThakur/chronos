'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { AIChatSidebar } from '@/components/chat/AIChatSidebar';
import { useResponsive } from '@/hooks/useResponsive';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen: isPaletteOpen, open: openPalette, close: closePalette, toggle: togglePalette } = useCommandPalette();

  const { isMobile, isTablet } = useResponsive();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Sync collapsible layout with tablet viewport size
  useEffect(() => {
    setIsCollapsed(isTablet);
  }, [isTablet]);

  // Expose chat toggle bindings globally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).toggleAIChat = () => setChatOpen((prev) => !prev);
      (window as any).openAIChat = () => setChatOpen(true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).toggleAIChat;
        delete (window as any).openAIChat;
      }
    };
  }, []);

  // Auth guard
  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.push('/login');
    }
  }, [user, loading, isDemo, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0a0a0a',
        color: 'var(--neon-cyan)', fontFamily: 'var(--font-jetbrains-mono), monospace',
        fontSize: 'var(--text-sm)', letterSpacing: '2px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 900, marginBottom: '12px' }} className="neon-text-cyan font-display">
            CHRONOS
          </div>
          <div style={{ color: 'var(--text-tertiary)', animation: 'pulse-neon 1.5s infinite' }}>
            INITIALIZING GUARDIAN SESSION...
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isDemo) return null;

  if (pathname === '/onboarding') {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      boxSizing: 'border-box',
    }}>
      <TopBar
        onMenuClick={() => {
          if (isMobile) {
            setSidebarOpen((v) => !v);
          } else {
            setIsCollapsed((v) => !v);
          }
        }}
        onSearchClick={togglePalette}
        isMobile={isMobile}
      />

      {/* Body: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar — fixed on desktop, drawer on mobile */}
        <Sidebar
          isOpen={isMobile ? sidebarOpen : true}
          isMobile={isMobile}
          isCollapsed={isCollapsed}
          onClose={() => setSidebarOpen(false)}
        />

        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Global AI Chat Sidebar */}
        <AIChatSidebar
          isOpen={chatOpen}
          onToggle={() => setChatOpen(v => !v)}
          userId={user?.id || 'demo-user'}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
      />
    </div>
  );
}
