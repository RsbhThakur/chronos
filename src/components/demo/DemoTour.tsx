'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

interface TourStep {
  target: string;        // data-tour attribute value
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface DemoTourProps {
  isActive: boolean;
  onComplete: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: 'task-board',
    title: "📋 Task Board",
    description: "Your command center. Today's focus tasks are surfaced here — prioritized and ready to act on.",
    position: 'bottom',
  },
  {
    target: 'ai-guardian',
    title: "🤖 Chronos AI",
    description: "Your AI Time Guardian. Ask it anything — reschedule, decompose tasks, or get motivational nudges.",
    position: 'left',
  },
  {
    target: 'topbar-search-btn',
    title: "⌘K Command Palette",
    description: "Press Cmd+K (Ctrl+K on Windows) to search tasks, navigate pages, and run actions instantly.",
    position: 'bottom',
  },
  {
    target: 'topbar-notif-btn',
    title: "🔔 Notifications",
    description: "Deadline alerts, rescue mode triggers, and achievement unlocks appear here in real-time.",
    position: 'bottom',
  },
  {
    target: 'ai-chat-toggle',
    title: "💬 AI Chat",
    description: "Click to open the AI assistant panel. It adapts to your personality for the most helpful guidance.",
    position: 'left',
  },
  {
    target: 'topbar-menu-btn',
    title: "🧭 Navigation",
    description: "Access Dashboard, Tasks, Goals, Analytics, and Settings from the sidebar. You're all set!",
    position: 'bottom',
  },
];

const AUTO_ADVANCE_MS = 8000;

// Get center coords of a DOM element
const getElementRect = (target: string): DOMRect | null => {
  const el = document.querySelector(`[data-tour="${target}"]`);
  return el ? el.getBoundingClientRect() : null;
};

export const DemoTour: React.FC<DemoTourProps> = ({ isActive, onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[stepIdx];

  const updateRect = useCallback(() => {
    if (step) setRect(getElementRect(step.target));
  }, [step]);

  // Update rect on step change and window resize
  useEffect(() => {
    if (!isActive) return;
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, updateRect]);

  // Auto-advance
  useEffect(() => {
    if (!isActive) return;
    const id = setTimeout(() => {
      if (stepIdx < TOUR_STEPS.length - 1) setStepIdx((s) => s + 1);
      else onComplete();
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(id);
  }, [stepIdx, isActive, onComplete]);

  const next = () => {
    if (stepIdx < TOUR_STEPS.length - 1) setStepIdx((s) => s + 1);
    else onComplete();
  };

  if (!isActive) return null;

  // Compute tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const pos = step.position || 'bottom';
    const gap = 12;
    const w = 280;
    switch (pos) {
      case 'bottom': return { top: rect.bottom + gap, left: Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 16), width: w };
      case 'top':    return { bottom: window.innerHeight - rect.top + gap, left: Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 16), width: w };
      case 'left':   return { top: rect.top, right: window.innerWidth - rect.left + gap, width: w };
      case 'right':  return { top: rect.top, left: rect.right + gap, width: w };
      default:       return { top: rect.bottom + gap, left: rect.left, width: w };
    }
  };

  // Spotlight: cut-out rect around target element
  const spotlightPad = 8;
  const spotlightStyle = rect
    ? {
        borderRadius: '8px',
        top: rect.top - spotlightPad,
        left: rect.left - spotlightPad,
        width: rect.width + spotlightPad * 2,
        height: rect.height + spotlightPad * 2,
      }
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, pointerEvents: 'none' }}>
      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', pointerEvents: 'auto' }} onClick={onComplete} />

      {/* Spotlight cutout */}
      {spotlightStyle && (
        <motion.div
          key={step.target}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          style={{
            position: 'absolute',
            ...spotlightStyle,
            background: 'transparent',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65), 0 0 0 2px var(--neon-cyan)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepIdx}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          style={{
            position: 'fixed',
            ...getTooltipStyle(),
            background: 'rgba(10, 10, 22, 0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--neon-cyan)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 20px rgba(0,229,255,0.1)',
            pointerEvents: 'auto',
            zIndex: 2001,
          }}
        >
          {/* Step counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--neon-cyan)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Step {stepIdx + 1} / {TOUR_STEPS.length}
            </span>
            <button onClick={onComplete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, display: 'flex' }}>
              <X size={13} />
            </button>
          </div>

          <h3 style={{ margin: '0 0 6px', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{step.title}</h3>
          <p style={{ margin: '0 0 14px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.description}</p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: i <= stepIdx ? 'var(--neon-cyan)' : 'var(--bg-secondary)', transition: 'background 0.3s ease' }} />
            ))}
          </div>

          {/* Auto-advance bar */}
          <motion.div
            key={`progress-${stepIdx}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
            style={{ height: '2px', background: 'var(--neon-cyan)', borderRadius: '1px', marginBottom: '12px', opacity: 0.4 }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onComplete} style={{ flex: 1, background: 'none', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '7px', fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              Skip Tour
            </button>
            <button
              onClick={next}
              style={{ flex: 1, background: 'var(--neon-cyan)', border: 'none', borderRadius: 'var(--radius-md)', padding: '7px', fontSize: '11px', fontWeight: 700, color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            >
              {stepIdx < TOUR_STEPS.length - 1 ? <><span>Next</span><ChevronRight size={12} /></> : 'Finish! 🚀'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DemoTour;
