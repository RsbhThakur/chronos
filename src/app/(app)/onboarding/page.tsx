'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { PersonalityQuiz } from '@/components/onboarding/PersonalityQuiz';
import { UserProfile } from '@/types';
import { doc, updateDoc } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isDemo } = useDemo();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleQuizComplete = async (profileData: Partial<UserProfile>) => {
    setSaving(true);

    if (!isDemo && user?.id) {
      // Real user: save to Firestore
      try {
        const docRef = doc(clientDb, 'users', user.id);
        await updateDoc(docRef, {
          mode:                profileData.mode,
          personality:         profileData.personality,
          preferences:         profileData.preferences,
          onboardingCompleted: true,
        });
        showToast({ type: 'success', message: "You're all set! Welcome to Chronos 🚀" });
      } catch (err) {
        console.error('Failed to save onboarding data:', err);
        showToast({ type: 'error', message: 'Failed to save preferences. You can update them in Settings.' });
      }
    } else {
      // Demo user: just show success toast (DemoProvider is read-only)
      showToast({ type: 'success', message: "Demo profile configured! Welcome to Chronos 🚀" });
      await new Promise((r) => setTimeout(r, 600));
    }

    setSaving(false);
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background ambient glow */}
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Main card */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: 'rgba(10, 10, 22, 0.95)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(24px, 5vw, 48px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        position: 'relative',
        zIndex: 1,
      }}>
        {saving ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div className="neon-text-cyan font-display" style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '4px', marginBottom: '16px' }}>
              CHRONOS
            </div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', animation: 'pulse-neon 1.5s infinite' }}>
              Configuring your Time Guardian...
            </div>
          </div>
        ) : (
          <PersonalityQuiz onComplete={handleQuizComplete} />
        )}
      </div>
    </div>
  );
}
