import React from 'react';
import { BOARD_GAME_MODES, type BoardGameMode, type PlayerState } from '../../shared/gameConfig';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';

interface LoadingArenaScreenProps {
  boardMode: BoardGameMode;
  players: PlayerState[];
  progress?: number;
  stageText?: string;
  qualityLabel?: string;
}

export const LoadingArenaScreen: React.FC<LoadingArenaScreenProps> = ({
  boardMode,
  players,
  progress = 0.08,
  stageText = 'Membangun papan batu runik, ular spline, dan kamera dinamis...',
  qualityLabel,
}) => {
  const safeProgress = Math.max(0.05, Math.min(1, progress));
  const modeLabel =
    BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic Mode';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
        <div className="flex items-center justify-center gap-2.5">
          <SerpentCrestEmblem className="w-7 h-7" />
          <span className="font-display text-lg font-bold text-gold-gradient">
            Memasuki Arena 3D
          </span>
        </div>

        <div className="flex justify-center py-2">
          <AnimatedProgressRing
            progress={safeProgress}
            size={108}
            strokeWidth={6}
            tone={safeProgress >= 0.99 ? 'emerald' : 'amber'}
            pulse={safeProgress < 0.99}
          >
            <div className="flex flex-col items-center">
              <span className="font-mono-num text-xl font-bold text-amber-200">
                {Math.round(safeProgress * 100)}%
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {qualityLabel ? qualityLabel : 'Menyiapkan'}
              </span>
            </div>
          </AnimatedProgressRing>
        </div>

        <div>
          <div className="text-sm font-bold text-white">{modeLabel}</div>
          <p className="text-xs text-slate-300 mt-1 min-h-[2rem] leading-relaxed">
            {stageText}
          </p>
        </div>

        {players.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-800/90">
            {players.map((p) => (
              <div
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200"
              >
                <ArchetypeEmblem archetypeIndex={p.archetypeIndex} className="w-3.5 h-3.5" />
                <span className="truncate max-w-[100px] font-medium">{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
