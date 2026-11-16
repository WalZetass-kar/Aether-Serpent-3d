import React, { useEffect, useState } from 'react';
import { Clock, Globe, HardDrive, History, RefreshCw, Trophy, X } from 'lucide-react';
import { BOARD_GAME_MODES } from '../../shared/gameConfig';
import type { LocalScoreEntry } from '../services/storageService';
import { CrownVictoryEmblem } from './FantasyIcons';

interface GlobalEntry {
  id: string;
  playerName: string;
  score: number;
  turns: number;
  mode: string;
  difficulty: string;
  createdAt: string;
}

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
  localScores: LocalScoreEntry[];
  isOnline: boolean;
  currentPlayerName: string;
}

function formatMatchDuration(durationSec?: number, fallbackTurns = 1): string {
  const totalSec =
    typeof durationSec === 'number' && durationSec > 0
      ? Math.round(durationSec)
      : Math.max(12, fallbackTurns * 7);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins <= 0) return `${secs} dtk`;
  return `${mins}m ${String(secs).padStart(2, '0')}d`;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  onClose,
  localScores,
  isOnline,
  currentPlayerName,
}) => {
  const [tab, setTab] = useState<'global' | 'local' | 'history'>('global');
  const [modeFilter, setModeFilter] = useState<'all' | 'solo' | 'local' | 'online'>('all');
  const [globalEntries, setGlobalEntries] = useState<GlobalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobal = async () => {
    if (!isOnline) {
      setError('Anda sedang offline. Menampilkan papan skor lokal.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?mode=${modeFilter}&limit=30`);
      if (!res.ok) throw new Error('Gagal memuat papan peringkat global.');
      const data = (await res.json()) as { entries: GlobalEntry[] };
      setGlobalEntries(data.entries || []);
    } catch {
      setError('Tidak dapat terhubung ke server peringkat saat ini.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && tab === 'global') {
      void fetchGlobal();
    }
  }, [open, tab, modeFilter, isOnline]);

  if (!open) return null;

  const filteredLocal =
    modeFilter === 'all' ? localScores : localScores.filter((s) => s.mode === modeFilter);

  // 5 most recent matches sorted newest-first by createdAt
  const recentFiveMatches = [...filteredLocal]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <CrownVictoryEmblem className="w-6 h-6 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-bold text-gold-gradient">
              Papan Peringkat & Riwayat
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-slate-950/50 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTab('global')}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'global'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('local')}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'local'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Lokal Peramban</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('history')}
              className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                tab === 'history'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Pertandingan</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(['all', 'solo', 'local', 'online'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modeFilter === m
                    ? 'bg-slate-700 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'all' ? 'Semua' : m === 'solo' ? 'Solo' : m === 'local' ? 'Lokal' : 'Daring'}
              </button>
            ))}
            {tab === 'global' && (
              <button
                type="button"
                onClick={() => void fetchGlobal()}
                aria-label="Muat Ulang Peringkat"
                className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll space-y-2 flex-1">
          {tab === 'global' ? (
            <>
              {error && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200">
                  {error}
                </div>
              )}
              {loading && globalEntries.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Memuat peringkat dunia...
                </div>
              ) : globalEntries.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  Belum ada catatan skor global. Jadilah juara pertama yang mencatat rekor!
                </div>
              ) : (
                <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40">
                  {globalEntries.map((item, idx) => {
                    const isSelf =
                      item.playerName.toLowerCase() === currentPlayerName.toLowerCase();
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-3 px-4 py-3 ${
                          isSelf ? 'bg-amber-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`font-mono-num w-8 text-sm font-bold inline-flex items-center gap-1 ${
                              idx === 0
                                ? 'text-amber-300'
                                : idx === 1
                                  ? 'text-slate-200'
                                  : idx === 2
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                            }`}
                          >
                            {idx === 0 ? (
                              <CrownVictoryEmblem className="w-4 h-4 shrink-0" />
                            ) : (
                              `#${idx + 1}`
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {item.playerName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.mode} · {item.turns} giliran ·{' '}
                              {new Date(item.createdAt).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono-num text-base font-bold text-amber-300 shrink-0">
                          {item.score.toLocaleString('id-ID')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : tab === 'local' ? (
            filteredLocal.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                Belum ada skor tersimpan di peramban ini. Selesaikan satu pertandingan untuk mencatat skor lokal!
              </div>
            ) : (
              <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40">
                {filteredLocal.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono-num w-7 text-sm font-bold text-slate-400">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {item.playerName} {item.won ? '— Menang' : ''}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.mode} · {item.turns} giliran ·{' '}
                          {formatMatchDuration(item.durationSec, item.turns)} ·{' '}
                          {new Date(item.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono-num text-base font-bold text-emerald-300 shrink-0">
                      {item.score.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Riwayat Pertandingan (5 Hasil Pertandingan Terakhir Lokal) */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Menampilkan 5 pertandingan terakhir di perangkat ini</span>
                <span className="font-mono-num text-amber-300 font-semibold">
                  {recentFiveMatches.length}/5 Laga
                </span>
              </div>

              {recentFiveMatches.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400 rounded-xl border border-slate-800 bg-slate-950/40">
                  Belum ada riwayat pertandingan lokal. Mainkan pertandingan untuk melihat detail skor & durasi 5 laga terakhir!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentFiveMatches.map((item, idx) => {
                    const boardModeLabel =
                      BOARD_GAME_MODES.find((m) => m.id === item.boardMode)?.label.replace(
                        ' Mode',
                        '',
                      ) ?? 'Classic';
                    const formattedDuration = formatMatchDuration(item.durationSec, item.turns);
                    const dateObj = new Date(item.createdAt);
                    const dateTimeStr = `${dateObj.toLocaleDateString('id-ID', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })} · ${dateObj.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`;

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono-num text-xs font-bold shrink-0 ${
                              item.won
                                ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
                                : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                            }`}
                          >
                            #{idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">
                                {item.playerName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  item.won
                                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                                    : 'border-slate-700 bg-slate-800 text-slate-300'
                                }`}
                              >
                                {item.won ? 'Menang' : 'Selesai'}
                              </span>
                              <span className="text-[11px] text-amber-300/90 font-medium">
                                {boardModeLabel} ({item.mode === 'solo' ? 'Solo AI' : item.mode === 'local' ? 'Lokal' : 'Daring'})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span className="inline-flex items-center gap-1 text-slate-200">
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                                Durasi: <strong className="font-mono-num">{formattedDuration}</strong>
                              </span>
                              <span>·</span>
                              <span>
                                <strong className="font-mono-num text-slate-200">{item.turns}</strong> giliran
                              </span>
                              <span>·</span>
                              <span>{dateTimeStr}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0 shrink-0">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">
                            Total Skor
                          </span>
                          <span className="font-mono-num text-base font-bold text-amber-300 inline-flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            {item.score.toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Credit */}
        <footer className="px-4 sm:px-5 py-2.5 border-t border-slate-800/90 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>Aether Serpent 3D</span>
          <span>
            Developed By{' '}
            <a
              href="https://portfolionyaihwal.my.id"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
            >
              WalZetass
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
};
