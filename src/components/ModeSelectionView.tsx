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

  return (
    <div className="relative z-10 flex flex-col w-full h-full p-4 sm:p-6 lg:px-10 lg:py-7 overflow-y-auto custom-scroll">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          className="glass-panel-soft inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          Kembali ke Menu Utama
        </button>

        <div className="glass-panel-soft rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <SerpentCrestEmblem className="w-6 h-6 shrink-0" />
          <span className="font-display text-sm sm:text-base font-bold text-gold-gradient">
            Pilih Mode Permainan
          </span>
        </div>
      </header>

      {/* Main Selection Panel */}
      <main className="my-auto mx-auto w-full max-w-5xl glass-panel rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest font-bold text-amber-300">
              Tahap 1 dari 2 · Aturan Pertandingan
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
              Tentukan Gaya Pertarungan Papan 3D
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-md">
            Setiap mode mengubah dinamika petak, interaksi antar pemain, dan konfigurasi yang tersedia sebelum memasuki arena.
          </p>
        </div>

        {/* 4 Mode Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {BOARD_GAME_MODES.map((m) => {
            const detail = MODE_DETAILS[m.id];
            const active = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  active
                    ? `${detail.accentBorder} ${detail.accentBg} shadow-lg`
                    : 'border-slate-700/80 bg-slate-900/70 hover:bg-slate-800/85 hover:border-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="w-11 h-11 rounded-xl border border-slate-700 bg-slate-950/80 flex items-center justify-center">
                      {detail.icon}
                    </div>
                    {active && <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />}
                  </div>

                  <h3 className="font-display text-base font-bold text-white">{m.label}</h3>
                  <p className="text-xs text-amber-200/90 font-medium mt-0.5">{m.shortDesc}</p>

                  <ul className="mt-3 space-y-1.5">
                    {detail.highlights.map((item) => (
                      <li key={item} className="text-[11px] text-slate-300 leading-snug flex gap-1.5">
                        <span className="text-amber-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>Kapasitas</span>
                  <span className="text-slate-200">{detail.playersLabel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Mode Summary & Route Buttons */}
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/70 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-300">
              Mode Terpilih: {activeModeMeta.label}
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed max-w-2xl">
              {activeModeMeta.rulesDesc}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onProceedToMultiplayer(selectedMode)}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border border-sky-500/45 bg-sky-500/15 text-xs sm:text-sm font-bold text-sky-200 hover:bg-sky-500/25 hover:border-sky-400 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Globe className="w-4 h-4 text-sky-300" />
              Lobi Multiplayer Daring
            </button>
            <button
              type="button"
              onClick={() => onProceedToConfig(selectedMode)}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs sm:text-sm font-bold hover:brightness-105 transition-all cursor-pointer whitespace-nowrap shadow-lg"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Konfigurasi Solo / Lokal
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
