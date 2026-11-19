import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

export type EmoteTone = 'amber' | 'emerald' | 'sky' | 'violet' | 'rose' | 'orange';

export interface EmoteWheelItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  payload: string;
  tone: EmoteTone;
  accentHex: string;
  glowRgba: string;
}

export const EMOTE_WHEEL_ITEMS: EmoteWheelItem[] = [
  {
    id: 'gg',
    label: 'GG!',
    shortLabel: 'GG',
    icon: '🏆',
    payload: '🏆 GG!',
    tone: 'amber',
    accentHex: '#fbbf24',
    glowRgba: 'rgba(251, 191, 36, 0.34)',
  },
  {
    id: 'thanks',
    label: 'Thanks!',
    shortLabel: 'Thanks',
    icon: '🙏',
    payload: '🙏 Thanks!',
    tone: 'emerald',
    accentHex: '#34d399',
    glowRgba: 'rgba(52, 211, 153, 0.32)',
  },
  {
    id: 'well_played',
    label: 'Well Played!',
    shortLabel: 'WP',
    icon: '⚔️',
    payload: '⚔️ Well Played!',
    tone: 'sky',
    accentHex: '#38bdf8',
    glowRgba: 'rgba(56, 189, 248, 0.32)',
  },
  {
    id: 'oops',
    label: 'Oops!',
    shortLabel: 'Oops',
    icon: '😱',
    payload: '😱 Oops!',
    tone: 'violet',
    accentHex: '#c084fc',
    glowRgba: 'rgba(192, 132, 252, 0.34)',
  },
  {
    id: 'angry',
    label: 'Angry!',
    shortLabel: 'Angry',
    icon: '💢',
    payload: '💢 Angry!',
    tone: 'rose',
    accentHex: '#fb7185',
    glowRgba: 'rgba(251, 113, 133, 0.36)',
  },
  {
    id: 'nice',
    label: 'Nice!',
    shortLabel: 'Nice',
    icon: '🔥',
    payload: '🔥 Nice!',
    tone: 'orange',
    accentHex: '#fb923c',
    glowRgba: 'rgba(251, 146, 60, 0.34)',
  },
];

export interface ResolvedEmoteVisual {
  icon: string;
  text: string;
  tone: EmoteTone;
  isAngry: boolean;
  isEmoteWheelItem: boolean;
}

/**
 * Matches any arena chat/emote string against known quick visual emotes so
 * incoming remote and local emotes render with expressive mood styling.
 */
export function resolveEmoteVisual(rawText: string): ResolvedEmoteVisual {
  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();
  const matched = EMOTE_WHEEL_ITEMS.find(
    (item) =>
      trimmed === item.payload ||
      lower === item.label.toLowerCase() ||
      lower === item.shortLabel.toLowerCase() ||
      trimmed.startsWith(item.icon),
  );
  if (matched) {
    return {
      icon: matched.icon,
      text: matched.label,
      tone: matched.tone,
      isAngry: matched.id === 'angry',
      isEmoteWheelItem: true,
    };
  }
  return {
    icon: '✨',
    text: trimmed,
    tone: 'amber',
    isAngry: false,
    isEmoteWheelItem: false,
  };
}

export interface EmoteWheelAnchor {
  x: number;
  y: number;
  openedByHold: boolean;
}

export interface UseEmoteLongPressOptions {
  enabled?: boolean;
  delayMs?: number;
  onLongPress: (anchor: EmoteWheelAnchor) => void;
}

/**
 * Unified mouse + touch long-press detector for player avatars and chat buttons.
 * Cancels cleanly on scroll/drag movement > 12px and suppresses accidental follow-up clicks.
 */
export function useEmoteLongPress({
  enabled = true,
  delayMs = 360,
  onLongPress,
}: UseEmoteLongPressOptions) {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<number>(0);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = 0;
    }
    setIsHolding(false);
    startPosRef.current = null;
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      firedRef.current = false;
      const x = e.clientX;
      const y = e.clientY;
      startPosRef.current = { x, y };
      setIsHolding(true);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = 0;
        firedRef.current = true;
        setIsHolding(false);
        soundEngine.playUiClick();
        onLongPress({ x, y, openedByHold: true });
      }, delayMs);
    },
    [delayMs, enabled, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      const dx = e.clientX - startPosRef.current.x;
      const dy = e.clientY - startPosRef.current.y;
      if (dx * dx + dy * dy > 144) {
        clearTimer();
      }
    },
    [clearTimer],
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (enabled && (firedRef.current || isHolding)) {
        e.preventDefault();
      }
    },
    [enabled, isHolding],
  );

  const consumeLongPressClick = useCallback((): boolean => {
    if (firedRef.current) {
      firedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    isHolding,
    consumeLongPressClick,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave: onPointerCancel,
      onContextMenu,
    },
  };
}

interface EmoteWheelProps {
  open: boolean;
  anchor: EmoteWheelAnchor | null;
  playerName?: string;
  onSelectEmote: (item: EmoteWheelItem) => void;
  onClose: () => void;
}

