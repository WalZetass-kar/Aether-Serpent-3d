import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  Flame,
  Lock,
  Smile,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  DICE_SKINS,
  EMOTE_SETS,
  getAchievementPointsTotal,
  getDailyChallengeForDate,
  getEmoteSetDef,
  getEmoteSetUnlockProgress,
  isDiceSkinUnlocked,
  type DiceSkinId,
  type EmoteSetId,
} from '../../shared/gameConfig';
import {
  dispatchAppNotification,
  isNotificationSupported,
  requestNotificationPermission,
} from '../services/notificationService';
import type { PlayerProfile } from '../services/storageService';
import { DiceSkinCubePreview } from './FantasyIcons';

export type AchievementsModalTab = 'all' | 'emotes' | 'dice' | 'achievements';

interface AchievementsDailyModalProps {
  open: boolean;
  initialTab?: AchievementsModalTab;
  onClose: () => void;
  profile: PlayerProfile;
  onUpdateNotifications: (enabled: boolean, hour: number) => void;
  onSelectDiceSkin: (skinId: DiceSkinId) => void;
  onSelectEmoteSet: (setId: EmoteSetId) => void;
}

export const AchievementsDailyModal: React.FC<AchievementsDailyModalProps> = ({
  open,
  initialTab = 'all',
  onClose,
  profile,
  onUpdateNotifications,
  onSelectDiceSkin,
  onSelectEmoteSet,
}) => {
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AchievementsModalTab>(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const challenge = getDailyChallengeForDate();
  const currentProgress = profile.dailyProgress[challenge.metric] ?? 0;
  const pct = Math.min(100, Math.round((currentProgress / challenge.target) * 100));
  const unlockedSet = new Set(profile.unlockedAchievements);
  const unlockedSkinsCount = DICE_SKINS.filter((s) =>
    isDiceSkinUnlocked(s.id, profile.unlockedAchievements),
  ).length;
  const unlockedEmoteSetsCount = EMOTE_SETS.filter(
    (s) => getEmoteSetUnlockProgress(s.id, profile.unlockedAchievements).unlocked,
  ).length;
  const earnedAchPoints = getAchievementPointsTotal(profile.unlockedAchievements);
  const masteryUnlockedCount = ACHIEVEMENTS.filter(
    (a) => a.category === 'mastery' && unlockedSet.has(a.id),
  ).length;
  const masteryTotalCount = ACHIEVEMENTS.filter((a) => a.category === 'mastery').length;
  const activeEmoteSet = getEmoteSetDef(profile.emoteSetId);

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

  const showEmotes = activeTab === 'all' || activeTab === 'emotes';
  const showDice = activeTab === 'all' || activeTab === 'dice';
  const showAchievements = activeTab === 'all' || activeTab === 'achievements';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-bold text-gold-gradient truncate">
              Pencapaian, Set Emote &amp; Skin Dadu 3D
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Filter Tabs */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-950/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {(
            [
              { id: 'all', label: 'Semua' },
              { id: 'emotes', label: `Set Emote (${unlockedEmoteSetsCount}/${EMOTE_SETS.length})` },
              { id: 'dice', label: `Skin Dadu (${unlockedSkinsCount}/${DICE_SKINS.length})` },
              { id: 'achievements', label: `Pencapaian (${unlockedSet.size}/${ACHIEVEMENTS.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto custom-scroll space-y-6">
          {/* Custom EmoteWheel Sets Section */}
          {showEmotes && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smile className="w-4 h-4 text-sky-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Koleksi Set Emote Wheel ({unlockedEmoteSetsCount}/{EMOTE_SETS.length} Terbuka)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-amber-300">
                  Aktif: {activeEmoteSet.name}
                </span>
              </div>

              {/* Clean unboxed achievement-progress summary */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-mono-num">
                <span>Pencapaian: {unlockedSet.size}/{ACHIEVEMENTS.length}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Poin Pencapaian: {earnedAchPoints.toLocaleString('id-ID')}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Kategori Mastery: {masteryUnlockedCount}/{masteryTotalCount}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {EMOTE_SETS.map((emoteSet) => {
                  const status = getEmoteSetUnlockProgress(
                    emoteSet.id,
                    profile.unlockedAchievements,
                  );
                  const isEquipped =
                    status.unlocked && profile.emoteSetId === emoteSet.id;

                  return (
                    <div
                      key={emoteSet.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                        isEquipped
                          ? 'border-amber-400 bg-amber-500/12 shadow-lg shadow-amber-950/35'
                          : status.unlocked
                            ? 'border-slate-700 bg-slate-950/65 hover:border-sky-400/50'
                            : 'border-slate-800/90 bg-slate-950/40'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: emoteSet.themeHex }}
                              />
                              <span className="text-sm font-bold text-white truncate">
                                {emoteSet.name}
                              </span>
                            </div>
                            <div className="text-[11px] font-semibold text-amber-300/90">
                              {emoteSet.subtitle}
                            </div>
                          </div>

                          {isEquipped ? (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 shrink-0">
                              Digunakan
                            </span>
                          ) : status.unlocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Terbuka
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 shrink-0">
                              <Lock className="w-3.5 h-3.5" />
                              Terkunci
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {emoteSet.description}
                        </p>

                        {/* 6-Emote Preview Grid */}
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {emoteSet.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 rounded-lg border border-slate-800/90 bg-slate-900/80 px-2 py-1 text-[11px] min-w-0"
                              title={item.label}
                            >
                              <span className="leading-none shrink-0">{item.icon}</span>
                              <span className="text-slate-200 font-medium truncate">
                                {item.shortLabel}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-300 truncate" title={status.requirementLabel}>
                              {status.requirementLabel}
                            </span>
                            <span
                              className={`font-mono-num font-semibold shrink-0 ${
                                status.unlocked ? 'text-emerald-300' : 'text-amber-300'
                              }`}
                            >
                              {status.progressText}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                status.unlocked ? 'bg-emerald-500' : 'bg-sky-400'
                              }`}
                              style={{ width: `${status.progressPct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!status.unlocked || isEquipped}
                          onClick={() => {
                            if (status.unlocked && !isEquipped) {
                              onSelectEmoteSet(emoteSet.id);
                            }
                          }}
                          className={`w-full min-h-[36px] px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                            isEquipped
                              ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200 cursor-default'
                              : status.unlocked
                                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer'
                                : 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isEquipped
                            ? 'Terpasang di EmoteWheel'
                            : status.unlocked
                              ? 'Pasang Set Emote'
                              : `Terkunci (${status.progressText})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Custom 3D Dice Skins Selector Section */}
          {showDice && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-100">
                    Koleksi Skin Dadu 3D ({unlockedSkinsCount}/{DICE_SKINS.length} Terbuka)
                  </h3>
                </div>
                <span className="text-xs text-amber-300 font-semibold">
                  Aktif: {DICE_SKINS.find((s) => s.id === profile.diceSkinId)?.name ?? 'Royal Obsidian'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {DICE_SKINS.map((skin) => {
                  const unlocked = isDiceSkinUnlocked(skin.id, profile.unlockedAchievements);
                  const selected = profile.diceSkinId === skin.id;

                  return (
                    <div
                      key={skin.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-all ${
                        selected
                          ? 'border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-950/40'
                          : unlocked
                            ? 'border-slate-700 bg-slate-950/60 hover:border-amber-500/40'
                            : 'border-slate-800/90 bg-slate-950/35 opacity-80'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl border border-slate-700/80 bg-slate-900/90 flex items-center justify-center shrink-0">
                          <DiceSkinCubePreview {...skin.previewColors} className="w-10 h-10" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-white truncate">{skin.name}</span>
                            {selected ? (
                              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 shrink-0">
                                Digunakan
                              </span>
                            ) : unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] font-semibold text-amber-300/90">
                            {skin.subtitle}
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {skin.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400 truncate">
                          {skin.requiredAchievementId
                            ? `Syarat: ${skin.requiredAchievementTitle}`
                            : 'Skin Dadu Bawaan'}
                        </span>
                        <button
                          type="button"
                          disabled={!unlocked || selected}
                          onClick={() => {
                            if (unlocked && !selected) {
                              onSelectDiceSkin(skin.id);
                            }
                          }}
                          className={`min-h-[32px] px-3 rounded-lg text-xs font-bold transition-colors shrink-0 whitespace-nowrap ${
                            selected
                              ? 'bg-amber-500/25 border border-amber-400/50 text-amber-200 cursor-default'
                              : unlocked
                                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer'
                                : 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {selected ? 'Terpasang' : unlocked ? 'Pilih Skin' : 'Terkunci'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Daily Challenge & Achievements Sections */}
          {showAchievements && (
            <>
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
                      {profile.dailyRewardClaimed
                        ? 'Selesai (+' + challenge.bonusScore + ' poin)'
                        : `Bonus +${challenge.bonusScore} poin`}
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
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
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
                      className="min-h-[36px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-amber-300 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Uji Push
                    </button>
                  </div>
                </div>
                {notifFeedback && (
                  <div className="text-xs text-amber-200">{notifFeedback}</div>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100">
                    Koleksi Pencapaian ({unlockedSet.size}/{ACHIEVEMENTS.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-mono-num">
                    {earnedAchPoints.toLocaleString('id-ID')} Poin Pencapaian · {profile.wins} Menang
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {ACHIEVEMENTS.map((ach) => {
                    const unlocked = unlockedSet.has(ach.id);
                    const rewardSkin = DICE_SKINS.find((s) => s.requiredAchievementId === ach.id);
                    const contributesToEmote = EMOTE_SETS.find(
                      (s) =>
                        (s.unlockCondition.type === 'specific_achievements' &&
                          s.unlockCondition.achievementIds.includes(ach.id)) ||
                        (s.unlockCondition.type === 'category_count' &&
                          s.unlockCondition.category === ach.category),
                    );
                    return (
                      <div
                        key={ach.id}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          unlocked
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-800 bg-slate-950/40 opacity-85'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {unlocked ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span className="text-sm font-bold text-white truncate">
                              {ach.title}
                            </span>
                          </div>
                          <span className="font-mono-num text-xs font-semibold text-amber-300 shrink-0">
                            +{ach.points}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {ach.description}
                        </p>
                        {(rewardSkin || contributesToEmote) && (
                          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                            {rewardSkin && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-amber-300/90 font-semibold truncate">
                                  Hadiah Dadu: {rewardSkin.name}
                                </span>
                                <span className={unlocked ? 'text-emerald-400 font-semibold shrink-0' : 'text-slate-500 shrink-0'}>
                                  {unlocked ? 'Terbuka' : 'Terkunci'}
                                </span>
                              </div>
                            )}
                            {contributesToEmote && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sky-300/90 font-semibold truncate">
                                  Set Emote: {contributesToEmote.name}
                                </span>
                                <span className={unlocked ? 'text-emerald-400 font-semibold shrink-0' : 'text-slate-400 shrink-0'}>
                                  {unlocked ? 'Tercatat' : ach.category === 'mastery' ? 'Mastery' : 'Syarat'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
