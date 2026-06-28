'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Trash2, Cpu, CheckCircle, HelpCircle, Loader2, Camera } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';
import { GlassCard } from '@/components/ui/GlassCard';
import { VoiceInput } from './VoiceInput';
import { CameraScanner } from './CameraScanner';
import { AnimatePresence, motion } from 'framer-motion';

interface AIChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userId: string;
}

// Simple regex-based markdown formatter
const formatMarkdown = (text: string) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold (**text**)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italics (*text*)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Inline Code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code style="font-family: var(--font-jetbrains-mono), monospace; font-size: 11px; background: rgba(255,255,255,0.06); padding: 2px 4px; border-radius: 3px; color: var(--neon-cyan);">$1</code>');

  // Bullet points (leading •, * or -)
  const lines = html.split('\n');
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
      const content = trimmed.replace(/^[•*-]\s*/, '');
      return `<li style="margin-left: 16px; margin-bottom: 4px; list-style-type: disc;">${content}</li>`;
    }
    return line;
  });
  html = formattedLines.join('\n');

  // Line breaks
  html = html.replace(/\n/g, '<br />');

  return html;
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
  isOpen,
  onToggle,
  userId,
}) => {
  const { messages, sendMessage, isStreaming, clearChat, conversationId } = useAIChat(userId);
  const { createTask } = useTasks(userId);
  const { showToast } = useToast();

  const [input, setInput] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Expose global callback on window for CommandPalette triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerAIChat = (text: string) => {
        if (!isOpen) onToggle();
        // Give sidebar a tiny moment to open before sending
        setTimeout(() => {
          sendMessage(text);
        }, 300);
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).triggerAIChat;
      }
    };
  }, [isOpen, onToggle, sendMessage]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (prompt: string) => {
    if (isStreaming) return;
    sendMessage(prompt);
  };

  const handleScanComplete = async (scannedTasks: any[]) => {
    for (const t of scannedTasks) {
      try {
        await createTask({
          title: t.title,
          description: t.rawText ? `Extracted via scan: "${t.rawText}"` : '',
          status: 'todo',
          priority: t.priority || 'medium',
          deadline: t.deadline ? new Date(t.deadline) : new Date(Date.now() + 24 * 3600 * 1000),
          estimatedMinutes: 30,
          category: t.category || 'General',
          tags: ['scanned'],
          subtasks: [],
        });
      } catch (e) {
        console.error('[AIChatSidebar] Failed to add scanned task:', e);
      }
    }
    showToast({
      type: 'success',
      message: `Successfully created ${scannedTasks.length} tasks!`,
    });
  };

  const actionChips = [
    { label: '📅 Plan my day', prompt: 'Plan my day' },
    { label: '🤔 What next?', prompt: 'What should I do next?' },
    { label: '🎯 Decompose Goal', prompt: 'Decompose a goal' },
    { label: '📊 Insights', prompt: 'Show productivity insights' },
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 380, opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              width: 'min(380px, 100vw)',
              height: '100%',
              background: 'rgba(8, 8, 18, 0.96)',
              borderLeft: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(20px)',
              zIndex: 500,
              position: 'relative',
              flexShrink: 0,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} className="neon-text-cyan" />
                <span
                  className="neon-text-cyan font-display"
                  style={{ fontSize: 'var(--text-sm)', fontWeight: 800, letterSpacing: '1px' }}
                >
                  CHRONOS AI
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    title="Clear history"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-pink)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={onToggle}
                  title="Close sidebar"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--neon-cyan)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(5, 5, 12, 0.2)',
              }}
            >
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>
                  <MessageSquare size={36} style={{ color: 'var(--neon-cyan)', opacity: 0.5, marginBottom: '12px' }} />
                  <p style={{ fontSize: 'var(--text-xs)', margin: 0, lineHeight: 1.5 }}>
                    Greetings! I am your AI Time Guardian.<br />Ask me to plan your schedule, decompose milestones, or sync calendars.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        gap: '6px',
                      }}
                    >
                      {/* Message Bubble */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          fontSize: 'var(--text-xs)',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          background: isUser ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isUser ? 'rgba(168,85,247,0.3)' : 'var(--glass-border)'}`,
                          color: 'var(--text-primary)',
                          boxShadow: isUser ? '0 0 10px rgba(168,85,247,0.05)' : 'none',
                        }}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
                          <div
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                            style={{ display: 'inline-block' }}
                          />
                        )}
                      </div>

                      {/* Tool Execution Logs */}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', paddingLeft: '4px' }}>
                          {msg.toolCalls.map((tc, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '10px',
                                color: tc.result ? 'var(--neon-green)' : 'var(--neon-cyan)',
                              }}
                            >
                              {tc.result ? (
                                <CheckCircle size={10} style={{ color: 'var(--neon-green)' }} />
                              ) : (
                                <Loader2 size={10} className="animate-spin" style={{ color: 'var(--neon-cyan)' }} />
                              )}
                              <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                                [{tc.name}] {tc.result ? 'Completed execution' : `Executing with args: ${JSON.stringify(tc.args).slice(0, 20)}...`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Pulsing Dots typing indicator */}
              {isStreaming && messages[messages.length - 1]?.content === '' && (
                <div style={{ display: 'flex', gap: '4px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '12px', width: 'fit-content' }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: 'var(--neon-cyan)',
                        animation: 'pulse-neon-dots 1.2s infinite alternate',
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes pulse-neon-dots {
                      0% { opacity: 0.3; transform: scale(0.8); }
                      100% { opacity: 1; transform: scale(1.2); }
                    }
                  `}} />
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Quick Actions & Input area */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--glass-border)', background: 'rgba(8,8,18,0.98)' }}>
              {/* Action Chips */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '10px',
                  marginBottom: '10px',
                  scrollbarWidth: 'none',
                }}
              >
                {actionChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => handleChipClick(chip.prompt)}
                    disabled={isStreaming}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-secondary)',
                      fontSize: '10px',
                      cursor: isStreaming ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isStreaming) {
                        e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.background = 'rgba(0,229,255,0.03)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isStreaming) {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <VoiceInput
                  isActive={voiceActive}
                  onActivate={() => setVoiceActive(true)}
                  onDeactivate={() => setVoiceActive(false)}
                  onTranscript={(text) => setInput((prev) => (prev ? prev + ' ' + text : text))}
                />

                <button
                  onClick={() => setCameraOpen(true)}
                  title="Scan doc/image"
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
                    flexShrink: 0,
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
                  <Camera size={16} />
                </button>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 12px',
                    flex: 1,
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isStreaming}
                    placeholder="Ask Chronos anything..."
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      width: '100%',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
                      color: input.trim() && !isStreaming ? 'var(--neon-cyan)' : 'var(--text-tertiary)',
                      display: 'flex',
                      padding: 0,
                      transition: 'color 0.15s ease',
                    }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CameraScanner
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScanComplete={handleScanComplete}
      />
    </>
  );
};
