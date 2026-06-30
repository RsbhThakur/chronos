'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Color Maps ──────────────────────────────────────────────────────────────
const typeConfig: Record<ToastType, { color: string; bg: string; Icon: React.FC<{ size: number }> }> = {
  info:    { color: 'var(--neon-cyan)',   bg: 'rgba(0, 229, 255, 0.08)',   Icon: Info           },
  success: { color: 'var(--neon-green)',  bg: 'rgba(34, 197, 94, 0.08)',   Icon: CheckCircle2   },
  warning: { color: 'var(--neon-amber)',  bg: 'rgba(245, 158, 11, 0.08)',  Icon: AlertTriangle  },
  error:   { color: 'var(--neon-pink)',   bg: 'rgba(236, 72, 153, 0.08)',  Icon: AlertCircle    },
};

// ─── Single Toast ─────────────────────────────────────────────────────────────
const Toast: React.FC<{ toast: ToastItem; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const { color, bg, Icon } = typeConfig[toast.type];
  const [progress, setProgress] = React.useState(100);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    const step = 100 / (toast.duration / 50);
    intervalRef.current = setInterval(() => {
      setProgress((p) => Math.max(0, p - step));
    }, 50);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [toast.id, toast.duration]);

  React.useEffect(() => {
    if (progress <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onDismiss(toast.id);
    }
  }, [progress, toast.id, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        position: 'relative',
        background: 'rgba(14, 14, 24, 0.96)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${color}40`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        minWidth: '300px',
        maxWidth: '400px',
        overflow: 'hidden',
        boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 16px ${color}15`,
      }}
    >
      {/* Content */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ color, flexShrink: 0, marginTop: '1px', display: 'flex' }}><Icon size={16} /></div>
        <p style={{ flex: 1, margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {toast.message}
        </p>
        <button
          onClick={() => onDismiss(toast.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Action */}
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss(toast.id); }}
          style={{ marginTop: '8px', background: 'none', border: 'none', cursor: 'pointer', color, fontSize: 'var(--text-xs)', fontWeight: 600, padding: 0 }}
        >
          {toast.action.label} →
        </button>
      )}

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--bg-secondary)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: color, transition: 'width 50ms linear' }} />
      </div>
    </motion.div>
  );
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [
      ...prev,
      { ...options, id, type: options.type ?? 'info', duration: options.duration ?? 4000 },
    ]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div style={{ position: 'fixed', top: '72px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: 'auto' }}>
              <Toast toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastProvider;
