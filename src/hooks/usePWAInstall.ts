import { useCallback, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Shared module-level store so multiple mounted PWAInstallButton instances stay in sync
let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let cachedNeedRefresh = false;
let cachedOfflineReady = false;
let cachedUpdateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swInitialized = false;

const listeners = new Set<() => void>();
const notifyAll = () => {
  listeners.forEach((fn) => fn());
};

function ensureGlobalPWAListeners(): void {
  if (typeof window === 'undefined' || swInitialized) return;
  swInitialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyAll();
  });

  window.addEventListener('appinstalled', () => {
    cachedDeferredPrompt = null;
    notifyAll();
  });

  try {
    cachedUpdateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        cachedNeedRefresh = true;
        notifyAll();
      },
      onOfflineReady() {
        cachedOfflineReady = true;
        notifyAll();
      },
      onRegisterError() {
        // Silently ignore SW registration errors inside restricted preview contexts
      },
    });
  } catch {
    // Fallback gracefully if SW registration is unavailable
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function usePWAInstall() {
  const [, setTick] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    ensureGlobalPWAListeners();

    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };
    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsAndroid(/android/.test(ua));

    const onChange = () => {
      checkStandalone();
      setTick((t) => t + 1);
    };

    listeners.add(onChange);
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener?.('change', onChange);

    return () => {
      listeners.delete(onChange);
      mql.removeEventListener?.('change', onChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!cachedDeferredPrompt) return false;
    await cachedDeferredPrompt.prompt();
    const { outcome } = await cachedDeferredPrompt.userChoice;
    if (outcome === 'accepted') {
      cachedDeferredPrompt = null;
      setIsInstalled(true);
      notifyAll();
      return true;
    }
    return false;
  }, []);

  const updateServiceWorker = useCallback(async () => {
    cachedNeedRefresh = false;
    notifyAll();
    if (cachedUpdateSW) {
      await cachedUpdateSW(true);
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const dismissOfflineReady = useCallback(() => {
    cachedOfflineReady = false;
    notifyAll();
  }, []);

  const dismissNeedRefresh = useCallback(() => {
    cachedNeedRefresh = false;
    notifyAll();
  }, []);

  return {
    isInstallable: Boolean(cachedDeferredPrompt),
    isInstalled,
    isIOS,
    isAndroid,
    isOnline,
    needRefresh: cachedNeedRefresh,
    offlineReady: cachedOfflineReady,
    install,
    updateServiceWorker,
    dismissOfflineReady,
    dismissNeedRefresh,
  };
}
