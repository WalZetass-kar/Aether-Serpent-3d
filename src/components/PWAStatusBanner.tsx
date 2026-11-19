import React, { useEffect } from 'react';
import { CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAStatusBanner: React.FC = () => {
  const {
    isOnline,
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissOfflineReady,
    dismissNeedRefresh,
  } = usePWAInstall();

  // Auto-hide offline-ready confirmation after 4.5s
  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      dismissOfflineReady();
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [offlineReady, dismissOfflineReady]);

  if (isOnline && !needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 right-3 sm:right-auto z-[95] flex flex-col gap-2 max-w-sm">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-amber-400/50 bg-[#090f1f]/95 px-3.5 py-2.5 text-xs text-amber-100 shadow-xl backdrop-blur-md"
        >
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-amber-200">Mode Offline Aktif</div>
            <div className="text-[11px] text-slate-300">
              Mode solo &amp; papan lokal tetap bisa dimainkan.
            </div>
          </div>
        </div>
      )}

      {needRefresh && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-emerald-400/50 bg-[#090f1f]/95 px-3.5 py-2.5 text-xs text-slate-100 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-emerald-200">Pembaruan Tersedia</div>
              <div className="text-[11px] text-slate-300 truncate">
                Muat ulang untuk versi terbaru.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => void updateServiceWorker()}
              className="rounded-lg bg-emerald-400 px-2.5 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
            >
              Perbarui
            </button>
            <button
              type="button"
              onClick={dismissNeedRefresh}
              aria-label="Tutup pemberitahuan pembaruan"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {offlineReady && isOnline && !needRefresh && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-sky-400/40 bg-[#090f1f]/95 px-3.5 py-2.5 text-xs text-slate-100 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[11px] font-medium text-sky-100">
              Aplikasi siap dimainkan secara offline.
            </span>
          </div>
          <button
            type="button"
            onClick={dismissOfflineReady}
            aria-label="Tutup"
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
