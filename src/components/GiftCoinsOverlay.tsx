import React, { useEffect, useState } from 'react';
import { Coins, Gift, Sparkles } from 'lucide-react';
import type { CoinGiftEvent } from '../services/topUpChatService';
import { CoinParticleBurst } from './CoinParticleBurst';

interface GiftCoinsOverlayProps {
  gift: CoinGiftEvent;
  newBalance: number;
  onDismiss: () => void;
}

export const GiftCoinsOverlay: React.FC<GiftCoinsOverlayProps> = ({
  gift,
  newBalance,
  onDismiss,
}) => {
  const [displayedAmount, setDisplayedAmount] = useState(0);
  const [entered, setEntered] = useState(false);
  const [burstTick, setBurstTick] = useState(0);

  // Trigger crisp entrance transition
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Auto-dismiss after 7.5 seconds unless user closes earlier
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onDismiss();
    }, 7500);
    return () => window.clearTimeout(timer);
  }, [gift.id, onDismiss]);

  // Allow Escape key to dismiss
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  // Animated rolling coin counter (respects prefers-reduced-motion)
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplayedAmount(gift.amount);
      return;
    }

    const durationMs = 1150;
    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedAmount(Math.max(1, Math.round(gift.amount * eased)));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        setDisplayedAmount(gift.amount);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [gift.amount, gift.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hadiah Koin Aether dari Admin"
      onClick={onDismiss}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4"
    >
      {/* Full-viewport small coin-shaped particle burst & cascade */}
      <CoinParticleBurst
        variant="fullscreen"
        triggerKey={`${gift.id}-${burstTick}`}
        coinAmount={gift.amount}
        className="z-0"
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-amber-400/55 bg-[#090f1f]/95 p-6 text-center shadow-2xl shadow-amber-500/20 transition-all duration-300 ${
          entered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-3'
        }`}
      >
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/60 bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-emerald-500/15 text-amber-300 shadow-lg shadow-amber-500/15">
          <Gift className="h-7 w-7" />
        </div>

        <div className="text-[11px] font-semibold text-amber-300/95">
          Hadiah Koin Aether · Dikirim oleh {gift.senderName}
        </div>

        <h2 className="mt-1 font-display text-2xl font-bold text-white">
          Kamu Menerima Gift Coins!
        </h2>

        {/* Focused coin-particle emitter directly inside the reward counter card */}
        <button
          type="button"
          onClick={() => setBurstTick((t) => t + 1)}
          title="Ketuk untuk memicu percikan partikel koin lagi"
          className="relative mt-4 w-full overflow-hidden rounded-xl border border-amber-400/35 bg-amber-950/35 px-4 py-4 cursor-pointer hover:border-amber-300/60 transition-colors"
        >
          <CoinParticleBurst
            variant="local"
            triggerKey={`${gift.id}-local-${burstTick}`}
            coinAmount={gift.amount}
            className="z-0"
          />
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center gap-2 font-mono-num text-3xl sm:text-4xl font-extrabold text-amber-300 drop-shadow">
              <Coins className="h-7 w-7 text-amber-400 shrink-0" />
              <span>+{displayedAmount.toLocaleString('id-ID')}</span>
            </div>
            <div className="mt-1 text-xs font-medium text-amber-200/85">
              Koin Aether ditambahkan ke dompetmu
            </div>
          </div>
        </button>

        {gift.message && (
          <div className="mt-3.5 rounded-xl border border-slate-800 bg-slate-900/75 px-3.5 py-2.5 text-xs text-slate-200 leading-relaxed">
            “{gift.message}”
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Saldo Koin Sekarang:</span>
          <span className="font-mono-num font-bold text-emerald-300">
            {newBalance.toLocaleString('id-ID')} Koin
          </span>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
        >
          <span>Terima Hadiah</span>
        </button>
      </div>
    </div>
  );
};
