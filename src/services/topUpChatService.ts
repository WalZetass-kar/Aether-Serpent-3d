import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { isAdminAccount } from './adminService';

export type TopUpThreadStatus = 'open' | 'pending_payment' | 'completed';

export interface TopUpChatThread {
  uid: string;
  email: string;
  displayName: string;
  status: TopUpThreadStatus;
  requestedPackName: string;
  lastMessageText: string;
  lastSenderRole: 'member' | 'admin';
  unreadByAdmin: number;
  unreadByMember: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface TopUpChatMessage {
  id: string;
  threadUid: string;
  senderUid: string;
  senderName: string;
  senderRole: 'member' | 'admin';
  text: string;
  packId: string;
  coinDelta: number;
  createdAtMs: number;
}

export interface WalletSyncSnapshot {
  aetherCoins: number;
  unlockedBoardIds: string[];
}

function toMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toMillis' in val) {
    const fn = (val as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(val);
  }
  return 0;
}

function makeMessageId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `msg_${Date.now()}_${rand}`;
}

function parseThread(docId: string, d: Record<string, unknown>): TopUpChatThread {
  const rawStatus = String(d.status || 'open');
  const status: TopUpThreadStatus =
    rawStatus === 'pending_payment' || rawStatus === 'completed' ? rawStatus : 'open';
  return {
    uid: String(d.uid || docId),
    email: String(d.email || '-'),
    displayName: String(d.displayName || 'Penjelajah Aether'),
    status,
    requestedPackName: String(d.requestedPackName || ''),
    lastMessageText: String(d.lastMessageText || ''),
    lastSenderRole: d.lastSenderRole === 'admin' ? 'admin' : 'member',
    unreadByAdmin: typeof d.unreadByAdmin === 'number' ? d.unreadByAdmin : 0,
    unreadByMember: typeof d.unreadByMember === 'number' ? d.unreadByMember : 0,
    createdAtMs: toMs(d.createdAt),
    updatedAtMs: toMs(d.updatedAt),
  };
}

function parseMessage(docId: string, d: Record<string, unknown>): TopUpChatMessage {
  return {
    id: String(d.id || docId),
    threadUid: String(d.threadUid || ''),
    senderUid: String(d.senderUid || ''),
    senderName: String(d.senderName || 'Pengguna'),
    senderRole: d.senderRole === 'admin' ? 'admin' : 'member',
    text: String(d.text || ''),
    packId: String(d.packId || ''),
    coinDelta: typeof d.coinDelta === 'number' ? Math.trunc(d.coinDelta) : 0,
    createdAtMs: toMs(d.createdAt) || Date.now(),
  };
}

/**
 * Live listener on the verified member's Firestore /users/{uid} wallet fields
 * so Admin coin additions/deductions & Royal Pass grants appear immediately.
 */
export function subscribeToUserWalletSync(
  user: User,
  onWalletChange: (snap: WalletSyncSnapshot) => void,
): Unsubscribe {
  if (!user.emailVerified) {
    return () => {};
  }
  const ref = doc(db, 'users', user.uid);
  return onSnapshot(
    ref,
    (docSnap) => {
      if (!docSnap.exists()) return;
      const d = docSnap.data();
      if (typeof d.aetherCoins !== 'number' && !Array.isArray(d.unlockedBoardIds)) return;
      onWalletChange({
        aetherCoins:
          typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250,
        unlockedBoardIds: Array.isArray(d.unlockedBoardIds)
          ? d.unlockedBoardIds.filter((v): v is string => typeof v === 'string').slice(0, 30)
          : [],
      });
    },
    () => {
      // Ignore transient offline snapshot errors
    },
  );
}

/**
 * Live listener for a member's own top-up chat thread header.
 */
export function subscribeToMemberTopUpThread(
  user: User,
  onThread: (thread: TopUpChatThread | null) => void,
): Unsubscribe {
  if (!user.emailVerified) {
    onThread(null);
    return () => {};
  }
  const ref = doc(db, 'topupChats', user.uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onThread(null);
        return;
      }
      onThread(parseThread(snap.id, snap.data()));
    },
    () => {
      // Ignore transient errors
    },
  );
}

/**
 * Live listener for all messages inside a specific member's top-up chat thread.
 */
