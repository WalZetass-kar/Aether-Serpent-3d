import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe,
  Shield,
  SlidersHorizontal,
  Swords,
  Users,
} from 'lucide-react';
import { BOARD_GAME_MODES, type BoardGameMode } from '../../shared/gameConfig';
import { SerpentCrestEmblem } from './FantasyIcons';

interface ModeSelectionViewProps {
  selectedMode: BoardGameMode;
  onSelectMode: (mode: BoardGameMode) => void;
  onBack: () => void;
  onProceedToConfig: (mode: BoardGameMode) => void;
  onProceedToMultiplayer: (mode: BoardGameMode) => void;
}

const MODE_DETAILS: Record<
  BoardGameMode,
  {
    icon: React.ReactNode;
    accentBorder: string;
    accentBg: string;
    highlights: string[];
    playersLabel: string;
  }
> = {
  classic: {
    icon: <Shield className="w-6 h-6 text-amber-300" />,
    accentBorder: 'border-amber-400/70',
    accentBg: 'bg-amber-500/12',
    highlights: [
      'Aturan standar ular tangga menuju petak 100',
      'Tangga suci mempercepat langkah, ular menurunkan posisi',
      'Kotak berkah memberi perisai pelindung & lemparan ekstra',
    ],
    playersLabel: '2–4 Pemain',
  },
  battle: {
    icon: <Swords className="w-6 h-6 text-rose-400" />,
    accentBorder: 'border-rose-400/70',
    accentBg: 'bg-rose-500/12',
    highlights: [
      'Mendarat di petak lawan mendorongnya mundur 4 petak',
      'Mencuri +75 poin kemenangan setiap duel berhasil',
      'Perisai Suci dapat menangkis serangan dorongan lawan',
    ],
    playersLabel: '2–4 Pemain',
  },
  team: {
    icon: <Users className="w-6 h-6 text-sky-400" />,
    accentBorder: 'border-sky-400/70',
    accentBg: 'bg-sky-500/12',
    highlights: [
      'Kolaborasi 2 Tim: Tim Surya (A) vs Tim Bulan (B)',
      'Bertemu rekan tim memberi Sinergi +40 poin bersama',
      'Satu anggota tim mencapai petak 100 membawa kemenangan tim',
    ],
    playersLabel: '4 Pemain (2v2)',
  },
  time_attack: {
    icon: <Clock className="w-6 h-6 text-emerald-400" />,
    accentBorder: 'border-emerald-400/70',
    accentBg: 'bg-emerald-500/12',
    highlights: [
      'Pertandingan cepat dengan batas waktu 2–5 menit',
      'Raih petak 100 sebelum waktu habis untuk kemenangan mutlak',
      'Saat waktu habis, petak & skor tertinggi menjadi pemenang',
    ],
    playersLabel: '2–4 Pemain',
  },
};

