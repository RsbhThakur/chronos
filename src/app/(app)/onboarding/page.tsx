'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { db as clientDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';

export default function OnboardingPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const completeOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(clientDb, 'users', user.id);
      await updateDoc(userRef, {
        onboardingCompleted: true
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px', background: '#0a0a0a', color: '#fff', fontFamily: 'var(--font-orbitron), sans-serif' }}>
      <h1 style={{ textShadow: '0 0 10px #ff00ff', color: '#ff00ff', fontSize: '2.5rem', letterSpacing: '2px' }}>CHRONOS ONBOARDING</h1>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', color: '#888', maxWidth: '500px', textAlign: 'center', lineHeight: '1.6' }}>
        Welcome {user?.displayName || 'Guardian'}! This is the Onboarding Quiz placeholder. Click below to mock-complete onboarding in Firestore and unlock the dashboard.
      </p>
      
      <div style={{ display: 'flex', gap: '15px' }}>
        <button onClick={completeOnboarding} disabled={saving} style={{ background: '#ff00ff', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold', boxShadow: '0 0 10px #ff00ff' }}>
          {saving ? 'SAVING...' : 'COMPLETE ONBOARDING'}
        </button>
        <button onClick={signOut} style={{ background: 'transparent', color: '#ff00ff', border: '2px solid #ff00ff', padding: '10px 22px', borderRadius: '5px', cursor: 'pointer', fontFamily: 'var(--font-jetbrains-mono), monospace', fontWeight: 'bold' }}>
          SIGN OUT
        </button>
      </div>
    </div>
  );
}
