import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Smile,
  Trophy,
  X,
} from 'lucide-react';
import {
  ONLINE_TURN_TIMEOUT_SEC,
  type BoardGameMode,
  type ConnectionMode,
  type PlayerState,
} from '../../shared/gameConfig';
import type { CameraMode } from '../three/DynamicCameraController';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { ArchetypeEmblem, FacetedDiceIcon } from './FantasyIcons';

export interface QuickEmoteItem {
  emoji: string;
  label: string;
}

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
  onChangeCameraMode: (mode: CameraMode) => void;
  onOpenCameraSettings: () => void;
  onRollDice: () => void;
  onSendEmote?: (emoji: string) => void;
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
  onChangeCameraMode,
  onOpenCameraSettings,
  onRollDice,
  onSendEmote,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenCloud,
}) => {
  const [emoteMenuOpen, setEmoteMenuOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const emoteRootDesktopRef = useRef<HTMLDivElement | null>(null);
  const emoteRootMobileRef = useRef<HTMLDivElement | null>(null);
  const mobileToolsRef = useRef<HTMLDivElement | null>(null);

  const active = players[currentTurnIndex] ?? players[0];
  const rollDisabled =
    !canRoll ||
    isAnimating ||
    !active ||
    active.isAI ||
    (mode === 'online' && !isMyOnlineTurn);

  const rollLabel = isAnimating
    ? 'Berjalan...'
    : active?.isAI
      ? 'Giliran AI'
      : mode === 'online' && !isMyOnlineTurn
        ? 'Menunggu'
        : 'Lempar Dadu';

  const mobileRollLabel = isAnimating
    ? 'Gerak'
    : active?.isAI
      ? 'AI'
      : mode === 'online' && !isMyOnlineTurn
        ? 'Tunggu'
        : 'Lempar';

  const showEmoteButton = mode === 'online' && Boolean(onSendEmote);
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

  const handleSelectEmote = (emoji: string) => {
    onSendEmote?.(emoji);
    setEmoteMenuOpen(false);
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* 1. MOBILE RIGHT-SIDE CONTROL RAIL (< md) — unobstructed center board   */}
      {/* ===================================================================== */}
      <div className="md:hidden fixed right-2.5 bottom-3 z-20 flex flex-col items-end gap-2">
        {collapsed ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-amber-500/40 bg-slate-950/90 backdrop-blur-md min-h-[44px] px-3 text-xs font-semibold text-amber-200 shadow-lg cursor-pointer"
              aria-label="Tampilkan Kontrol"
            >
              <Eye className="w-4 h-4" />
              <span>Kontrol</span>
            </button>
            <button
              type="button"
              disabled={rollDisabled}
              onClick={onRollDice}
              className={`inline-flex items-center justify-center gap-1.5 rounded-2xl min-h-[44px] min-w-[44px] px-3 text-xs font-bold shadow-lg transition-all cursor-pointer ${
                rollDisabled
                  ? 'border border-slate-700 bg-slate-900/90 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/25 active:scale-95'
              }`}
              aria-label={rollLabel}
            >
              <FacetedDiceIcon className="w-5 h-5" />
              <span>{mobileRollLabel}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Compact Active Turn Pill Card */}
            {active && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 shadow-lg max-w-[172px]">
                {showTurnProgress ? (
                  <AnimatedProgressRing
                    progress={turnProgress}
                    size={30}
                    strokeWidth={3}
                    tone={isMyOnlineTurn ? 'amber' : 'sky'}
                    urgent={turnUrgent}
                  >
                    <ArchetypeEmblem archetypeIndex={active.archetypeIndex} className="w-3.5 h-3.5" />
                  </AnimatedProgressRing>
                ) : (
                  <ArchetypeEmblem archetypeIndex={active.archetypeIndex} className="w-5 h-5 shrink-0" />
                )}
                <div className="min-w-0 leading-tight">
                  <div className="text-[11px] font-bold text-white truncate">
                    {active.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-mono-num text-amber-300 font-semibold">P{active.tile}</span>
                    {boardMode === 'team' && active.team && (
                      <span className={active.team === 'A' ? 'text-amber-300' : 'text-sky-300'}>
                        Tim {active.team}
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
            <div className="flex flex-col items-end gap-2">
              {/* Collapsible Secondary Tools Drawer (opens to the left of right rail) */}
              <div ref={mobileToolsRef} className="relative flex items-center gap-2">
                {mobileToolsOpen && (
                  <div className="absolute right-full bottom-0 mr-2 w-56 rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-xl p-3 shadow-2xl space-y-2.5">
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
                        Mode Kamera
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
                              onClick={() => onChangeCameraMode(cm)}
                              className={`min-h-[36px] rounded-lg px-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
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

                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileToolsOpen(false);
                          onOpenCameraSettings();
                        }}
                        className="flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
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
                        className="flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
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
                        className="flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
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
                        className="flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700/80 bg-slate-900 text-xs font-medium text-slate-200 cursor-pointer"
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
                      className="w-full flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-700/70 bg-slate-900/70 text-xs text-slate-300 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Sembunyikan Panel</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEmoteMenuOpen(false);
                    setMobileToolsOpen((o) => !o);
                  }}
                  className={`inline-flex items-center justify-center rounded-2xl border backdrop-blur-md min-w-[44px] min-h-[44px] shadow-lg transition-colors cursor-pointer ${
                    mobileToolsOpen
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-amber-400/50'
                  }`}
                  aria-label="Menu Kontrol & Pengaturan"
                  title="Menu Kontrol & Pengaturan"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Multiplayer Emote Picker Trigger (Mobile Right Rail) */}
              {showEmoteButton && (
                <div ref={emoteRootMobileRef} className="relative flex items-center">
                  {emoteMenuOpen && (
                    <div
                      role="menu"
                      aria-label="Pilih Emote Multiplayer"
                      className="absolute right-full bottom-0 mr-2 w-56 rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-xl p-2.5 shadow-2xl"
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
                            className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 hover:border-amber-400/60 hover:bg-slate-800 min-h-[44px] min-w-[44px] text-lg transition-transform active:scale-95 cursor-pointer"
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
                    onClick={() => {
                      setMobileToolsOpen(false);
                      setEmoteMenuOpen((o) => !o);
                    }}
                    className={`inline-flex items-center justify-center rounded-2xl border backdrop-blur-md min-w-[44px] min-h-[44px] shadow-lg transition-colors cursor-pointer ${
                      emoteMenuOpen
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-amber-400/50'
                    }`}
                    aria-label="Kirim Emote"
                    title="Kirim Emote"
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Primary Right-Thumb Roll Dice CTA */}
              <button
                type="button"
                disabled={rollDisabled}
                onClick={onRollDice}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl min-w-[68px] min-h-[64px] px-3 py-2 text-xs font-bold shadow-xl transition-all cursor-pointer ${
                  rollDisabled
                    ? 'border border-slate-700 bg-slate-900/90 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-amber-500/30 active:scale-95'
                }`}
                aria-label={rollLabel}
              >
                <FacetedDiceIcon className="w-6 h-6" />
                <span className="leading-none">{mobileRollLabel}</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 2. DESKTOP BOTTOM CONTROL DOCK (>= md)                                */}
      {/* ===================================================================== */}
      {collapsed ? (
        <div className="hidden md:block fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
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
        <div className="hidden md:block pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94vw] max-w-4xl">
          <div className="pointer-events-auto glass-panel rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            {/* Active Turn Info */}
            <div className="flex items-center gap-2.5 min-w-0">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={rollDisabled}
                onClick={onRollDice}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                  rollDisabled
                    ? 'border border-slate-700 bg-slate-800/80 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 active:scale-95'
                }`}
              >
                <FacetedDiceIcon className="w-5 h-5" />
                <span>{rollLabel}</span>
              </button>

              {showEmoteButton && (
                <div ref={emoteRootDesktopRef} className="relative">
                  {emoteMenuOpen && (
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
                    onClick={() => setEmoteMenuOpen((o) => !o)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                      emoteMenuOpen
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                    title="Kirim Emote"
                    aria-label="Kirim Emote"
                  >
                    <Smile className="w-4 h-4" />
                    <span>Emote</span>
                  </button>
                </div>
              )}
            </div>

            {/* Camera & Secondary Utility Controls */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-0.5 text-[11px]">
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
                      className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer ${
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
                className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-2 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                title="Pengaturan Kamera & Grafis"
                aria-label="Pengaturan Kamera & Grafis"
              >
                <Camera className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-2 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                title="Peringkat"
                aria-label="Peringkat"
              >
                <Trophy className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenAchievements}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-2 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                title="Pencapaian & Misi"
                aria-label="Pencapaian & Misi"
              >
                <Award className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenCloud}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-2 text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
                title="Simpan Cloud"
                aria-label="Simpan Cloud"
              >
                <Cloud className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onToggleCollapse}
                className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/75 p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