const WHEEL_SIZE = 256;
const HALF = WHEEL_SIZE / 2;
const OUTER_R = 118;
const INNER_R = 44;
const ICON_R = 82;
const DEADZONE_R = 28;
const SECTOR_COUNT = EMOTE_WHEEL_ITEMS.length;
const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT;
// Offset so index 0 ("GG") sits centered at straight top (-90 deg)
const START_OFFSET = -Math.PI / 2 - SECTOR_ANGLE / 2;

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function buildWedgePath(index: number, outerR: number, innerR: number): string {
  const gap = 0.032;
  const a0 = START_OFFSET + index * SECTOR_ANGLE + gap;
  const a1 = START_OFFSET + (index + 1) * SECTOR_ANGLE - gap;

  const p0 = polarToCartesian(HALF, HALF, outerR, a0);
  const p1 = polarToCartesian(HALF, HALF, outerR, a1);
  const p2 = polarToCartesian(HALF, HALF, innerR, a1);
  const p3 = polarToCartesian(HALF, HALF, innerR, a0);

  return [
    `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function resolveSectorIndex(dx: number, dy: number): number | null {
  const dist = Math.hypot(dx, dy);
  if (dist < DEADZONE_R) return null;
  let angle = Math.atan2(dy, dx) - START_OFFSET;
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return Math.floor(angle / SECTOR_ANGLE) % SECTOR_COUNT;
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({
  open,
  anchor,
  playerName,
  onSelectEmote,
  onClose,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [pointerAngle, setPointerAngle] = useState<number | null>(null);
  const activeIdxRef = useRef<number | null>(null);
  activeIdxRef.current = activeIdx;

  // Clamp radial center strictly inside safe viewport bounds so wheel never clips
  const center = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const margin = HALF + 16;
    const rawX = anchor?.x ?? vw / 2;
    const rawY = anchor?.y ?? vh / 2;
    return {
      x: Math.max(margin, Math.min(vw - margin, rawX)),
      y: Math.max(margin + 12, Math.min(vh - margin - 12, rawY)),
    };
  }, [anchor]);

  const wedges = useMemo(
    () =>
      EMOTE_WHEEL_ITEMS.map((item, idx) => {
        const midAngle = START_OFFSET + (idx + 0.5) * SECTOR_ANGLE;
        const pos = polarToCartesian(HALF, HALF, ICON_R, midAngle);
        return {
          item,
          idx,
          path: buildWedgePath(idx, OUTER_R, INNER_R),
          activePath: buildWedgePath(idx, OUTER_R + 5, INNER_R - 1),
          pos,
          midAngle,
        };
      }),
    [],
  );

  // Reset hover state on open
  useEffect(() => {
    if (open) {
      setActiveIdx(null);
      setPointerAngle(null);
    }
  }, [open, anchor]);

  // Support true hold-drag-release when opened by long-press AND Escape key dismissal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleGlobalMove = (e: PointerEvent) => {
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      const dist = Math.hypot(dx, dy);
      if (dist > OUTER_R + 72) {
        if (anchor?.openedByHold) {
          // Even far drags still pick nearest sector while holding
          setActiveIdx(resolveSectorIndex(dx, dy));
          setPointerAngle(Math.atan2(dy, dx));
        } else {
          setActiveIdx(null);
          setPointerAngle(null);
        }
        return;
      }
      const idx = resolveSectorIndex(dx, dy);
      setActiveIdx(idx);
      setPointerAngle(idx !== null ? Math.atan2(dy, dx) : null);
    };

    const handleGlobalUp = () => {
      if (!anchor?.openedByHold) return;
      const idx = activeIdxRef.current;
      if (idx !== null) {
        const chosen = EMOTE_WHEEL_ITEMS[idx];
        if (chosen) {
          soundEngine.playUiClick();
          onSelectEmote(chosen);
        }
        onClose();
      }
      // If user released inside the center deadzone, keep wheel open so they can tap any wedge cleanly!
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointermove', handleGlobalMove, { passive: true });
    if (anchor?.openedByHold) {
      window.addEventListener('pointerup', handleGlobalUp, { once: true });
      window.addEventListener('pointercancel', onClose, { once: true });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', onClose);
    };
  }, [anchor?.openedByHold, center.x, center.y, onClose, onSelectEmote, open]);

  if (!open || !anchor) return null;

  const activeItem = activeIdx !== null ? EMOTE_WHEEL_ITEMS[activeIdx] : null;

  return (
    <div
      className="fixed inset-0 z-50 select-none touch-none"
      role="dialog"
      aria-modal="false"
      aria-label="Emote Wheel Arena"
    >
      {/* Subtle click-away backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/28 transition-opacity"
        onPointerDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Radial Wheel Container anchored cleanly inside viewport */}
      <div
        className="absolute animate-emote-wheel-pop"
        style={{
          left: center.x - HALF,
          top: center.y - HALF,
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Outer Ambient Glow */}
        <div
          className="pointer-events-none absolute inset-2 rounded-full transition-all duration-150"
          style={{
            boxShadow: activeItem
              ? `0 0 38px ${activeItem.glowRgba}, 0 22px 48px rgba(2, 6, 23, 0.85)`
              : '0 0 28px rgba(245, 158, 11, 0.16), 0 22px 48px rgba(2, 6, 23, 0.82)',
          }}
        />

        {/* Precision SVG Radial Sectors */}
        <svg
          width={WHEEL_SIZE}
          height={WHEEL_SIZE}
          viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
          className="block overflow-visible"
        >
          <defs>
            <radialGradient id="emoteWheelBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.96)" />
              <stop offset="100%" stopColor="rgba(5, 9, 20, 0.94)" />
            </radialGradient>
          </defs>

          {/* Outer Obsidian Backing Disc & Gilded Brass Ring */}
          <circle
            cx={HALF}
            cy={HALF}
            r={OUTER_R + 3}
            fill="url(#emoteWheelBg)"
            stroke="rgba(245, 158, 11, 0.42)"
            strokeWidth="1.5"
          />
          <circle
            cx={HALF}
            cy={HALF}
            r={OUTER_R - 2}
            fill="none"
            stroke="rgba(253, 230, 138, 0.1)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* 6 Interactive Emote Wedges */}
          {wedges.map(({ item, idx, path, activePath }) => {
            const isSelected = activeIdx === idx;
            return (
              <path
                key={item.id}
                d={isSelected ? activePath : path}
                fill={isSelected ? item.glowRgba : 'rgba(15, 23, 42, 0.72)'}
                stroke={isSelected ? item.accentHex : 'rgba(148, 163, 184, 0.22)'}
                strokeWidth={isSelected ? 2 : 1}
                className="cursor-pointer transition-all duration-100"
                onPointerEnter={() => setActiveIdx(idx)}
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playUiClick();
                  onSelectEmote(item);
                  onClose();
                }}
              />
            );
          })}

          {/* Directional Selection Beam Indicator around Inner Hub */}
          {pointerAngle !== null && activeItem && (
            <g
              transform={`translate(${HALF}, ${HALF}) rotate(${(pointerAngle * 180) / Math.PI + 90})`}
              className="pointer-events-none"
            >
              <polygon
                points="0,-46 -6,-36 6,-36"
                fill={activeItem.accentHex}
              />
            </g>
          )}
        </svg>

        {/* Crisp Wedge Icons & Labels positioned on polar centers */}
        {wedges.map(({ item, idx, pos }) => {
          const isSelected = activeIdx === idx;
          return (
            <button
              key={item.id}
              type="button"
              onPointerEnter={() => setActiveIdx(idx)}
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playUiClick();
                onSelectEmote(item);
                onClose();
              }}
              aria-label={`Kirim emote ${item.label}`}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-xl px-1.5 py-1 transition-transform duration-100 cursor-pointer ${
                isSelected ? 'scale-115' : 'scale-100 hover:scale-110'
              }`}
              style={{
                left: pos.x,
                top: pos.y,
              }}
            >
              <span className="text-xl sm:text-2xl leading-none drop-shadow-sm">
                {item.icon}
              </span>
              <span
                className={`mt-1 text-[10px] font-extrabold tracking-wide leading-none whitespace-nowrap ${
                  isSelected ? 'text-white' : 'text-slate-200/90'
                }`}
              >
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* Center Hub Orb: Live Preview of Active Emote OR Close Trigger */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Tutup Emote Wheel"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[78px] h-[78px] rounded-full border bg-slate-950/96 flex flex-col items-center justify-center text-center shadow-inner transition-colors cursor-pointer"
          style={{
            borderColor: activeItem ? activeItem.accentHex : 'rgba(245, 158, 11, 0.45)',
          }}
        >
          {activeItem ? (
            <>
              <span className="text-2xl leading-none">{activeItem.icon}</span>
              <span
                className="mt-1 text-[10px] font-extrabold tracking-wide leading-none"
                style={{ color: activeItem.accentHex }}
              >
                {activeItem.shortLabel}
              </span>
            </>
          ) : (
            <>
              <X className="w-4 h-4 text-slate-300" />
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300/90">
                Emote
              </span>
              {playerName && (
                <span className="max-w-[60px] truncate text-[8px] text-slate-400">
                  {playerName}
                </span>
              )}
            </>
          )}
        </button>

        {/* Subtle Bottom Hint Strip */}
        <div className="pointer-events-none absolute left-1/2 -bottom-7 -translate-x-1/2 whitespace-nowrap rounded-lg border border-amber-500/25 bg-slate-950/90 px-2.5 py-0.5 text-[10px] font-medium text-slate-300 shadow-lg">
          {anchor.openedByHold
            ? activeItem
              ? `Lepas untuk kirim ${activeItem.label}`
              : 'Geser & lepas, atau ketuk emote'
            : 'Ketuk emote untuk mengirim'}
        </div>
      </div>
    </div>
  );
};
