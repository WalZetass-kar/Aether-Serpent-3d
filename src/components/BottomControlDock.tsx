import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  Compass,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Smile,
  Trophy,
  X,
} from 'lucide-react';
import {
  ONLINE_TURN_TIMEOUT_SEC,
  getEmoteSetDef,
  type BoardGameMode,
  type ConnectionMode,
  type EmoteSetId,
  type PlayerState,
} from '../../shared/gameConfig';
import type { CameraMode } from '../three/DynamicCameraController';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { useEmoteLongPress, type EmoteWheelAnchor } from './EmoteWheel';
import { ArchetypeEmblem, FacetedDiceIcon } from './FantasyIcons';

export interface QuickEmoteItem {
  emoji: string;
  label: string;
}

export interface FantasyEmoteItem {
  id: string;
  icon: string;
  label: string;
  message: string;
}

export const FANTASY_EMOTES: FantasyEmoteItem[] = [
  { id: 'victory', icon: '👑', label: 'Victory!', message: '👑 Victory!' },
  { id: 'well_played', icon: '⚔️', label: 'Well Played!', message: '⚔️ Well Played!' },
  { id: 'oh_no', icon: '😱', label: 'Oh No!', message: '😱 Oh No!' },
  { id: 'for_aether', icon: '✨', label: 'For Aether!', message: '✨ For Aether!' },
  { id: 'ascend', icon: '🪜', label: 'Ascend!', message: '🪜 Ascend!' },
  { id: 'dragon_wrath', icon: '🐉', label: 'Dragon Wrath!', message: '🐉 Dragon Wrath!' },
];

export const QUICK_EMOTES: QuickEmoteItem[] = [
  { emoji: '😄', label: 'Senang' },
  { emoji: '🔥', label: 'Mantap' },
  { emoji: '👍', label: 'Keren' },
  { emoji: '😱', label: 'Kaget' },
  { emoji: '🐍', label: 'Ular!' },
  { emoji: '🪜', label: 'Tangga!' },
  { emoji: '🎲', label: 'Hoki' },
  { emoji: '👏', label: 'Hebat' },
];

