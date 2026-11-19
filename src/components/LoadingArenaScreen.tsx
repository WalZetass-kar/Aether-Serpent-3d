import React, { useEffect, useState } from 'react';
import {
  BOARD_GAME_MODES,
  LADDERS,
  PLAYER_ARCHETYPES,
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
import type { QualityPresetId } from '../three/perf/qualityPresets';
import { AnimatedProgressRing, type ProgressRingTone } from './AnimatedProgressRing';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';

interface LoadingArenaScreenProps {
  boardMode: BoardGameMode;
  boardConfig?: BoardConfig;
  connectionMode?: ConnectionMode;
  difficulty?: DifficultyMode;
  players: PlayerState[];
  progress?: number;
  stageText?: string;
  qualityLabel?: string;
  graphicsPreset?: QualityPresetId;
  onChangeGraphicsPreset?: (preset: QualityPresetId) => void;
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
  { id: 2, left: '22%', top: '66%', sizePx: 4, colorClass: 'bg-emerald-300 shadow-emerald-400/80', duration: '5.1s', delay: '0.6s', drift: '-14px' },
  { id: 3, left: '34%', top: '84%', sizePx: 5, colorClass: 'bg-amber-200 shadow-amber-300/80', duration: '4.7s', delay: '1.1s', drift: '12px' },
  { id: 4, left: '48%', top: '76%', sizePx: 6, colorClass: 'bg-sky-300 shadow-sky-400/80', duration: '5.4s', delay: '0.3s', drift: '-18px' },
  { id: 5, left: '62%', top: '85%', sizePx: 5, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.4s', delay: '0.9s', drift: '15px' },
  { id: 6, left: '76%', top: '70%', sizePx: 4, colorClass: 'bg-emerald-300 shadow-emerald-400/80', duration: '4.9s', delay: '1.4s', drift: '-12px' },
  { id: 7, left: '88%', top: '64%', sizePx: 5, colorClass: 'bg-sky-300 shadow-sky-400/80', duration: '5.2s', delay: '1.2s', drift: '-15px' },
  { id: 8, left: '16%', top: '32%', sizePx: 5, colorClass: 'bg-amber-300 shadow-amber-400/80', duration: '4.8s', delay: '0.8s', drift: '10px' },
  { id: 9, left: '66%', top: '28%', sizePx: 6, colorClass: 'bg-amber-200 shadow-amber-300/80', duration: '4.5s', delay: '0.2s', drift: '14px' },
  { id: 10, left: '84%', top: '36%', sizePx: 4, colorClass: 'bg-emerald-200 shadow-emerald-400/80', duration: '5.0s', delay: '1.0s', drift: '-11px' },
];

interface BuildStageSpec {
  id: string;
  shortLabel: string;
  detailLabel: string;
  threshold: number;
}

const BUILD_STAGES: BuildStageSpec[] = [
  { id: 'lighting', shortLabel: 'Atmosfer', detailLabel: 'Cahaya & Langit IBL', threshold: 0.12 },
  { id: 'landscape', shortLabel: 'Lanskap', detailLabel: 'Pulau, Air & Hutan', threshold: 0.26 },
  { id: 'board', shortLabel: 'Papan 100', detailLabel: 'Ubin Batu Runik', threshold: 0.42 },
  { id: 'ladders', shortLabel: 'Tangga', detailLabel: 'Tangga Suci 3D', threshold: 0.58 },
  { id: 'snakes', shortLabel: 'Ular 3D', detailLabel: 'Ular Spline & Kuil', threshold: 0.72 },
  { id: 'pawns', shortLabel: 'Pion & Dadu', detailLabel: 'Pahlawan & Altar', threshold: 0.86 },
  { id: 'shaders', shortLabel: 'Siap', detailLabel: 'Sinkronisasi Kamera', threshold: 0.95 },
];

const QUICK_PERF_OPTIONS: Array<{
  id: QualityPresetId;
  label: string;
  sub: string;
  badge: string;
}> = [
  {
    id: 'potato',
    label: 'Super Ringan',
    sub: 'Sangat Enteng · 60 FPS',
    badge: 'TERINGAN',
  },
  {
    id: 'low',
    label: 'Hemat & Lancar',
    sub: 'Optimal HP / Tablet',
    badge: 'HEMAT GPU',
  },
  {
    id: 'medium',
    label: 'HD Seimbang',
    sub: 'Bayangan Halus',
    badge: 'HD',
  },
  {
    id: 'auto',
    label: 'Otomatis',
    sub: 'Sesuai Perangkat',
    badge: 'AUTO',
  },
];

const TACTICAL_TIPS: string[] = [
  'Jika perangkat terasa berat, pilih mode "Super Ringan" atau "Hemat & Lancar" di atas untuk mendongkrak FPS.',
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
  badgeBorder: string;
} {
  switch (themeId) {
    case 'dragon_volcano':
    case 'sakura_shogun':
      return {
        ringTone: 'rose',
        auraPrimary: 'bg-rose-500/15',
        auraSecondary: 'bg-pink-600/12',
        barGradient: 'from-rose-600 via-pink-500 to-amber-300',
        accentText: 'text-rose-300',
        badgeBorder: 'border-rose-500/35 bg-rose-950/35 text-rose-200',
      };
    case 'frozen_kingdom':
    case 'atlantis_ocean':
    case 'celestial_sky':
    case 'cosmic_nebula':
      return {
        ringTone: 'sky',
        auraPrimary: 'bg-sky-500/15',
        auraSecondary: 'bg-violet-500/12',
        barGradient: 'from-violet-600 via-sky-400 to-cyan-200',
        accentText: 'text-sky-300',
        badgeBorder: 'border-sky-500/35 bg-sky-950/35 text-sky-200',
      };
    case 'enchanted_forest':
    case 'ancient_temple':
    case 'jade_palace':
      return {
        ringTone: 'emerald',
        auraPrimary: 'bg-emerald-500/15',
        auraSecondary: 'bg-amber-500/12',
        barGradient: 'from-emerald-600 via-emerald-400 to-amber-300',
        accentText: 'text-emerald-300',
        badgeBorder: 'border-emerald-500/35 bg-emerald-950/35 text-emerald-200',
      };
    case 'lost_desert':
    case 'shadow_realm':
    case 'clockwork_aether':
    default:
      return {
        ringTone: 'amber',
        auraPrimary: 'bg-amber-500/15',
        auraSecondary: 'bg-indigo-500/12',
        barGradient: 'from-amber-600 via-amber-400 to-yellow-200',
        accentText: 'text-amber-300',
        badgeBorder: 'border-amber-500/35 bg-amber-950/35 text-amber-200',
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
  graphicsPreset = 'auto',
  onChangeGraphicsPreset,
}) => {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TACTICAL_TIPS.length));
  const [displayPct, setDisplayPct] = useState(() => Math.round(Math.max(0.06, Math.min(1, progress)) * 100));

  useEffect(() => {
    const id = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TACTICAL_TIPS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  const targetProgress = Math.max(0.06, Math.min(1, progress));
  const targetPct = Math.round(targetProgress * 100);

  // Smoothly interpolate percentage counter so the UI feels fluid across every frame
  useEffect(() => {
    if (displayPct === targetPct) return;
    const step = targetPct > displayPct ? Math.max(1, Math.ceil((targetPct - displayPct) * 0.35)) : -1;
    const timer = window.setTimeout(() => {
      setDisplayPct((prev) => {
        if (step > 0) return Math.min(targetPct, prev + step);
        return Math.max(targetPct, prev + step);
      });
    }, 24);
    return () => window.clearTimeout(timer);
  }, [displayPct, targetPct]);

  const safeProgress = displayPct / 100;
  const pctInt = displayPct;
  const isComplete = targetProgress >= 0.99;

  const modeLabel =
    BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic Mode';
  const themeId = boardConfig?.themeId ?? 'enchanted_forest';
  const themeLabel = BOARD_THEME_LABELS[themeId] ?? 'Enchanted Forest';
  const boardName = boardConfig?.name ?? 'Lembah Aether';
  const laddersCount = boardConfig?.ladders?.length ?? LADDERS.length;
  const snakesCount = boardConfig?.snakes?.length ?? SNAKES.length;
  const themeVisual = getThemeVisualAccent(themeId);

  const activeStageIdx = BUILD_STAGES.reduce(
    (acc, st, idx) => (targetProgress >= st.threshold ? idx : acc),
    0,
  );
  const activeStage = BUILD_STAGES[activeStageIdx] ?? BUILD_STAGES[0];

  const connectionLabel =
    connectionMode === 'online'
      ? 'Multiplayer Online'
      : connectionMode === 'local'
        ? 'Multiplayer Lokal'
        : `Solo vs AI (${difficulty === 'adaptive' ? 'Adaptif' : difficulty})`;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-2.5 sm:p-5 md:p-6 overflow-x-hidden overflow-y-auto select-none">
      {/* 1. Ambient Sanctuary Backdrop, Radial Portal Glow & Floating Aether Particles */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              'radial-gradient(circle at 50% 38%, rgba(15, 23, 42, 0.28) 0%, rgba(2, 6, 23, 0.98) 76%)',
          }}
        />
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-[30rem] sm:h-[30rem] rounded-full ${themeVisual.auraPrimary} blur-3xl animate-progress-pulse`}
        />
        <div
          className={`hidden sm:block absolute top-1/3 left-1/3 w-72 h-72 rounded-full ${themeVisual.auraSecondary} blur-3xl`}
        />

        {/* Sacred Geometry Concentric Background Rings */}
        <svg
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] sm:w-[580px] sm:h-[580px] lg:w-[680px] lg:h-[680px] opacity-[0.08] text-amber-300 animate-astrolabe-ccw"
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

      {/* 2. Responsive Sanctuary Portal Loading Card (Mobile Single-Col / Tablet & Desktop 12-Col Grid) */}
      <div className="relative z-10 w-full max-w-lg md:max-w-3xl lg:max-w-4xl max-h-[94dvh] overflow-y-auto custom-scroll glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl border border-amber-400/25">
        {/* Top Header Bar: Theme, Mode & Active Quality */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3.5 sm:pb-4 border-b border-slate-800/80 text-center sm:text-left">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs text-slate-400">
              <span className={`font-bold ${themeVisual.accentText}`}>{themeLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-200 font-medium">{modeLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{connectionLabel}</span>
            </div>
            <h1 className="font-display text-lg sm:text-2xl md:text-3xl font-bold text-gold-gradient tracking-wide truncate mt-0.5">
              {boardName}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1.5 shrink-0">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-emerald-300">
              ↑ {laddersCount} Tangga
            </span>
            <span className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1 font-mono-num text-[11px] font-semibold text-rose-300">
              ↓ {snakesCount} Ular
            </span>
            {qualityLabel && (
              <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${themeVisual.badgeBorder}`}>
                ⚡ {qualityLabel}
              </span>
            )}
          </div>
        </div>

        {/* Main Body: Responsive 12-Col Grid on Tablet/Desktop, Stacked on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center py-4 sm:py-5">
          {/* Left Column (5 cols on md+): Arcane Astrolabe & Progress Ring */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center py-1 sm:py-2">
              <div
                className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 sm:w-36 sm:h-36 rounded-full ${themeVisual.auraPrimary} blur-2xl animate-progress-pulse`}
                aria-hidden="true"
              />

              {/* Outer Counter-Rotating Runic Compass Dial */}
              <svg
                className="pointer-events-none absolute w-36 h-36 sm:w-44 sm:h-44 text-amber-400/35 animate-astrolabe-ccw"
                viewBox="0 0 200 200"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="100" cy="100" r="94" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
                <circle cx="100" cy="100" r="86" stroke="currentColor" strokeWidth="0.75" strokeOpacity="0.6" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <g key={deg} transform={`rotate(${deg} 100 100)`}>
                    <line x1="100" y1="3" x2="100" y2="11" stroke="currentColor" strokeWidth="1.5" />
                    <polygon points="100,13 97.5,17 100,21 102.5,17" fill="currentColor" fillOpacity="0.55" />
                  </g>
                ))}
              </svg>

              {/* Inner Clockwise Sacred Octagram Frame */}
              <svg
                className="pointer-events-none absolute w-32 h-32 sm:w-36 sm:h-36 text-amber-300/25 animate-astrolabe-cw"
                viewBox="0 0 160 160"
                fill="none"
                aria-hidden="true"
              >
                <rect x="26" y="26" width="108" height="108" rx="6" stroke="currentColor" strokeWidth="1" />
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

              <AnimatedProgressRing
                progress={safeProgress}
                size={140}
                strokeWidth={6}
                tone={isComplete ? 'emerald' : themeVisual.ringTone}
                pulse={!isComplete}
              >
                <div className="flex flex-col items-center justify-center animate-portal-float">
                  <SerpentCrestEmblem className="w-10 h-10 sm:w-12 sm:h-12 mb-0.5" />
                  <span className="font-mono-num text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">
                    {pctInt}%
                  </span>
                  <span className="text-[10px] font-semibold text-amber-200/90 mt-0.5">
                    {isComplete
                      ? 'Arena Siap!'
                      : `Tahap ${activeStageIdx + 1}/${BUILD_STAGES.length}`}
                  </span>
                </div>
              </AnimatedProgressRing>
            </div>

            {/* Active Stage Pill */}
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/85 px-3 py-1.5 text-[11px] text-slate-200">
              <span
                className={`h-2 w-2 rounded-full ${
                  isComplete ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                }`}
              />
              <span className="font-semibold text-amber-200">{activeStage.detailLabel}</span>
            </div>
          </div>

          {/* Right Column (7 cols on md+): 7-Stage Pipeline, Progress Bar & Quick Performance Selector */}
          <div className="md:col-span-7 space-y-3.5 text-left">
            {/* Linear Progress Bar + Stage Text */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-200 truncate">{stageText}</span>
                <span className="font-mono-num font-bold text-amber-300 shrink-0">{pctInt}%</span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-slate-900/95 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`relative h-full rounded-full overflow-hidden transition-all duration-200 ease-out bg-gradient-to-r ${
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
            </div>

            {/* 7-Stage Grid Checklist (Responsive 4 cols on mobile, 7 cols on sm+) */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-[10px]">
              {BUILD_STAGES.map((st, idx) => {
                const isDone = targetProgress > st.threshold + 0.08 || isComplete || idx < activeStageIdx;
                const isCurrent = idx === activeStageIdx && !isComplete;
                return (
                  <div
                    key={st.id}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1.5 text-center transition-all ${
                      isCurrent
                        ? 'border-amber-400/75 bg-amber-500/15 text-amber-200 font-bold shadow-sm'
                        : isDone
                          ? 'border-emerald-500/35 bg-emerald-950/30 text-emerald-300 font-semibold'
                          : 'border-slate-800/80 bg-slate-900/50 text-slate-500'
                    }`}
                  >
                    <span className="font-mono-num text-[10px] leading-none">
                      {isDone ? '✓' : `0${idx + 1}`}
                    </span>
                    <span className="truncate max-w-full leading-tight">{st.shortLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Interactive Quick Performance Mode Switcher right on the Loading Screen */}
            {onChangeGraphicsPreset && (
              <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-2.5 sm:p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-amber-300">⚡</span>
                    <span>Mode Performa Game (Bisa Diubah Langsung)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Pilih Super Ringan jika terasa berat
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {QUICK_PERF_OPTIONS.map((opt) => {
                    const active = graphicsPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onChangeGraphicsPreset(opt.id)}
                        className={`rounded-xl border px-2.5 py-1.5 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-amber-400/75 bg-amber-500/20 text-amber-100 shadow-sm'
                            : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold truncate">{opt.label}</span>
                          <span
                            className={`text-[9px] font-mono-num font-bold px-1 py-0.5 rounded ${
                              active
                                ? 'bg-amber-400/25 text-amber-200'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{opt.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Competing Players Roster Showcase (Responsive Grid across Mobile, Tablet, Desktop) */}
        {players.length > 0 && (
          <div className="pt-3 border-t border-slate-800/90 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Pahlawan Bertanding ({players.length} Pemain)
              </span>
              <span className="text-slate-500">Pion 3D & Aether Trail Siap</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {players.map((p, idx) => {
                const arch = PLAYER_ARCHETYPES[p.archetypeIndex % PLAYER_ARCHETYPES.length];
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/85 px-2.5 py-2 text-left min-w-0"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                      style={{ backgroundColor: `${p.color}22`, color: p.color }}
                    >
                      <ArchetypeEmblem
                        archetypeIndex={p.archetypeIndex}
                        className="w-4 h-4 shrink-0"
                      />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {boardMode === 'team' && p.team
                          ? `Tim ${p.team === 'A' ? 'Surya' : 'Bulan'}`
                          : p.isAI
                            ? `AI · ${arch?.title ?? 'Hero'}`
                            : `Giliran #${idx + 1}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rotating Tactical Tip Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[11px] text-slate-400 leading-relaxed">
          <div className="truncate">
            <span className="font-semibold text-amber-300">Tips Arena: </span>
            <span>{TACTICAL_TIPS[tipIndex]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

