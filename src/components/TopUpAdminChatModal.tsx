import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CheckCircle2,
  Coins,
  Crown,
  LogIn,
  MessageCircle,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AETHER_COIN_PACKS, type AetherCoinPack } from '../../shared/boardThemes';
import { ADMIN_EMAIL } from '../services/adminService';
import {
  markTopUpThreadReadByMember,
  sendMemberTopUpMessage,
  subscribeToMemberTopUpThread,
  subscribeToTopUpMessages,
  type TopUpChatMessage,
  type TopUpChatThread,
} from '../services/topUpChatService';
import { soundEngine } from '../audio/soundEngine';

interface TopUpAdminChatModalProps {
  user: User | null;
  displayName: string;
  currentCoins: number;
  initialBoardRequestName?: string | null;
  onOpenAuth?: () => void;
  onClose: () => void;
}

function formatTimeId(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TopUpAdminChatModal: React.FC<TopUpAdminChatModalProps> = ({
  user,
  displayName,
  currentCoins,
  initialBoardRequestName,
  onOpenAuth,
  onClose,
}) => {
  const [thread, setThread] = useState<TopUpChatThread | null>(null);
  const [messages, setMessages] = useState<TopUpChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isVerifiedUser = Boolean(user && user.emailVerified);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setThread(null);
      setMessages([]);
      return;
    }

    const unsubThread = subscribeToMemberTopUpThread(user, (nextThread) => {
      setThread(nextThread);
      if (nextThread && nextThread.unreadByMember > 0) {
        void markTopUpThreadReadByMember(user);
      }
    });

    const unsubMsgs = subscribeToTopUpMessages(
      user.uid,
      false,
      (list) => {
        setMessages(list);
      },
      () => {
        // Thread may not exist yet before first message
      },
    );

    return () => {
      unsubThread();
      unsubMsgs();
    };
  }, [user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSendText = async (
    textToSend: string,
    pack?: AetherCoinPack,
  ) => {
    if (!user || !user.emailVerified) return;
    const clean = textToSend.trim();
    if (!clean) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await sendMemberTopUpMessage(user, displayName, clean, {
        packId: pack?.id,
        packName: pack ? `${pack.name} (${pack.priceIdr})` : undefined,
      });
      soundEngine.playUiClick();
      if (!pack) {
        setDraft('');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim pesan ke Admin.');
    } finally {
      setSending(false);
    }
  };

  const handleOrderPack = (pack: AetherCoinPack) => {
    setSelectedPackId(pack.id);
    const totalCoins = pack.coins + pack.bonusCoins;
    const boardNote = initialBoardRequestName
      ? ` untuk membuka papan "${initialBoardRequestName}"`
      : '';
    const orderText = pack.unlockAllPremium
      ? `Halo Admin, saya ingin memesan ${pack.name} (${pack.priceIdr} — Buka semua papan Premium + ${totalCoins.toLocaleString('id-ID')} Koin)${boardNote}. Mohon info nomor rekening / QRIS untuk pembayaran ya!`
      : `Halo Admin, saya ingin beli paket ${pack.name} (${totalCoins.toLocaleString('id-ID')} Koin Aether · ${pack.priceIdr})${boardNote}. Mohon info metode pembayarannya ya!`;

    void handleSendText(orderText, pack);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/40 bg-[#080d1a] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Pembelian Resmi Koin Aether via Chat Admin</span>
            </div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-0.5 truncate">
              Beli Koin Aether &amp; Royal Pass
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Saldo saat ini:{' '}
              <span className="font-mono-num font-bold text-amber-300">
                {currentCoins.toLocaleString('id-ID')} Koin Aether
              </span>
              {' · '}
              <span>Admin akan memverifikasi pembayaran &amp; menambahkan koin langsung ke akunmu.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Modal Top-Up"
            className="p-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split: Left Price List / Right Live Chat with Admin */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Official Price Catalog */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-800 overflow-y-auto custom-scroll p-4 space-y-3 bg-slate-950/50">
            <div>
              <div className="text-xs font-bold text-white">1. Pilih Paket untuk Dipesan</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Klik paket di bawah untuk langsung mengirim pesanan ke Admin di kolom chat. Koin hanya masuk setelah pembayaran diverifikasi Admin.
              </p>
            </div>

            <div className="space-y-2.5">
              {AETHER_COIN_PACKS.map((pack) => {
                const totalCoins = pack.coins + pack.bonusCoins;
                const isPass = Boolean(pack.unlockAllPremium);
                const isSelected = selectedPackId === pack.id;
                return (
                  <div
                    key={pack.id}
                    className={`rounded-xl border p-3.5 space-y-2.5 transition-colors ${
                      isPass
                        ? 'border-amber-400/55 bg-amber-950/20'
                        : isSelected
                          ? 'border-emerald-400/60 bg-slate-900'
                          : 'border-slate-800 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          {isPass ? (
                            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{pack.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{pack.tagline}</p>
                      </div>
                      <span className="font-mono-num text-xs font-bold text-amber-300 shrink-0">
                        {pack.priceIdr}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="text-[11px] font-mono-num font-semibold text-emerald-300">
                        +{totalCoins.toLocaleString('id-ID')} Koin
                        {pack.bonusCoins > 0 && (
                          <span className="text-amber-300 ml-1">(+{pack.bonusCoins} bonus)</span>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!isVerifiedUser || sending}
                        onClick={() => handleOrderPack(pack)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed ${
                          isPass
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-slate-800 text-amber-200 border border-amber-500/35 hover:bg-amber-500/20'
                        }`}
                      >
                        <MessageCircle className="w-3 h-3" />
                        Pesan via Chat
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live 2-Way Chat with Admin */}
          <div className="lg:col-span-7 flex flex-col min-h-[300px] lg:min-h-0 overflow-hidden bg-[#060913]">
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 bg-slate-950/70">
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>2. Chat Langsung dengan Admin</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Admin Resmi: {ADMIN_EMAIL}
                  {thread?.status === 'pending_payment'
                    ? ' · Menunggu Verifikasi Pembayaran'
                    : thread?.status === 'completed'
                      ? ' · Pesanan Terakhir Selesai'
                      : ''}
                </div>
              </div>
              {thread?.requestedPackName && (
                <div className="text-right text-[10px] text-amber-300 font-semibold max-w-[160px] truncate">
                  {thread.requestedPackName}
                </div>
              )}
            </div>

            {!isVerifiedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-950/40 text-amber-300">
                  <LogIn className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="font-display text-base font-bold text-white">
                    Login Akun Diperlukan untuk Beli Koin
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Masuk dengan akun terverifikasi agar kamu bisa chat langsung dengan Admin dan Koin Aether yang dibeli masuk permanen ke akunmu.
                  </p>
                </div>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Masuk / Daftar Akun
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto custom-scroll p-4 space-y-3"
                >
                  {messages.length === 0 ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4 text-xs text-slate-300 space-y-2">
                      <div className="font-bold text-amber-300">Cara Pembelian Koin Aether:</div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                        <li>Klik salah satu paket di sebelah kiri atau ketik pesan langsung ke Admin.</li>
                        <li>Admin akan membalas info pembayaran (Transfer Bank / E-Wallet / QRIS) di chat ini.</li>
                        <li>Kirim konfirmasi setelah bayar — Admin langsung menambahkan Koin Aether ke akunmu secara real-time.</li>
                      </ol>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      const isCoinLog = msg.coinDelta !== 0;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdminMsg ? 'items-start' : 'items-end'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                              isCoinLog
                                ? 'border border-emerald-400/50 bg-emerald-950/55 text-emerald-100'
                                : isAdminMsg
                                  ? 'border border-amber-500/35 bg-slate-900 text-slate-100'
                                  : 'bg-amber-500 text-slate-950 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] mb-1 opacity-80">
                              <span className="font-bold">
                                {isAdminMsg ? 'Admin Resmi' : 'Kamu'}
                              </span>
                              <span className="font-mono-num">{formatTimeId(msg.createdAtMs)}</span>
                            </div>
                            {isCoinLog && (
                              <div className="flex items-center gap-1.5 font-mono-num font-bold text-emerald-300 mb-1">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {msg.coinDelta > 0
                                    ? `+${msg.coinDelta.toLocaleString('id-ID')} Koin Aether Ditambahkan`
                                    : `${msg.coinDelta.toLocaleString('id-ID')} Koin Aether Dikurangi`}
                                </span>
                              </div>
                            )}
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {errorMsg && (
                  <div className="px-4 py-1.5 text-[11px] text-rose-300 bg-rose-950/40 border-t border-rose-500/30">
                    {errorMsg}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendText(draft);
                  }}
                  className="shrink-0 flex items-center gap-2 border-t border-slate-800 p-3 bg-slate-950/85"
                >
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={600}
                    placeholder="Ketik pesan atau konfirmasi transfer ke Admin..."
                    className="flex-1 min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[42px] rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-45 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
