'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn, signInGuest, startDemo, loading, user, isDemo } = useAuth();
  const [sessionExpired, setSessionExpired] = useState(false);
  const router = useRouter();

  // Redirect authenticated users or demo sessions
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.onboardingCompleted) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else if (isDemo) {
        router.push('/dashboard');
      }
    }
  }, [user, isDemo, loading, router]);

  // Auto-trigger demo if param is passed, and detect session expiration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'session_expired') {
        setSessionExpired(true);
      }
      
      if (!user && !isDemo && !loading) {
        if (params.get('demo') === 'true') {
          startDemo();
        }
      }
    }
  }, [startDemo, user, isDemo, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-orbitron), sans-serif', padding: '20px' }}>
      <h1 style={{ textShadow: '0 0 10px #00f0ff', color: '#00f0ff', fontSize: '2.5rem', letterSpacing: '2px', margin: '0' }}>CHRONOS LOGIN</h1>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', color: '#888', margin: '0 0 10px 0' }}>Stage 2 Authentication Verification</p>
      
      {sessionExpired && (
        <div id="session-expired-alert" style={{
          background: 'rgba(239, 68, 68, 0.12)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          padding: '16px 24px',
          borderRadius: '8px',
          maxWidth: '450px',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '15px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#ff4d4d', fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.95rem' }}>
            ⚠️ OAuth Session Expired
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#e0e0e0', fontFamily: 'var(--font-inter), sans-serif', lineHeight: '1.4' }}>
            Your Google session token has expired or was revoked. Please sign in again to sync your tasks, calendars, and AI agents.
          </p>
        </div>
      )}

      {loading ? (
        <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>Loading session...</p>
      ) : user ? (
        <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>Signed in as {user.displayName}</p>
      ) : (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={signIn} style={{ background: '#00f0ff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold', boxShadow: '0 0 10px #00f0ff' }}>
            SIGN IN WITH GOOGLE
          </button>
          <button onClick={signInGuest} style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold', boxShadow: '0 0 10px #a855f7' }}>
            LOG IN AS GUEST (LIVE DB)
          </button>
          <button onClick={startDemo} style={{ background: 'transparent', color: '#00f0ff', border: '2px solid #00f0ff', padding: '10px 22px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold' }}>
            TRY DEMO MODE
          </button>
        </div>
      )}
    </div>
  );
}
