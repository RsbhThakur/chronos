'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDemo } from '@/hooks/useDemo';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { UserMode, WorkStyle, MotivationType, CommunicationStyle, NotificationChannel } from '@/types';
import { User, Brain, Zap, Bell, Database, Link2, ChevronRight, Check, X, Download } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';

type Section = 'profile' | 'personality' | 'features' | 'integrations' | 'notifications' | 'data';

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',        icon: <User size={14} /> },
  { id: 'personality',   label: 'Personality',    icon: <Brain size={14} /> },
  { id: 'features',      label: 'Features',       icon: <Zap size={14} /> },
  { id: 'integrations',  label: 'Integrations',   icon: <Link2 size={14} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={14} /> },
  { id: 'data',          label: 'Data & Privacy', icon: <Database size={14} /> },
];

// Toggle component
const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void; color?: string }> = ({ enabled, onChange, color = 'var(--neon-cyan)' }) => (
  <div
    onClick={() => onChange(!enabled)}
    style={{ width: '40px', height: '22px', borderRadius: '11px', background: enabled ? color : 'var(--bg-secondary)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0, border: `1px solid ${enabled ? color : 'var(--glass-border)'}` }}
  >
    <div style={{ position: 'absolute', top: '2px', left: enabled ? '20px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: enabled ? '#000' : 'var(--text-tertiary)', transition: 'left 0.2s ease' }} />
  </div>
);

const SettingRow: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', gap: '12px' }}>
    <div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
      {description && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>{description}</div>}
    </div>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { isDemo } = useDemo();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [gmailConnected, setGmailConnected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem('chronos_gmail_connected');
      if (persisted !== null) {
        setGmailConnected(persisted === 'true');
      } else {
        setGmailConnected(!!user);
      }
    }
  }, [user]);

  const handleConnectGmail = () => {
    if (gmailConnected) {
      setGmailConnected(false);
      localStorage.setItem('chronos_gmail_connected', 'false');
      showToast({ type: 'info', message: 'Gmail integration disconnected.' });
    } else {
      showToast({ type: 'info', message: 'Connecting to Gmail via Google OAuth...' });
      setTimeout(() => {
        setGmailConnected(true);
        localStorage.setItem('chronos_gmail_connected', 'true');
        showToast({ type: 'success', message: 'Gmail connected successfully! Automated task extraction is now active.' });
      }, 1200);
    }
  };

  // Feature toggles state
  const [features, setFeatures] = useState({
    ghostWorker:   true,
    gamification:  true,
    rescueMode:    true,
    voice:         false,
    cameraScam:    false,
  });

  const [notifs, setNotifs] = useState({
    push:  false,
    email: true,
    inApp: true,
    timing: '2h',
  });

  // Sync state with user profile once loaded
  useEffect(() => {
    if (user) {
      setFeatures({
        ghostWorker:   user.preferences?.ghostWorkerEnabled   ?? true,
        gamification:  user.preferences?.gamificationEnabled  ?? true,
        rescueMode:    user.preferences?.rescueModeEnabled    ?? true,
        voice:         user.preferences?.voiceEnabled         ?? false,
        cameraScam:    localStorage.getItem('chronos_camera_scan_enabled') === 'true',
      });

      const channels = user.preferences?.notificationChannels || [];
      setNotifs({
        push:  channels.includes('push'),
        email: channels.includes('email'),
        inApp: channels.includes('inApp'),
        timing: localStorage.getItem('chronos_alert_timing') || '2h',
      });
    }
  }, [user]);

  const updateFeatureSetting = async (key: keyof typeof features, val: boolean) => {
    // 1. Update local UI state immediately
    setFeatures((f) => ({ ...f, [key]: val }));

    if (key === 'cameraScam') {
      localStorage.setItem('chronos_camera_scan_enabled', val ? 'true' : 'false');
      showToast({ type: 'success', message: 'Camera Scan setting auto-saved.' });
      return;
    }

    // 2. Prepare new preferences payload
    const mapKey: Record<string, string> = {
      ghostWorker: 'ghostWorkerEnabled',
      gamification: 'gamificationEnabled',
      rescueMode: 'rescueModeEnabled',
      voice: 'voiceEnabled',
    };
    const prefKey = mapKey[key];
    if (!prefKey) return;

    const currentPreferences = user?.preferences || {
      gamificationEnabled: true,
      ghostWorkerEnabled: false,
      rescueModeEnabled: false,
      voiceEnabled: false,
      notificationChannels: [],
    };

    const updatedPreferences = {
      ...currentPreferences,
      [prefKey]: val,
    };

    if (!isDemo && user?.id) {
      try {
        const docRef = doc(clientDb, 'users', user.id);
        await updateDoc(docRef, {
          preferences: updatedPreferences,
        });
        showToast({ type: 'success', message: 'Settings auto-saved.' });
      } catch (err) {
        console.error('Failed to auto-save preference:', err);
        showToast({ type: 'error', message: 'Failed to auto-save changes.' });
      }
    } else {
      showToast({ type: 'success', message: 'Settings saved (Demo Mode).' });
    }
  };

  const updateNotificationSetting = async (key: 'push' | 'email' | 'inApp' | 'timing', val: any) => {
    // 1. Update local UI state immediately
    let newNotifs = { ...notifs };
    if (key === 'timing') {
      newNotifs.timing = val;
      localStorage.setItem('chronos_alert_timing', val);
    } else {
      newNotifs[key] = val;
    }
    setNotifs(newNotifs);

    if (key === 'timing') {
      showToast({ type: 'success', message: 'Alert timing auto-saved.' });
      return;
    }

    // 2. Build channels list
    const channels: NotificationChannel[] = [];
    if (newNotifs.push) channels.push('push');
    if (newNotifs.email) channels.push('email');
    if (newNotifs.inApp) channels.push('inApp');

    const currentPreferences = user?.preferences || {
      gamificationEnabled: true,
      ghostWorkerEnabled: false,
      rescueModeEnabled: false,
      voiceEnabled: false,
      notificationChannels: [],
    };

    const updatedPreferences = {
      ...currentPreferences,
      notificationChannels: channels,
    };

    if (!isDemo && user?.id) {
      try {
        const docRef = doc(clientDb, 'users', user.id);
        await updateDoc(docRef, {
          preferences: updatedPreferences,
        });
        showToast({ type: 'success', message: 'Notification channels auto-saved.' });
      } catch (err) {
        console.error('Failed to auto-save notification channels:', err);
        showToast({ type: 'error', message: 'Failed to auto-save notification settings.' });
      }
    } else {
      showToast({ type: 'success', message: 'Notification settings saved (Demo Mode).' });
    }
  };

  const updatePersonalitySetting = async (key: 'workStyle' | 'motivationType' | 'communicationStyle', val: any) => {
    if (!user) return;

    const currentPersonality = user.personality || {
      workStyle: 'sprinter',
      motivationType: 'encouragement',
      communicationStyle: 'casual',
      timezone: 'UTC',
      peakHours: [],
    };

    const updatedPersonality = {
      ...currentPersonality,
      [key]: val,
    };

    if (!isDemo && user.id) {
      try {
        const docRef = doc(clientDb, 'users', user.id);
        await updateDoc(docRef, {
          personality: updatedPersonality,
        });
        showToast({ type: 'success', message: 'Personality profile auto-saved!' });
      } catch (err) {
        console.error('Failed to auto-save personality profile:', err);
        showToast({ type: 'error', message: 'Failed to save personality change.' });
      }
    } else {
      showToast({ type: 'success', message: `Personality profile updated in Demo Mode!` });
    }
  };

  const exportData = () => {
    const data = { user, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'chronos-data.json'; a.click();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', message: 'Data exported!' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--neon-cyan)' }} />
              ) : (
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,229,255,0.15)', border: '2px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {(user?.displayName || 'U')[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.displayName || 'Anonymous'}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{user?.email || 'demo@chronos.ai'}</div>
                {isDemo && <span className="badge badge--purple" style={{ fontSize: '9px', marginTop: '4px', display: 'inline-block' }}>DEMO</span>}
              </div>
            </div>
            <SettingRow label="Mode" description="Your productivity persona">
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['student', 'professional', 'entrepreneur'] as UserMode[]).map((m) => (
                  <span key={m} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${user?.mode === m ? 'var(--neon-cyan)' : 'var(--glass-border)'}`, color: user?.mode === m ? 'var(--neon-cyan)' : 'var(--text-tertiary)', textTransform: 'capitalize', cursor: 'default' }}>{m}</span>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Sign Out" description="End your current session">
              <NeonButton variant="pink" size="sm" onClick={signOut}>Sign Out</NeonButton>
            </SettingRow>
          </div>
        );

      case 'personality':
        return (
          <div>
            <SettingRow label="Work Style" description="How you approach tasks">
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['sprinter', 'marathoner', 'mixed'] as WorkStyle[]).map((s) => (
                  <span key={s} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${user?.personality?.workStyle === s ? 'var(--neon-purple)' : 'var(--glass-border)'}`, color: user?.personality?.workStyle === s ? 'var(--neon-purple)' : 'var(--text-tertiary)', textTransform: 'capitalize', cursor: 'default' }}>{s}</span>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Motivation Type" description="What drives you">
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['encouragement', 'pressure', 'data-driven'] as MotivationType[]).map((m) => (
                  <span key={m} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${user?.personality?.motivationType === m ? 'var(--neon-amber)' : 'var(--glass-border)'}`, color: user?.personality?.motivationType === m ? 'var(--neon-amber)' : 'var(--text-tertiary)', textTransform: 'capitalize', cursor: 'default' }}>{m}</span>
                ))}
              </div>
            </SettingRow>
            <SettingRow label="Communication Style" description="How Chronos talks to you">
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['casual', 'professional', 'minimal'] as CommunicationStyle[]).map((c) => (
                  <span key={c} style={{ fontSize: '10px', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: `1px solid ${user?.personality?.communicationStyle === c ? 'var(--neon-pink)' : 'var(--glass-border)'}`, color: user?.personality?.communicationStyle === c ? 'var(--neon-pink)' : 'var(--text-tertiary)', textTransform: 'capitalize', cursor: 'default' }}>{c}</span>
                ))}
              </div>
            </SettingRow>
            <div style={{ marginTop: '20px' }}>
              <NeonButton variant="purple" size="sm" onClick={() => showToast({ type: 'info', message: 'Retake quiz coming soon!' })}>Retake Personality Quiz</NeonButton>
            </div>
          </div>
        );

      case 'features':
        return (
          <div>
            <SettingRow label="Ghost Worker" description="AI completes tasks on your behalf (emails, docs)">
              <Toggle enabled={features.ghostWorker} onChange={(v) => updateFeature('ghostWorker', v)} color="var(--neon-cyan)" />
            </SettingRow>
            <SettingRow label="Gamification" description="XP, levels, streaks, and badges">
              <Toggle enabled={features.gamification} onChange={(v) => updateFeature('gamification', v)} color="var(--neon-purple)" />
            </SettingRow>
            <SettingRow label="Rescue Mode" description="Emergency planning for approaching deadlines">
              <Toggle enabled={features.rescueMode} onChange={(v) => updateFeature('rescueMode', v)} color="var(--neon-pink)" />
            </SettingRow>
            <SettingRow label="Voice Assistant" description="Control Chronos with your voice">
              <Toggle enabled={features.voice} onChange={(v) => updateFeature('voice', v)} color="var(--neon-green)" />
            </SettingRow>
            <SettingRow label="Camera Scan" description="Scan documents and whiteboards">
              <Toggle enabled={features.cameraScam} onChange={(v) => updateFeature('cameraScam', v)} color="var(--neon-amber)" />
            </SettingRow>
          </div>
        );

      case 'integrations':
        return (
          <div>
            <SettingRow label="Google Calendar" description={user ? 'Connected via Google OAuth' : 'Not connected'}>
              <NeonButton variant={user ? 'green' : 'cyan'} size="sm" onClick={() => showToast({ type: 'info', message: 'Calendar sync available after Google sign-in.' })}>
                {user ? 'Connected' : 'Connect'}
              </NeonButton>
            </SettingRow>
            <SettingRow label="Gmail" description={gmailConnected ? 'Connected to read emails and extract tasks automatically' : 'Read emails to extract tasks automatically'}>
              <NeonButton variant={gmailConnected ? 'green' : 'cyan'} size="sm" onClick={handleConnectGmail}>
                {gmailConnected ? 'Connected' : 'Connect'}
              </NeonButton>
            </SettingRow>
          </div>
        );

      case 'notifications':
        return (
          <div>
            <SettingRow label="Push Notifications" description="Browser push alerts for deadlines">
              <Toggle enabled={notifs.push} onChange={(v) => setNotifs((n) => ({ ...n, push: v }))} />
            </SettingRow>
            <SettingRow label="Email Notifications" description="Get deadline reminders via email">
              <Toggle enabled={notifs.email} onChange={(v) => setNotifs((n) => ({ ...n, email: v }))} />
            </SettingRow>
            <SettingRow label="In-App Notifications" description="Toast and bell notifications inside Chronos">
              <Toggle enabled={notifs.inApp} onChange={(v) => setNotifs((n) => ({ ...n, inApp: v }))} />
            </SettingRow>
            <SettingRow label="Alert Timing" description="How far before deadline to notify you">
              <select value={notifs.timing} onChange={(e) => setNotifs((n) => ({ ...n, timing: e.target.value }))} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', color: 'var(--text-primary)', fontSize: 'var(--text-xs)', outline: 'none', cursor: 'pointer' }}>
                <option value="1h" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>1 hour before</option>
                <option value="2h" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>2 hours before</option>
                <option value="6h" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>6 hours before</option>
                <option value="24h" style={{ background: '#0a0a14', color: 'var(--text-primary)' }}>24 hours before</option>
              </select>
            </SettingRow>
          </div>
        );

      case 'data':
        return (
          <div>
            <SettingRow label="Export Data" description="Download all your data as JSON">
              <NeonButton variant="cyan" size="sm" icon={<Download size={13} />} onClick={exportData}>Export</NeonButton>
            </SettingRow>
            <SettingRow label="Delete Account" description="Permanently remove all data — this cannot be undone">
              {showDeleteConfirm ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <NeonButton variant="pink" size="sm" onClick={() => { showToast({ type: 'error', message: 'Account deletion requires server confirmation.' }); setShowDeleteConfirm(false); }}>
                    Confirm Delete
                  </NeonButton>
                  <NeonButton variant="purple" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</NeonButton>
                </div>
              ) : (
                <NeonButton variant="pink" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete Account</NeonButton>
              )}
            </SettingRow>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar nav */}
      <div style={{ width: '200px', flexShrink: 0, borderRight: '1px solid var(--glass-border)', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {sections.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: 'none', background: activeSection === id ? 'rgba(0,229,255,0.08)' : 'transparent', color: activeSection === id ? 'var(--neon-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: activeSection === id ? 600 : 400, textAlign: 'left', width: '100%', borderLeft: `2px solid ${activeSection === id ? 'var(--neon-cyan)' : 'transparent'}`, transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { if (activeSection !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { if (activeSection !== id) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ flexShrink: 0 }}>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px', paddingBottom: '90px' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
          {sections.find((s) => s.id === activeSection)?.label}
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Manage your {sections.find((s) => s.id === activeSection)?.label.toLowerCase()} settings
        </p>
        <GlassCard padding="md" hoverable={false}>
          {renderSection()}
        </GlassCard>
      </div>
    </div>
  );
}
