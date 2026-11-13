import React, { useState } from 'react';
import { Check, Cloud, CloudDownload, CloudUpload, Copy, KeyRound, X } from 'lucide-react';
import type { PlayerProfile } from '../services/storageService';
import { PWAInstallButton } from './PWAInstallButton';

interface CloudSyncModalProps {
  open: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  isOnline: boolean;
  onProfileRestored: (restored: PlayerProfile, syncCode: string, pin: string, updatedAt: string) => void;
  onSyncLinked: (syncCode: string, pin: string, updatedAt: string) => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  open,
  onClose,
  profile,
  isOnline,
  onProfileRestored,
  onSyncLinked,
}) => {
  const [pinInput, setPinInput] = useState(profile.syncPin || '');
  const [restoreCode, setRestoreCode] = useState('');
  const [restorePin, setRestorePin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCreateCloudCode = async () => {
    if (!isOnline) {
      setMessage({ kind: 'err', text: 'Anda sedang offline. Hubungkan internet untuk sinkronisasi awan.' });
      return;
    }
    if (pinInput.trim().length < 4) {
      setMessage({ kind: 'err', text: 'Buat PIN keamanan minimal 4 karakter.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cloud-sync/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput.trim(), profile }),
      });
      const data = (await res.json()) as { syncCode?: string; updatedAt?: string; error?: string };
      if (!res.ok || !data.syncCode) {
        throw new Error(data.error || 'Gagal membuat kode awan.');
      }
      onSyncLinked(data.syncCode, pinInput.trim(), data.updatedAt || new Date().toISOString());
      setMessage({ kind: 'ok', text: `Cadangan awan dibuat! Kode Anda: ${data.syncCode}` });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Gagal terhubung ke server.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveToCloud = async () => {
    if (!isOnline || !profile.syncCode || !profile.syncPin) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cloud-sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode: profile.syncCode,
          pin: profile.syncPin,
          profile,
        }),
      });
      const data = (await res.json()) as { updatedAt?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Gagal mengunggah progres.');
      onSyncLinked(profile.syncCode, profile.syncPin, data.updatedAt || new Date().toISOString());
      setMessage({ kind: 'ok', text: 'Progres permainan berhasil disinkronkan ke awan.' });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Gagal menyimpan ke awan.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!isOnline) {
      setMessage({ kind: 'err', text: 'Koneksi internet diperlukan untuk memulihkan dari awan.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/cloud-sync/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode: restoreCode.trim().toUpperCase(),
          pin: restorePin.trim(),
        }),
      });
      const data = (await res.json()) as {
        profile?: PlayerProfile;
        syncCode?: string;
        updatedAt?: string;
        error?: string;
      };
      if (!res.ok || !data.profile || !data.syncCode) {
        throw new Error(data.error || 'Gagal memulihkan data.');
      }
      onProfileRestored(
        data.profile,
        data.syncCode,
        restorePin.trim(),
        data.updatedAt || new Date().toISOString(),
      );
      setMessage({ kind: 'ok', text: 'Progres berhasil dipulihkan dari awan!' });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Gagal memulihkan data.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!profile.syncCode) return;
    try {
      await navigator.clipboard.writeText(profile.syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-xl max-h-[86vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-sky-400" />
            <h2 className="font-display text-lg font-bold text-amber-300">
              Sinkronisasi Awan & Mode Offline
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

        <div className="p-5 overflow-y-auto custom-scroll space-y-5">
          {message && (
            <div
              className={`rounded-xl border p-3 text-xs font-medium ${
                message.kind === 'ok'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                  : 'border-rose-500/40 bg-rose-950/40 text-rose-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Active Cloud Backup Section */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">Simpan Progres ke Awan</h3>
            {profile.syncCode ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
                  <div>
                    <div className="text-[11px] text-slate-400">Kode Sinkronisasi Anda</div>
                    <div className="font-mono-num text-lg font-bold text-sky-300">
                      {profile.syncCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyCode()}
                    className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Disalin' : 'Salin Kode'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    Terakhir disinkronkan:{' '}
                    {profile.lastSyncedAt
                      ? new Date(profile.lastSyncedAt).toLocaleString('id-ID')
                      : 'Belum pernah'}
                  </span>
                  <button
                    type="button"
                    disabled={busy || !isOnline}
                    onClick={() => void handleSaveToCloud()}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    Unggah Sekarang
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Buat Kode Sinkronisasi Awan pribadi untuk mencadangkan skor tertinggi, pencapaian, dan streak harian Anda secara aman.
                </p>
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[160px]">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={24}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Buat PIN (min. 4 karakter)"
                      className="w-full min-h-[42px] rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !isOnline}
                    onClick={() => void handleCreateCloudCode()}
                    className="min-h-[42px] px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    Buat Cadangan Awan
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Restore From Another Device */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">Pulihkan dari Perangkat Lain</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={restoreCode}
                onChange={(e) => setRestoreCode(e.target.value.toUpperCase())}
                placeholder="Kode (contoh: AETH-XXXX1234)"
                className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-mono-num text-white focus:outline-none focus:border-sky-400"
              />
              <input
                type="password"
                value={restorePin}
                onChange={(e) => setRestorePin(e.target.value)}
                placeholder="PIN Keamanan"
                className="min-h-[42px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white focus:outline-none focus:border-sky-400"
              />
            </div>
            <button
              type="button"
              disabled={busy || !isOnline || !restoreCode.trim() || !restorePin.trim()}
              onClick={() => void handleRestoreFromCloud()}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-45 transition-colors cursor-pointer"
            >
              <CloudDownload className="w-4 h-4 text-sky-400" />
              Pulihkan Progres
            </button>
          </section>

          {/* Offline & PWA Installation */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">Bermain Offline (PWA)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Simpan game ke layar utama agar dapat dimainkan kapan saja tanpa internet.
              </p>
            </div>
            <PWAInstallButton />
          </section>
        </div>
      </div>
    </div>
  );
};
