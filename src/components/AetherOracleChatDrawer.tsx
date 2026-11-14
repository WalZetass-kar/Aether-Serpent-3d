import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Crown,
  Send,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type { BoardConfig } from '../../shared/boardThemes';
import {
  LADDERS,
  SNAKES,
  type BoardGameMode,
  type DifficultyMode,
  type PlayerState,
} from '../../shared/gameConfig';
import { SerpentCrestEmblem } from './FantasyIcons';

export type OraclePersona = 'tactician' | 'lorekeeper' | 'architect';
export type OracleSpeedMode = 'deep' | 'fast';

export interface OracleChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface AetherOracleChatDrawerProps {
  open: boolean;
  onClose: () => void;
  screen: string;
  boardConfig: BoardConfig;
  boardMode: BoardGameMode;
  difficulty: DifficultyMode;
  players: PlayerState[];
  currentTurnIndex: number;
}

const PERSONA_OPTIONS: Array<{
  id: OraclePersona;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'tactician',
    label: 'Taktis',
    desc: 'Peluang dadu 1-6, risiko ular & target tangga',
    icon: <Compass className="w-3.5 h-3.5" />,
  },
  {
    id: 'lorekeeper',
    label: 'Lore',
    desc: 'Kisah mistis 8 dunia Aether & legenda naga',
    icon: <Crown className="w-3.5 h-3.5" />,
  },
  {
    id: 'architect',
    label: 'Arsitek',
    desc: 'Tips desain papan 3D, posisi ular & tangga',
    icon: <Wand2 className="w-3.5 h-3.5" />,
  },
];

