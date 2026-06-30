'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatePresence, motion } from 'framer-motion';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (tasks: any[]) => void;
  userId?: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  userId,
}) => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Dual tab state: 'upload' is default (excellent for desktop-first), 'camera' is backup
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('upload');
  const [isDragging, setIsDragging] = useState(false);

  // Focus modal container on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        containerRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Start Camera Stream
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('navigator.mediaDevices or getUserMedia is not supported in this browser context (unsecured HTTP or unsupported browser)');
      }

      // Try with ideal 'environment' constraint first (back camera on phones),
      // then fall back to standard video constraint to prevent desktop errors
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
      } catch (err) {
        console.warn('[CameraScanner] FacingMode constraint failed, falling back to basic video:', err);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      streamRef.current = stream;
      setHasCamera(true);
      setCameraActive(true);

      // Bind stream immediately if element is already mounted
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.play().catch((playErr) => {
          console.warn('[CameraScanner] Immediate play failed, autoPlay should kick in:', playErr);
        });
      }
    } catch (err: any) {
      console.error('[CameraScanner] Camera permission/access error:', err);
      setHasCamera(false);
      setCameraActive(false);
      showToast({
        type: 'error',
        message: err.message?.includes('unsupported')
          ? 'Webcam features require a secure HTTPS connection or localhost. Please use file upload instead.'
          : 'Could not access camera. Ensure permissions are granted or use the file upload instead.',
      });
      setActiveTab('upload');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // React to open/close and tab switching
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) {
      setCapturedImage(null);
      setSuggestions([]);
      setSelectedIndices(new Set());
    }
  }, [isOpen]);

  // Bind camera stream reliably as soon as the <video> element mounts
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch((playErr) => {
        console.warn('[CameraScanner] video.play() failed on ref mount:', playErr);
      });
    }
  }, [cameraActive, capturedImage, activeTab]);

  // Helper to extract and process image from clipboard data
  const handlePasteImage = (clipboardData: DataTransfer | null) => {
    if (!isOpen || activeTab !== 'upload' || capturedImage) return false;

    const items = clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            showToast({
              type: 'success',
              message: 'Image pasted from clipboard!',
            });
            return true;
          }
        }
      }
    }
    return false;
  };

  // Add Clipboard Paste (Ctrl+V) listener globally when modal is open on upload tab
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      handlePasteImage(e.clipboardData);
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, activeTab, capturedImage]);

  // Capture Snapshot
  const captureSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/png');
    setCapturedImage(base64Data);
    stopCamera();

    // Send snapshot to scan API
    sendToScanAPI(base64Data);
  };

  // Call OCR Scan API
  const sendToScanAPI = async (base64Image: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, userId }),
      });

      if (!res.ok) throw new Error('API processing failed');
      const data = await res.json();
      
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        // Auto-select all suggestions by default
        setSelectedIndices(new Set(data.suggestions.map((_: any, idx: number) => idx)));
        showToast({
          type: 'success',
          message: `Extracted ${data.suggestions.length} potential task items!`,
        });
      } else {
        showToast({
          type: 'info',
          message: 'No tasks or deadlines detected in the snapshot.',
        });
      }
    } catch (err: any) {
      console.error('[CameraScanner] Scan API error:', err);
      showToast({
        type: 'error',
        message: 'Failed to scan image. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Upload/Drag Handler
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Please upload an image file (PNG, JPG, WEBP).' });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setCapturedImage(base64Data);
      stopCamera();
      sendToScanAPI(base64Data);
    };
    reader.onerror = () => {
      showToast({ type: 'error', message: 'Failed to read image file.' });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Toggle suggestion selection
  const toggleSelect = (index: number) => {
    const next = new Set(selectedIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIndices(next);
  };

  // Submit selected suggestions
  const handleAddTasks = () => {
    const selected = suggestions.filter((_, idx) => selectedIndices.has(idx));
    if (selected.length === 0) return;
    onScanComplete(selected);
    onClose();
  };

  // Retake Snapshot
  const retakeSnapshot = () => {
    setCapturedImage(null);
    setSuggestions([]);
    setSelectedIndices(new Set());
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onPaste={(e) => {
        handlePasteImage(e.clipboardData);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 5, 12, 0.96)',
        backdropFilter: 'blur(16px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(10, 10, 22, 0.95)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={16} className="neon-text-cyan" /> Camera & Document Scanner
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Dual Mode Switcher (Tab selection) */}
        {!capturedImage && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setActiveTab('upload')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'upload' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'upload' ? '2px solid var(--neon-cyan)' : 'none',
                color: activeTab === 'upload' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              DRAG / DROP / PASTE
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'camera' ? 'rgba(0, 229, 255, 0.08)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'camera' ? '2px solid var(--neon-cyan)' : 'none',
                color: activeTab === 'camera' ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                letterSpacing: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              WEBCAM CAPTURE
            </button>
          </div>
        )}

        {/* Scan Body */}
        <div style={{ flex: 1, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '320px', background: '#020205' }}>
          {/* Hidden snapshot canvas */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Active Camera Feed */}
          {activeTab === 'camera' && !capturedImage && (
            <div style={{ width: '100%', position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', background: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '300px', display: cameraActive ? 'block' : 'none' }}
              />
              {!cameraActive ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <Loader2 size={36} className="animate-spin text-cyan" style={{ color: 'var(--neon-cyan)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Initializing camera stream...</span>
                </div>
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: '20px',
                    border: '2px dashed rgba(0,229,255,0.4)',
                    borderRadius: 'var(--radius-md)',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                  }}
                />
              )}
            </div>
          )}

          {/* Drag and Drop File Upload Area */}
          {activeTab === 'upload' && !capturedImage && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onPaste={(e) => {
                handlePasteImage(e.clipboardData);
              }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                border: `2px dashed ${isDragging ? 'var(--neon-cyan)' : 'var(--glass-border)'}`,
                borderRadius: 'var(--radius-md)',
                margin: '20px',
                background: isDragging ? 'rgba(0, 229, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minHeight: '260px',
                boxShadow: isDragging ? '0 0 15px rgba(0, 229, 255, 0.1) inset' : 'none',
                outline: 'none',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
              <motion.div
                animate={{ y: isDragging ? -5 : 0 }}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--glass-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  color: isDragging ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                  boxShadow: isDragging ? '0 0 20px rgba(0, 229, 255, 0.2)' : 'none',
                }}
              >
                <Upload size={24} className={isDragging ? 'neon-text-cyan' : ''} />
              </motion.div>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0', textAlign: 'center' }}>
                {isDragging ? 'Drop Image Here!' : 'Drag & Drop / Paste Image'}
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 4px 0', textAlign: 'center' }}>
                or press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--glass-border)', fontSize: '10px' }}>Ctrl + V</kbd> to paste
              </p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 4px 0', textAlign: 'center' }}>
                or <span style={{ color: 'var(--neon-cyan)', textDecoration: 'underline' }}>browse files</span> on your computer
              </p>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>
                Supports PNG, JPG, JPEG, or WEBP (Max 10MB)
              </span>
            </div>
          )}


          {/* Snapshot Preview / Results */}
          {capturedImage && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
              {/* Display snapshot at top of list */}
              <div style={{ position: 'relative', height: '180px', width: '100%' }}>
                <img src={capturedImage} alt="snapshot" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                {isLoading && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'rgba(0,0,0,0.5)' }}>
                    <Loader2 size={32} className="animate-spin text-cyan" style={{ color: 'var(--neon-cyan)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Analyzing image snapshot...</span>
                  </div>
                )}
              </div>

              {/* Extraction Suggestions Checklist */}
              {!isLoading && (
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Extracted Suggestions Checklist:</span>
                  {suggestions.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                      No tasks were detected. Try taking another shot or uploading a file with clearer, readable text.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {suggestions.map((s, idx) => {
                        const selected = selectedIndices.has(idx);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleSelect(idx)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px',
                              borderRadius: 'var(--radius-md)',
                              background: selected ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${selected ? 'rgba(0,229,255,0.3)' : 'var(--glass-border)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                border: `1.5px solid ${selected ? 'var(--neon-cyan)' : 'var(--text-tertiary)'}`,
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '2px',
                                flexShrink: 0,
                              }}
                            >
                              {selected && <div style={{ width: '10px', height: '10px', background: 'var(--neon-cyan)', borderRadius: '1px' }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 600 }}>{s.title}</div>
                              {s.rawText && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', fontStyle: 'italic' }}>"{s.rawText}"</div>}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>{s.category}</span>
                                <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: 'rgba(0,229,255,0.06)', color: 'var(--neon-cyan)', textTransform: 'capitalize' }}>{s.priority}</span>
                                {s.deadline && (
                                  <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: 'rgba(245,158,11,0.06)', color: 'var(--neon-amber)' }}>
                                    Due {new Date(s.deadline).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(10, 10, 22, 0.98)',
          }}
        >
          {activeTab === 'camera' && cameraActive && !capturedImage ? (
            <>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Align document text inside the scanner border</span>
              <NeonButton variant="cyan" size="sm" icon={<Camera size={14} />} onClick={captureSnapshot}>
                Capture Snapshot
              </NeonButton>
            </>
          ) : activeTab === 'upload' && !capturedImage ? (
            <>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Or switch to Webcam Capture at the top to take a picture</span>
              <NeonButton variant="cyan" size="sm" onClick={() => fileInputRef.current?.click()} icon={<Upload size={14} />}>
                Browse File
              </NeonButton>
            </>
          ) : (
            <>
              <NeonButton variant="purple" size="sm" onClick={retakeSnapshot} disabled={isLoading} icon={<RefreshCw size={12} />}>
                Reset / Retake
              </NeonButton>
              {suggestions.length > 0 && (
                <NeonButton variant="cyan" size="sm" onClick={handleAddTasks} disabled={isLoading || selectedIndices.size === 0} icon={<CheckCircle size={12} />}>
                  Add Selected Tasks ({selectedIndices.size})
                </NeonButton>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
