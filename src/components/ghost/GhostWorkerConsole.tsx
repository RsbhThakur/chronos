'use client';

import React, { useState, useEffect } from 'react';
import { Task, GhostWorkerOutput } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/components/ui/Toast';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  X, Sparkles, Send, Download, FileText, Mail, 
  Code, Calendar, Presentation, Edit3, Eye, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const convertMarkdownToHtml = (md: string) => {
  if (!md) return '';
  
  // Basic escaping for HTML structure safely
  let html = md;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 style="color: #00e5ff; font-family: system-ui, -apple-system, sans-serif; font-size: 16px; font-weight: 700; margin-top: 20px; margin-bottom: 8px;">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="color: #a855f7; font-family: system-ui, -apple-system, sans-serif; font-size: 18px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 style="color: #ff007f; font-family: system-ui, -apple-system, sans-serif; font-size: 22px; font-weight: 800; margin-top: 28px; margin-bottom: 16px;">$1</h1>');
  
  // Images: ![alt](url)
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<div style="margin: 16px 0; text-align: center;"><img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.3);" /></div>');
  
  // Links: [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: #00e5ff; text-decoration: underline;">$1</a>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #00e5ff; font-weight: 700;">$1</strong>');
  
  // List items
  html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="color: #cbd5e1; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; margin-bottom: 6px; list-style-type: square; margin-left: 20px;">$1</li>');
  
  // Split paragraphs
  const paragraphs = html.split(/\n{2,}/g);
  const formattedParagraphs = paragraphs.map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<div') || trimmed.startsWith('<li')) {
      return trimmed;
    }
    return `<p style="color: #cbd5e1; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">${trimmed.replace(/\n/g, '<br />')}</p>`;
  });
  
  return `<div style="background-color: #05050a; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); color: #cbd5e1; font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">${formattedParagraphs.join('\n')}</div>`;
};