export const AetherOracleChatDrawer: React.FC<AetherOracleChatDrawerProps> = ({
  open,
  onClose,
  screen,
  boardConfig,
  boardMode,
  difficulty,
  players,
  currentTurnIndex,
}) => {
  const [persona, setPersona] = useState<OraclePersona>('tactician');
  const [speedMode, setSpeedMode] = useState<OracleSpeedMode>('deep');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<OracleChatMessage[]>(() => [
    {
      id: 'welcome-oracle',
      role: 'model',
      text: 'Salam, Penjelajah. Tanyakan peluang angka dadumu, posisi ular di depan, atau strategi terbaik untuk memenangkan giliran ini.',
      timestamp: Date.now(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activePlayer = players[currentTurnIndex] ?? players[0];
  const currentTile = activePlayer?.tile ?? 1;
  const activeLadders =
    boardConfig.ladders && boardConfig.ladders.length > 0 ? boardConfig.ladders : LADDERS;
  const activeSnakes =
    boardConfig.snakes && boardConfig.snakes.length > 0 ? boardConfig.snakes : SNAKES;

  const upcomingLadders = activeLadders
    .filter((l) => l.from > currentTile && l.from <= currentTile + 12)
    .map((l) => ({ from: l.from, to: l.to, dist: l.from - currentTile, name: l.name }))
    .sort((a, b) => a.dist - b.dist);

  const upcomingSnakes = activeSnakes
    .filter((s) => s.from > currentTile && s.from <= currentTile + 12)
    .map((s) => ({ from: s.from, to: s.to, dist: s.from - currentTile, name: s.name }))
    .sort((a, b) => a.dist - b.dist);

  const diceRangeLadders = upcomingLadders.filter((l) => l.dist >= 1 && l.dist <= 6);
  const diceRangeSnakes = upcomingSnakes.filter((s) => s.dist >= 1 && s.dist <= 6);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  if (!open) return null;

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMsg: OracleChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setOptionsOpen(false);
    setLoading(true);

    try {
      const opponentsSummary = players
        .map((p) => `${p.name}: Petak ${p.tile} (${p.score} poin, ${p.shields} perisai)`)
        .join(' | ');

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          persona,
          speedMode,
          gameContext: {
            screen,
            boardName: boardConfig.name,
            boardTheme: boardConfig.themeId,
            boardMode,
            difficulty,
            activePlayerName: activePlayer?.name ?? 'Penjelajah',
            activeTile: currentTile,
            activeShields: activePlayer?.shields ?? 0,
            activeScore: activePlayer?.score ?? 0,
            upcomingLadders,
            upcomingSnakes,
            opponentsSummary,
          },
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      const replyText =
        data.reply ||
        data.error ||
        'Maaf, koneksi Oracle sedang sibuk. Silakan coba sesaat lagi.';

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: replyText,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: `**Analisis Cepat (Petak ${currentTile}/100)**\n• Tangga jangkauan dadu: ${
            diceRangeLadders.length > 0
              ? diceRangeLadders.map((l) => `Dadu ${l.dist} (Petak ${l.from}→${l.to})`).join(', ')
              : 'Belum ada dalam 6 langkah'
          }\n• Ular jangkauan dadu: ${
            diceRangeSnakes.length > 0
              ? diceRangeSnakes.map((s) => `Dadu ${s.dist} (Petak ${s.from}→${s.to})`).join(', ')
              : 'Aman dari ular terdekat'
          }`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts =
    persona === 'lorekeeper'
      ? [
          { label: 'Kisah Papan Ini', prompt: `Ceritakan legenda singkat papan ${boardConfig.name}` },
          { label: 'Legenda Naga', prompt: 'Siapa naga penjaga di Lembah Aether?' },
          { label: 'Rahasia Petak 100', prompt: 'Apa rahasia Mahkota di Petak 100?' },
        ]
      : persona === 'architect'
        ? [
            { label: 'Tips Susun Ular & Tangga', prompt: 'Bagaimana cara menyusun posisi ular & tangga yang seimbang?' },
            { label: 'Rekomendasi Tema', prompt: 'Tema papan mana yang paling cocok untuk mode Battle?' },
          ]
        : [
            { label: `Peluang Dadu (P${currentTile})`, prompt: `Analisis peluang daduku dari Petak ${currentTile} sekarang` },
            { label: 'Cek Bahaya Ular', prompt: 'Angka dadu berapa yang harus kuhindari dari posisiku?' },
            { label: 'Tips Menang Cepat', prompt: `Bagaimana strategi menang di mode ${boardMode}?` },
          ];

  const renderFormattedText = (raw: string) => {
    const lines = raw.split('\n');
    return lines.map((line, lIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={lIdx} className={lIdx > 0 ? 'mt-2' : ''}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-semibold text-amber-200">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-xs">
      <div className="relative flex h-full w-full sm:max-w-[400px] flex-col border-l border-slate-800/90 bg-slate-950/96 shadow-2xl">
        {/* Clean Minimal Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <SerpentCrestEmblem className="h-6 w-6 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-amber-200 truncate">
                Oracle Aether AI
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                <span className="truncate">{boardConfig.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-num text-amber-300/90 shrink-0">
                  Petak {currentTile}/100
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setOptionsOpen((v) => !v)}
              title="Pengaturan Peran & Mode AI"
              aria-label="Pengaturan AI"
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                optionsOpen
                  ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                  : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Tutup Chat AI"
              aria-label="Tutup Chat AI"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:border-rose-500/40 hover:text-rose-200 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Collapsible AI Settings Drawer (Hidden by default to keep chat super clean) */}
        {optionsOpen && (
          <div className="border-b border-slate-800/90 bg-slate-900/95 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Gaya Penasihat AI</span>
              <button
                type="button"
                onClick={() => {
                  setMessages([
                    {
                      id: `welcome-${Date.now()}`,
                      role: 'model',
                      text: 'Percakapan telah direset. Silakan tanyakan strategi atau kisah papan.',
                      timestamp: Date.now(),
                    },
                  ]);
                  setOptionsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-300 hover:text-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Bersihkan Chat
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {PERSONA_OPTIONS.map((p) => {
                const active = persona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPersona(p.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">Kecepatan Respons</span>
              <div className="inline-flex rounded-xl border border-slate-800 bg-slate-950 p-0.5">
                <button
                  type="button"
                  onClick={() => setSpeedMode('deep')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    speedMode === 'deep'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Strategis
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedMode('fast')}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    speedMode === 'fast'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kilat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quiet 1-Line Unboxed Context Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-900 bg-slate-950/60 px-4 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <span>
              Tangga:{' '}
              <strong className="font-mono-num text-amber-300 font-semibold">
                {diceRangeLadders.length > 0
                  ? diceRangeLadders.map((l) => `Dadu ${l.dist}→${l.to}`).join(', ')
                  : 'Aman'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Ular:{' '}
              <strong className="font-mono-num text-rose-300 font-semibold">
                {diceRangeSnakes.length > 0
                  ? diceRangeSnakes.map((s) => `Dadu ${s.dist}→${s.to}`).join(', ')
                  : '0 Risiko'}
              </strong>
            </span>
          </div>
          <span className="font-mono-num text-sky-300 shrink-0">
            Perisai {activePlayer?.shields ?? 0}
          </span>
        </div>

        {/* Spacious, Uncluttered Message List */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-4 custom-scroll"
        >
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[86%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                    isUser
                      ? 'rounded-br-xs bg-amber-400 text-slate-950 font-medium'
                      : 'rounded-bl-xs border border-slate-800/90 bg-slate-900/85 text-slate-100'
                  }`}
                >
                  {renderFormattedText(msg.text)}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start">
              <div className="rounded-2xl rounded-bl-xs border border-slate-800 bg-slate-900/75 px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>Menyusun analisis...</span>
              </div>
            </div>
          )}
        </div>

        {/* Slim Single-Row Quick Suggestions + Clean Input */}
        <div className="border-t border-slate-800/80 bg-slate-950 p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {quickPrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={loading}
                onClick={() => void sendPrompt(item.prompt)}
                className="shrink-0 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-40"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPrompt(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan taktis..."
              className="flex-1 min-h-[44px] rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-amber-400/70 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Kirim Pesan"
              className="inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
