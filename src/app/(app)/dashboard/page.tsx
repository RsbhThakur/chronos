'use client';

import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '25px', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-orbitron), sans-serif' }}>
      <h1 style={{ textShadow: '0 0 10px #00ff00', color: '#00ff00', fontSize: '2.5rem', letterSpacing: '2px' }}>CHRONOS DASHBOARD</h1>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', color: '#888' }}>
        Status: Successfully authenticated and onboarded!
      </p>
      
      {user && (
        <div style={{ fontFamily: 'var(--font-inter), sans-serif', background: '#111', border: '1px solid #333', padding: '25px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '320px', boxShadow: '0 0 15px rgba(0, 255, 0, 0.1)' }}>
          <p style={{ margin: 0 }}><strong style={{ color: '#888' }}>Name:</strong> {user.displayName}</p>
          <p style={{ margin: 0 }}><strong style={{ color: '#888' }}>Email:</strong> {user.email}</p>
          <p style={{ margin: 0 }}><strong style={{ color: '#888' }}>UID:</strong> <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '0.9em' }}>{user.id}</span></p>
          <p style={{ margin: 0 }}><strong style={{ color: '#888' }}>Mode:</strong> {user.mode}</p>
          <p style={{ margin: 0 }}><strong style={{ color: '#888' }}>Onboarding Status:</strong> <span style={{ color: '#00ff00', fontWeight: 'bold' }}>{user.onboardingCompleted ? 'COMPLETED' : 'PENDING'}</span></p>
        </div>
      )}
      
      <button onClick={signOut} style={{ background: '#00ff00', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold', boxShadow: '0 0 10px #00ff00' }}>
        SIGN OUT
      </button>
    </div>
  );
}
