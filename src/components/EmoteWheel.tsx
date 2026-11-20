import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  EMOTE_SETS,
  getEmoteSetDef,
  isEmoteSetUnlocked,
  type EmoteSetId,
  type EmoteTone,
  type EmoteWheelItem,
} from '../../shared/gameConfig';
import { soundEngine } from '../audio/soundEngine';

export type { EmoteTone, EmoteWheelItem };

export const EMOTE_WHEEL_ITEMS: EmoteWheelItem[] = EMOTE_SETS[0].items;

export interface ResolvedEmoteVisual {
  icon: string;
  text: string;
  tone: EmoteTone;
  isAngry: boolean;
  isEmoteWheelItem: boolean;
}

const ALL_EMOTE_ITEMS: EmoteWheelItem[] = EMOTE_SETS.flatMap((set) => set.items);

/**
 * Matches any arena chat/emote string against all EmoteWheel sets so
 * incoming remote and local emotes render with expressive mood styling.
 */
export function resolveEmoteVisual(rawText: string): ResolvedEmoteVisual {
  const trimmed = rawText.trim();
  const lower = trimmed.toLowerCase();
  const matched = ALL_EMOTE_ITEMS.find(
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
      isAngry: Boolean(matched.isAngry || matched.id === 'angry'),
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
  emoteSetId?: EmoteSetId;
  unlockedAchievements?: string[];
  onSwitchEmoteSet?: (setId: EmoteSetId) => void;
  onOpenEmoteCustomizer?: () => void;
  onSelectEmote: (item: EmoteWheelItem) => void;
  onClose: () => void;
}

const WHEEL_SIZE = 256;
const HALF = WHEEL_SIZE / 2;
const OUTER_R = 118;
const INNER_R = 44;
const ICON_R = 82;
const DEADZONE_R = 28;
const SECTOR_COUNT = 6;
const SECTOR_ANGLE = (Math.PI * 2) / SECTOR_COUNT;
// Offset so index 0 sits centered at straight top (-90 deg)
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

function resolveSectorIndex(dx: number, dy: number, sectorCount: number): number | null {
  const dist = Math.hypot(dx, dy);
  if (dist < DEADZONE_R) return null;
  const sectorAngle = (Math.PI * 2) / sectorCount;
  const startOffset = -Math.PI / 2 - sectorAngle / 2;
  let angle = Math.atan2(dy, dx) - startOffset;
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return Math.floor(angle / sectorAngle) % sectorCount;
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({
  open,
  anchor,
  playerName,
  emoteSetId = 'classic_aether',
  unlockedAchievements = [],
  onSwitchEmoteSet,
  onOpenEmoteCustomizer,
  onSelectEmote,
  onClose,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [pointerAngle, setPointerAngle] = useState<number | null>(null);
  const activeIdxRef = useRef<number | null>(null);
  activeIdxRef.current = activeIdx;

  const unlockedSets = useMemo(
    () => EMOTE_SETS.filter((set) => isEmoteSetUnlocked(set.id, unlockedAchievements)),
    [unlockedAchievements],
  );

  const activeSet = useMemo(() => {
    if (isEmoteSetUnlocked(emoteSetId, unlockedAchievements)) {
      return getEmoteSetDef(emoteSetId);
    }
    return EMOTE_SETS[0];
  }, [emoteSetId, unlockedAchievements]);

  const activeItems = activeSet.items;
  const activeItemsRef = useRef<EmoteWheelItem[]>(activeItems);
  activeItemsRef.current = activeItems;

  // Clamp radial center strictly inside safe viewport bounds so wheel + top set bar never clip
  const center = useMemo(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
    const marginX = HALF + 16;
    const topMargin = HALF + 58;
    const bottomMargin = HALF + 38;
    const rawX = anchor?.x ?? vw / 2;
    const rawY = anchor?.y ?? vh / 2;
    return {
      x: Math.max(marginX, Math.min(vw - marginX, rawX)),
      y: Math.max(topMargin, Math.min(vh - bottomMargin, rawY)),
    };
  }, [anchor]);

  const wedges = useMemo(
    () =>
      activeItems.map((item, idx) => {
        const count = activeItems.length;
        const sectorAngle = (Math.PI * 2) / count;
        const startOffset = -Math.PI / 2 - sectorAngle / 2;
        const midAngle = startOffset + (idx + 0.5) * sectorAngle;
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
    [activeItems],
  );

  // Reset hover state on open or set switch
  useEffect(() => {
    if (open) {
      setActiveIdx(null);
      setPointerAngle(null);
    }
  }, [open, anchor, activeSet.id]);

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
      const count = activeItemsRef.current.length;
      if (dist > OUTER_R + 72) {
        if (anchor?.openedByHold) {
          setActiveIdx(resolveSectorIndex(dx, dy, count));
          setPointerAngle(Math.atan2(dy, dx));
        } else {
          setActiveIdx(null);
          setPointerAngle(null);
        }
        return;
      }
      const idx = resolveSectorIndex(dx, dy, count);
      setActiveIdx(idx);
      setPointerAngle(idx !== null ? Math.atan2(dy, dx) : null);
    };

    const handleGlobalUp = () => {
      if (!anchor?.openedByHold) return;
      const idx = activeIdxRef.current;
      if (idx !== null) {
        const chosen = activeItemsRef.current[idx];
        if (chosen) {
          soundEngine.playUiClick();
          onSelectEmote(chosen);
        }
        onClose();
      }
      // If released inside center deadzone, keep wheel open for tap selection
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

  const activeItem = activeIdx !== null ? activeItems[activeIdx] : null;

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

      {/* Compact Top Set Bar (Switch between unlocked sets or open customizer) */}
      <div
        className="absolute -translate-x-1/2 flex items-center gap-1 rounded-xl border border-slate-700/90 bg-slate-950/94 backdrop-blur-md px-1.5 py-1 shadow-xl max-w-[92vw] overflow-x-auto no-scrollbar"
        style={{
          left: center.x,
          top: Math.max(10, center.y - HALF - 44),
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onSwitchEmoteSet && unlockedSets.length > 1 ? (
          unlockedSets.map((set) => {
            const isActive = set.id === activeSet.id;
            return (
              <button
                key={set.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchEmoteSet(set.id);
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {set.items[0]?.icon} {set.name}
              </button>
            );
          })
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-bold text-amber-200 whitespace-nowrap shrink-0">
            {activeSet.items[0]?.icon} {activeSet.name}
          </span>
        )}
        {onOpenEmoteCustomizer && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.playUiClick();
              onClose();
              onOpenEmoteCustomizer();
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[10px] font-semibold text-sky-300 hover:border-sky-400/60 hover:text-sky-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Lihat progres & buka set emote baru"
          >
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            <span>Set ({unlockedSets.length}/{EMOTE_SETS.length})</span>
          </button>
        )}
      </div>

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
              : `0 0 28px ${activeSet.glowRgba}, 0 22px 48px rgba(2, 6, 23, 0.82)`,
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

          {/* Outer Obsidian Backing Disc & Theme Accent Ring */}
          <circle
            cx={HALF}
            cy={HALF}
            r={OUTER_R + 3}
            fill="url(#emoteWheelBg)"
            stroke={activeSet.themeHex}
            strokeOpacity="0.48"
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

          {/* Interactive Emote Wedges */}
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
            borderColor: activeItem ? activeItem.accentHex : activeSet.themeHex,
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
              <span
                className="mt-0.5 text-[9px] font-bold uppercase tracking-wider max-w-[66px] truncate"
                style={{ color: activeSet.themeHex }}
              >
                {activeSet.name.split(' ')[0]}
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
