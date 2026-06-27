'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();
  const { isOpen: isPaletteOpen, open: openPalette, close: closePalette, toggle: togglePalette } = useCommandPalette();

  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Responsive breakpoint detection
  useEffect(() => {
    const checkSize = () => setIsMobile(window.innerWidth < 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
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
      {/* Top Bar */}
      <TopBar
        onMenuClick={() => setSidebarOpen((v) => !v)}
        onSearchClick={togglePalette}
      />

      {/* Body: Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Sidebar — fixed on desktop, drawer on mobile */}
        <Sidebar
          isOpen={isMobile ? sidebarOpen : true}
          isMobile={isMobile}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}>
          {children}
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
      />
    </div>
  );
}
