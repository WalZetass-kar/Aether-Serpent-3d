import React, { useState } from 'react';
import { BookOpen, Camera, Compass, Home, Menu, MessageSquare, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react';
import {
  BOARD_GAME_MODES,
  ONLINE_TURN_TIMEOUT_SEC,
  type BoardGameMode,
  type ConnectionMode,
  type DifficultyMode,
} from '../../shared/gameConfig';
import type { QualityPresetId } from '../three/perf/qualityPresets';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { SerpentCrestEmblem } from './FantasyIcons';

interface HUDTopBarProps {
  mode: ConnectionMode;
  boardMode: BoardGameMode;
  difficulty: DifficultyMode;
  adaptiveTier: string;
  isOnline: boolean;
  muted: boolean;
  onlineRoomCode: string | null;
  pingMs: number | null;
  timeLeftSec: number | null;
  timeLimitSec: number;
  turnTimeLeftSec: number | null;
  isMyOnlineTurn: boolean;
  isAnimating: boolean;
  graphicsPreset?: QualityPresetId;
  unreadChatCount?: number;
  onQuickToggleLightweight?: () => void;
  onOpenChat?: () => void;
  onToggleMute: () => void;
  onOpenTutorial: () => void;
  onOpenCameraSettings?: () => void;
  onResetOverview?: () => void;
  onOpenOracleAI?: () => void;
  onReturnToMenu: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const HUDTopBar: React.FC<HUDTopBarProps> = ({
  mode,
  boardMode,
  difficulty,
  adaptiveTier,
  muted,
  onlineRoomCode,
  pingMs,
  timeLeftSec,
  timeLimitSec,
  turnTimeLeftSec,
  isMyOnlineTurn,
  isAnimating,
  graphicsPreset = 'auto',
  unreadChatCount = 0,
  onQuickToggleLightweight,
  onOpenChat,
  onToggleMute,
  onOpenTutorial,
  onOpenCameraSettings,
  onResetOverview,
  onOpenOracleAI,
  onReturnToMenu,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isLightMode = graphicsPreset === 'potato' || graphicsPreset === 'low';

  const modeLabel =
    BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic';
  const showTurnClock = mode === 'online' && turnTimeLeftSec !== null && !isAnimating;
  const turnUrgent = showTurnClock && (turnTimeLeftSec ?? 99) <= 5;
  const turnProgress = showTurnClock
    ? Math.max(0, Math.min(1, (turnTimeLeftSec ?? 0) / ONLINE_TURN_TIMEOUT_SEC))
    : 1;

  const showMatchClock = timeLeftSec !== null;
  const matchUrgent = showMatchClock && (timeLeftSec ?? 999) <= 20;
  const matchProgress = showMatchClock
    ? Math.max(0, Math.min(1, (timeLeftSec ?? 0) / Math.max(1, timeLimitSec)))
    : 1;

  const pingTone =
    pingMs === null
      ? 'text-slate-400'
      : pingMs < 90
        ? 'text-emerald-300'
        : pingMs < 180
          ? 'text-amber-300'
          : 'text-rose-300';

  return (
    <>
      <header className="pointer-events-none fixed safe-hud-top z-20 px-2 sm:px-4 pt-1.5 sm:pt-3 animate-hud-slide-in">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Slim Brand & Active Match Title */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-500/25 bg-slate-950/82 sm:bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md min-w-0">
            <SerpentCrestEmblem className="w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[11px] sm:text-sm font-bold text-gold-gradient truncate">
                  Aether Serpent 3D
                </span>
                {mode === 'online' && onlineRoomCode && (
                  <span className="font-mono-num text-[9px] sm:text-[11px] font-semibold text-amber-300 shrink-0">
                    #{onlineRoomCode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-slate-400 truncate">
                <span className="truncate">{modeLabel}</span>
                <span>·</span>
                <span className="truncate">
                  {mode === 'solo'
                    ? difficulty === 'adaptive'
                      ? `AI ${adaptiveTier}`
                      : `AI ${difficulty}`
                    : mode === 'local'
                      ? 'Lokal'
                      : 'Online'}
                </span>
                {mode === 'online' && pingMs !== null && (
                  <span className={`hidden sm:inline font-mono-num ${pingTone}`}>
                    · {pingMs} ms
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Timers + Tablet/Desktop Actions + Mobile Quick Controls */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {showMatchClock && (
              <div
                className={`flex items-center gap-1 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-md bg-slate-950/80 sm:bg-slate-950/90 backdrop-blur-md ${
                  matchUrgent ? 'border-rose-500/60' : 'border-amber-500/35'
                }`}
                title="Sisa Waktu Time Attack"
              >
                <AnimatedProgressRing
                  progress={matchProgress}
                  size={28}
                  strokeWidth={2.5}
                  tone="amber"
                  urgent={matchUrgent}
                >
                  <span
                    className={`font-mono-num text-[8px] font-bold ${
                      matchUrgent ? 'text-rose-200' : 'text-amber-200'
                    }`}
                  >
                    {Math.max(0, Math.ceil(timeLeftSec ?? 0))}
                  </span>
                </AnimatedProgressRing>
                <div className="hidden sm:block leading-tight pr-0.5">
                  <div className="text-[10px] text-slate-400">Waktu</div>
                  <div
                    className={`font-mono-num text-xs font-bold ${
                      matchUrgent ? 'text-rose-200' : 'text-amber-200'
                    }`}
                  >
                    {formatClock(timeLeftSec ?? 0)}
                  </div>
                </div>
              </div>
            )}

            {showTurnClock && (
              <div
                className={`flex items-center gap-1 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-md bg-slate-950/80 sm:bg-slate-950/90 backdrop-blur-md ${
                  turnUrgent
                    ? 'border-rose-500/70'
                    : isMyOnlineTurn
                      ? 'border-amber-400/60'
                      : 'border-sky-500/40'
                }`}
                title="Batas Waktu Lempar Dadu"
              >
                <AnimatedProgressRing
                  progress={turnProgress}
                  size={28}
                  strokeWidth={2.5}
                  tone={isMyOnlineTurn ? 'amber' : 'sky'}
                  urgent={turnUrgent}
                >
                  <span
                    className={`font-mono-num text-[9px] font-bold ${
                      turnUrgent
                        ? 'text-rose-200'
                        : isMyOnlineTurn
                          ? 'text-amber-200'
                          : 'text-sky-200'
                    }`}
                  >
                    {turnTimeLeftSec}
                  </span>
                </AnimatedProgressRing>
                <div className="hidden sm:block leading-tight pr-0.5">
                  <div className="text-[10px] text-slate-400">
                    {isMyOnlineTurn ? 'Giliranmu' : 'Giliran Lawan'}
                  </div>
                  <div className="font-mono-num text-xs font-bold text-slate-100">
                    {turnTimeLeftSec} dtk
                  </div>
                </div>
              </div>
            )}

            {/* 1-Tap Quick Lightweight Mode Toggle (Visible on Mobile, Tablet & Desktop) */}
            {onQuickToggleLightweight && (
              <button
                type="button"
                onClick={onQuickToggleLightweight}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border backdrop-blur-md h-9 sm:min-h-[38px] px-2 sm:px-2.5 text-[11px] font-bold transition-all cursor-pointer shadow-md ${
                  isLightMode
                    ? 'border-emerald-400/65 bg-emerald-500/20 text-emerald-200 hover:border-emerald-300'
                    : 'border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                }`}
                title={
                  isLightMode
                    ? 'Mode Super Ringan Aktif (Klik untuk ganti mode grafis)'
                    : 'Aktifkan Mode Super Ringan 60 FPS'
                }
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isLightMode ? 'text-emerald-300' : 'text-amber-300'}`} />
                <span className="hidden md:inline">
                  {isLightMode ? 'Mode Ringan ON' : 'Mode Ringan'}
                </span>
              </button>
            )}

            {/* Tablet & Desktop Action Buttons */}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="hidden sm:inline-flex relative items-center justify-center gap-1.5 rounded-xl border border-sky-400/45 bg-sky-500/15 backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-bold text-sky-200 hover:border-sky-300 hover:text-sky-100 shadow-lg transition-all cursor-pointer"
                title="Obrolan Sesama Pemain"
                aria-label="Buka Obrolan Pemain"
              >
                <MessageSquare className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="hidden md:inline">Chat</span>
                {unreadChatCount > 0 && (
                  <span className="font-mono-num inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-amber-400 text-[10px] font-extrabold text-slate-950">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            )}

            {onOpenOracleAI && (
              <button
                type="button"
                onClick={onOpenOracleAI}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/15 backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-bold text-amber-200 hover:border-amber-300 hover:text-amber-100 shadow-lg transition-all cursor-pointer"
                title="Oracle Aether AI — Penasihat Strategi"
              >
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="hidden md:inline">Oracle AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md w-[38px] h-[38px] text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
              title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
              aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenTutorial}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md w-[38px] h-[38px] text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
              title="Panduan Bermain"
              aria-label="Panduan Bermain"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReturnToMenu}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-semibold text-slate-200 hover:border-rose-400/50 hover:text-rose-200 transition-colors cursor-pointer"
              title="Kembali ke Menu Utama"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">Menu</span>
            </button>

            {/* Mobile Quick Chat Button */}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                aria-label="Buka Obrolan Pemain"
                className="sm:hidden relative inline-flex items-center justify-center rounded-xl border border-sky-400/45 bg-slate-950/85 backdrop-blur-md w-9 h-9 text-sky-200 shadow-md cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-sky-300" />
                {unreadChatCount > 0 && (
                  <span className="font-mono-num absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-md bg-amber-400 text-[9px] font-extrabold text-slate-950">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Single Menu Sidebar Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Menu Arena"
              className="sm:hidden inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-slate-950/80 backdrop-blur-md w-9 h-9 text-xs font-bold text-amber-200 shadow-md cursor-pointer"
            >
              <Menu className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile In-Game Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs sm:hidden">
          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-l border-slate-800 bg-slate-950/98 safe-drawer-inset space-y-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SerpentCrestEmblem className="w-5 h-5" />
                <span className="font-display text-sm font-bold text-amber-200">
                  Menu Arena
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Tutup Menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {onQuickToggleLightweight && (
                <button
                  type="button"
                  onClick={() => {
                    onQuickToggleLightweight();
                  }}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border text-xs font-bold ${
                    isLightMode
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Mode Ringan (60 FPS)</span>
                  </span>
                  <span className="font-mono-num text-[11px]">
                    {isLightMode ? 'AKTIF' : 'MATI'}
                  </span>
                </button>
              )}

              {onResetOverview && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onResetOverview();
                  }}
                  className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-200"
                >
                  <Compass className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Reset Pandangan Papan Penuh</span>
                </button>
              )}

              {onOpenCameraSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenCameraSettings();
                  }}
                  className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
                >
                  <Camera className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Kamera & Detail Grafis</span>
                </button>
              )}

              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenChat();
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-sky-400/45 bg-sky-500/15 text-xs font-bold text-sky-200"
                >
                  <span className="inline-flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>Obrolan Sesama Pemain</span>
                  </span>
                  {unreadChatCount > 0 && (
                    <span className="font-mono-num px-1.5 py-0.5 rounded bg-amber-400 text-[10px] font-extrabold text-slate-950">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {onOpenOracleAI && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenOracleAI();
                  }}
                  className="w-full flex items-center gap-3 min-h-[44px] px-3.5 rounded-xl border border-amber-400/50 bg-amber-500/15 text-xs font-bold text-amber-200"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Oracle Aether AI (Strategi)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onToggleMute();
                }}
                className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
              >
                <span className="inline-flex items-center gap-2.5">
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  Suara Permainan
                </span>
                <span className={muted ? 'text-rose-300' : 'text-emerald-300'}>
                  {muted ? 'Mati' : 'Aktif'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenTutorial();
                }}
                className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span>Panduan Bermain</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onReturnToMenu();
                }}
                className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-rose-500/35 bg-rose-950/25 text-xs font-semibold text-rose-200"
              >
                <Home className="w-4 h-4 text-rose-400" />
                <span>Kembali ke Menu Utama</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

