'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isDemo } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !isDemo) {
      router.push('/login');
    }
  }, [user, loading, isDemo, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0a', color: '#00f0ff', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
        LOADING GUARDIAN SESSION...
      </div>
    );
  }

  if (!user && !isDemo) {
    return null; // Will redirect to /login
  }

  return <>{children}</>;
}