interface GhostWorkerConsoleProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export const GhostWorkerConsole: React.FC<GhostWorkerConsoleProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { user, googleAccessToken } = useAuth();
  const { updateTask } = useTasks(user?.id || '');
  const { showToast } = useToast();

  const [activeType, setActiveType] = useState<'email' | 'document' | 'presentation' | 'code' | 'agenda'>('email');
  const [additionalContext, setAdditionalContext] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');

  // Load existing output if already present
  useEffect(() => {
    if (task.ghostWorkerOutput) {
      setDraftContent(task.ghostWorkerOutput.content);
      setDraftTitle(task.ghostWorkerOutput.title);
      setActiveType(task.ghostWorkerOutput.type);
    } else {
      setDraftContent('');
      setDraftTitle('');
    }
  }, [task.ghostWorkerOutput, isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/ghost-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          deliverableType: activeType,
          additionalContext,
          userId: user?.id || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftContent(data.output.content);
        setDraftTitle(data.output.title);
        await updateTask(task.id, { ghostWorkerOutput: data.output });
        setActiveTab('preview');
        showToast({ type: 'success', message: 'Ghost draft generated successfully!' });
      } else {
        showToast({ type: 'error', message: data.error || 'Failed to generate draft' });
      }
    } catch {
      showToast({ type: 'error', message: 'Error communicating with Ghost Agent' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!draftContent) return;
    try {
      const res = await fetch('/api/ai/ghost-worker', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          approved: true,
          edits: draftContent,
          userId: user?.id || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        await updateTask(task.id, { ghostWorkerOutput: data.output });
        showToast({ type: 'success', message: 'Draft marked as APPROVED & finalized!' });
      } else {
        showToast({ type: 'error', message: data.error || 'Failed to approve draft' });
      }
    } catch {
      showToast({ type: 'error', message: 'Error saving draft updates' });
    }
  };

  const handleExport = async () => {
    if (!draftContent) return;
    setExporting(true);

    try {
      // 1. Email Draft creation via Google APIs
      if (activeType === 'email') {
        if (googleAccessToken) {
          // Attempt Gmail draft insertion
          try {
            // Rich HTML MIME formation using convertMarkdownToHtml
            const toStr = recipientEmail ? `To: ${recipientEmail}\r\n` : '';
            const emailHtml = convertMarkdownToHtml(draftContent);
            const subject = draftTitle || `Deliverable Draft for: ${task.title}`;
            const mimeMessage = [
              toStr +
              `Subject: ${subject}\r\n` +
              'Content-Type: text/html; charset=utf-8\r\n' +
              'MIME-Version: 1.0\r\n\r\n' +
              emailHtml
            ].join('\r\n');

            const base64SafeMime = btoa(unescape(encodeURIComponent(mimeMessage)))
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${googleAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: {
                  raw: base64SafeMime
                }
              }),
            });

            if (gmailRes.ok) {
              showToast({ type: 'success', message: 'Holographic draft sent directly to your Gmail box!' });
              setExporting(false);
              return;
            } else {
              console.warn('Gmail draft API failed, falling back to download');
            }
          } catch (gmailErr) {
            console.error('Failed call to Gmail API:', gmailErr);
          }
        }
        
        // Falling back notification
        showToast({ type: 'success', message: 'Demo Mode fallback active. Downloaded draft as .md file.' });
      }

      // 2. Fallback direct Document download (.md)
      const sanitizedTitle = (draftTitle || 'deliverable').toLowerCase().replace(/\s+/g, '_');
      const blob = new Blob([draftContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${sanitizedTitle}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      showToast({ type: 'error', message: 'Failed to complete export operation' });
    } finally {
      setExporting(false);
    }
  };

  // Premium, lightweight custom markdown parser to avoid external dependencies
  const parseInlineElements = (text: string): React.ReactNode[] => {
    if (!text) return [];
    // Regular expression to match bold text, links, and images
    const regex = /(!\[.*?\]\(.*?\)|\[.*?\]\(.*?\)|\*\*.*?\*\*)/g;
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.startsWith('![') && part.endsWith(')')) {
        const match = part.match(/!\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, alt, url] = match;
          return (
            <span key={index} style={{ display: 'block', margin: '14px 0', textAlign: 'center' }}>
              <img
                src={url}
                alt={alt}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}
              />
            </span>
          );
        }
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
              style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}
            >
              {label}
            </a>
          );
        }
      } else if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <strong key={index} style={{ color: 'var(--neon-cyan)', fontWeight: 700 }}>
            {boldText}
          </strong>
        );
      }
      
      return part;
    });
  };

  const parseMarkdown = (md: string) => {
    if (!md) return <span style={{ color: 'var(--text-tertiary)' }}>No draft generated yet. Fill context and press Generate.</span>;
    
    const lines = md.split('\n');
    const elements: React.ReactNode[] = [];
    
    let inList = false;
    let listItems: React.ReactNode[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key}`} style={{ margin: '0 0 12px 0', paddingLeft: '16px', listStyleType: 'square' }}>
            {listItems}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      // Check list items
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        inList = true;
        const itemContent = line.replace(/^\s*[\*\-]\s+/, '');
        listItems.push(
          <li key={`li-${i}`} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginBottom: '4px', lineHeight: 1.5 }}>
            {parseInlineElements(itemContent)}
          </li>
        );
        return;
      } else {
        flushList(i);
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h2 key={i} style={{ color: 'var(--neon-pink)', fontSize: 'var(--text-md)', fontWeight: 800, marginTop: '20px', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>
            {parseInlineElements(line.slice(2))}
          </h2>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h3 key={i} style={{ color: 'var(--neon-purple)', fontSize: 'var(--text-sm)', fontWeight: 700, marginTop: '16px', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', fontFamily: 'var(--font-display)' }}>
            {parseInlineElements(line.slice(3))}
          </h3>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h4 key={i} style={{ color: 'var(--neon-cyan)', fontSize: 'var(--text-xs)', fontWeight: 700, marginTop: '14px', marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
            {parseInlineElements(line.slice(4))}
          </h4>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h5 key={i} style={{ color: 'var(--neon-pink)', fontSize: '10px', fontWeight: 600, marginTop: '10px', marginBottom: '4px' }}>
            {parseInlineElements(line.slice(5))}
          </h5>
        );
      }
      
      // Codeblocks
      else if (line.startsWith('```')) {
        return; // Strip raw marker
      }

      // Empty line
      else if (trimmed === '') {
        elements.push(<div key={i} style={{ height: '8px' }} />);
      }

      // Paragraph / normal text
      else {
        elements.push(
          <p key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 6px', lineHeight: 1.6 }}>
            {parseInlineElements(line)}
          </p>
        );
      }
    });

    // Flush any remaining list items at the end
    flushList(lines.length);

    return elements;
  };

  const types = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'document', label: 'Doc', icon: FileText },
    { id: 'presentation', label: 'Slides', icon: Presentation },
    { id: 'code', label: 'Code', icon: Code },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
  ] as const;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 850,
      background: 'rgba(5, 5, 10, 0.45)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'flex-end',
    }} onClick={onClose}>
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(740px, 100vw)',
          height: '100vh',
          background: 'rgba(10, 10, 22, 0.98)',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Console Header */}
        <div style={{
          padding: '24px', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'var(--neon-purple-subtle)', border: '1px solid var(--neon-purple)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={16} style={{ color: 'var(--neon-purple)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                GHOST WORKER STUDIO
              </h3>
              <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0 }}>
                AUTOMATE HANDOFFS FOR: {task.title.toUpperCase()}
              </p>
            </div>
          </div>
          
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'color 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--neon-pink)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}>
            <X size={20} />
          </button>
        </div>

        {/* Console Body Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
          
          {/* Segment Selector */}
          <div>
            <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.5px' }}>
              SELECT DELIVERABLE TYPE
            </label>
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-md)', padding: '4px', gap: '4px',
            }}>
              {types.map((t) => {
                const Icon = t.icon;
                const active = activeType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveType(t.id)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '10px 4px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                      background: active ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
                      border: `1px solid ${active ? 'var(--neon-purple)' : 'transparent'}`,
                      color: active ? 'var(--neon-purple)' : 'var(--text-secondary)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context Input Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeType === 'email' && (
              <div>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Recipient Email (Optional)
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. lead@hackathon.com"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)',
                    fontSize: 'var(--text-xs)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                Additional AI Instructions & Context (Optional)
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g. Keep tone formal and highly professional. Emphasize integration test coverage..."
                rows={3}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  resize: 'none', lineHeight: 1.4,
                }}
              />
            </div>

            <NeonButton variant="purple" fullWidth loading={loading} onClick={handleGenerate} icon={<Sparkles size={14} />}>
              Generate Draft with Ghost AI
            </NeonButton>
          </div>

          {/* Preview Panel Section */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '340px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px',
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 700 }}>
                DRAFT DELIVERABLE STUDIO
              </span>

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                <button
                  onClick={() => setActiveTab('preview')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', border: 'none', padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                    background: activeTab === 'preview' ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                    color: activeTab === 'preview' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  <Eye size={11} /> PREVIEW
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px', border: 'none', padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '10px', fontWeight: 600,
                    background: activeTab === 'edit' ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                    color: activeTab === 'edit' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  }}
                >
                  <Edit3 size={11} /> EDIT RAW
                </button>
              </div>
            </div>

            {/* Title Display if present */}
            {draftTitle && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '10px', letterSpacing: '0.5px' }}>
                TITLE: {draftTitle.toUpperCase()}
              </div>
            )}

            {/* Inner Content Area */}
            <div style={{ flex: 1, minHeight: '260px', display: 'flex' }}>
              {activeTab === 'edit' ? (
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Draft content markdown appears here..."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)', padding: '16px', color: 'var(--text-secondary)',
                    fontSize: 'var(--text-xs)', outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-mono)',
                    resize: 'none', lineHeight: 1.6,
                  }}
                />
              ) : (
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-md)', padding: '16px', color: 'var(--text-secondary)',
                  overflowY: 'auto', boxSizing: 'border-box', height: '100%',
                }}>
                  {parseMarkdown(draftContent)}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Drawer Control Bar */}
        {draftContent && (
          <div style={{
            padding: '20px 24px', borderTop: '1px solid var(--glass-border)',
            display: 'flex', gap: '12px', background: 'rgba(10, 10, 22, 0.99)',
          }}>
            <button 
              onClick={handleApprove}
              style={{
                flex: 1, background: task.ghostWorkerOutput?.approved ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${task.ghostWorkerOutput?.approved ? 'var(--neon-green)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px', color: task.ghostWorkerOutput?.approved ? 'var(--neon-green)' : 'var(--text-secondary)',
                fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!task.ghostWorkerOutput?.approved) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'var(--neon-green)';
                }
              }}
              onMouseLeave={(e) => {
                if (!task.ghostWorkerOutput?.approved) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                }
              }}
            >
              <CheckCircle2 size={14} style={{ color: task.ghostWorkerOutput?.approved ? 'var(--neon-green)' : 'inherit' }} />
              {task.ghostWorkerOutput?.approved ? 'Approved' : 'Mark Approved'}
            </button>

            <NeonButton 
              variant="cyan" 
              loading={exporting} 
              onClick={handleExport}
              style={{ flex: 1.2 }}
            >
              {activeType === 'email' ? <Mail size={14} /> : <Download size={14} />}
              {activeType === 'email' ? 'Export to Gmail Draft' : 'Export (.md file)'}
            </NeonButton>
          </div>
        )}

      </motion.div>
    </div>
  );
};
