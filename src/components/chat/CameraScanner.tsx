'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { NeonButton } from '@/components/ui/NeonButton';
import { GlassCard } from '@/components/ui/GlassCard';
import { AnimatePresence, motion } from 'framer-motion';

interface CameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (tasks: any[]) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const { showToast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasCamera, setHasCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Start Camera Stream
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
      setCameraActive(true);
    } catch (err: any) {
      console.error('[CameraScanner] Camera permission/access error:', err);
      setHasCamera(false);
      setCameraActive(false);
      showToast({
        type: 'error',
        message: 'Could not access camera. Ensure permissions are granted.',
      });
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

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setSuggestions([]);
      setSelectedIndices(new Set());
    }
    return () => stopCamera();
  }, [isOpen]);

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
        body: JSON.stringify({ image: base64Image }),
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
    startCamera();
  };

  if (!isOpen) return null;

  return (
    <div
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
            <Camera size={16} className="neon-text-cyan" /> Camera Scanner
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scan Body */}
        <div style={{ flex: 1, position: 'relative', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '320px', background: '#020205' }}>
          {/* Hidden snapshot canvas */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Active Camera Feed */}
          {cameraActive && !capturedImage && (
            <div style={{ width: '100%', position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '300px' }}
              />
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
                      No tasks were detected. Try taking another shot with clear, readable text.
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
          {cameraActive && !capturedImage ? (
            <>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Align document text inside the scanner border</span>
              <NeonButton variant="cyan" size="sm" icon={<Camera size={14} />} onClick={captureSnapshot}>
                Capture Snapshot
              </NeonButton>
            </>
          ) : (
            <>
              <NeonButton variant="purple" size="sm" onClick={retakeSnapshot} disabled={isLoading} icon={<RefreshCw size={12} />}>
                Retake Photo
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
