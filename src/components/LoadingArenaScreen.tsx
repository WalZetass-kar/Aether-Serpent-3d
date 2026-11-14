import React, { useEffect, useState } from 'react';
import {
  BOARD_GAME_MODES,
  LADDERS,
  SNAKES,
  type BoardGameMode,
  type ConnectionMode,
  type DifficultyMode,
  type PlayerState,
} from '../../shared/gameConfig';
import {
  BOARD_THEME_LABELS,
  type BoardConfig,
  type BoardThemeId,
} from '../../shared/boardThemes';
import { AnimatedProgressRing, type ProgressRingTone } from './AnimatedProgressRing';
import { ArchetypeEmblem, FacetedDiceIcon, SerpentCrestEmblem } from './FantasyIcons';

interface LoadingArenaScreenProps {
  boardMode: BoardGameMode;
  boardConfig?: BoardConfig;
  connectionMode?: ConnectionMode;
  difficulty?: DifficultyMode;
  players: PlayerState[];
  progress?: number;
  stageText?: string;
  qualityLabel?: string;
}

interface DustParticleSpec {
  id: number;
  left: string;
  top: string;
  sizePx: number;
  colorClass: string;
  duration: string;
  delay: string;
  drift: string;
}

const MAGICAL_DUST_PARTICLES: DustParticleSpec[] = [
  { id: 1, left: '10%', top: '80%', sizePx: 6, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.2s', delay: '0s', drift: '16px' },
  { id: 2, left: '20%', top: '66%', sizePx: 4, colorClass: 'bg-emerald-300 shadow-emerald-400/80', duration: '5.1s', delay: '0.6s', drift: '-14px' },
  { id: 3, left: '30%', top: '84%', sizePx: 5, colorClass: 'bg-amber-200 shadow-amber-300/80', duration: '4.7s', delay: '1.1s', drift: '12px' },
  { id: 4, left: '44%', top: '76%', sizePx: 7, colorClass: 'bg-sky-300 shadow-sky-400/80', duration: '5.4s', delay: '0.3s', drift: '-18px' },
  { id: 5, left: '56%', top: '85%', sizePx: 5, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.4s', delay: '0.9s', drift: '15px' },
  { id: 6, left: '68%', top: '70%', sizePx: 4, colorClass: 'bg-emerald-300 shadow-emerald-400/80', duration: '4.9s', delay: '1.4s', drift: '-12px' },
  { id: 7, left: '79%', top: '78%', sizePx: 6, colorClass: 'bg-amber-200 shadow-amber-400/80', duration: '4.6s', delay: '0.4s', drift: '18px' },
  { id: 8, left: '89%', top: '64%', sizePx: 5, colorClass: 'bg-sky-300 shadow-sky-400/80', duration: '5.2s', delay: '1.2s', drift: '-15px' },
  { id: 9, left: '16%', top: '34%', sizePx: 5, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.8s', delay: '0.8s', drift: '10px' },
  { id: 10, left: '35%', top: '26%', sizePx: 4, colorClass: 'bg-emerald-300 shadow-emerald-400/80', duration: '5.3s', delay: '1.6s', drift: '-14px' },
  { id: 11, left: '64%', top: '30%', sizePx: 6, colorClass: 'bg-amber-200 shadow-amber-300/80', duration: '4.5s', delay: '0.2s', drift: '14px' },
  { id: 12, left: '84%', top: '36%', sizePx: 4, colorClass: 'bg-emerald-200 shadow-emerald-400/80', duration: '5.0s', delay: '1.0s', drift: '-11px' },
  { id: 13, left: '25%', top: '50%', sizePx: 5, colorClass: 'bg-sky-200 shadow-sky-400/80', duration: '4.3s', delay: '1.5s', drift: '13px' },
  { id: 14, left: '75%', top: '48%', sizePx: 6, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.7s', delay: '0.7s', drift: '-16px' },
];

interface BuildStageSpec {
  id: string;
  shortLabel: string;
  threshold: number;
}

const BUILD_STAGES: BuildStageSpec[] = [
  { id: 'lighting', shortLabel: 'Atmosfer', threshold: 0.15 },
  { id: 'landscape', shortLabel: 'Lanskap 3D', threshold: 0.34 },
  { id: 'board', shortLabel: 'Papan & Ular', threshold: 0.56 },
  { id: 'shrines', shortLabel: 'Artefak & Pion', threshold: 0.76 },
  { id: 'shaders', shortLabel: 'Shader PBR', threshold: 0.91 },
];

const TACTICAL_TIPS: string[] = [
  'Petak Perisai Suci melindungi pion dari gigitan ular mistis dan dorongan lawan di Battle Mode.',
  'Ketuk ubin mana pun di papan 3D saat bermain untuk menginspeksi tujuan tangga atau bahaya ular.',
  'Di Team Mode 2v2, mendarat berdekatan dengan rekan satu tim memberikan bonus skor Sinergi Tim.',
  'Gunakan tombol Spasi di desktop atau ketuk dadu 3D langsung di atas altar untuk melempar dadu.',
];

function getThemeVisualAccent(themeId?: BoardThemeId): {
  ringTone: ProgressRingTone;
  auraPrimary: string;
  auraSecondary: string;
  barGradient: string;
  accentText: string;
} {
  switch (themeId) {
    case 'dragon_volcano':
      return {
        ringTone: 'rose',
        auraPrimary: 'bg-orange-500/15',
        auraSecondary: 'bg-rose-600/12',
        barGradient: 'from-rose-600 via-orange-500 to-amber-300',
        accentText: 'text-orange-300',
      };
    case 'frozen_kingdom':
    case 'atlantis_ocean':
    case 'celestial_sky':
      return {
        ringTone: 'sky',
        auraPrimary: 'bg-sky-500/15',
        auraSecondary: 'bg-cyan-400/12',
        barGradient: 'from-sky-600 via-cyan-400 to-teal-200',
        accentText: 'text-sky-300',
      };
    case 'enchanted_forest':
    case 'ancient_temple':
      return {
        ringTone: 'emerald',
        auraPrimary: 'bg-emerald-500/15',
        auraSecondary: 'bg-amber-500/12',
        barGradient: 'from-emerald-600 via-emerald-400 to-amber-300',
        accentText: 'text-emerald-300',
      };
    case 'lost_desert':
    case 'shadow_realm':
    default:
      return {
        ringTone: 'amber',
        auraPrimary: 'bg-amber-500/15',
        auraSecondary: 'bg-indigo-500/12',
        barGradient: 'from-amber-600 via-amber-400 to-yellow-200',
        accentText: 'text-amber-300',
      };
  }
}

export const LoadingArenaScreen: React.FC<LoadingArenaScreenProps> = ({
  boardMode,
  boardConfig,
  connectionMode = 'solo',
  difficulty = 'adaptive',
  players,
  progress = 0.08,
  stageText = 'Membangun papan batu runik, ular spline, dan kamera dinamis...',
  qualityLabel,
}) => {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TACTICAL_TIPS.length));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TACTICAL_TIPS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const safeProgress = Math.max(0.06, Math.min(1, progress));
  const pctInt = Math.round(safeProgress * 100);
  const isComplete = safeProgress >= 0.99;

  const modeLabel =
    BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic Mode';
  const themeId = boardConfig?.themeId ?? 'enchanted_forest';
  const themeLabel = BOARD_THEME_LABELS[themeId] ?? 'Enchanted Forest';
  const boardName = boardConfig?.name ?? 'Lembah Aether';
  const laddersCount = boardConfig?.ladders?.length ?? LADDERS.length;
  const snakesCount = boardConfig?.snakes?.length ?? SNAKES.length;
  const themeVisual = getThemeVisualAccent(themeId);

  const activeStageIdx = BUILD_STAGES.reduce(
    (acc, st, idx) => (safeProgress >= st.threshold ? idx : acc),
    0,
  );

  const connectionLabel =
    connectionMode === 'online'
      ? 'Multiplayer Online'
      : connectionMode === 'local'
        ? 'Multiplayer Lokal'
        : `Solo vs AI (${difficulty === 'adaptive' ? 'Adaptif' : difficulty})`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950 p-4 sm:p-6 overflow-hidden select-none">
      {/* 1. Ambient Sanctuary Backdrop, Radial Portal Glow & Floating Aether Particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Subtle radial perspective vignette */}
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, rgba(15, 23, 42, 0.25) 0%, rgba(2, 6, 23, 0.96) 76%)',
          }}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full ${themeVisual.auraPrimary} blur-3xl animate-progress-pulse`}
        />
        <div
          className={`absolute top-1/3 left-1/3 w-80 h-80 rounded-full ${themeVisual.auraSecondary} blur-3xl`}
        />

        {/* Subtle Sacred Geometry Concentric Background Rings */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] sm:w-[680px] sm:h-[680px] opacity-[0.09] text-amber-300 animate-astrolabe-ccw"
          viewBox="0 0 400 400"
          fill="none"
        >
          <circle cx="200" cy="200" r="188" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="0.75" />
          <polygon
            points="200,28 322,78 372,200 322,322 200,372 78,322 28,200 78,78"
            stroke="currentColor"
            strokeWidth="0.75"
          />
          <polygon
            points="200,52 348,200 200,348 52,200"
            stroke="currentColor"
            strokeWidth="0.75"
          />
        </svg>

        {MAGICAL_DUST_PARTICLES.map((p) => (
          <span
            key={p.id}
            className={`absolute rounded-full shadow-md animate-aether-dust ${p.colorClass}`}
            style={
              {
                left: p.left,
                top: p.top,
                width: `${p.sizePx}px`,
                height: `${p.sizePx}px`,
                '--dust-duration': p.duration,
                '--dust-delay': p.delay,
                '--dust-drift': p.drift,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 2. Main Sanctuary Portal Loading Panel */}
      <div className="relative z-10 w-full max-w-xl glass-panel rounded-3xl p-5 sm:p-7 text-center space-y-5 shadow-2xl">
        {/* Top Kicker & Board Destination Title */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className={`font-semibold ${themeVisual.accentText}`}>{themeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{modeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{connectionLabel}</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-gold-gradient tracking-wide">
            {boardName}
          </h1>
          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="font-mono-num text-emerald-300 font-semibold">
              {laddersCount} Tangga Suci
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num text-rose-300 font-semibold">
              {snakesCount} Ular Mistis
            </span>
            {qualityLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-200/90">Grafis {qualityLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* Central Arcane Astrolabe & Progress Portal */}
        <div className="relative flex items-center justify-center py-2">
          {/* Glowing portal aura behind the astrolabe */}
          <div
            className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 rounded-full ${themeVisual.auraPrimary} blur-2xl animate-progress-pulse`}
            aria-hidden="true"
          />

          {/* Outer Counter-Rotating Runic Compass Dial */}
          <svg
            className="pointer-events-none absolute w-44 h-44 sm:w-48 sm:h-48 text-amber-400/35 animate-astrolabe-ccw"
            viewBox="0 0 200 200"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
            <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6" />
            {/* 8 Cardinal & Intercardinal Astrolabe Notches */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <g key={deg} transform={`rotate(${deg} 100 100)`}>
                <line x1="100" y1="3" x2="100" y2="11" stroke="currentColor" strokeWidth="1.5" />
                <polygon points="100,13 97.5,17 100,21 102.5,17" fill="currentColor" fillOpacity="0.55" />
              </g>
            ))}
          </svg>

          {/* Inner Clockwise Sacred Octagram Frame */}
          <svg
            className="pointer-events-none absolute w-36 h-36 sm:w-40 sm:h-40 text-amber-300/25 animate-astrolabe-cw"
            viewBox="0 0 160 160"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="26"
              y="26"
              width="108"
              height="108"
              rx="6"
              stroke="currentColor"
              strokeWidth="1"
            />
            <rect
              x="26"
              y="26"
              width="108"
              height="108"
              rx="6"
              transform="rotate(45 80 80)"
              stroke="currentColor"
              strokeWidth="1"
            />
          </svg>

          {/* Primary Animated Progress Ring */}
          <AnimatedProgressRing
            progress={safeProgress}
            size={140}
            strokeWidth={6}
            tone={isComplete ? 'emerald' : themeVisual.ringTone}
            pulse={!isComplete}
          >
            <div className="flex flex-col items-center justify-center animate-portal-float">
              <div className="flex items-center gap-1.5 mb-0.5">
                <SerpentCrestEmblem className="w-5 h-5" />
                <FacetedDiceIcon className="w-4 h-4 text-amber-300" />
              </div>
              <span className="font-mono-num text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {pctInt}%
              </span>
              <span className="text-[10px] font-semibold text-amber-200/90 mt-0.5">
                {isComplete ? 'Arena Siap!' : `Tahap ${activeStageIdx + 1} / ${BUILD_STAGES.length}`}
              </span>
            </div>
          </AnimatedProgressRing>
        </div>

        {/* 5-Stage Real-Time WebGL2 Build Pipeline & Shimmer Bar */}
        <div className="space-y-2.5">
          {/* Stage Milestone Nodes */}
          <div className="grid grid-cols-5 gap-1.5 text-[10px] sm:text-[11px]">
            {BUILD_STAGES.map((st, idx) => {
              const isDone = safeProgress > st.threshold + 0.14 || isComplete;
              const isCurrent = idx === activeStageIdx && !isComplete;
              return (
                <div
                  key={st.id}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-1.5 transition-colors ${
                    isCurrent
                      ? 'border-amber-400/65 bg-amber-500/15 text-amber-200 font-bold'
                      : isDone
                        ? 'border-emerald-500/35 bg-emerald-950/25 text-emerald-300 font-semibold'
                        : 'border-slate-800/80 bg-slate-900/50 text-slate-500'
                  }`}
                >
                  <span className="font-mono-num text-[10px]">
                    {isDone ? '✓' : `0${idx + 1}`}
                  </span>
                  <span className="truncate max-w-full">{st.shortLabel}</span>
                </div>
              );
            })}
          </div>

          {/* Shimmering Linear Progress Track */}
          <div className="relative h-2.5 w-full rounded-full bg-slate-900/95 border border-slate-800 overflow-hidden p-0.5">
            <div
              className={`relative h-full rounded-full overflow-hidden transition-all duration-300 ease-out bg-gradient-to-r ${
                isComplete
                  ? 'from-emerald-500 via-emerald-400 to-teal-300'
                  : themeVisual.barGradient
              }`}
              style={{ width: `${pctInt}%` }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent animate-shimmer-sweep"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Current Detailed Stage Description */}
          <p className="text-xs text-slate-300 min-h-[1.25rem] leading-relaxed">
            {stageText}
          </p>
        </div>

        {/* Competing Players Roster Showcase */}
        {players.length > 0 && (
          <div className="pt-3 border-t border-slate-800/90 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/85 px-2.5 py-2 text-left"
                >
                  <ArchetypeEmblem
                    archetypeIndex={p.archetypeIndex}
                    className="w-5 h-5 shrink-0"
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {boardMode === 'team' && p.team
                        ? `Tim ${p.team === 'A' ? 'Surya' : 'Bulan'}`
                        : p.isAI
                          ? 'Penjaga AI'
                          : `Giliran #${idx + 1}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rotating Tactical Tip Footer */}
        <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
          <span className="font-semibold text-amber-300">Tips Arena: </span>
          <span>{TACTICAL_TIPS[tipIndex]}</span>
        </div>
      </div>
    </div>
  );
};
