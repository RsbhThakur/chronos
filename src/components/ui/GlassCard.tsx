'use client';

import React from 'react';
import { motion } from 'framer-motion';

type GlowColor = 'cyan' | 'purple' | 'pink' | 'green' | 'amber' | 'none';
type Padding = 'sm' | 'md' | 'lg';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: GlowColor;
  hoverable?: boolean;
  padding?: Padding;
  onClick?: () => void;
  animate?: boolean;
  style?: React.CSSProperties;
}

const paddingMap: Record<Padding, string> = {
  sm: '12px',
  md: '20px',
  lg: '32px',
};

const glowBorderMap: Record<GlowColor, string> = {
  cyan:   'rgba(0, 229, 255, 0.5)',
  purple: 'rgba(168, 85, 247, 0.5)',
  pink:   'rgba(236, 72, 153, 0.5)',
  green:  'rgba(34, 197, 94, 0.5)',
  amber:  'rgba(245, 158, 11, 0.5)',
  none:   'var(--glass-border)',
};

const glowShadowMap: Record<GlowColor, string> = {
  cyan:   '0 0 20px rgba(0, 229, 255, 0.15)',
  purple: '0 0 20px rgba(168, 85, 247, 0.15)',
  pink:   '0 0 20px rgba(236, 72, 153, 0.15)',
  green:  '0 0 20px rgba(34, 197, 94, 0.15)',
  amber:  '0 0 20px rgba(245, 158, 11, 0.15)',
  none:   'none',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glowColor = 'none',
  hoverable = true,
  padding = 'md',
  onClick,
  animate = false,
  style,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    padding: paddingMap[padding],
    borderColor: isHovered && glowColor !== 'none' ? glowBorderMap[glowColor] : 'var(--glass-border)',
    boxShadow: isHovered && glowColor !== 'none' ? glowShadowMap[glowColor] : undefined,
    cursor: onClick ? 'pointer' : undefined,
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    ...style,
  };

  const motionProps = animate
    ? { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 280, damping: 24 } }
    : {};

  const hoverProps = hoverable
    ? { whileHover: { scale: 1.01 } }
    : {};

  return (
    <motion.div
      className={`glass-card ${className}`}
      style={baseStyle}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      {...motionProps}
      {...hoverProps}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
