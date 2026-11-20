import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import type { ConnectionMode } from '../../shared/gameConfig';

export interface ArenaChatMessage {
  id?: number | string;
  senderId?: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface ArenaChatDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: ArenaChatMessage[];
  currentPlayerId: string;
  mode: ConnectionMode;
  roomCode: string | null;
  readOnly?: boolean;
  onSendMessage: (text: string) => void;
}

const QUICK_CHAT_PHRASES = [
  'Main bagus!',
  'Hati-hati ular!',
  'Giliranmu!',
  'Gas ke 100!',
];

function formatMessageTime(ts: number): string {
  try {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export const ArenaChatDrawer: React.FC<ArenaChatDrawerProps> = ({
  open,
  onClose,
  messages,
  currentPlayerId,
  mode,
  roomCode,
  readOnly = false,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draft.trim().slice(0, 80);
    if (!clean) return;
    onSendMessage(clean);
    setDraft('');
  };

  return (
    <section
      aria-label="Obrolan Pemain di Arena"
      className="pointer-events-auto fixed right-2.5 sm:right-4 bottom-24 sm:bottom-28 z-40 flex w-[calc(100vw-1.25rem)] sm:w-80 md:w-96 max-h-[54vh] sm:max-h-[420px] flex-col rounded-2xl border border-amber-500/35 bg-slate-950/95 backdrop-blur-md shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 px-3.5 py-2.5 bg-slate-900/70 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-amber-300 shrink-0" />
          <div className="min-w-0 leading-tight">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">
              Obrolan Pemain
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              {readOnly
                ? roomCode
                  ? `Room #${roomCode} · Mode Penonton (Read-Only)`
                  : 'Mode Penonton (Read-Only)'
                : mode === 'online'
                  ? roomCode
                    ? `Room #${roomCode} · Live Multiplayer`
                    : 'Multiplayer Online'
                  : mode === 'local'
                    ? 'Catatan Arena Lokal'
                    : 'Obrolan Arena Solo'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Obrolan"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto custom-scroll px-3 py-2.5 space-y-2 min-h-[150px]">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center px-4">
            <MessageSquare className="w-6 h-6 text-slate-600 mb-1.5" />
            <p className="text-xs font-medium text-slate-400">
              Belum ada pesan di arena ini.
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kirim pesan singkat atau pilih balasan cepat di bawah untuk menyapa pemain lain.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = Boolean(msg.senderId && msg.senderId === currentPlayerId);
            return (
              <div
                key={msg.id ?? `${msg.timestamp}-${idx}`}
                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 px-1 mb-0.5 text-[10px] text-slate-400">
                  <span className={`font-semibold ${isMine ? 'text-amber-300' : 'text-sky-300'}`}>
                    {isMine ? `${msg.senderName} (Anda)` : msg.senderName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-num">{formatMessageTime(msg.timestamp)}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed break-words border ${
                    isMine
                      ? 'bg-amber-500/18 border-amber-400/40 text-amber-50'
                      : 'bg-slate-900/95 border-slate-800 text-slate-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      {readOnly ? (
        <div className="border-t border-slate-800 px-3.5 py-2.5 bg-slate-950 text-center text-[11px] text-sky-300/90 shrink-0">
          Mode Penonton (Read-Only) · Anda dapat membaca obrolan &amp; melihat gerakan papan secara langsung.
        </div>
      ) : (
        <>
          {/* Quick Phrases */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-800/70 px-3 py-1.5 bg-slate-900/40 shrink-0">
            {QUICK_CHAT_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => onSendMessage(phrase)}
                className="shrink-0 whitespace-nowrap rounded-lg border border-slate-700/80 bg-slate-900 px-2 py-1 text-[10px] sm:text-[11px] font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-slate-800 px-3 py-2.5 bg-slate-950 shrink-0"
          >
            <input
              type="text"
              maxLength={80}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tulis pesan ke pemain..."
              className="flex-1 min-w-0 min-h-[38px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Kirim Pesan"
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-45 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </section>
  );
};
