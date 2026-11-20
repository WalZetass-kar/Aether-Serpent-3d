import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Coins,
  Copy,
  Crown,
  Layers,
  LogIn,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AETHER_COIN_PACKS, type AetherCoinPack } from '../../shared/boardThemes';
import { ADMIN_EMAIL } from '../services/adminService';
import { soundEngine } from '../audio/soundEngine';

export interface TopUpInstructionsDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  playerName: string;
  currentCoins: number;
  unlimitedCoins?: boolean;
  onOpenAuth: (tab: 'login' | 'register') => void;
  onOpenAdminChat: () => void;
  onOpenBoardCollection: () => void;
}

async function copyTextSafe(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

export const TopUpInstructionsDrawer: React.FC<TopUpInstructionsDrawerProps> = ({
  open,
  onClose,
  user,
  playerName,
  currentCoins,
  unlimitedCoins = false,
  onOpenAuth,
  onOpenAdminChat,
  onOpenBoardCollection,
}) => {
  const [selectedPackId, setSelectedPackId] = useState<string>(
    AETHER_COIN_PACKS[1]?.id ?? AETHER_COIN_PACKS[0]?.id ?? 'pack_pouch',
  );
  const [copiedTarget, setCopiedTarget] = useState<'instructions' | 'uid' | 'admin' | null>(null);

  const selectedPack: AetherCoinPack = useMemo(
    () =>
      AETHER_COIN_PACKS.find((p) => p.id === selectedPackId) ??
      AETHER_COIN_PACKS[0],
    [selectedPackId],
  );

  // Close drawer with Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const instructionTemplate = useMemo(() => {
    const totalCoins = selectedPack.coins + selectedPack.bonusCoins;
    const uidLine = user?.uid ?? '(Belum login — masuk akun dulu untuk mendapatkan ID)';
    const emailLine = user?.email ?? '(Belum terhubung ke akun Cloud)';
    const bonusNote =
      selectedPack.bonusCoins > 0
        ? ` (termasuk +${selectedPack.bonusCoins.toLocaleString('id-ID')} bonus)`
        : '';
    const extraPerk = selectedPack.unlockAllPremium
      ? '\nBonus Paket   : Buka semua papan Premium + Koin Aether'
      : '';

    return [
      '=== INSTRUKSI TOPUP AETHER COINS ===',
      `Admin Resmi   : ${ADMIN_EMAIL}`,
      `Nama Pemain   : ${playerName}`,
      `Email Akun    : ${emailLine}`,
      `ID Pengguna   : ${uidLine}`,
      `Paket Dipilih : ${selectedPack.name}`,
      `Total Koin    : ${totalCoins.toLocaleString('id-ID')} Koin Aether${bonusNote}`,
      `Nominal Harga : ${selectedPack.priceIdr}${extraPerk}`,
      '',
      'Langkah Pembayaran:',
      '1. Kirim format pesanan ini ke Admin Resmi (melalui Chat Admin di aplikasi atau email resmi di atas).',
      '2. Admin akan memberikan detail pembayaran resmi (Transfer Bank / E-Wallet / QRIS).',
      '3. Setelah transfer selesai, kirim bukti pembayaran beserta ID Pengguna di atas.',
      '4. Admin memverifikasi pembayaran dan mengirim Aether Coins langsung ke akunmu secara real-time.',
    ].join('\n');
  }, [playerName, selectedPack, user?.email, user?.uid]);

  if (!open) return null;

  const triggerCopyFeedback = (target: 'instructions' | 'uid' | 'admin') => {
    soundEngine.playUiClick();
    setCopiedTarget(target);
    window.setTimeout(() => {
      setCopiedTarget((prev) => (prev === target ? null : prev));
    }, 2200);
  };

  const handleCopyInstructions = async () => {
    const ok = await copyTextSafe(instructionTemplate);
    if (ok) triggerCopyFeedback('instructions');
  };

  const handleCopyUid = async () => {
    if (!user?.uid) return;
    const ok = await copyTextSafe(user.uid);
    if (ok) triggerCopyFeedback('uid');
  };

  const handleCopyAdminEmail = async () => {
    const ok = await copyTextSafe(ADMIN_EMAIL);
    if (ok) triggerCopyFeedback('admin');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="TopUp Aether Coins via Admin"
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-50 flex justify-end bg-slate-950/72 backdrop-blur-xs"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[440px] flex-col border-l border-slate-800 bg-[#080d1a] shadow-2xl overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4 bg-slate-950/90">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Pembayaran Resmi via Admin</span>
            </div>
            <h3 className="font-display text-lg font-bold text-white mt-0.5 truncate">
              TopUp Aether Coins
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Saldo saat ini:</span>
              <span
                className={`font-mono-num font-bold ${
                  unlimitedCoins ? 'text-cyan-300' : 'text-amber-300'
                }`}
              >
                {unlimitedCoins
                  ? '∞ Unlimited Koin'
                  : `${currentCoins.toLocaleString('id-ID')} Koin`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Drawer TopUp"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-amber-400/50 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll p-5 space-y-5">
          {/* 1. Package Selector */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white">1. Pilih Paket Aether Coins</h4>
              <span className="text-[11px] text-slate-400">Harga resmi IDR</span>
            </div>
            <div className="space-y-2">
              {AETHER_COIN_PACKS.map((pack) => {
                const isSelected = pack.id === selectedPack.id;
                const totalCoins = pack.coins + pack.bonusCoins;
                const isPass = Boolean(pack.unlockAllPremium);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSelectedPackId(pack.id);
                    }}
                    className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/12'
                        : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isPass ? (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="text-xs font-bold text-white truncate">
                          {pack.name}
                        </span>
                      </div>
                      <span className="font-mono-num text-xs font-bold text-amber-300 shrink-0">
                        {pack.priceIdr}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-slate-400 truncate">{pack.tagline}</span>
                      <span className="font-mono-num font-semibold text-emerald-300 shrink-0">
                        +{totalCoins.toLocaleString('id-ID')} Koin
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Player ID & Admin Info */}
          <section className="space-y-2.5 pt-4 border-t border-slate-800/90">
            <h4 className="text-xs font-bold text-white">2. Data Penerima &amp; Kontak Admin</h4>

            <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Admin Resmi</div>
                  <div className="font-mono-num text-amber-200 font-semibold truncate">
                    {ADMIN_EMAIL}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyAdminEmail()}
                  className="inline-flex items-center gap-1.5 min-h-[34px] rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {copiedTarget === 'admin' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedTarget === 'admin' ? 'Tersalin' : 'Salin Admin'}</span>
                </button>
              </div>

              <div className="pt-2.5 border-t border-slate-800/80">
                {user ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400">
                        ID Pengguna Kamu ({playerName})
                      </div>
                      <div className="font-mono-num text-[11px] text-slate-200 break-all mt-0.5">
                        {user.uid}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyUid()}
                      className="inline-flex items-center gap-1.5 min-h-[34px] rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {copiedTarget === 'uid' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedTarget === 'uid' ? 'Tersalin' : 'Salin ID'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Masuk akun terlebih dahulu agar ID Pengguna otomatis terisi dan koin tersimpan permanen.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth('login');
                      }}
                      className="inline-flex items-center gap-1.5 min-h-[36px] rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Masuk</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 3. Copyable Payment Instructions Preview */}
          <section className="space-y-2.5 pt-4 border-t border-slate-800/90">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-white">
                3. Instruksi Pembayaran via Admin
              </h4>
              <span className="text-[11px] text-emerald-300 font-medium">
                Siap Salin
              </span>
            </div>

            <pre className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono-num text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words select-all">
              {instructionTemplate}
            </pre>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Setelah pembayaran diverifikasi, Admin akan menambahkan saldo atau mengirimkan Gift Coins langsung ke akunmu secara real-time.
            </p>
          </section>
        </div>

        {/* Sticky Footer Actions */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/95 p-4 space-y-2.5">
          <button
            type="button"
            onClick={() => void handleCopyInstructions()}
            className={`w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
              copiedTarget === 'instructions'
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
            }`}
          >
            {copiedTarget === 'instructions' ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Instruksi Pembayaran Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Salin Instruksi Pembayaran</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
                onOpenAdminChat();
              }}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/12 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Chat Admin</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
                onOpenBoardCollection();
              }}
              className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Koleksi Papan</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
