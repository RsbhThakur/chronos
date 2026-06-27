'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, GraduationCap, Briefcase, Rocket, Zap, Clock, Shuffle, Star, Flame, BarChart3, Smile, ClipboardList, Volume2, Shield, Trophy, Ghost } from 'lucide-react';
import { UserProfile, UserMode, WorkStyle, MotivationType, CommunicationStyle } from '@/types';

interface PersonalityQuizProps {
  onComplete: (profile: Partial<UserProfile>) => void;
}

type Answers = {
  mode?: UserMode;
  workStyle?: WorkStyle;
  motivationType?: MotivationType;
  communicationStyle?: CommunicationStyle;
  features?: Record<string, boolean>;
};

// Step option card
const OptionCard: React.FC<{ icon: React.ReactNode; label: string; description: string; selected: boolean; onClick: () => void }> = ({ icon, label, description, selected, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px',
      background: selected ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${selected ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
      borderRadius: 'var(--radius-lg)', cursor: 'pointer',
      boxShadow: selected ? '0 0 16px rgba(0,229,255,0.1)' : 'none',
      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
    }}
  >
    <div style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: selected ? 'var(--neon-cyan)' : 'var(--text-primary)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{description}</div>
    </div>
    {selected && (
      <div style={{ marginLeft: 'auto', width: '20px', height: '20px', borderRadius: '50%', background: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: '#000', fontSize: '12px', fontWeight: 900 }}>✓</span>
      </div>
    )}
  </motion.div>
);

