'use client';

import React, { useState, useEffect } from 'react';
import { Task, RescuePlan, RescueStep } from '@/types';
import { 
  Shield, 
  Zap, 
  Check, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Lock, 
  LogOut, 
  HelpCircle,
  TrendingDown
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';

interface RescueModeViewProps {
  task: Task;
  rescuePlan: RescuePlan;
  onStepComplete: (stepId: string, completed: boolean) => void;
  onExit: () => void;
}

export const RescueModeView: React.FC<RescueModeViewProps> = ({
  task,
  rescuePlan,
  onStepComplete,
  onExit,
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [sacrificesOpen, setSacrificesOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [timerPulse, setTimerPulse] = useState(false);

  // Initialize and tick countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = new Date(task.deadline).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [task.deadline]);

  // Expand the active step automatically
  const activeStep = rescuePlan.plan.find(s => !s.completed);
  useEffect(() => {
    if (activeStep) {
      setExpandedStepId(activeStep.id);
    }
  }, [activeStep?.id]);

  // Determine Countdown Timer Neon Glow Color
  const getTimerStyles = () => {
    const hours = timeLeft / 3600;
    if (timeLeft === 0) {
      return {
        color: 'var(--text-disabled)',
        glow: 'none',
        label: 'Deadline Passed',
        class: '',
      };
    }
    if (hours > 2) {
      return {
        color: 'var(--neon-green)',
        glow: '0 0 15px var(--neon-green-glow)',
        label: 'COMPRESS FOCUS ACTIVE',
        class: '',
      };
    }
    if (hours > 1) {
      return {
        color: 'var(--neon-amber)',
        glow: '0 0 15px var(--neon-amber-glow)',
        label: 'TIME CRITICAL',
        class: '',
      };
    }
    if (timeLeft < 15 * 60) {
      return {
        color: 'var(--neon-pink)',
        glow: '0 0 25px var(--neon-pink-glow)',
        label: 'EMERGENCY CRISIS PULSE',
        class: 'animate-rescue', // Pulsing anim in globals.css
      };
    }
    return {
      color: 'var(--neon-red)',
      glow: '0 0 20px rgba(239, 68, 68, 0.4)',
      label: 'MAX COMPRESSION',
      class: '',
    };
  };

  const timerStyle = getTimerStyles();

  // Helper to format remaining seconds into HH:MM:SS
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalSteps = rescuePlan.plan.length;
  const completedStepsCount = rescuePlan.plan.filter(s => s.completed).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedStepsCount / totalSteps) * 100) : 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      background: 'radial-gradient(circle at center, #0a0a14 0%, #05050a 100%)',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-body)',
      padding: '40px 20px',
      alignItems: 'center',
    }}>
      
      {/* Container wrapper for max width and structure */}
      <div style={{ width: '100%', maxWidth: '780px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Header Title Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--neon-pink-subtle)',
              border: '1px solid var(--neon-pink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px var(--neon-pink-glow)',
            }}>
              <Shield size={20} style={{ color: 'var(--neon-pink)' }} />
            </div>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>RESCUE MODULE</h2>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>MISSION FOR: {task.title.toUpperCase()}</p>
            </div>
          </div>
          
          <button 
            onClick={onExit}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.borderColor = 'var(--neon-pink)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
          >
            <LogOut size={13} />
            Exit Focus
          </button>
        </div>

        {/* Countdown Timer Widget */}
        <div style={{
          background: 'rgba(10, 10, 20, 0.5)',
          border: `1px solid ${timerStyle.color}44`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          textAlign: 'center',
          boxShadow: timerStyle.glow,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
        }} className={timerStyle.class}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', color: timerStyle.color, fontFamily: 'var(--font-display)' }}>
            {timerStyle.label}
          </div>
          <div style={{
            fontSize: 'var(--text-6xl)',
            fontWeight: 900,
            fontFamily: 'var(--font-display)',
            color: timerStyle.color,
            textShadow: timerStyle.glow,
            letterSpacing: '2px',
            lineHeight: 1.1,
          }}>
            {formatTime(timeLeft)}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
            Time remaining until deadline: <strong>{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>
          </p>
        </div>

        {/* Banner Alert for non-feasibility */}
        {!rescuePlan.feasible && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.05)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <AlertTriangle size={18} style={{ color: 'var(--neon-amber)', flexShrink: 0 }} />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--neon-amber)' }}>Tight Deadline Alert:</strong> This plan is highly compressed. Standard timelines suggest more block allocation, but Chronos generated this as the absolute optimal path. Focus up!
            </p>
          </div>
        )}

        {/* Level Progress Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            <span>COMPRESSION PLAN PROGRESS</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--neon-cyan)' }}>{progressPercent}% COMPLETE</span>
          </div>
          <div style={{
            height: '10px',
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--glass-border)',
            overflow: 'hidden',
          }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--neon-cyan) 0%, var(--neon-pink) 100%)',
                boxShadow: '0 0 10px var(--neon-cyan-glow)',
                borderRadius: 'var(--radius-full)',
              }}
            />
          </div>
        </div>

        {/* Core Step List Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} style={{ color: 'var(--neon-pink)' }} />
            STEP ACCELERATORS
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rescuePlan.plan.map((step, idx) => {
              const isCurrent = activeStep?.id === step.id;
              const isCompleted = step.completed;
              const isUpcoming = !isCurrent && !isCompleted;
              const isOpen = expandedStepId === step.id;

              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  
                  {/* Inline Checkpoint Milestones Trigger */}
                  {idx > 0 && rescuePlan.checkpoints[idx - 1] && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '4px 20px',
                      margin: '4px 0',
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isCompleted ? 'var(--neon-green)' : 'var(--text-disabled)' }} />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: isCompleted ? 'var(--neon-green)' : 'var(--text-tertiary)', letterSpacing: '0.5px' }}>
                        MILESTONE: {rescuePlan.checkpoints[idx - 1].milestone.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Step Row Card */}
                  <div style={{
                    background: isCurrent 
                      ? 'rgba(0, 229, 255, 0.03)' 
                      : isCompleted 
                        ? 'rgba(34, 197, 94, 0.02)' 
                        : 'rgba(255, 255, 255, 0.01)',
                    border: `1px solid ${
                      isCurrent 
                        ? 'var(--neon-cyan)' 
                        : isCompleted 
                          ? 'rgba(34, 197, 94, 0.3)' 
                          : 'var(--glass-border)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    opacity: isUpcoming ? 0.45 : 1,
                    boxShadow: isCurrent ? '0 0 15px var(--neon-cyan-subtle)' : 'none',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}>
                    {/* Upper Step Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isUpcoming ? 'default' : 'pointer' }}
                         onClick={() => {
                           if (!isUpcoming) {
                             setExpandedStepId(isOpen ? null : step.id);
                           }
                         }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        {/* Status Icon Indicator */}
                        <div style={{ flexShrink: 0 }}>
                          {isCompleted ? (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--neon-green-subtle)',
                              border: '1px solid var(--neon-green)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Check size={14} style={{ color: 'var(--neon-green)' }} />
                            </div>
                          ) : isCurrent ? (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--neon-cyan-subtle)',
                              border: '1px solid var(--neon-cyan)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                            }}>
                              <Clock size={13} style={{ color: 'var(--neon-cyan)' }} className="spin-slow" />
                              <span style={{
                                position: 'absolute',
                                width: '6px',
                                height: '6px',
                                background: 'var(--neon-cyan)',
                                borderRadius: '50%',
                                top: '-2px',
                                right: '-2px',
                                animation: 'pulse-neon 1s infinite',
                              }} />
                            </div>
                          ) : (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid var(--text-disabled)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              <Lock size={12} style={{ color: 'var(--text-disabled)' }} />
                            </div>
                          )}
                        </div>

                        {/* Title and details */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: isCurrent ? 700 : 500,
                            color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}>
                            {step.action}
                          </span>
                          <span style={{ fontSize: '10px', color: isCurrent ? 'var(--neon-cyan)' : 'var(--text-tertiary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            ALLOCATED: {step.timeBlock} ({step.estimatedMinutes} MINS)
                          </span>
                        </div>
                      </div>

                      {/* Accordion Expand Icon */}
                      {!isUpcoming && (
                        <div>
                          {isOpen ? <ChevronUp size={15} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-tertiary)' }} />}
                        </div>
                      )}
                    </div>

                    {/* Step Body Accordion Expansion */}
                    {isOpen && (
                      <div style={{
                        borderTop: '1px solid var(--glass-border)',
                        paddingTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-secondary)',
                      }}>
                        {/* Tips panel */}
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--neon-cyan)', lineHeight: 1.4 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Sparkles size={11} style={{ color: 'var(--neon-cyan)' }} />
                            CHRONOS EXPERT STRATEGY
                          </div>
                          {step.tips}
                        </div>

                        {/* Step action footer details */}
                        {isCurrent && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <NeonButton 
                              variant="cyan" 
                              size="sm" 
                              onClick={() => onStepComplete(step.id, true)}
                              style={{ flex: 1, padding: '10px' }}
                            >
                              <Check size={14} /> I'm done with this step
                            </NeonButton>

                            {step.canBeSkipped && (
                              <button 
                                onClick={() => onStepComplete(step.id, true)} // Complete step to skip it
                                style={{
                                  background: 'rgba(236,72,153,0.05)',
                                  border: '1px solid rgba(236,72,153,0.2)',
                                  borderRadius: 'var(--radius-md)',
                                  padding: '0 16px',
                                  color: 'var(--neon-pink)',
                                  fontSize: 'var(--text-xs)',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236,72,153,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(236,72,153,0.05)'}
                              >
                                Skip Step
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Motivational Message Panel */}
        <div style={{
          background: 'rgba(168, 85, 247, 0.02)',
          border: '1px solid rgba(168, 85, 247, 0.15)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          <Sparkles size={18} style={{ color: 'var(--neon-purple)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--neon-purple)', fontWeight: 700, letterSpacing: '1px', marginBottom: '2px' }}>ACCOUNTABILITY GUARD ADVICE</div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, lineHeight: 1.4 }}>
              "{rescuePlan.motivationalMessage}"
            </p>
          </div>
        </div>

        {/* Collapsible Sacrifices panel */}
        {rescuePlan.sacrifices && rescuePlan.sacrifices.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => setSacrificesOpen(!sacrificesOpen)}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: 0,
                width: 'fit-content',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <TrendingDown size={13} style={{ color: 'var(--neon-pink)' }} />
              {sacrificesOpen ? 'COLLAPSE PLAN SACRIFICES' : 'VIEW DETERMINED PLAN SACRIFICES'} ({rescuePlan.sacrifices.length})
              {sacrificesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            <AnimatePresence>
              {sacrificesOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 600 }}>
                      The AI Rescue Agent recommends skipping or downscaling these items to meet your deadline:
                    </p>
                    {rescuePlan.sacrifices.map((sacrifice, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                        <span style={{ color: 'var(--neon-pink)' }}>•</span>
                        <span>{sacrifice}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Text link at bottom */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button 
            onClick={onExit}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-tertiary)',
              textDecoration: 'underline',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-pink)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >
            Exit Rescue Mode (Go back to Dashboard)
          </button>
        </div>

      </div>
    </div>
  );
};
