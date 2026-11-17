import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authBusy: boolean;
  authError: string | null;
  authNotice: string | null;
  clearMessages: () => void;
  signInWithGoogle: () => Promise<User | null>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<User | null>;
  loginWithEmail: (email: string, password: string) => Promise<User | null>;
  sendResetPassword: (email: string) => Promise<boolean>;
  resendVerification: () => Promise<boolean>;
  refreshVerification: () => Promise<boolean>;
  logoutAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Jendela login Google ditutup sebelum selesai.';
    case 'auth/popup-blocked':
      return 'Pop-up login diblokir browser. Izinkan pop-up lalu coba lagi.';
    case 'auth/unauthorized-domain':
      return 'Domain website ini belum didaftarkan di Firebase Console -> Authentication -> Settings -> Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Metode login Email/Password belum diaktifkan di Firebase Console -> Authentication -> Sign-in method.';
    case 'auth/email-already-in-use':
      return 'Email ini sudah terdaftar. Silakan masuk atau gunakan Lupa Sandi.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi salah. Periksa kembali data Anda.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet terganggu. Periksa jaringan Anda lalu coba lagi.';
    default:
      return err instanceof Error ? err.message : 'Terjadi kendala saat proses autentikasi.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState<boolean>(true);
  const [authBusy, setAuthBusy] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const clearMessages = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser(cred.user);
      setAuthNotice(`Berhasil masuk sebagai ${cred.user.displayName || cred.user.email}`);
      return cred.user;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName: string): Promise<User | null> => {
      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);
      try {
        const cleanEmail = email.trim();
        const cleanName = displayName.trim().slice(0, 32) || 'Penjelajah Aether';
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(cred.user, { displayName: cleanName });
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-fatal if verification rate limit is hit
        }
        await reload(cred.user);
        setUser(auth.currentUser);
        setAuthNotice(
          'Akun dibuat! Cek kotak masuk/spam email Anda untuk tautan verifikasi agar sinkronisasi awan aktif.',
        );
        return auth.currentUser ?? cred.user;
      } catch (err) {
        setAuthError(mapFirebaseAuthError(err));
        return null;
      } finally {
        setAuthBusy(false);
      }
    },
    [],
  );

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<User | null> => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(cred.user);
      if (!cred.user.emailVerified) {
        setAuthNotice(
          'Berhasil masuk. Verifikasi email Anda untuk mengaktifkan penyimpanan progres awan Firebase.',
        );
      } else {
        setAuthNotice(`Selamat datang kembali, ${cred.user.displayName || cred.user.email}!`);
      }
      return cred.user;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return null;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const sendResetPassword = useCallback(async (email: string): Promise<boolean> => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setAuthNotice('Email pemulihan kata sandi telah dikirim. Periksa kotak masuk atau folder spam.');
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const resendVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await sendEmailVerification(auth.currentUser);
      setAuthNotice('Tautan verifikasi email baru sudah dikirim.');
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const refreshVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setAuthBusy(true);
    setAuthError(null);
    try {
      await reload(auth.currentUser);
      const refreshed = auth.currentUser;
      setUser(refreshed ? ({ ...refreshed } as User) : null);
      if (refreshed?.emailVerified) {
        setAuthNotice('Email terverifikasi! Akun Anda kini tersinkron penuh dengan Firebase.');
        return true;
      }
      setAuthError('Email belum terverifikasi. Klik tautan di email Anda lalu tekan tombol ini lagi.');
      return false;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const logoutAccount = useCallback(async (): Promise<void> => {
    setAuthBusy(true);
    setAuthError(null);
    setAuthNotice(null);
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authBusy,
        authError,
        authNotice,
        clearMessages,
        signInWithGoogle,
        registerWithEmail,
        loginWithEmail,
        sendResetPassword,
        resendVerification,
        refreshVerification,
        logoutAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
