import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SerpentCrestEmblem } from './FantasyIcons';

interface AuthModalProps {
  open: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: () => void;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  initialTab = 'login',
  onClose,
  onSuccess,
  onLogout,
}) => {
  const {
    user,
    authBusy,
    authError,
    authNotice,
    clearMessages,
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    sendResetPassword,
    resendVerification,
    refreshVerification,
    logoutAccount,
  } = useAuth();

  const [tab, setTab] = useState<'login' | 'register' | 'reset'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setLocalError(null);
      clearMessages();
    }
  }, [open, initialTab, clearMessages]);

  if (!open) return null;

  const handleGoogleClick = async () => {
    setLocalError(null);
    const loggedUser = await signInWithGoogle();
    if (loggedUser) {
      onSuccess?.();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Masukkan alamat email yang valid.');
      return;
    }

    if (tab === 'reset') {
      await sendResetPassword(email);
      return;
    }

    if (password.length < 6) {
      setLocalError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (tab === 'register') {
      if (displayName.trim().length < 2) {
        setLocalError('Masukkan nama pemain minimal 2 karakter.');
        return;
      }
      await registerWithEmail(email, password, displayName);
      return;
    }

    const signed = await loginWithEmail(email, password);
    if (signed && signed.emailVerified) {
      onSuccess?.();
      onClose();
    }
  };

  const shownError = localError || authError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="glass-panel relative w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-slate-100 my-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup jendela akun"
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 pr-10">
          <SerpentCrestEmblem className="w-10 h-10 shrink-0" />
          <div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
              Akun Naga Tangga
            </h2>
            <p className="text-xs text-slate-400">
              Simpan rekor, skin dadu 3D, & papan kustom di awan Firebase
            </p>
          </div>
        </div>

        {/* Already Signed-In State */}
        {user ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {user.displayName || 'Penjelajah Aether'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{user.email}</div>
                </div>
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 shrink-0">
                    Perlu Verifikasi
                  </span>
                )}
              </div>

              {!user.emailVerified && (
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Klik tautan verifikasi yang dikirim ke email Anda agar progres tersimpan ke server Firebase. Anda tetap bisa langsung bermain secara lokal sekarang.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void refreshVerification()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Saya Sudah Verifikasi
                    </button>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void resendVerification()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Kirim Ulang Email
                    </button>
                  </div>
                </div>
              )}
            </div>

            {shownError && (
              <div className="rounded-xl border border-rose-500/35 bg-rose-950/40 px-3.5 py-2.5 text-xs text-rose-200">
                {shownError}
              </div>
            )}
            {authNotice && (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/35 px-3.5 py-2.5 text-xs text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{authNotice}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2.5">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    void logoutAccount();
                  }
                }}
                className="rounded-xl border border-rose-500/35 bg-rose-950/30 px-4 py-2.5 text-xs font-semibold text-rose-200 hover:bg-rose-900/40 cursor-pointer"
              >
                Keluar Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:brightness-105 cursor-pointer"
              >
                Lanjut ke Game
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setLocalError(null);
                  clearMessages();
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'login'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setLocalError(null);
                  clearMessages();
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'register'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('reset');
                  setLocalError(null);
                  clearMessages();
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'reset'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Sandi
              </button>
            </div>

            {/* Google Quick Login */}
            {tab !== 'reset' && (
              <>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void handleGoogleClick()}
                  className="w-full min-h-[44px] inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>
                    {tab === 'register' ? 'Daftar Cepat dengan Google' : 'Masuk dengan Google'}
                  </span>
                </button>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <div className="h-px flex-1 bg-slate-800" />
                  <span>atau gunakan Email</span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
              </>
            )}

            {/* Email / Password Form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nama Pemain di Arena
                  </label>
                  <input
                    type="text"
                    maxLength={32}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Contoh: Pendekar Naga"
                    className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {tab !== 'reset' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900/95 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              )}

              {shownError && (
                <div className="rounded-xl border border-rose-500/35 bg-rose-950/45 px-3.5 py-2.5 text-xs text-rose-200 leading-relaxed">
                  {shownError}
                </div>
              )}

              {authNotice && (
                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/35 px-3.5 py-2.5 text-xs text-emerald-200 leading-relaxed">
                  {authNotice}
                </div>
              )}

              <button
                type="submit"
                disabled={authBusy}
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg hover:brightness-105 disabled:opacity-60 transition-all cursor-pointer"
              >
                {authBusy
                  ? 'Memproses...'
                  : tab === 'register'
                    ? 'Buat Akun & Simpan Progres'
                    : tab === 'reset'
                      ? 'Kirim Email Reset Sandi'
                      : 'Masuk ke Akun'}
              </button>
            </form>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Kembali ke Halaman Utama
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
