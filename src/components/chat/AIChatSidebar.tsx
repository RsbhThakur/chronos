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
  isMobile?: boolean;
  isTablet?: boolean;
}

// Premium, safe tokenized Markdown Parser & Renderer to replace raw HTML injection
const parseInlineMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  // Match inline code `code`, bold **text**, and links [label](url)
  const regex = /(\`.*?\`|\*\*.*?\*\*|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      const code = part.slice(1, -1);
      return (
        <code key={index} style={{
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontSize: '11px',
          background: 'rgba(255,255,255,0.08)',
          padding: '2px 5px',
          borderRadius: '4px',
          color: 'var(--neon-cyan)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {code}
        </code>
      );
    } else if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {boldText}
        </strong>
      );
    } else if (part.startsWith('[') && part.endsWith(')')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, label, url] = match;
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontWeight: 500 }}
          >
            {label}
          </a>
        );
      }
    }
    return part;
  });
};

const parseTextWithMarkdown = (text: string, blockKey: number): React.ReactNode => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} style={{ margin: '8px 0 12px 0', paddingLeft: '20px', listStyleType: 'square', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // List item check
    if (trimmed.startsWith('•') || trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('— ')) {
      inList = true;
      const itemContent = line.replace(/^\s*[•\*\-—]\s+/, '');
      listItems.push(
        <li key={`li-${i}`} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: '4px', lineHeight: 1.5 }}>
          {parseInlineMarkdown(itemContent)}
        </li>
      );
      return;
    } else {
      flushList(i);
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} style={{ color: 'var(--neon-pink)', fontSize: 'var(--text-sm)', fontWeight: 800, marginTop: '16px', marginBottom: '8px', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
          {parseInlineMarkdown(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} style={{ color: 'var(--neon-purple)', fontSize: 'var(--text-xs)', fontWeight: 700, marginTop: '14px', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '3px', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
          {parseInlineMarkdown(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-xs)', fontWeight: 700, marginTop: '12px', marginBottom: '4px', fontFamily: 'var(--font-display)' }}>
          {parseInlineMarkdown(line.slice(4))}
        </h4>
      );
    }
    // Empty line
    else if (trimmed === '') {
      elements.push(<div key={i} style={{ height: '6px' }} />);
    }
    // Standard paragraph
    else {
      elements.push(
        <p key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.5 }}>
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  // Flush remaining list items
  flushList(lines.length);

  return <div key={`text-block-${blockKey}`}>{elements}</div>;
};

// Interactive copy-ready CodeBlock widget
const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(5, 5, 10, 0.65)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      margin: '10px 0',
      overflow: 'hidden',
      fontFamily: 'var(--font-jetbrains-mono), monospace',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      width: '100%',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        padding: '6px 12px',
        fontSize: '10px',
        color: 'var(--text-tertiary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{language.toUpperCase() || 'CODE'}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? 'var(--neon-green)' : 'var(--neon-cyan)',
            cursor: 'pointer',
            fontSize: '9px',
            padding: '2px 6px',
            borderRadius: '3px',
            fontWeight: 600,
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '12px',
        fontSize: '11px',
        overflowX: 'auto',
        color: 'rgba(255,255,255,0.95)',
        lineHeight: 1.5,
        background: 'transparent',
      }}>
        <code style={{ fontFamily: 'inherit', color: 'inherit' }}>{code}</code>
      </pre>
    </div>
  );
};

// Main MarkdownRenderer component with copy-to-clipboard functionality
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Split by triple backticks for code block identification
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const content = part.slice(3, -3);
          const lines = content.split('\n');
          let language = '';
          let code = content;
          if (lines.length > 0 && lines[0].trim().length > 0 && !lines[0].includes(' ') && lines[0].trim().length < 15) {
            language = lines[0].trim();
            code = lines.slice(1).join('\n');
          }
          return <CodeBlock key={index} code={code.trim()} language={language} />;
        } else {
          return parseTextWithMarkdown(part, index);
        }
      })}
    </div>
  );
};

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({
  isOpen,
  onToggle,
  userId,
  isMobile = false,
  isTablet = false,
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

  const handleVoiceTranscript = (text: string) => {
    if (isStreaming || !text.trim()) return;
    const fullText = input.trim() ? `${input} ${text}` : text;
    sendMessage(fullText);
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

  const isOverlay = isMobile || isTablet;

  return (
    <>
      <AnimatePresence>
        {isOpen && isOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 499,
            }}
          />
        )}
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
              position: isOverlay ? 'fixed' : 'relative',
              right: isOverlay ? 0 : undefined,
              top: isOverlay ? 0 : undefined,
              bottom: isOverlay ? 0 : undefined,
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
                          <MarkdownRenderer text={msg.content} />
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
                  onTranscript={handleVoiceTranscript}
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
        userId={userId}
      />
    </>
  );
};
