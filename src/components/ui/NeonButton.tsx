'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'cyan' | 'purple' | 'pink' | 'green' | 'solid';
type Size = 'sm' | 'md' | 'lg';

interface NeonButtonProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  className?: string;
  style?: React.CSSProperties;
}

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-xs)' },
  md: { padding: '10px 20px', fontSize: 'var(--text-sm)' },
  lg: { padding: '14px 28px', fontSize: 'var(--text-md)' },
};

const variantColorMap: Record<Variant, string> = {
  cyan:   'var(--neon-cyan)',
  purple: 'var(--neon-purple)',
  pink:   'var(--neon-pink)',
  green:  'var(--neon-green)',
  solid:  'var(--neon-cyan)',
};

const variantBgMap: Record<Variant, string> = {
  cyan:   'transparent',
  purple: 'transparent',
  pink:   'transparent',
  green:  'transparent',
  solid:  'var(--neon-cyan)',
};

const variantTextMap: Record<Variant, string> = {
  cyan:   'var(--neon-cyan)',
  purple: 'var(--neon-purple)',
  pink:   'var(--neon-pink)',
  green:  'var(--neon-green)',
  solid:  '#000',
};

export const NeonButton: React.FC<NeonButtonProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  type = 'button',
  className = '',
  style,
}) => {
  const color = variantColorMap[variant];
  const bg = variantBgMap[variant];
  const textColor = variantTextMap[variant];

  const baseStyle: React.CSSProperties = {
    ...sizeStyles[size],
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    fontWeight: 600,
    letterSpacing: '0.3px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${color}`,
    background: bg,
    color: textColor,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth ? 'center' : undefined,
    transition: 'box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease',
    outline: 'none',
    ...style,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;
    e.currentTarget.style.boxShadow = `0 0 16px ${color}40`;
    if (variant !== 'solid') {
      e.currentTarget.style.background = `${color}10`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.boxShadow = 'none';
    if (variant !== 'solid') {
      e.currentTarget.style.background = 'transparent';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={baseStyle}
      className={`neon-button ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default NeonButton;
