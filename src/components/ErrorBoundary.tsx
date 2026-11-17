import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
      detail: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = 'Terjadi gangguan tak terduga pada aplikasi.';
    let detail: string | null = error.message || null;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed && parsed.operationType) {
        readable = `Gagal memproses data Firebase (${parsed.operationType}${
          parsed.path ? ` pada ${parsed.path}` : ''
        }).`;
        detail = parsed.error || error.message;
      }
    } catch {
      // plain Error message
    }

    return {
      hasError: true,
      message: readable,
      detail,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="max-w-md w-full rounded-2xl border border-rose-500/35 bg-slate-900 p-6 shadow-2xl space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="font-display text-lg font-bold text-white">
            Gangguan Sinkronisasi atau Rendering
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{this.state.message}</p>
          {this.state.detail && (
            <p className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] font-mono-num text-slate-400 break-words">
              {this.state.detail}
            </p>
          )}
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Muat Ulang Halaman</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