export const ModeSelectionView: React.FC<ModeSelectionViewProps> = ({
  selectedMode,
  onSelectMode,
  onBack,
  onProceedToConfig,
  onProceedToMultiplayer,
}) => {
  const activeModeMeta =
    BOARD_GAME_MODES.find((m) => m.id === selectedMode) ?? BOARD_GAME_MODES[0];

  const activeDetail = MODE_DETAILS[selectedMode];

  return (
    <div className="relative z-10 flex flex-col w-full h-full safe-page-scroll overflow-y-auto custom-scroll">
      {/* Header */}
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between gap-2.5 mb-2.5 sm:mb-3.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="glass-panel-soft inline-flex items-center gap-1.5 sm:gap-2 min-h-[42px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Menu Utama</span>
        </button>

        <div className="glass-panel-soft rounded-xl min-h-[42px] px-3 sm:px-3.5 py-2 flex items-center gap-2 shrink-0">
          <SerpentCrestEmblem className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <span className="font-display text-xs sm:text-base font-bold text-gold-gradient whitespace-nowrap">
            Pilih Mode Permainan
          </span>
        </div>
      </header>

      {/* Main Selection Panel — Top-anchored cleanly below header (zero top dead gap) */}
      <main className="mx-auto w-full max-w-6xl shrink-0 overflow-hidden glass-panel rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-amber-300">
              Tahap 1 dari 2 · Aturan Pertandingan
            </div>
            <h2 className="font-display text-base sm:text-2xl font-bold text-white mt-0.5">
              Tentukan Gaya Pertarungan Papan 3D
            </h2>
          </div>
          <p className="hidden sm:block text-xs text-slate-300 max-w-md">
            Pilih salah satu dari 4 mode di bawah untuk mengatur aturan pertarungan sebelum masuk ke arena.
          </p>
        </div>

        {/* 4 Precision Mode Cards (2x2 on compact phones, 4-col on sm+ & desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 items-stretch">
          {BOARD_GAME_MODES.map((m) => {
            const detail = MODE_DETAILS[m.id];
            const active = selectedMode === m.id;
            const shortTitle = m.label.replace(' Mode', '');
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`h-full min-w-0 overflow-hidden relative flex flex-col items-start justify-between gap-2 rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all cursor-pointer ${
                  active
                    ? `${detail.accentBorder} ${detail.accentBg} shadow-lg ring-1 ring-amber-400/40`
                    : 'border-slate-700/80 bg-slate-900/75 hover:bg-slate-800/85 hover:border-slate-500'
                }`}
              >
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-700/90 bg-slate-950/85 flex items-center justify-center shrink-0">
                    {detail.icon}
                  </div>
                  {active && (
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                  )}
                </div>

                <div className="w-full min-w-0">
                  <h3 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                    {shortTitle}
                  </h3>
                  <p className="text-[11px] text-amber-200/90 font-medium mt-0.5 line-clamp-2 leading-snug">
                    {m.shortDesc}
                  </p>
                </div>

                <div className="w-full pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px] sm:text-[11px] font-semibold text-slate-400 min-w-0">
                  <span className="shrink-0">Pemain</span>
                  <span className="text-slate-200 font-mono-num truncate">
                    {detail.playersLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Mode Detailed Highlights & Route Buttons */}
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/75 p-3.5 sm:p-5 space-y-3.5 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                {activeDetail.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm sm:text-base font-bold text-amber-300 truncate">
                    {activeModeMeta.label}
                  </span>
                  <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300 shrink-0">
                    {activeDetail.playersLabel}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {activeModeMeta.rulesDesc}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Equal-Height Rule Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
            {activeDetail.highlights.map((item) => (
              <div
                key={item}
                className="h-full min-w-0 rounded-xl border border-slate-800/90 bg-slate-900/70 px-3 py-2.5 text-xs text-slate-200 leading-snug flex items-start gap-2"
              >
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span className="min-w-0">{item}</span>
              </div>
            ))}
          </div>

          {/* Primary Navigation Actions — Uniform height & baseline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => onProceedToMultiplayer(selectedMode)}
              className="min-w-0 inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border border-sky-500/45 bg-sky-500/15 text-xs sm:text-sm font-bold text-sky-200 hover:bg-sky-500/25 hover:border-sky-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-4 h-4 text-sky-300 shrink-0" />
              <span className="truncate">Lobi Multiplayer Daring</span>
            </button>
            <button
              type="button"
              onClick={() => onProceedToConfig(selectedMode)}
              className="min-w-0 inline-flex items-center justify-center gap-2 min-h-[46px] px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs sm:text-sm font-bold hover:brightness-105 transition-all cursor-pointer shadow-lg whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              <span className="truncate">Konfigurasi Solo / Lokal</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </main>

      <footer className="mt-auto pt-3 pb-1 shrink-0 text-center text-xs text-slate-400">
        Developed By{' '}
        <a
          href="https://portfolionyaihwal.my.id"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          WalZetass
        </a>
      </footer>
    </div>
  );
};
