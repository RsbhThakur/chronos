'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { RescueModeView } from '@/components/rescue/RescueModeView';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Trophy, ArrowRight, Star } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

export default function RescuePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const taskId = params?.taskId as string;

  const { tasks, loading, updateTask, completeTask } = useTasks(user?.id || '');
  const [generating, setGenerating] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  const task = tasks.find((t) => t.id === taskId);

  // Rotating loading messages for premium strategic formulation feeling
  const formulationMessages = [
    'Isolating critical path blockages...',
    'Analyzing remaining minutes vs cognitive workload...',
    'Simulating parallel micro-sprint accelerations...',
    'Trimming non-essential scope items for sacrifices list...',
    'Calibrating custom accountability guard personality advice...',
  ];

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % formulationMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [generating]);

  // If task loaded and has no rescue plan, trigger generation automatically
  useEffect(() => {
    if (loading || !task) return;
    if (!task.rescuePlan && !generating) {
      const generatePlan = async () => {
        try {
          setGenerating(true);
          const res = await fetch('/api/ai/rescue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, userId: user?.id || '' }),
          });
          const data = await res.json();
          if (data.success) {
            await updateTask(taskId, { rescuePlan: data.rescuePlan, status: 'rescued' });
            showToast({ type: 'success', message: 'Rescue Mode active! Immersive focus layout loaded.' });
          } else {
            showToast({ type: 'error', message: data.error || 'Failed to construct rescue plan' });
          }
        } catch {
          showToast({ type: 'error', message: 'Network error generating rescue plan' });
        } finally {
          setGenerating(false);
        }
      };
      generatePlan();
    }
  }, [loading, task, taskId, generating, user?.id, updateTask, showToast]);

  const handleStepComplete = async (stepId: string, completed: boolean) => {
    try {
      const res = await fetch('/api/ai/rescue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, stepId, completed, userId: user?.id || '' }),
      });
      const data = await res.json();
      if (data.success) {
        await updateTask(taskId, { rescuePlan: data.rescuePlan });
        
        // Trigger explosion of particle success if all completed
        const allDone = data.rescuePlan.plan.every((s: any) => s.completed);
        if (allDone) {
          handleSuccess();
        }
      } else {
        showToast({ type: 'error', message: data.error || 'Failed to update step status' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error updating step status' });
    }
  };

  const handleSuccess = async () => {
    try {
      await completeTask(taskId);
      setShowSuccessModal(true);
    } catch {
      showToast({ type: 'error', message: 'Failed to mark task completed' });
    }
  };

  const handleExit = () => {
    router.push('/dashboard');
  };

  // 1. Core Loading Spinner (While fetching task list)
  if (loading && !task) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#05050a', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
      }}>
        <div className="spin-slow" style={{
          width: '50px', height: '50px', borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--neon-cyan)',
        }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          SECURE CONNECTION TO CORE DATABASE...
        </span>
      </div>
    );
  }

  // 2. Beautiful Formulating-Plan Loading Overlay
  if (generating || (task && !task.rescuePlan)) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(circle at center, #0c0a1a 0%, #05050a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', textAlign: 'center', color: 'var(--text-primary)',
      }}>
        <div style={{ position: 'relative', width: '120px', height: '120px', marginBottom: '32px' }}>
          {/* Glowing pulse rings */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.15, 0.4, 0.15] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'radial-gradient(circle, var(--neon-pink-glow) 0%, transparent 70%)',
            }}
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            style={{
              position: 'absolute', inset: '10px', borderRadius: '50%',
              background: 'radial-gradient(circle, var(--neon-cyan-glow) 0%, transparent 70%)',
            }}
          />
          <div style={{
            position: 'absolute', inset: '25px', borderRadius: '50%',
            background: 'rgba(10, 10, 20, 0.8)', border: '1px solid var(--neon-pink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px var(--neon-pink-subtle)',
          }}>
            <Shield size={36} style={{ color: 'var(--neon-pink)' }} className="pulse-slow" />
          </div>
        </div>

        <h2 style={{
          fontSize: 'var(--text-xl)', fontWeight: 900, fontFamily: 'var(--font-display)',
          letterSpacing: '2px', color: 'var(--neon-cyan)', marginBottom: '8px',
          textShadow: '0 0 10px var(--neon-cyan-glow)',
        }}>
          AI COGNITIVE AGENT FORMULATING RESCUE SYSTEM
        </h2>
        
        <div style={{ height: '24px', overflow: 'hidden', marginBottom: '40px' }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={loadingTextIndex}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)', margin: 0,
              }}
            >
              {formulationMessages[loadingTextIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Decorative modern scanner bar */}
        <div style={{
          width: '240px', height: '4px', background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-full)',
          overflow: 'hidden', position: 'relative',
        }}>
          <motion.div
            animate={{ left: ['-50%', '100%', '-50%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 0, height: '100%', width: '50%',
              background: 'linear-gradient(90deg, transparent, var(--neon-cyan), transparent)',
            }}
          />
        </div>
      </div>
    );
  }

  // 3. Task Not Found State
  if (!task) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#05050a', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px',
      }}>
        <h2 style={{ fontSize: 'var(--text-md)', color: 'var(--neon-pink)', fontFamily: 'var(--font-display)' }}>
          CRITICAL ERROR: TASK ID NOT FOUND
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'center' }}>
          This task cannot be retrieved from your current database state. Try returning to the dashboard and re-activating Focus.
        </p>
        <NeonButton variant="purple" onClick={handleExit}>Return to Dashboard</NeonButton>
      </div>
    );
  }

  // 4. Render main Rescue view and the Success Achievement overlay
  return (
    <>
      <RescueModeView
        task={task}
        rescuePlan={task.rescuePlan!}
        onStepComplete={handleStepComplete}
        onExit={handleExit}
      />

      {/* Holographic XP Success Modal Overlay */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(5, 5, 10, 0.92)', backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px',
            }}
          >
            {/* Confetti-like radial elements behind card */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
              {[...Array(24)].map((_, i) => {
                const angle = (i * 360) / 24;
                const radius = 100 + Math.random() * 250;
                const tx = Math.cos((angle * Math.PI) / 180) * radius;
                const ty = Math.sin((angle * Math.PI) / 180) * radius;
                return (
                  <motion.div
                    key={i}
                    initial={{ scale: 0.1, x: 0, y: 0, opacity: 1 }}
                    animate={{ scale: [0.1, 1, 0], x: tx, y: ty, opacity: [1, 1, 0] }}
                    transition={{ duration: 1.8, ease: 'easeOut', delay: 0.1 }}
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: i % 2 === 0 ? 'var(--neon-cyan)' : 'var(--neon-pink)',
                      boxShadow: i % 2 === 0 ? '0 0 10px var(--neon-cyan-glow)' : '0 0 10px var(--neon-pink-glow)',
                    }}
                  />
                );
              })}
            </div>

            <motion.div
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 20 }}
              style={{
                width: 'min(480px, 92vw)',
                background: 'rgba(10, 10, 22, 0.95)',
                border: '1px solid var(--neon-cyan)',
                borderRadius: 'var(--radius-xl)',
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 0 35px var(--neon-cyan-subtle)',
                position: 'relative',
              }}
            >
              {/* Spinning star background */}
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%',
                background: 'var(--neon-cyan-subtle)', border: '1px solid var(--neon-cyan)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', boxShadow: '0 0 25px var(--neon-cyan-glow)',
              }}>
                <Trophy size={42} style={{ color: 'var(--neon-cyan)' }} className="pulse-slow" />
              </div>

              <h2 style={{
                fontSize: 'var(--text-2xl)', fontWeight: 900, fontFamily: 'var(--font-display)',
                letterSpacing: '1.5px', color: 'var(--text-primary)', marginBottom: '8px',
              }}>
                RESCUE MISSION SUCCESS!
              </h2>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '32px' }}>
                TASK MARKED COMPLETED • OPTIMAL EFFICIENCY MET
              </p>

              {/* Reward stats banner */}
              <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex',
                justifyContent: 'center', alignItems: 'center', gap: '24px', marginBottom: '32px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={18} style={{ color: 'var(--neon-amber)' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>REWARD</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)' }}>+50 XP</div>
                  </div>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'var(--glass-border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} style={{ color: 'var(--neon-cyan)' }} />
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>BONUS</div>
                    <div style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>x1.5 CLUTCH</div>
                  </div>
                </div>
              </div>

              <NeonButton variant="cyan" fullWidth onClick={handleExit} icon={<ArrowRight size={14} />}>
                Return to Dashboard
              </NeonButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
