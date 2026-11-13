import React, { useId } from 'react';

export type ProgressRingTone = 'amber' | 'sky' | 'rose' | 'emerald';

interface AnimatedProgressRingProps {
  /** Normalized progress from 0 (empty) to 1 (full). */
  progress: number;
  size?: number;
  strokeWidth?: number;
  tone?: ProgressRingTone;
  urgent?: boolean;
  pulse?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const TONE_PALETTE: Record<
  ProgressRingTone,
  { start: string; end: string; track: string; glow: string }
> = {
  amber: {
    start: '#fde047',
    end: '#f59e0b',
    track: 'rgba(245, 158, 11, 0.18)',
    glow: 'rgba(251, 191, 36, 0.58)',
  },
  sky: {
    start: '#7dd3fc',
    end: '#0284c7',
    track: 'rgba(56, 189, 248, 0.18)',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  rose: {
    start: '#fda4af',
    end: '#e11d48',
    track: 'rgba(244, 63, 94, 0.22)',
    glow: 'rgba(244, 63, 94, 0.72)',
  },
  emerald: {
    start: '#6ee7b7',
    end: '#059669',
    track: 'rgba(16, 185, 129, 0.18)',
    glow: 'rgba(52, 211, 153, 0.58)',
  },
};

export const AnimatedProgressRing: React.FC<AnimatedProgressRingProps> = ({
  progress,
  size = 44,
  strokeWidth = 3.5,
  tone = 'amber',
  urgent = false,
  pulse = true,
  className = '',
  children,
}) => {
  const gradId = useId().replace(/:/g, '');
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);
  const center = size / 2;
  const colors = TONE_PALETTE[urgent ? 'rose' : tone];

  // Tip dot coordinates along the arc
  const tipAngle = -Math.PI / 2 + clamped * Math.PI * 2;
  const tipX = center + Math.cos(tipAngle) * radius;
  const tipY = center + Math.sin(tipAngle) * radius;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        urgent ? 'animate-ring-urgent' : pulse ? 'animate-ring-glow' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        style={{ filter: `drop-shadow(0 0 ${urgent ? 8 : 5}px ${colors.glow})` }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`ring-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.start} />
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
        </defs>

        {/* Outer faint halo ring */}
        <circle
          cx={center}
          cy={center}
          r={radius + strokeWidth * 0.55}
          fill="none"
          stroke={colors.track}
          strokeWidth={1}
        />

        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={strokeWidth}
        />

        {/* Animated progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#ring-${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />

        {/* Glowing leading-edge bead when progress > 4% */}
        {clamped > 0.04 && (
          <circle
            cx={tipX}
            cy={tipY}
            r={Math.max(1.8, strokeWidth * 0.62)}
            fill={colors.start}
          />
        )}
      </svg>

      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};