interface BottomControlDockProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  players: PlayerState[];
  currentTurnIndex: number;
  lastRoll: number | null;
  canRoll: boolean;
  isAnimating: boolean;
  isMyOnlineTurn: boolean;
  turnTimeLeftSec: number | null;
  mode: ConnectionMode;
  boardMode: BoardGameMode;
  cameraMode: CameraMode;
  isSpectator?: boolean;
  onChangeCameraMode: (mode: CameraMode) => void;
  onResetOverview?: () => void;
  onOpenCameraSettings: () => void;
  onRollDice: () => void;
  onSendEmote?: (emoji: string) => void;
  equippedEmoteSetId?: EmoteSetId;
  localPlayerId?: string;
  onOpenEmoteWheel?: (anchor: EmoteWheelAnchor) => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenCloud: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  collapsed,
  onToggleCollapse,
  players,
  currentTurnIndex,
  lastRoll,
  canRoll,
  isAnimating,
  isMyOnlineTurn,
  turnTimeLeftSec,
  mode,
  boardMode,
  cameraMode,
  isSpectator = false,
  onChangeCameraMode,
  onResetOverview,
  onOpenCameraSettings,
  onRollDice,
  onSendEmote,
  equippedEmoteSetId = 'classic_aether',
  localPlayerId,
  onOpenEmoteWheel,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenCloud,
}) => {
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [recentEmoteId, setRecentEmoteId] = useState<string | null>(null);
  const activeEmoteSet = getEmoteSetDef(equippedEmoteSetId);
  const emoteRootDesktopRef = useRef<HTMLDivElement | null>(null);
  const emoteRootMobileRef = useRef<HTMLDivElement | null>(null);
  const mobileToolsRef = useRef<HTMLDivElement | null>(null);
  const emoteFeedbackTimerRef = useRef<number>(0);

  const active = players[currentTurnIndex] ?? players[0];
  const rollDisabled =
    isSpectator ||
    !canRoll ||
    isAnimating ||
    !active ||
    active.isAI ||
    (mode === 'online' && !isMyOnlineTurn);

  const rollLabel = isSpectator
    ? 'Mode Penonton'
    : isAnimating
      ? 'Berjalan...'
      : active?.isAI
        ? 'Giliran AI'
        : mode === 'online' && !isMyOnlineTurn
          ? 'Menunggu'
          : 'Lempar Dadu';

  const mobileRollLabel = isSpectator
    ? 'Tonton'
    : isAnimating
      ? 'Gerak'
      : active?.isAI
        ? 'AI'
        : mode === 'online' && !isMyOnlineTurn
          ? 'Tunggu'
          : 'Lempar';

  const cameraModeShortLabel =
    cameraMode === 'isometric'
      ? 'Papan'
      : cameraMode === 'auto_follow'
        ? 'Ikuti'
        : 'Dinamis';

  const handleCycleMobileCamera = () => {
    const order: CameraMode[] = ['cinematic', 'isometric', 'auto_follow'];
    const idx = order.indexOf(cameraMode);
    const next = order[(idx + 1) % order.length];
    onChangeCameraMode(next);
    if (next === 'isometric') {
      onResetOverview?.();
    }
  };

  const isActiveOwnAvatar = Boolean(
    !isSpectator &&
      active &&
      !active.isAI &&
      (mode === 'online' ? active.id === localPlayerId : true),
  );
  const avatarLongPress = useEmoteLongPress({
    enabled: Boolean(onOpenEmoteWheel && isActiveOwnAvatar),
    onLongPress: (anchor) => onOpenEmoteWheel?.(anchor),
  });

  const showEmoteButton = !isSpectator && mode === 'online' && Boolean(onSendEmote);
  const showRadialEmoteTrigger = !isSpectator && (Boolean(onOpenEmoteWheel) || showEmoteButton);
  const showTurnProgress = mode === 'online' && turnTimeLeftSec !== null && !isAnimating;
  const turnProgress = showTurnProgress
    ? Math.max(0, Math.min(1, (turnTimeLeftSec ?? 0) / ONLINE_TURN_TIMEOUT_SEC))
    : 1;
  const turnUrgent = showTurnProgress && (turnTimeLeftSec ?? 99) <= 5;

  // Close popovers cleanly on outside click or Escape
  useEffect(() => {
    if (!emoteMenuOpen && !mobileToolsOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        emoteMenuOpen &&
        !emoteRootDesktopRef.current?.contains(target) &&
        !emoteRootMobileRef.current?.contains(target)
      ) {
        setEmoteMenuOpen(false);
      }
      if (mobileToolsOpen && !mobileToolsRef.current?.contains(target)) {
        setMobileToolsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEmoteMenuOpen(false);
        setMobileToolsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [emoteMenuOpen, mobileToolsOpen]);

  useEffect(() => {
    return () => {
      window.clearTimeout(emoteFeedbackTimerRef.current);
    };
  }, []);

  const handleSelectEmote = (payload: string, emoteId?: string) => {
    onSendEmote?.(payload);
    setEmoteMenuOpen(false);
    if (emoteId) {
      setRecentEmoteId(emoteId);
      window.clearTimeout(emoteFeedbackTimerRef.current);
      emoteFeedbackTimerRef.current = window.setTimeout(() => setRecentEmoteId(null), 900);
    }
  };

  return (
    <>
      {/* Mobile Dedicated Fantasy Emote Row (bottom-left beside right thumb rail) */}
      {!collapsed && showEmoteButton && (
        <div
          role="toolbar"
          aria-label="Emote Fantasi Cepat"
          className="md:hidden fixed left-2 right-[5.25rem] z-20 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
          style={{ bottom: 'max(0.5rem, calc(var(--safe-bottom) + 0.375rem))' }}
        >
          {activeEmoteSet.items.map((item) => {
            const isSent = recentEmoteId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectEmote(item.payload, item.id)}
                className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap shrink-0 backdrop-blur-md shadow-md transition-all active:scale-95 cursor-pointer ${
                  isSent
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                    : 'border-amber-500/25 bg-slate-950/82 text-slate-100 hover:border-amber-400/60'
                }`}
                aria-label={`Kirim emote ${item.label}`}
              >
                <span className="leading-none">{item.icon}</span>
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* ===================================================================== */}
      {/* 1. MOBILE RIGHT-SIDE CONTROL RAIL (< md) — unobstructed center board   */}
      {/* ===================================================================== */}
      <div className="md:hidden fixed safe-dock-mobile z-20 flex flex-col items-end gap-1.5">
        {collapsed ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/35 bg-slate-950/80 backdrop-blur-md min-h-[40px] px-2.5 text-[11px] font-semibold text-amber-200 shadow-md cursor-pointer"
              aria-label="Tampilkan Kontrol"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>HUD</span>
            </button>
            <button
              type="button"
              onClick={handleCycleMobileCamera}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 backdrop-blur-md min-h-[40px] px-2.5 text-[11px] font-semibold text-slate-200 shadow-md cursor-pointer"
              aria-label="Ganti Sudut Pandang Kamera"
            >
              <Compass className="w-3.5 h-3.5 text-amber-300" />
              <span>{cameraModeShortLabel}</span>
            </button>
            {isSpectator ? (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-500/20 min-h-[40px] px-3 text-xs font-bold text-sky-200 shadow-lg">
                <Eye className="w-4 h-4" />
                <span>Read-Only</span>
              </div>
            ) : (
              <button
                type="button"
                disabled={rollDisabled}
                onClick={onRollDice}
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl min-h-[40px] min-w-[44px] px-3 text-xs font-bold shadow-lg transition-all cursor-pointer ${
                  rollDisabled
                    ? 'border border-slate-700 bg-slate-900/85 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/25 active:scale-95'
                }`}
                aria-label={rollLabel}
              >
                <FacetedDiceIcon className="w-4 h-4" />
                <span>{mobileRollLabel}</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Compact Active Turn Pill Card (Long-press own avatar for Emote Wheel) */}
            {active && (
              <div
                {...(isActiveOwnAvatar ? avatarLongPress.bind : {})}
                title={isActiveOwnAvatar ? 'Tahan avatar untuk Emote Wheel' : undefined}
                className={`flex items-center gap-1.5 rounded-xl border backdrop-blur-md px-2 py-1 shadow-md max-w-[152px] transition-all select-none ${
                  isActiveOwnAvatar && avatarLongPress.isHolding
                    ? 'border-amber-400 bg-amber-500/20 scale-95 ring-2 ring-amber-400/50'
                    : 'border-amber-500/25 bg-slate-950/78'
                } ${isActiveOwnAvatar ? 'cursor-pointer' : ''}`}
              >
                {showTurnProgress ? (
                  <AnimatedProgressRing
                    progress={turnProgress}
                    size={26}
                    strokeWidth={2.5}
                    tone={isMyOnlineTurn ? 'amber' : 'sky'}
                    urgent={turnUrgent}
                  >
                    <ArchetypeEmblem archetypeIndex={active.archetypeIndex} className="w-3 h-3" />
                  </AnimatedProgressRing>
                ) : (
                  <ArchetypeEmblem archetypeIndex={active.archetypeIndex} className="w-4 h-4 shrink-0" />
                )}
                <div className="min-w-0 leading-tight">
                  <div className="text-[10px] font-bold text-white truncate">
                    {active.name}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-slate-300">
                    <span className="font-mono-num text-amber-300 font-semibold">P{active.tile}</span>
                    {boardMode === 'team' && active.team && (
                      <span className={active.team === 'A' ? 'text-amber-300' : 'text-sky-300'}>
                        T{active.team}
                      </span>
                    )}
                    {lastRoll !== null && (
                      <span className="font-mono-num text-slate-200">· {lastRoll}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Right-Side Stacked Control Rail */}
            <div className="flex flex-col items-end gap-1.5">
              {/* 1-Tap Quick Camera / Full Board View Switcher */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700/75 bg-slate-950/78 backdrop-blur-md w-9 h-9 text-slate-300 hover:text-amber-200 shadow-md cursor-pointer"
                  title="Mode Pandang Leluasa (Sembunyikan Panel)"
                  aria-label="Mode Pandang Leluasa"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleCycleMobileCamera}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-slate-950/80 backdrop-blur-md h-9 px-2.5 text-[10px] font-bold text-amber-200 shadow-md active:scale-95 transition-transform cursor-pointer"
                  title="Ganti Sudut Pandang Kamera (Dinamis / Papan Penuh / Ikuti)"
                  aria-label="Ganti Sudut Pandang Kamera"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{cameraModeShortLabel}</span>
                </button>
              </div>

              {/* Collapsible Secondary Tools Drawer (opens to the left of right rail) */}
              <div ref={mobileToolsRef} className="relative flex items-center gap-1.5">
                {mobileToolsOpen && (
                  <div className="absolute right-full bottom-0 mr-2 w-56 max-w-[calc(100dvw-5rem)] rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-xl p-3 shadow-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-amber-200">Kontrol Arena</span>
                      <button
                        type="button"
                        onClick={() => setMobileToolsOpen(false)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                        aria-label="Tutup Menu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        Sudut Kamera 3D
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['cinematic', 'auto_follow', 'isometric'] as CameraMode[]).map((cm) => {
                          const label =
                            cm === 'cinematic'
                              ? 'Dinamis'
                              : cm === 'auto_follow'
                                ? 'Ikuti'
                                : 'Papan';
                          return (
                            <button
                              key={cm}
                              type="button"
                              onClick={() => {
                                onChangeCameraMode(cm);
                                if (cm === 'isometric') onResetOverview?.();
                              }}
                              className={`min-h-[34px] rounded-lg px-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                                cameraMode === cm
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {onResetOverview && (
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onResetOverview();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 min-h-[36px] rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-[11px] font-semibold text-emerald-200 cursor-pointer"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Reset Pandang Papan Penuh</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onOpenCameraSettings();
                        }}
                        className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-300" />
                        <span>Grafis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onOpenLeaderboard();
                        }}
                        className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>Skor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onOpenAchievements();
                        }}
                        className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-300" />
                        <span>Misi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onOpenCloud();
                        }}
                        className="flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
                      >
                        <Cloud className="w-3.5 h-3.5 text-amber-300" />
                        <span>Cloud</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileToolsOpen(false);
                        onToggleCollapse();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 min-h-[38px] rounded-xl border border-slate-700/70 bg-slate-900/70 text-xs text-slate-300 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Mode Pandang Leluasa</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEmoteMenuOpen(false);
                    setMobileToolsOpen((o) => !o);
                  }}
                  className={`inline-flex items-center justify-center rounded-xl border backdrop-blur-md w-10 h-10 shadow-md transition-colors cursor-pointer ${
                    mobileToolsOpen
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700/80 bg-slate-950/80 text-slate-200 hover:border-amber-400/50'
                  }`}
                  aria-label="Menu Kontrol & Pengaturan"
                  title="Menu Kontrol & Pengaturan"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Emote Wheel Trigger (Mobile Right Rail — all Arena modes) */}
              {showRadialEmoteTrigger && (
                <div ref={emoteRootMobileRef} className="relative flex items-center">
                  {!onOpenEmoteWheel && emoteMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Pilih Emote Multiplayer"
                      className="absolute right-full bottom-0 mr-2 w-56 max-w-[calc(100dvw-5rem)] rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-xl p-2.5 shadow-2xl"
                    >
                      <div className="text-[11px] font-semibold text-amber-200 mb-1.5 px-1">
                        Kirim Emote
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {QUICK_EMOTES.map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            onClick={() => handleSelectEmote(item.emoji)}
                            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 hover:border-amber-400/60 hover:bg-slate-800 min-h-[42px] min-w-[42px] text-lg transition-transform active:scale-95 cursor-pointer"
                            title={item.label}
                            aria-label={`Emote ${item.label}`}
                          >
                            <span>{item.emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      setMobileToolsOpen(false);
                      if (onOpenEmoteWheel) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        onOpenEmoteWheel({
                          x: rect.left - 80,
                          y: rect.top - 40,
                          openedByHold: false,
                        });
                      } else {
                        setEmoteMenuOpen((o) => !o);
                      }
                    }}
                    className={`inline-flex items-center justify-center rounded-xl border backdrop-blur-md w-10 h-10 shadow-md transition-colors cursor-pointer ${
                      emoteMenuOpen
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-amber-500/35 bg-slate-950/80 text-amber-200 hover:border-amber-400/70'
                    }`}
                    aria-label="Buka Emote Wheel"
                    title="Buka Emote Wheel"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Primary Right-Thumb Roll Dice CTA (replaced with Read-Only badge when spectating) */}
              {isSpectator ? (
                <div className="flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-sky-400/50 bg-sky-950/85 min-w-[60px] min-h-[56px] px-2.5 py-1.5 text-[10px] font-bold text-sky-200 shadow-xl">
                  <Eye className="w-5 h-5 text-sky-300" />
                  <span className="leading-none">Tonton</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={rollDisabled}
                  onClick={onRollDice}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl min-w-[60px] min-h-[56px] px-2.5 py-1.5 text-[11px] font-bold shadow-xl transition-all cursor-pointer ${
                    rollDisabled
                      ? 'border border-slate-700 bg-slate-900/85 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-amber-500/30 active:scale-95'
                  }`}
                  aria-label={rollLabel}
                >
                  <FacetedDiceIcon className="w-5 h-5" />
                  <span className="leading-none">{mobileRollLabel}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. DESKTOP BOTTOM CONTROL DOCK (>= md)                                */}
      {/* ===================================================================== */}
      {collapsed ? (
        <div className="hidden md:block fixed safe-dock-desktop left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-slate-950/90 backdrop-blur-md px-4 py-2 text-xs font-semibold text-amber-200 shadow-xl hover:border-amber-400 cursor-pointer"
          >
            <ChevronUp className="w-4 h-4" />
            <span>Tampilkan Kontrol</span>
          </button>
        </div>
      ) : (
        <div className="hidden md:flex flex-col gap-1.5 pointer-events-none fixed safe-dock-desktop left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl">
          {/* Dedicated Fantasy Emote Button Row (Multiplayer Online) */}
          {showEmoteButton && (
            <div
              role="toolbar"
              aria-label="Emote Fantasi Cepat"
              className="pointer-events-auto mx-auto flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar rounded-xl border border-amber-500/25 bg-slate-950/85 backdrop-blur-md px-2.5 py-1.5 shadow-lg"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90 px-1 shrink-0">
                {activeEmoteSet.name}
              </span>
              {activeEmoteSet.items.map((item) => {
                const isSent = recentEmoteId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectEmote(item.payload, item.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 cursor-pointer ${
                      isSent
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-slate-700/80 bg-slate-900/90 text-slate-100 hover:border-amber-400/60 hover:text-amber-200'
                    }`}
                    title={`Kirim "${item.label}" ke Room`}
                    aria-label={`Kirim emote ${item.label}`}
                  >
                    <span className="leading-none">{item.icon}</span>
                    <span>{item.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="pointer-events-auto glass-panel rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            {/* Active Turn Info (Long-press own avatar for Emote Wheel) */}
            <div
              {...(isActiveOwnAvatar ? avatarLongPress.bind : {})}
              title={isActiveOwnAvatar ? 'Tahan avatar untuk Emote Wheel' : undefined}
              className={`flex items-center gap-2.5 min-w-0 rounded-xl px-1.5 py-1 -mx-1.5 transition-all select-none ${
                isActiveOwnAvatar && avatarLongPress.isHolding
                  ? 'bg-amber-500/20 ring-2 ring-amber-400/60 scale-95'
                  : isActiveOwnAvatar
                    ? 'hover:bg-slate-800/45 cursor-pointer'
                    : ''
              }`}
            >
              {active && (
                <>
                  {showTurnProgress ? (
                    <AnimatedProgressRing
                      progress={turnProgress}
                      size={40}
                      strokeWidth={3.5}
                      tone={isMyOnlineTurn ? 'amber' : 'sky'}
                      urgent={turnUrgent}
                    >
                      <ArchetypeEmblem
                        archetypeIndex={active.archetypeIndex}
                        className="w-4 h-4"
                      />
                    </AnimatedProgressRing>
                  ) : (
                    <ArchetypeEmblem
                      archetypeIndex={active.archetypeIndex}
                      className="w-6 h-6 shrink-0"
                    />
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-white truncate">
                      <span className="truncate">{active.name}</span>
                      {boardMode === 'team' && active.team && (
                        <span
                          className={`text-[10px] font-bold ${
                            active.team === 'A' ? 'text-amber-300' : 'text-sky-300'
                          }`}
                        >
                          · Tim {active.team}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>
                        Petak{' '}
                        <strong className="font-mono-num text-amber-300">
                          {active.tile}
                        </strong>
                      </span>
                      {lastRoll !== null && (
                        <span>
                          · Dadu:{' '}
                          <strong className="font-mono-num text-slate-200">
                            {lastRoll}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Center Primary Roll CTA + Multiplayer Emote Picker */}
            <div className="flex items-center gap-2 shrink-0">
              {isSpectator ? (
                <div className="inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-sky-400/50 bg-sky-500/15 px-4 py-2 text-xs font-bold text-sky-200 whitespace-nowrap">
                  <Eye className="w-4 h-4 text-sky-300 shrink-0" />
                  <span>Mode Penonton (Read-Only)</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={rollDisabled}
                  onClick={onRollDice}
                  className={`inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl px-5 py-2 text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                    rollDisabled
                      ? 'border border-slate-700 bg-slate-800/80 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95'
                  }`}
                >
                  <FacetedDiceIcon className="w-5 h-5 shrink-0" />
                  <span>{rollLabel}</span>
                </button>
              )}

              {showRadialEmoteTrigger && (
                <div ref={emoteRootDesktopRef} className="relative">
                  {!onOpenEmoteWheel && emoteMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Pilih Emote Multiplayer"
                      className="absolute bottom-full right-0 mb-2.5 w-60 rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-xl p-3 shadow-2xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-200">
                          Emote Cepat
                        </span>
                        <span className="text-[10px] text-slate-400">Kirim ke Room</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {QUICK_EMOTES.map((item) => (
                          <button
                            key={item.emoji}
                            type="button"
                            onClick={() => handleSelectEmote(item.emoji)}
                            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 hover:border-amber-400/60 hover:bg-slate-800 py-2 text-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                            title={item.label}
                            aria-label={`Emote ${item.label}`}
                          >
                            <span>{item.emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      if (onOpenEmoteWheel) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        onOpenEmoteWheel({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 132,
                          openedByHold: false,
                        });
                      } else {
                        setEmoteMenuOpen((o) => !o);
                      }
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      emoteMenuOpen
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-amber-500/35 bg-slate-900/80 text-amber-200 hover:border-amber-400/70 hover:bg-amber-500/15'
                    }`}
                    title="Buka Emote Wheel"
                    aria-label="Buka Emote Wheel"
                  >
                    <Smile className="w-4 h-4 shrink-0" />
                    <span>Emote</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera & Secondary Utility Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center min-h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 p-1 text-[11px]">
                {(['cinematic', 'auto_follow', 'isometric'] as CameraMode[]).map((cm) => {
                  const label =
                    cm === 'cinematic'
                      ? 'Dinamis'
                      : cm === 'auto_follow'
                        ? 'Ikuti'
                        : 'Papan';
                  return (
                    <button
                      key={cm}
                      type="button"
                      onClick={() => onChangeCameraMode(cm)}
                      className={`inline-flex items-center justify-center min-h-[30px] px-2.5 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        cameraMode === cm
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onOpenCameraSettings}
                className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
                title="Pengaturan Kamera & Grafis"
                aria-label="Pengaturan Kamera & Grafis"
              >
                <Camera className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
                title="Peringkat"
                aria-label="Peringkat"
              >
                <Trophy className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenAchievements}
                className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
                title="Pencapaian & Misi"
                aria-label="Pencapaian & Misi"
              >
                <Award className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenCloud}
                className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer shrink-0"
                title="Simpan Cloud"
                aria-label="Simpan Cloud"
              >
                <Cloud className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border border-slate-700/80 bg-slate-900/75 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Sembunyikan Kontrol (H)"
                aria-label="Sembunyikan Kontrol"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
