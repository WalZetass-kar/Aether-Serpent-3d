import { getDailyChallengeForDate, getTodayDateString } from '../../shared/gameConfig';
import type { PlayerProfile } from './storageService';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function dispatchAppNotification(title: string, body: string, tag = 'aether-serpent'): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag,
        });
        return true;
      }
    }
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      tag,
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkAndTriggerDailyReminder(
  profile: PlayerProfile,
  onMarkNotified: (dateStr: string) => void,
): Promise<void> {
  if (!profile.notificationsEnabled) return;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  const today = getTodayDateString();
  if (profile.dailyRewardClaimed || profile.lastNotifiedDate === today) return;

  const nowHour = new Date().getHours();
  if (nowHour >= profile.notificationHour) {
    const challenge = getDailyChallengeForDate(today);
    const sent = await dispatchAppNotification(
      'Tantangan Harian Menantimu!',
      `${challenge.title}: ${challenge.description} (+${challenge.bonusScore} poin bonus)`,
      `daily-${today}`,
    );
    if (sent) {
      onMarkNotified(today);
    }
  }
}
