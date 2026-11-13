import React, { useState } from 'react';
import { Award, Bell, BellOff, Calendar, CheckCircle2, Flame, Lock, X } from 'lucide-react';
import { ACHIEVEMENTS, getDailyChallengeForDate } from '../../shared/gameConfig';
import {
  dispatchAppNotification,
  isNotificationSupported,
  requestNotificationPermission,
} from '../services/notificationService';
import type { PlayerProfile } from '../services/storageService';

interface AchievementsDailyModalProps {
  open: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateNotifications: (enabled: boolean, hour: number) => void;
}

export const AchievementsDailyModal: React.FC<AchievementsDailyModalProps> = ({
  open,
  onClose,
  profile,
  onUpdateNotifications,
}) => {
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  if (!open) return null;

  const challenge = getDailyChallengeForDate();
  const currentProgress = profile.dailyProgress[challenge.metric] ?? 0;
  const pct = Math.min(100, Math.round((currentProgress / challenge.target) * 100));
  const unlockedSet = new Set(profile.unlockedAchievements);

  const handleToggleNotif = async () => {
    if (!isNotificationSupported()) {
      setNotifFeedback('Peramban ini tidak mendukung notifikasi web.');
      return;
    }
    if (!profile.notificationsEnabled) {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        onUpdateNotifications(true, profile.notificationHour);
        setNotifFeedback('Pengingat tantangan harian aktif!');
      } else {
        setNotifFeedback('Izin notifikasi ditolak oleh peramban.');
      }
    } else {
      onUpdateNotifications(false, profile.notificationHour);
      setNotifFeedback('Pengingat harian dimatikan.');
    }
  };

  const handleTestNotif = async () => {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      setNotifFeedback('Izinkan notifikasi terlebih dahulu untuk mengirim uji coba.');
      return;
    }
    const ok = await dispatchAppNotification(
      'Tantangan Harian Aether Serpent 3D',
      `${challenge.title}: ${challenge.description}`,
      'test-daily',
    );
    setNotifFeedback(ok ? 'Notifikasi uji coba berhasil dikirim!' : 'Gagal mengirim notifikasi.');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="font-display text-lg font-bold text-gold-gradient">
              Pencapaian & Tantangan Harian
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

        <div className="p-5 overflow-y-auto custom-scroll space-y-6">
          {/* Daily Challenge Card */}
          <section className="rounded-xl border border-amber-500/30 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <Calendar className="w-4 h-4" />
                <span>Tantangan Hari Ini · {challenge.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-300 font-mono-num">
                <Flame className="w-4 h-4" />
                <span>Streak {profile.dailyStreak} Hari</span>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{challenge.title}</h3>
              <p className="text-xs text-slate-300 mt-0.5">{challenge.description}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-num">
                <span className="text-slate-300">
                  Progres: {Math.min(currentProgress, challenge.target)} / {challenge.target}
                </span>
                <span className="text-amber-300 font-semibold">
                  {profile.dailyRewardClaimed ? 'Selesai (+' + challenge.bonusScore + ' poin)' : `Bonus +${challenge.bonusScore} poin`}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    profile.dailyRewardClaimed ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Push Notification Daily Reminder */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                {profile.notificationsEnabled ? (
                  <Bell className="w-4 h-4 text-emerald-400" />
                ) : (
                  <BellOff className="w-4 h-4 text-slate-500" />
                )}
                <span>Notifikasi Pengingat Harian</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Jam Pengingat Harian"
                  value={profile.notificationHour}
                  onChange={(e) =>
                    onUpdateNotifications(profile.notificationsEnabled, Number(e.target.value))
                  }
                  className="min-h-[36px] rounded-lg border border-slate-700 bg-slate-800 px-2.5 text-xs text-slate-200"
                >
                  {[8, 12, 17, 19, 21].map((h) => (
                    <option key={h} value={h}>
                      Pukul {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleToggleNotif()}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    profile.notificationsEnabled
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {profile.notificationsEnabled ? 'Aktif' : 'Aktifkan'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleTestNotif()}
                  className="min-h-[36px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Uji Push
                </button>
              </div>
            </div>
            {notifFeedback && (
              <div className="text-xs text-amber-200">{notifFeedback}</div>
            )}
          </section>

          {/* Achievements Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">
                Koleksi Pencapaian ({unlockedSet.size}/{ACHIEVEMENTS.length})
              </h3>
              <span className="text-xs text-slate-400 font-mono-num">
                Total Kemenangan: {profile.wins} · Skor Tertinggi: {profile.bestScore.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const unlocked = unlockedSet.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`rounded-xl border p-3.5 transition-colors ${
                      unlocked
                        ? 'border-emerald-500/40 bg-emerald-950/20'
                        : 'border-slate-800 bg-slate-950/40 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {unlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm font-bold text-white">{ach.title}</span>
                      </div>
                      <span className="font-mono-num text-xs font-semibold text-amber-300 shrink-0">
                        +{ach.points}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                      {ach.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
