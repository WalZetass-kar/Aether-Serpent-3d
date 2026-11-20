import React from 'react';

interface VoiceActivityBarsProps {
  /** Normalized real-time audio volume level in [0..1] */
  level: number;
  /** True when the participant is actively passing the noise gate / speaking */
  active: boolean;
  /** True when muted or disconnected */
  muted?: boolean;
  size?: 'xs' | 'sm' | 'md';
  tone?: 'emerald' | 'amber' | 'sky';
  className?: string;
}

const BAR_WEIGHTS = [0.58, 1.0, 0.82, 0.48] as const;

export const VoiceActivityBars: React.FC<VoiceActivityBarsProps> = ({
  level,
  active,
  muted = false,
  size = 'sm',
  tone = 'emerald',
  className = '',
}) => {
  const safeLevel = muted ? 0 : Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0));
  const isLive = !muted && (active || safeLevel >= 0.05);

  const dims =
    size === 'xs'
      ? { height: 'h-3', width: 'w-[2px]', gap: 'gap-[1.5px]' }
      : size === 'md'
        ? { height: 'h-4.5', width: 'w-[3px]', gap: 'gap-[2px]' }
        : { height: 'h-3.5', width: 'w-[2.5px]', gap: 'gap-[2px]' };

  const activeColor =
    tone === 'amber'
      ? 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.65)]'
      : tone === 'sky'
        ? 'bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.65)]'
        : 'bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.65)]';

  const idleColor = muted ? 'bg-rose-400/35' : 'bg-slate-500/45';

  return (
    <span
      className={`inline-flex items-end ${dims.height} ${dims.gap} shrink-0 ${className}`}
      aria-hidden="true"
    >
      {BAR_WEIGHTS.map((weight, idx) => {
        const dynamicPct = isLive
          ? Math.max(24, Math.min(100, Math.round((0.18 + safeLevel * 0.82) * weight * 100)))
          : 20;

        return (
          <span
            key={idx}
            className={`${dims.width} rounded-full transition-[height,opacity,background-color] duration-100 ease-out origin-bottom ${
              isLive ? `${activeColor} animate-voice-bar` : idleColor
            }`}
            style={{
              height: `${dynamicPct}%`,
              animationDelay: isLive ? `${idx * 90}ms` : undefined,
            }}
          />
        );
      })}
    </span>
  );
};
