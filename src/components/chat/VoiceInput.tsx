'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

interface VoiceInputProps {
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onTranscript: (text: string) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  isActive,
  onActivate,
  onDeactivate,
  onTranscript,
}) => {
  const { showToast } = useToast();
  const recognitionRef = useRef<any>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          onActivate();
        };

        recognition.onresult = (event: any) => {
          if (event.results && event.results[0] && event.results[0][0]) {
            const text = event.results[0][0].transcript;
            if (text) {
              onTranscript(text);
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === 'no-speech') {
            console.warn('[VoiceInput] Speech recognition timeout (no speech detected).');
          } else {
            console.error('[VoiceInput] Speech recognition error:', event.error);
          }

          if (event.error === 'not-allowed') {
            showToast({
              type: 'error',
              message: 'Microphone permission denied. Enable it in your browser settings.',
            });
          } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
            showToast({
              type: 'error',
              message: 'Speech recognition error: ' + event.error,
            });
          }
          onDeactivate();
        };

        recognition.onend = () => {
          onDeactivate();
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onActivate, onDeactivate, onTranscript, showToast]);

  const toggleListening = () => {
    if (!isSupported) {
      showToast({
        type: 'error',
        message: 'Speech recognition is not supported in this browser. Try Chrome or Safari.',
      });
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isActive) {
      try {
        recognition.stop();
      } catch (e) {}
      onDeactivate();
    } else {
      try {
        recognition.start();
      } catch (e) {
        console.error('[VoiceInput] Failed to start recognition:', e);
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {isActive ? (
        <button
          onClick={toggleListening}
          title="Stop listening"
          style={{
            background: 'rgba(236,72,153,0.15)',
            border: '1px solid var(--neon-pink)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--neon-pink)',
            boxShadow: '0 0 10px rgba(236,72,153,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <Square size={14} fill="var(--neon-pink)" />
        </button>
      ) : (
        <button
          onClick={toggleListening}
          title="Voice Input"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'var(--neon-cyan)';
            e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--glass-border)';
          }}
        >
          <Mic size={16} />
        </button>
      )}

      {/* Listening Waveform Indicator */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '-10px',
            background: 'rgba(10,10,22,0.95)',
            border: '1px solid var(--neon-cyan)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 900,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Listening...</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '10px' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: '2px',
                  height: '100%',
                  background: 'var(--neon-cyan)',
                  borderRadius: '1px',
                  animation: `waveform-bar 0.8s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes waveform-bar {
              0% { height: 2px; }
              100% { height: 10px; }
            }
          `}} />
        </div>
      )}
    </div>
  );
};
