'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught client-side rendering exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          background: 'radial-gradient(circle at center, #0f0a18 0%, #05050a 100%)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display), system-ui, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}>
          {/* Glass Card Fallback Panel */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 0, 128, 0.15)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 0 30px rgba(255, 0, 128, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}>
            {/* Pulsing neon failure icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 0, 128, 0.1)',
              border: '1px solid var(--neon-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 0, 128, 0.25)',
              animation: 'pulse-neon 2s infinite',
            }}>
              <AlertOctagon size={32} style={{ color: 'var(--neon-pink)' }} />
            </div>

            <div>
              <h2 style={{
                margin: '0 0 8px',
                fontSize: '20px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                textTransform: 'uppercase',
              }}>
                Chronos Collision
              </h2>
              <p style={{
                margin: 0,
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                lineHeight: 1.6,
              }}>
                A rendering exception occurred in your current viewport. Rest assured, your data is safe and the guardian is active.
              </p>
            </div>

            {/* Error log snippet */}
            {this.state.error && (
              <div style={{
                width: '100%',
                background: 'rgba(5, 5, 10, 0.5)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                textAlign: 'left',
                overflowX: 'auto',
                fontSize: '10px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: 'var(--neon-pink)',
                lineHeight: 1.4,
                maxHeight: '100px',
              }}>
                {this.state.error.name}: {this.state.error.message}
              </div>
            )}

            {/* Recovery / Reset Button */}
            <button
              onClick={this.handleReset}
              style={{
                background: 'rgba(255, 0, 128, 0.12)',
                border: '1px solid var(--neon-pink)',
                color: 'var(--neon-pink)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 24px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 0 10px rgba(255, 0, 128, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 128, 0.2)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 128, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 128, 0.12)';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 0, 128, 0.1)';
              }}
            >
              <RotateCcw size={14} />
              Restore Guardian
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