// Feature toggle card
const FeatureCard: React.FC<{ icon: React.ReactNode; label: string; description: string; enabled: boolean; onToggle: () => void }> = ({ icon, label, description, enabled, onToggle }) => (
  <div
    onClick={onToggle}
    style={{
      display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
      background: enabled ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${enabled ? 'rgba(0,229,255,0.3)' : 'var(--glass-border)'}`,
      borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s ease',
    }}
  >
    <div style={{ fontSize: '20px' }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{description}</div>
    </div>
    <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: enabled ? 'var(--neon-cyan)' : 'var(--bg-secondary)', position: 'relative', flexShrink: 0, transition: 'background 0.2s', border: `1px solid ${enabled ? 'var(--neon-cyan)' : 'var(--glass-border)'}` }}>
      <div style={{ position: 'absolute', top: '2px', left: enabled ? '17px' : '2px', width: '14px', height: '14px', borderRadius: '50%', background: enabled ? '#000' : 'var(--text-tertiary)', transition: 'left 0.2s ease' }} />
    </div>
  </div>
);

const STEPS = ['welcome', 'mode', 'workStyle', 'motivation', 'communication', 'features'] as const;

export const PersonalityQuiz: React.FC<PersonalityQuizProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [features, setFeatures] = useState({ ghostWorker: true, gamification: true, rescueMode: true, voice: true });

  const totalSteps = STEPS.length;
  const currentStep = STEPS[step];

  const advance = () => {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else {
      onComplete({
        mode: answers.mode,
        personality: {
          workStyle: answers.workStyle || 'mixed',
          motivationType: answers.motivationType || 'encouragement',
          communicationStyle: answers.communicationStyle || 'casual',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          peakHours: [9, 10, 11, 14, 15, 16],
        },
        preferences: {
          gamificationEnabled: features.gamification,
          ghostWorkerEnabled: features.ghostWorker,
          rescueModeEnabled: features.rescueMode,
          voiceEnabled: features.voice,
          notificationChannels: ['inApp'],
        },
        onboardingCompleted: true,
      });
    }
  };

  const canAdvance = () => {
    if (currentStep === 'welcome' || currentStep === 'features') return true;
    if (currentStep === 'mode') return !!answers.mode;
    if (currentStep === 'workStyle') return !!answers.workStyle;
    if (currentStep === 'motivation') return !!answers.motivationType;
    if (currentStep === 'communication') return !!answers.communicationStyle;
    return false;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
              <div className="neon-text-cyan font-display" style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '4px', marginBottom: '16px' }}>CHRONOS</div>
            </motion.div>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)', margin: '0 0 8px', fontWeight: 600 }}>Welcome to Chronos.</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>Let me get to know you so I can become your perfect AI Time Guardian.</p>
          </div>
        );

      case 'mode':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <OptionCard icon={<GraduationCap />} label="🎓 Student" description="I'm managing coursework, exams, and projects" selected={answers.mode === 'student'} onClick={() => setAnswers((a) => ({ ...a, mode: 'student' }))} />
            <OptionCard icon={<Briefcase />} label="💼 Professional" description="I'm managing work projects, meetings, and deliverables" selected={answers.mode === 'professional'} onClick={() => setAnswers((a) => ({ ...a, mode: 'professional' }))} />
            <OptionCard icon={<Rocket />} label="🚀 Entrepreneur" description="I'm building something and juggling everything" selected={answers.mode === 'entrepreneur'} onClick={() => setAnswers((a) => ({ ...a, mode: 'entrepreneur' }))} />
          </div>
        );

      case 'workStyle':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <OptionCard icon={<Zap />} label="⚡ Sprinter" description="Intense bursts of focus, then rest" selected={answers.workStyle === 'sprinter'} onClick={() => setAnswers((a) => ({ ...a, workStyle: 'sprinter' }))} />
            <OptionCard icon={<Clock />} label="🏃 Marathoner" description="Steady, consistent progress throughout the day" selected={answers.workStyle === 'marathoner'} onClick={() => setAnswers((a) => ({ ...a, workStyle: 'marathoner' }))} />
            <OptionCard icon={<Shuffle />} label="🔄 Mixed" description="Depends on the task and my mood" selected={answers.workStyle === 'mixed'} onClick={() => setAnswers((a) => ({ ...a, workStyle: 'mixed' }))} />
          </div>
        );

      case 'motivation':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <OptionCard icon={<Star />} label="🌟 Encouragement" description="Positive vibes and celebration of wins" selected={answers.motivationType === 'encouragement'} onClick={() => setAnswers((a) => ({ ...a, motivationType: 'encouragement' }))} />
            <OptionCard icon={<Flame />} label="🔥 Pressure" description="Urgency and a kick in the right direction" selected={answers.motivationType === 'pressure'} onClick={() => setAnswers((a) => ({ ...a, motivationType: 'pressure' }))} />
            <OptionCard icon={<BarChart3 />} label="📊 Data" description="Numbers, stats, and objective analysis" selected={answers.motivationType === 'data-driven'} onClick={() => setAnswers((a) => ({ ...a, motivationType: 'data-driven' }))} />
          </div>
        );

      case 'communication':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <OptionCard icon={<Smile />} label="😊 Casual" description="Like a friend — relaxed and fun" selected={answers.communicationStyle === 'casual'} onClick={() => setAnswers((a) => ({ ...a, communicationStyle: 'casual' }))} />
            <OptionCard icon={<ClipboardList />} label="📋 Professional" description="Keep it structured and business-like" selected={answers.communicationStyle === 'professional'} onClick={() => setAnswers((a) => ({ ...a, communicationStyle: 'professional' }))} />
            <OptionCard icon={<Zap />} label="⚡ Minimal" description="Just the essentials, no fluff" selected={answers.communicationStyle === 'minimal'} onClick={() => setAnswers((a) => ({ ...a, communicationStyle: 'minimal' }))} />
          </div>
        );

      case 'features':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <FeatureCard icon={<Ghost size={20} />} label="Ghost Worker" description="AI completes tasks on your behalf" enabled={features.ghostWorker} onToggle={() => setFeatures((f) => ({ ...f, ghostWorker: !f.ghostWorker }))} />
            <FeatureCard icon={<Trophy size={20} />} label="Gamification" description="XP, levels, streaks, and achievements" enabled={features.gamification} onToggle={() => setFeatures((f) => ({ ...f, gamification: !f.gamification }))} />
            <FeatureCard icon={<Shield size={20} />} label="Rescue Mode" description="Emergency planning for tight deadlines" enabled={features.rescueMode} onToggle={() => setFeatures((f) => ({ ...f, rescueMode: !f.rescueMode }))} />
            <FeatureCard icon={<Volume2 size={20} />} label="Voice Assistant" description="Control Chronos with your voice" enabled={features.voice} onToggle={() => setFeatures((f) => ({ ...f, voice: !f.voice }))} />
          </div>
        );
    }
  };

  const stepTitles: Record<typeof STEPS[number], string> = {
    welcome:       '',
    mode:          'Who are you?',
    workStyle:     'How do you work best?',
    motivation:    'What gets you going?',
    communication: 'How should I talk to you?',
    features:      'Which features do you want?',
  };

  return (
    <div style={{ width: '100%', maxWidth: '520px', margin: '0 auto' }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '32px' }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ width: i === step ? '24px' : '8px', height: '8px', borderRadius: '4px', background: i <= step ? 'var(--neon-cyan)' : 'var(--bg-secondary)', transition: 'all 0.3s ease' }} />
        ))}
      </div>

      {/* Title */}
      {stepTitles[currentStep] && (
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', textAlign: 'center' }}>
          {stepTitles[currentStep]}
        </h2>
      )}

      {/* Step content with slide animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Continue button */}
      <motion.button
        onClick={advance}
        disabled={!canAdvance()}
        whileHover={canAdvance() ? { scale: 1.02 } : {}}
        whileTap={canAdvance() ? { scale: 0.98 } : {}}
        style={{
          marginTop: '28px', width: '100%', padding: '14px',
          background: canAdvance() ? 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))' : 'var(--bg-secondary)',
          border: 'none', borderRadius: 'var(--radius-lg)',
          color: canAdvance() ? '#000' : 'var(--text-tertiary)',
          fontSize: 'var(--text-sm)', fontWeight: 700, cursor: canAdvance() ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontFamily: 'inherit', transition: 'opacity 0.2s ease',
          opacity: canAdvance() ? 1 : 0.5,
        }}
      >
        {step === totalSteps - 1 ? 'Launch Chronos 🚀' : 'Continue'}
        {step < totalSteps - 1 && <ChevronRight size={16} />}
      </motion.button>
    </div>
  );
};

export default PersonalityQuiz;
