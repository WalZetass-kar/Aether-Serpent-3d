import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  MonitorSmartphone,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export interface PWAInstallButtonProps {
  /** 'button' = standard CTA, 'compact' = tight header/bar button, 'card' = rich sidebar install card */
  variant?: 'button' | 'compact' | 'card';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!showGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuide]);

  // Suppress completely when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
      return;
    }
    setShowGuide(true);
  };

  const label = isInstallable
    ? installing
      ? 'Memasang...'
      : 'Pasang Aplikasi'
    : isIOS
      ? 'Pasang di iOS'
      : 'Pasang Aplikasi (PWA)';

  return (
    <>
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => void handleAction()}
          disabled={installing}
          className={`w-full flex items-center justify-between gap-3 min-h-[54px] px-4 py-3 rounded-2xl border border-amber-400/45 bg-amber-500/12 text-left hover:bg-amber-500/20 transition-colors cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/pwa-192x192.png"
              alt="Ikon Aplikasi Aether Serpent 3D"
              className="w-9 h-9 rounded-xl border border-amber-400/40 object-cover shrink-0 bg-slate-950"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-200 truncate">
                {label}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Layar penuh, akses cepat &amp; siap main offline
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 whitespace-nowrap shrink-0">
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Pasang</span>
          </span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={() => void handleAction()}
          disabled={installing}
          title="Pasang Aether Serpent 3D sebagai Aplikasi (PWA)"
          className={`inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 py-2 rounded-xl border border-amber-400/45 bg-amber-500/15 text-xs font-bold text-amber-200 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{isInstallable ? 'Pasang App' : 'PWA App'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleAction()}
          disabled={installing}
          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-amber-400/45 bg-amber-500/15 text-amber-200 font-semibold text-xs sm:text-sm hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{label}</span>
        </button>
      )}

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panduan Pemasangan Aplikasi Aether Serpent 3D"
          onClick={() => setShowGuide(false)}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-amber-500/35 bg-[#080d1a] p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Ikon Aether Serpent 3D"
                  className="w-12 h-12 rounded-2xl border border-amber-400/45 bg-slate-950 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-amber-300">
                    Progressive Web App
                  </div>
                  <h3 className="font-display text-lg font-bold text-white truncate">
                    Pasang Aether Serpent 3D
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup Panduan Pasang"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-2.5">
                <Smartphone className="w-4 h-4 text-amber-300 mx-auto" />
                <div className="mt-1 text-[11px] font-semibold text-slate-200">Layar Penuh</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-2.5">
                <WifiOff className="w-4 h-4 text-emerald-300 mx-auto" />
                <div className="mt-1 text-[11px] font-semibold text-slate-200">Siap Offline</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-2.5">
                <CheckCircle2 className="w-4 h-4 text-sky-300 mx-auto" />
                <div className="mt-1 text-[11px] font-semibold text-slate-200">Auto-Update</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2.5 text-xs text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <Share className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Cara Pasang di iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Ketuk tombol <strong className="text-white">Bagikan (Share)</strong> pada bilah bawah Safari.
                    </li>
                    <li>
                      Gulir ke bawah lalu pilih <strong className="text-white">Tambahkan ke Layar Utama</strong>.
                    </li>
                    <li>
                      Ketuk <strong className="text-white">Tambah</strong> — ikon Aether3D langsung muncul di layar utama.
                    </li>
                  </ol>
                </>
              ) : isAndroid ? (
                <>
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <Smartphone className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Cara Pasang di Android (Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Ketuk menu titik tiga <strong className="text-white">(⋮)</strong> di pojok kanan atas browser.
                    </li>
                    <li>
                      Pilih <strong className="text-white">Instal aplikasi</strong> atau <strong className="text-white">Tambahkan ke layar utama</strong>.
                    </li>
                    <li>
                      Konfirmasi <strong className="text-white">Instal</strong> untuk pengalaman layar penuh tanpa bilah browser.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 font-bold text-amber-200">
                    <MonitorSmartphone className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Cara Pasang di Desktop (Chrome / Edge)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>
                      Buka aplikasi di tab browser penuh (jika sedang melihat di jendela pratinjau).
                    </li>
                    <li>
                      Klik ikon <strong className="text-white">Instal Aplikasi</strong> di ujung kanan bilah alamat (address bar).
                    </li>
                    <li>
                      Klik <strong className="text-white">Instal</strong> agar Aether Serpent 3D bisa dibuka seperti aplikasi native.
                    </li>
                  </ol>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-amber-400 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
