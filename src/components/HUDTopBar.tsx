import React from 'react';
import { BookOpen, Home, Volume2, VolumeX } from 'lucide-react';
import {
  BOARD_GAME_MODES,
  ONLINE_TURN_TIMEOUT_SEC,
  type BoardGameMode,
  type ConnectionMode,
  type DifficultyMode,
} from '../../shared/gameConfig';
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
  onToggleMute: () => void;
  onOpenTutorial: () => void;
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
  onToggleMute,
  onOpenTutorial,
  onReturnToMenu,
}) => {
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
    <header className="pointer-events-none fixed top-0 left-0 right-0 z-20 px-2.5 sm:px-4 pt-2 sm:pt-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        {/* Compact Brand & Active Match Mode */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 shadow-lg min-w-0">
          <SerpentCrestEmblem className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs sm:text-sm font-bold text-gold-gradient truncate">
                <span className="sm:hidden">{modeLabel}</span>
                <span className="hidden sm:inline">Aether Serpent 3D</span>
              </span>
              {mode === 'online' && onlineRoomCode && (
                <span className="font-mono-num text-[10px] sm:text-[11px] font-semibold text-amber-300">
                  #{onlineRoomCode}
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
              <span>{modeLabel}</span>
              <span>·</span>
              <span>
                {mode === 'solo'
                  ? difficulty === 'adaptive'
                    ? `AI ${adaptiveTier}`
                    : `AI ${difficulty}`
                  : mode === 'local'
                    ? 'Lokal'
                    : 'Online'}
              </span>
              {mode === 'online' && pingMs !== null && (
                <>
                  <span>·</span>
                  <span className={`font-mono-num ${pingTone}`}>{pingMs} ms</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Timers + Slim Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {showMatchClock && (
            <div
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 sm:px-2.5 py-1 shadow-lg bg-slate-950/90 backdrop-blur-md ${
                matchUrgent ? 'border-rose-500/60' : 'border-amber-500/35'
              }`}
              title="Sisa Waktu Time Attack"
            >
              <AnimatedProgressRing
                progress={matchProgress}
                size={34}
                strokeWidth={3}
                tone="amber"
                urgent={matchUrgent}
              >
                <span
                  className={`font-mono-num text-[9px] font-bold ${
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
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border px-2 sm:px-2.5 py-1 shadow-lg bg-slate-950/90 backdrop-blur-md ${
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
                size={34}
                strokeWidth={3}
                tone={isMyOnlineTurn ? 'amber' : 'sky'}
                urgent={turnUrgent}
              >
                <span
                  className={`font-mono-num text-[10px] font-bold ${
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

          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
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
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-[38px] sm:px-3 text-xs font-semibold text-slate-200 hover:border-rose-400/50 hover:text-rose-200 transition-colors cursor-pointer"
            title="Kembali ke Menu Utama"
            aria-label="Kembali ke Menu Utama"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
