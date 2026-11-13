import React, { useState } from 'react';
import { Check, Copy, Home, RotateCcw, Share2, ShieldAlert, Swords, Users, X } from 'lucide-react';
import {
  BOARD_GAME_MODES,
  type BoardGameMode,
  type PlayerState,
  type TeamId,
} from '../../shared/gameConfig';
import { ArchetypeEmblem, CrownVictoryEmblem } from './FantasyIcons';

interface VictoryModalProps {
  open: boolean;
  winner: PlayerState | null;
  players: PlayerState[];
  boardMode: BoardGameMode;
  winningTeam: TeamId | null;
  timeExpired: boolean;
  isLocalWinner: boolean;
  canRematch?: boolean;
  globalRank: number | null;
  onRematch: () => void;
  onMainMenu: () => void;
  onClose: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  open,
  winner,
  players,
  boardMode,
  winningTeam,
  timeExpired,
  isLocalWinner,
  canRematch = true,
  globalRank,
  onRematch,
  onMainMenu,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!open || !winner) return null;

  const modeLabel = BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic Mode';
  const teamWinnerName =
    boardMode === 'team' && winningTeam
      ? winningTeam === 'A'
        ? 'Tim Surya'
        : 'Tim Bulan'
      : null;

  const headline = teamWinnerName
    ? isLocalWinner
      ? `${teamWinnerName} Menang!`
      : `${teamWinnerName} Menguasai Papan`
    : isLocalWinner
      ? `${winner.name} Menang!`
      : `${winner.name} Menaklukkan Takhta`;

  const subtitle = timeExpired
    ? `Waktu habis di ${modeLabel}! Ditentukan dari petak & skor tertinggi${
        globalRank ? ` · Global #${globalRank}` : ''
      }`
    : `${modeLabel} · Selesai dalam ${winner.turnsTaken} giliran${
        globalRank ? ` · Global #${globalRank}` : ''
      }`;

  const shareText = `Saya baru saja menyelesaikan Aether Serpent 3D (${modeLabel}) bersama ${winner.name} dengan skor ${winner.score.toLocaleString('id-ID')} poin!${
    globalRank ? ` (Peringkat Global #${globalRank})` : ''
  } Tantang saya di papan ular tangga fantasi 3D!`;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Skor Aether Serpent 3D',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // user canceled or unsupported
      }
    }
    await handleCopyShare();
  };

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const sorted = [...players].sort((a, b) => b.tile - a.tile || b.score - a.score);
  const teamAScore = players
    .filter((p) => p.team === 'A')
    .reduce((acc, p) => acc + p.score, 0);
  const teamBScore = players
    .filter((p) => p.team === 'B')
    .reduce((acc, p) => acc + p.score, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
                isLocalWinner
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-lg'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {isLocalWinner ? (
                <CrownVictoryEmblem className="w-7 h-7" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2
                className={`font-display text-xl font-bold ${
                  isLocalWinner ? 'text-gold-gradient' : 'text-slate-100'
                }`}
              >
                {headline}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Team Summary Bar in Team Mode */}
        {boardMode === 'team' && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div
              className={`rounded-xl border px-3 py-2.5 ${
                winningTeam === 'A'
                  ? 'border-amber-400/60 bg-amber-500/10'
                  : 'border-slate-800 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Users className="w-3.5 h-3.5" />
                Tim Surya (A)
              </div>
              <div className="font-mono-num text-sm font-bold text-white mt-0.5">
                {teamAScore.toLocaleString('id-ID')} poin
              </div>
            </div>
            <div
              className={`rounded-xl border px-3 py-2.5 ${
                winningTeam === 'B'
                  ? 'border-sky-400/60 bg-sky-500/10'
                  : 'border-slate-800 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Users className="w-3.5 h-3.5" />
                Tim Bulan (B)
              </div>
              <div className="font-mono-num text-sm font-bold text-white mt-0.5">
                {teamBScore.toLocaleString('id-ID')} poin
              </div>
            </div>
          </div>
        )}

        {/* Standings */}
        <div className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50">
          {sorted.map((p, idx) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`font-mono-num text-xs font-bold w-6 ${
                    idx === 0 ? 'text-amber-300' : 'text-slate-400'
                  }`}
                >
                  #{idx + 1}
                </span>
                <ArchetypeEmblem archetypeIndex={p.archetypeIndex} className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-white truncate">{p.name}</span>
                {boardMode === 'team' && p.team && (
                  <span
                    className={`text-[11px] font-semibold ${
                      p.team === 'A' ? 'text-amber-300' : 'text-sky-300'
                    }`}
                  >
                    ({p.team === 'A' ? 'Surya' : 'Bulan'})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 font-mono-num text-xs text-slate-300 shrink-0">
                {boardMode === 'battle' && (p.battleHits ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-rose-400">
                    <Swords className="w-3 h-3" />
                    {p.battleHits}
                  </span>
                )}
                <span>
                  Petak {p.tile} ·{' '}
                  <span className="text-amber-300 font-bold">{p.score.toLocaleString('id-ID')}</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Social Media Share */}
        <div className="mt-5 space-y-2">
          <div className="text-xs font-semibold text-slate-300">Bagikan Skor ke Teman</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-white hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-300" />
              Bagikan
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-lg bg-emerald-700/80 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors whitespace-nowrap"
            >
              WhatsApp
            </a>
            <a
              href={twitterHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-lg bg-sky-700/80 text-xs font-semibold text-white hover:bg-sky-600 transition-colors whitespace-nowrap"
            >
              Post ke X
            </a>
            <button
              type="button"
              onClick={() => void handleCopyShare()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Disalin' : 'Salin'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onMainMenu}
            className="sm:w-44 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-slate-800 text-amber-200 font-bold text-sm hover:bg-slate-700 hover:border-amber-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Home className="w-4 h-4 text-amber-400" />
            Menu Utama
          </button>
          <button
            type="button"
            disabled={!canRematch}
            onClick={onRematch}
            className="flex-1 min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            {canRematch ? 'Main Lagi' : 'Menunggu Host Memulai Ulang...'}
          </button>
        </div>
      </div>
    </div>
  );
};
