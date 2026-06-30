'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { signIn, signInGuest, startDemo, loading, user, isDemo } = useAuth();

  // Auto-trigger demo if param is passed
  useEffect(() => {
    if (typeof window !== 'undefined' && !user && !isDemo && !loading) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === 'true') {
        startDemo();
      }
    }
  }, [startDemo, user, isDemo, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-orbitron), sans-serif' }}>
      <h1 style={{ textShadow: '0 0 10px #00f0ff', color: '#00f0ff', fontSize: '2.5rem', letterSpacing: '2px' }}>CHRONOS LOGIN</h1>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', color: '#888' }}>Stage 2 Authentication Verification</p>
      
      {loading ? (
        <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>Loading session...</p>
      ) : user ? (
        <p style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>Signed in as {user.displayName}</p>
      ) : (
        <div style={{ display: 'flex', gap: '15px' }}>
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