export function subscribeToTopUpMessages(
  threadUid: string,
  viewerIsAdmin: boolean,
  onMessages: (messages: TopUpChatMessage[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const colRef = collection(db, 'topupChats', threadUid, 'messages');
  const q = viewerIsAdmin
    ? query(colRef, orderBy('createdAt', 'asc'), limit(120))
    : query(colRef, where('threadUid', '==', threadUid), limit(120));

  return onSnapshot(
    q,
    (snap) => {
      const list: TopUpChatMessage[] = [];
      snap.forEach((docSnap) => {
        list.push(parseMessage(docSnap.id, docSnap.data()));
      });
      list.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onMessages(list);
    },
    (err) => {
      if (onError) onError(err);
    },
  );
}

/**
 * Live listener for Admin Portal: all member top-up chat threads.
 */
export function subscribeToAllTopUpThreads(
  adminUser: User,
  onThreads: (threads: TopUpChatThread[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!isAdminAccount(adminUser)) {
    onThreads([]);
    return () => {};
  }
  const q = query(collection(db, 'topupChats'), limit(150));
  return onSnapshot(
    q,
    (snap) => {
      const list: TopUpChatThread[] = [];
      snap.forEach((docSnap) => {
        list.push(parseThread(docSnap.id, docSnap.data()));
      });
      list.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onThreads(list);
    },
    (err) => {
      if (onError) onError(err);
    },
  );
}

/**
 * Sends a message from a verified member to the Admin in their private top-up thread.
 */
export async function sendMemberTopUpMessage(
  user: User,
  displayName: string,
  rawText: string,
  options?: { packId?: string; packName?: string },
): Promise<void> {
  if (!user.emailVerified || !user.email) {
    throw new Error('Akun harus login dengan email terverifikasi untuk menghubungi Admin.');
  }
  const text = rawText.trim().slice(0, 600);
  if (!text) return;

  const safeName = (displayName || user.displayName || 'Penjelajah Aether').trim().slice(0, 32) || 'Penjelajah Aether';
  const safePackId = (options?.packId || '').trim().slice(0, 40);
  const safePackName = (options?.packName || '').trim().slice(0, 80);

  const threadRef = doc(db, 'topupChats', user.uid);
  const threadPath = `topupChats/${user.uid}`;

  try {
    const existingSnap = await getDoc(threadRef);
    if (!existingSnap.exists()) {
      await setDoc(threadRef, {
        uid: user.uid,
        email: user.email,
        displayName: safeName,
        status: safePackName ? 'pending_payment' : 'open',
        requestedPackName: safePackName,
        lastMessageText: text.slice(0, 300),
        lastSenderRole: 'member',
        unreadByAdmin: 1,
        unreadByMember: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prev = existingSnap.data();
      const prevUnread = typeof prev.unreadByAdmin === 'number' ? prev.unreadByAdmin : 0;
      const nextPack = safePackName || String(prev.requestedPackName || '').slice(0, 80);
      await updateDoc(threadRef, {
        displayName: safeName,
        status: safePackName ? 'pending_payment' : prev.status === 'completed' ? 'open' : (prev.status || 'open'),
        requestedPackName: nextPack,
        lastMessageText: text.slice(0, 300),
        lastSenderRole: 'member',
        unreadByAdmin: Math.min(999, prevUnread + 1),
        unreadByMember: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, threadPath);
  }

  const msgId = makeMessageId();
  const msgRef = doc(db, 'topupChats', user.uid, 'messages', msgId);
  const msgPath = `topupChats/${user.uid}/messages/${msgId}`;
  try {
    await setDoc(msgRef, {
      id: msgId,
      threadUid: user.uid,
      senderUid: user.uid,
      senderName: safeName.slice(0, 40),
      senderRole: 'member',
      text,
      packId: safePackId,
      coinDelta: 0,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath);
  }
}

/**
 * Sends a reply (or coin adjustment receipt) from Admin into a member's top-up chat thread.
 */
export async function sendAdminTopUpReply(
  adminUser: User,
  targetMember: { uid: string; email: string; displayName: string },
  rawText: string,
  options?: { coinDelta?: number; status?: TopUpThreadStatus },
): Promise<void> {
  if (!isAdminAccount(adminUser)) {
    throw new Error('Hanya Admin yang dapat membalas chat top-up.');
  }
  const text = rawText.trim().slice(0, 600);
  if (!text) return;

  const coinDelta = Math.max(-10000000, Math.min(10000000, Math.trunc(options?.coinDelta ?? 0)));
  const safeTargetName = (targetMember.displayName || 'Member').trim().slice(0, 32) || 'Member';
  const safeTargetEmail = (targetMember.email || 'member@aether.app').trim().slice(0, 254);

  const threadRef = doc(db, 'topupChats', targetMember.uid);
  const threadPath = `topupChats/${targetMember.uid}`;

  try {
    const existingSnap = await getDoc(threadRef);
    if (!existingSnap.exists()) {
      await setDoc(threadRef, {
        uid: targetMember.uid,
        email: safeTargetEmail,
        displayName: safeTargetName,
        status: options?.status ?? (coinDelta !== 0 ? 'completed' : 'open'),
        requestedPackName: '',
        lastMessageText: text.slice(0, 300),
        lastSenderRole: 'admin',
        unreadByAdmin: 0,
        unreadByMember: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const prev = existingSnap.data();
      const prevUnreadMember = typeof prev.unreadByMember === 'number' ? prev.unreadByMember : 0;
      await updateDoc(threadRef, {
        status: options?.status ?? (coinDelta > 0 ? 'completed' : prev.status || 'open'),
        lastMessageText: text.slice(0, 300),
        lastSenderRole: 'admin',
        unreadByAdmin: 0,
        unreadByMember: Math.min(999, prevUnreadMember + 1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, threadPath);
  }

  const msgId = makeMessageId();
  const msgRef = doc(db, 'topupChats', targetMember.uid, 'messages', msgId);
  const msgPath = `topupChats/${targetMember.uid}/messages/${msgId}`;
  try {
    await setDoc(msgRef, {
      id: msgId,
      threadUid: targetMember.uid,
      senderUid: adminUser.uid,
      senderName: 'Admin Resmi',
      senderRole: 'admin',
      text,
      packId: '',
      coinDelta,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, msgPath);
  }
}

export async function markTopUpThreadReadByMember(user: User): Promise<void> {
  if (!user.emailVerified) return;
  try {
    const ref = doc(db, 'topupChats', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if ((snap.data().unreadByMember ?? 0) > 0) {
      await updateDoc(ref, {
        unreadByMember: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-critical
  }
}

export async function markTopUpThreadReadByAdmin(
  adminUser: User,
  targetUid: string,
): Promise<void> {
  if (!isAdminAccount(adminUser)) return;
  try {
    const ref = doc(db, 'topupChats', targetUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if ((snap.data().unreadByAdmin ?? 0) > 0) {
      await updateDoc(ref, {
        unreadByAdmin: 0,
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-critical
  }
}

export interface CoinGiftEvent {
  id: string;
  recipientUid: string;
  senderUid: string;
  senderName: string;
  amount: number;
  message: string;
  acknowledged: boolean;
  createdAtMs: number;
}

function parseCoinGift(docId: string, d: Record<string, unknown>): CoinGiftEvent {
  return {
    id: String(d.id || docId),
    recipientUid: String(d.recipientUid || ''),
    senderUid: String(d.senderUid || ''),
    senderName: String(d.senderName || 'Admin Resmi'),
    amount: typeof d.amount === 'number' ? Math.max(0, Math.trunc(d.amount)) : 0,
    message: String(d.message || ''),
    acknowledged: d.acknowledged === true,
    createdAtMs: toMs(d.createdAt) || Date.now(),
  };
}

/**
 * Real-time listener on `/users/{uid}/coinGifts` for unacknowledged Gift Coins
 * sent by Admin so the recipient immediately sees the celebratory coin animation.
 */
export function subscribeToPendingCoinGifts(
  user: User | null,
  onGifts: (gifts: CoinGiftEvent[]) => void,
): Unsubscribe {
  if (!user || !user.emailVerified) {
    onGifts([]);
    return () => {};
  }
  const colRef = collection(db, 'users', user.uid, 'coinGifts');
  const q = query(colRef, where('recipientUid', '==', user.uid), limit(25));
  return onSnapshot(
    q,
    (snap) => {
      const pending: CoinGiftEvent[] = [];
      snap.forEach((docSnap) => {
        const parsed = parseCoinGift(docSnap.id, docSnap.data());
        if (!parsed.acknowledged && parsed.amount > 0) {
          pending.push(parsed);
        }
      });
      pending.sort((a, b) => a.createdAtMs - b.createdAtMs);
      onGifts(pending);
    },
    () => {
      // Non-critical listener failure
    },
  );
}

/**
 * Marks a received Gift Coins event as acknowledged so the animation plays once.
 */
export async function acknowledgeCoinGift(user: User, giftId: string): Promise<void> {
  if (!user.emailVerified || !giftId) return;
  const path = `users/${user.uid}/coinGifts/${giftId}`;
  try {
    const ref = doc(db, 'users', user.uid, 'coinGifts', giftId);
    await updateDoc(ref, {
      acknowledged: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
