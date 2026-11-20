import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { PLAYER_ARCHETYPES, type BoardGameMode, type DiceSkinId } from '../../shared/gameConfig';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  deriveNumericFriendId,
  type CloudPublicProfile,
} from './firebaseAccountService';

export type FriendshipStatus = 'pending' | 'accepted';
export type OnlinePresenceStatus = 'online' | 'away' | 'offline';

export interface FriendshipItem {
  id: string;
  friendUid: string;
  friendNumericId: string;
  friendName: string;
  friendArchetype: number;
  status: FriendshipStatus;
  requestedBy: string;
  isIncoming: boolean;
  isOutgoing: boolean;
  inviteRoomCode: string;
  inviteFromUid: string;
  hasPendingRoomInvite: boolean;
  updatedAtMs: number;
}

export interface FriendshipSummary {
  friends: FriendshipItem[];
  incomingRequests: FriendshipItem[];
  outgoingRequests: FriendshipItem[];
}

export interface FriendPresence {
  uid: string;
  numericId: string;
  status: OnlinePresenceStatus;
  isOnline: boolean;
  lastSeenAtMs: number;
}

export interface FriendChatMessage {
  id: string;
  pairId: string;
  senderUid: string;
  recipientUid: string;
  senderName: string;
  text: string;
  createdAtMs: number;
}

export interface BackendFriendNotification {
  id: string;
  type: 'friend_request' | 'friend_accept' | 'friend_chat' | 'room_invite';
  recipientUid: string;
  senderUid: string;
  senderName: string;
  senderNumericId?: string;
  roomCode?: string;
  messagePreview?: string;
  createdAt: number;
}

export interface SendFriendRequestResult {
  outcome: 'sent' | 'accepted_existing' | 'already_friends' | 'already_pending';
  backendNotified: boolean;
}

export interface FriendActiveMatch {
  friendUid: string;
  roomCode: string;
  roomName: string;
  boardName: string;
  boardMode: BoardGameMode;
  playerCount: number;
  maxPlayers: number;
  spectatorCount: number;
  isPublic: boolean;
  turnCount: number;
}

function clampArchetype(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 0;
  return Math.min(PLAYER_ARCHETYPES.length - 1, Math.max(0, n));
}

function cleanDisplayName(raw: unknown, fallback = 'Penjelajah Aether'): string {
  const s = typeof raw === 'string' ? raw.trim().slice(0, 32) : '';
  return s.length > 0 ? s : fallback;
}

function timestampToMs(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts) {
    try {
      return (ts as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}

function resolveOnlinePresence(isOnlineFlag: unknown, lastSeenAt: unknown): {
  status: OnlinePresenceStatus;
  isOnline: boolean;
  lastSeenAtMs: number;
} {
  const lastSeenAtMs = timestampToMs(lastSeenAt);
  const ageMs = lastSeenAtMs > 0 ? Date.now() - lastSeenAtMs : Number.POSITIVE_INFINITY;
  if (isOnlineFlag === true && ageMs <= 3 * 60 * 1000) {
    return { status: 'online', isOnline: true, lastSeenAtMs };
  }
  if (lastSeenAtMs > 0 && ageMs <= 15 * 60 * 1000) {
    return { status: 'away', isOnline: false, lastSeenAtMs };
  }
  return { status: 'offline', isOnline: false, lastSeenAtMs };
}

export function buildFriendshipPairId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}__${uidB}` : `${uidB}__${uidA}`;
}

function toPublicProfile(docId: string, d: Record<string, unknown>): CloudPublicProfile {
  const uid = String(d.uid || docId);
  const numericId =
    typeof d.numericId === 'string' && /^\d+$/.test(d.numericId)
      ? d.numericId
      : deriveNumericFriendId(uid);
  const presence = resolveOnlinePresence(d.isOnline, d.lastSeenAt ?? d.updatedAt);

  return {
    uid,
    displayName: cleanDisplayName(d.displayName, 'Penjelajah'),
    numericId,
    archetypeIndex: clampArchetype(d.archetypeIndex),
    diceSkinId: (typeof d.diceSkinId === 'string' ? d.diceSkinId : 'royal_obsidian') as DiceSkinId,
    wins: typeof d.wins === 'number' ? Math.max(0, Math.floor(d.wins)) : 0,
    totalGames: typeof d.totalGames === 'number' ? Math.max(0, Math.floor(d.totalGames)) : 0,
    bestScore: typeof d.bestScore === 'number' ? Math.max(0, Math.floor(d.bestScore)) : 0,
    onlineWins: typeof d.onlineWins === 'number' ? Math.max(0, Math.floor(d.onlineWins)) : 0,
    isOnline: presence.isOnline,
    lastSeenAtMs: presence.lastSeenAtMs,
  };
}

/**
 * Triggers a real-time recipient notification through the Express backend service (/api/friends/notify).
 */
export async function notifyRecipientViaBackend(
  user: User,
  payload: {
    type: 'friend_request' | 'friend_accept' | 'friend_chat' | 'room_invite';
    recipientUid: string;
    senderName: string;
    roomCode?: string;
    messagePreview?: string;
  },
): Promise<boolean> {
  if (!user.emailVerified || !payload.recipientUid || payload.recipientUid === user.uid) {
    return false;
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/friends/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: payload.type,
        recipientUid: payload.recipientUid,
        senderName: payload.senderName,
        senderNumericId: deriveNumericFriendId(user.uid),
        ...(payload.roomCode ? { roomCode: payload.roomCode } : {}),
        ...(payload.messagePreview ? { messagePreview: payload.messagePreview } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchBackendFriendNotifications(
  user: User,
): Promise<BackendFriendNotification[]> {
  if (!user.emailVerified) return [];
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/friends/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { notifications?: BackendFriendNotification[] };
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch {
    return [];
  }
}

export async function acknowledgeBackendFriendNotifications(
  user: User,
  ids: string[],
): Promise<void> {
  if (!user.emailVerified || ids.length === 0) return;
  try {
    const token = await user.getIdToken();
    await fetch('/api/friends/notifications/ack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // non-fatal
  }
}

/**
 * Queries the backend multiplayer server for friends who are currently inside
 * a live 'playing' room so the FriendsListDrawer can display a 'Watch' button.
 */
export async function fetchFriendsActiveMatches(
  user: User,
  friendUids: string[],
): Promise<Record<string, FriendActiveMatch>> {
  const cleanUids = Array.from(new Set(friendUids.filter((id) => Boolean(id && id !== user.uid)))).slice(
    0,
    50,
  );
  if (!user.emailVerified || cleanUids.length === 0) {
    return {};
  }
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/friends/active-matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ friendUids: cleanUids }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { matches?: Record<string, FriendActiveMatch> };
    return data.matches && typeof data.matches === 'object' ? data.matches : {};
  } catch {
    return {};
  }
}

/**
 * Polls live playing rooms for connected friends while the FriendsListDrawer is open.
 */
export function subscribeToFriendsActiveMatches(
  user: User | null | undefined,
  friendUids: string[],
  enabled: boolean,
  onUpdate: (matches: Record<string, FriendActiveMatch>) => void,
): () => void {
  const uniqueUids = Array.from(new Set(friendUids.filter((id) => Boolean(id && id !== user?.uid)))).slice(
    0,
    50,
  );
  if (!enabled || !user?.emailVerified || uniqueUids.length === 0) {
    onUpdate({});
    return () => {};
  }

  let active = true;
  const syncNow = async () => {
    const next = await fetchFriendsActiveMatches(user, uniqueUids);
    if (active) {
      onUpdate(next);
    }
  };

  void syncNow();
  const timer = window.setInterval(() => {
    void syncNow();
  }, 3000);

  return () => {
    active = false;
    window.clearInterval(timer);
  };
}

/**
 * Search verified player profiles by unique username (displayName),
 * numeric ID (e.g. #847291034), or exact Firebase UID.
 */
export async function searchPlayersByNameOrId(
  currentUser: User,
  rawQuery: string,
): Promise<CloudPublicProfile[]> {
  if (!currentUser.emailVerified) return [];
  const trimmed = rawQuery.trim().replace(/^#/, '');
  const lower = trimmed.toLowerCase();
  const digitsOnly = trimmed.replace(/\D/g, '');
  const byUid = new Map<string, CloudPublicProfile>();

  // 1. Direct exact UID lookup when query looks like a Firebase UID
  if (trimmed.length >= 6 && /^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed !== currentUser.uid) {
    const exactPath = `publicProfiles/${trimmed}`;
    try {
      const exactSnap = await getDoc(doc(db, 'publicProfiles', trimmed));
      if (exactSnap.exists()) {
        const prof = toPublicProfile(exactSnap.id, exactSnap.data());
        if (prof.uid !== currentUser.uid) {
          byUid.set(prof.uid, prof);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, exactPath);
    }
  }

  // 2. Direct numeric ID equality query when user enters 6+ digits
  if (digitsOnly.length >= 6 && digitsOnly === trimmed) {
    try {
      const numQ = query(
        collection(db, 'publicProfiles'),
        where('isPublic', '==', true),
        where('numericId', '==', digitsOnly),
        limit(10),
      );
      const numSnap = await getDocs(numQ);
      numSnap.forEach((docSnap) => {
        const prof = toPublicProfile(docSnap.id, docSnap.data());
        if (prof.uid !== currentUser.uid) {
          byUid.set(prof.uid, prof);
        }
      });
    } catch {
      // Fall back smoothly to directory scan below if numericId equality index isn't built yet
    }
  }

  // 3. Scan public directory & match by username, numericId, or UID
  const listPath = 'publicProfiles';
  try {
    const q = query(
      collection(db, 'publicProfiles'),
      where('isPublic', '==', true),
      limit(100),
    );
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      const prof = toPublicProfile(docSnap.id, docSnap.data());
      if (prof.uid === currentUser.uid) return;
      if (byUid.has(prof.uid)) return;

      if (!lower) {
        byUid.set(prof.uid, prof);
        return;
      }

      const nameLower = prof.displayName.toLowerCase();
      const uidLower = prof.uid.toLowerCase();
      const numId = (prof.numericId || '').toLowerCase();
      if (
        nameLower.includes(lower) ||
        uidLower.includes(lower) ||
        (digitsOnly.length > 0 && numId.includes(digitsOnly)) ||
        numId.includes(lower)
      ) {
        byUid.set(prof.uid, prof);
      }
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, listPath);
  }

  const results = Array.from(byUid.values());
  if (!lower) {
    return results
      .sort((a, b) => Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline)) || b.bestScore - a.bestScore)
      .slice(0, 24);
  }

  return results
    .sort((a, b) => {
      const aExactId =
        a.uid.toLowerCase() === lower || (a.numericId && a.numericId === digitsOnly) ? 5 : 0;
      const bExactId =
        b.uid.toLowerCase() === lower || (b.numericId && b.numericId === digitsOnly) ? 5 : 0;
      if (aExactId !== bExactId) return bExactId - aExactId;

      const aExactName = a.displayName.toLowerCase() === lower ? 3 : 0;
      const bExactName = b.displayName.toLowerCase() === lower ? 3 : 0;
      if (aExactName !== bExactName) return bExactName - aExactName;

      const aPrefix = a.displayName.toLowerCase().startsWith(lower) ? 2 : 0;
      const bPrefix = b.displayName.toLowerCase().startsWith(lower) ? 2 : 0;
      if (aPrefix !== bPrefix) return bPrefix - aPrefix;

      return b.bestScore - a.bestScore || b.wins - a.wins;
    })
    .slice(0, 24);
}

/**
 * Subscribe in real time to all friendships, friend requests, and incoming room invites
 * for the currently verified user.
 */
export function subscribeToFriendships(
  user: User,
  onUpdate: (summary: FriendshipSummary) => void,
): () => void {
  if (!user.emailVerified) {
    onUpdate({ friends: [], incomingRequests: [], outgoingRequests: [] });
    return () => {};
  }

  const path = 'friendships';
  const q = query(
    collection(db, 'friendships'),
    where('participantUids', 'array-contains', user.uid),
    limit(100),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const friends: FriendshipItem[] = [];
      const incomingRequests: FriendshipItem[] = [];
      const outgoingRequests: FriendshipItem[] = [];

      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const user1Uid = String(d.user1Uid || '');
        const user2Uid = String(d.user2Uid || '');
        if (!user1Uid || !user2Uid) return;

        const amUser1 = user.uid === user1Uid;
        const friendUid = amUser1 ? user2Uid : user1Uid;
        const friendName = cleanDisplayName(amUser1 ? d.user2Name : d.user1Name, 'Pemain Aether');
        const friendArchetype = clampArchetype(amUser1 ? d.user2Archetype : d.user1Archetype);
        const status: FriendshipStatus = d.status === 'accepted' ? 'accepted' : 'pending';
        const requestedBy = String(d.requestedBy || '');
        const isIncoming = status === 'pending' && requestedBy !== user.uid;
        const isOutgoing = status === 'pending' && requestedBy === user.uid;
        const inviteRoomCode =
          typeof d.inviteRoomCode === 'string' ? d.inviteRoomCode.trim().toUpperCase() : '';
        const inviteFromUid = typeof d.inviteFromUid === 'string' ? d.inviteFromUid : '';
        const hasPendingRoomInvite =
          status === 'accepted' && inviteRoomCode.length >= 4 && inviteFromUid === friendUid;
        const updatedAtMs = timestampToMs(d.updatedAt) || Date.now();

        const item: FriendshipItem = {
          id: docSnap.id,
          friendUid,
          friendNumericId: deriveNumericFriendId(friendUid),
          friendName,
          friendArchetype,
          status,
          requestedBy,
          isIncoming,
          isOutgoing,
          inviteRoomCode,
          inviteFromUid,
          hasPendingRoomInvite,
          updatedAtMs,
        };

        if (status === 'accepted') {
          friends.push(item);
        } else if (isIncoming) {
          incomingRequests.push(item);
        } else {
          outgoingRequests.push(item);
        }
      });

      friends.sort((a, b) => {
        if (a.hasPendingRoomInvite !== b.hasPendingRoomInvite) {
          return a.hasPendingRoomInvite ? -1 : 1;
        }
        return a.friendName.localeCompare(b.friendName, 'id');
      });
      incomingRequests.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      outgoingRequests.sort((a, b) => b.updatedAtMs - a.updatedAtMs);

      onUpdate({ friends, incomingRequests, outgoingRequests });
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    },
  );
}

/**
 * Subscribes in real time to each friend's public profile document so online status indicators
 * (Online / Away / Offline) stay updated live as friends log in, play, or go offline.
 */
export function subscribeToFriendsPresence(
  user: User | null | undefined,
  friendUids: string[],
  onUpdate: (presenceByUid: Record<string, FriendPresence>) => void,
): () => void {
  const uniqueUids = Array.from(new Set(friendUids.filter((id) => Boolean(id && id !== user?.uid)))).slice(
    0,
    40,
  );
  if (!user?.emailVerified || uniqueUids.length === 0) {
    onUpdate({});
    return () => {};
  }

  let active = true;
  const presenceMap: Record<string, FriendPresence> = {};
  for (const uid of uniqueUids) {
    presenceMap[uid] = {
      uid,
      numericId: deriveNumericFriendId(uid),
      status: 'offline',
      isOnline: false,
      lastSeenAtMs: 0,
    };
  }
  onUpdate({ ...presenceMap });

  const unsubs = uniqueUids.map((uid) =>
    onSnapshot(
      doc(db, 'publicProfiles', uid),
      (snap) => {
        if (!active) return;
        if (!snap.exists()) {
          presenceMap[uid] = {
            uid,
            numericId: deriveNumericFriendId(uid),
            status: 'offline',
            isOnline: false,
            lastSeenAtMs: 0,
          };
          onUpdate({ ...presenceMap });
          return;
        }
        const d = snap.data();
        const resolved = resolveOnlinePresence(d.isOnline, d.lastSeenAt ?? d.updatedAt);
        const numericId =
          typeof d.numericId === 'string' && /^\d+$/.test(d.numericId)
            ? d.numericId
            : deriveNumericFriendId(uid);

        presenceMap[uid] = {
          uid,
          numericId,
          status: resolved.status,
          isOnline: resolved.isOnline,
          lastSeenAtMs: resolved.lastSeenAtMs,
        };
        onUpdate({ ...presenceMap });
      },
      () => {
        // Non-fatal fallback if a specific friend profile is private or temporarily unreadable
      },
    ),
  );

  // Re-evaluate stale thresholds locally every 30s without extra Firestore reads
  const decayTimer = window.setInterval(() => {
    if (!active) return;
    let changed = false;
    const now = Date.now();
    for (const uid of uniqueUids) {
      const cur = presenceMap[uid];
      if (!cur) continue;
      const age = cur.lastSeenAtMs > 0 ? now - cur.lastSeenAtMs : Number.POSITIVE_INFINITY;
      const nextStatus: OnlinePresenceStatus =
        cur.isOnline && age <= 3 * 60 * 1000
          ? 'online'
          : cur.lastSeenAtMs > 0 && age <= 15 * 60 * 1000
            ? 'away'
            : 'offline';
      if (nextStatus !== cur.status) {
        presenceMap[uid] = {
          ...cur,
          status: nextStatus,
          isOnline: nextStatus === 'online',
        };
        changed = true;
      }
    }
    if (changed) {
      onUpdate({ ...presenceMap });
    }
  }, 30_000);

  return () => {
    active = false;
    window.clearInterval(decayTimer);
    unsubs.forEach((unsub) => unsub());
  };
}

export async function sendFriendRequest(
  user: User,
  myProfile: { name: string; archetypeIndex: number },
  target: CloudPublicProfile,
): Promise<SendFriendRequestResult> {
  if (!user.emailVerified) {
    throw new Error('Verifikasi email akun terlebih dahulu untuk menambah teman.');
  }
  if (!target.uid || target.uid === user.uid) {
    throw new Error('Tidak dapat menambahkan akun sendiri sebagai teman.');
  }

  const pairId = buildFriendshipPairId(user.uid, target.uid);
  const path = `friendships/${pairId}`;
  const ref = doc(db, 'friendships', pairId);
  const mySafeName = cleanDisplayName(myProfile.name || user.displayName);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const data = existing.data();
      if (data.status === 'accepted') {
        return { outcome: 'already_friends', backendNotified: false };
      }
      if (data.requestedBy !== user.uid) {
        await updateDoc(ref, {
          status: 'accepted',
          updatedAt: serverTimestamp(),
        });
        const backendNotified = await notifyRecipientViaBackend(user, {
          type: 'friend_accept',
          recipientUid: target.uid,
          senderName: mySafeName,
        });
        return { outcome: 'accepted_existing', backendNotified };
      }
      return { outcome: 'already_pending', backendNotified: false };
    }

    const amUser1 = user.uid < target.uid;
    const user1Uid = amUser1 ? user.uid : target.uid;
    const user2Uid = amUser1 ? target.uid : user.uid;
    const mySafeArch = clampArchetype(myProfile.archetypeIndex);
    const targetSafeName = cleanDisplayName(target.displayName);
    const targetSafeArch = clampArchetype(target.archetypeIndex);

    await setDoc(ref, {
      id: pairId,
      user1Uid,
      user2Uid,
      participantUids: [user1Uid, user2Uid],
      requestedBy: user.uid,
      status: 'pending',
      user1Name: amUser1 ? mySafeName : targetSafeName,
      user2Name: amUser1 ? targetSafeName : mySafeName,
      user1Archetype: amUser1 ? mySafeArch : targetSafeArch,
      user2Archetype: amUser1 ? targetSafeArch : mySafeArch,
      inviteRoomCode: '',
      inviteFromUid: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const backendNotified = await notifyRecipientViaBackend(user, {
      type: 'friend_request',
      recipientUid: target.uid,
      senderName: mySafeName,
    });

    return { outcome: 'sent', backendNotified };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function acceptFriendRequest(
  user: User,
  friendshipId: string,
  myName?: string,
  friendUid?: string,
): Promise<void> {
  if (!user.emailVerified) return;
  const path = `friendships/${friendshipId}`;
  try {
    await updateDoc(doc(db, 'friendships', friendshipId), {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });
    if (friendUid) {
      void notifyRecipientViaBackend(user, {
        type: 'friend_accept',
        recipientUid: friendUid,
        senderName: cleanDisplayName(myName || user.displayName),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeOrDeclineFriendship(user: User, friendshipId: string): Promise<void> {
  if (!user.emailVerified) return;
  const path = `friendships/${friendshipId}`;
  try {
    await deleteDoc(doc(db, 'friendships', friendshipId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function sendRoomInviteToFriend(
  user: User,
  friendshipId: string,
  roomCode: string,
  recipientUid?: string,
  myName?: string,
): Promise<void> {
  if (!user.emailVerified) return;
  const cleanCode = roomCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  if (cleanCode.length < 4) return;

  const path = `friendships/${friendshipId}`;
  try {
    await updateDoc(doc(db, 'friendships', friendshipId), {
      inviteRoomCode: cleanCode,
      inviteFromUid: user.uid,
      updatedAt: serverTimestamp(),
    });
    if (recipientUid) {
      void notifyRecipientViaBackend(user, {
        type: 'room_invite',
        recipientUid,
        senderName: cleanDisplayName(myName || user.displayName),
        roomCode: cleanCode,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function clearRoomInvite(user: User, friendshipId: string): Promise<void> {
  if (!user.emailVerified) return;
  const path = `friendships/${friendshipId}`;
  try {
    await updateDoc(doc(db, 'friendships', friendshipId), {
      inviteRoomCode: '',
      inviteFromUid: '',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Subscribe in real time to 1-to-1 quick-chat messages between accepted friends.
 */
export function subscribeToFriendChatMessages(
  user: User | null | undefined,
  pairId: string | null,
  onMessages: (messages: FriendChatMessage[]) => void,
): () => void {
  if (!user?.emailVerified || !pairId) {
    onMessages([]);
    return () => {};
  }

  const path = `friendships/${pairId}/messages`;
  const q = query(
    collection(db, 'friendships', pairId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(60),
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: FriendChatMessage[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: String(d.id || docSnap.id),
          pairId: String(d.pairId || pairId),
          senderUid: String(d.senderUid || ''),
          recipientUid: String(d.recipientUid || ''),
          senderName: cleanDisplayName(d.senderName, 'Pemain'),
          text: typeof d.text === 'string' ? d.text : '',
          createdAtMs: timestampToMs(d.createdAt) || Date.now(),
        });
      });
      onMessages(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    },
  );
}

/**
 * Sends an immutable quick-chat message to an accepted friend inside /friendships/{pairId}/messages
 * and dispatches a backend notification to the recipient.
 */
export async function sendFriendChatMessage(
  user: User,
  pairId: string,
  recipientUid: string,
  myName: string,
  text: string,
): Promise<void> {
  if (!user.emailVerified) {
    throw new Error('Verifikasi email diperlukan untuk mengirim pesan.');
  }
  const cleanText = text.trim().slice(0, 300);
  if (!cleanText) return;

  const participantUids = user.uid < recipientUid ? [user.uid, recipientUid] : [recipientUid, user.uid];
  const expectedPairId = `${participantUids[0]}__${participantUids[1]}`;
  if (expectedPairId !== pairId) {
    throw new Error('ID percakapan teman tidak cocok.');
  }

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `friendships/${pairId}/messages/${messageId}`;
  const safeSenderName = cleanDisplayName(myName || user.displayName);

  try {
    await setDoc(doc(db, 'friendships', pairId, 'messages', messageId), {
      id: messageId,
      pairId,
      senderUid: user.uid,
      recipientUid,
      participantUids,
      senderName: safeSenderName,
      text: cleanText,
      createdAt: serverTimestamp(),
    });

    void notifyRecipientViaBackend(user, {
      type: 'friend_chat',
      recipientUid,
      senderName: safeSenderName,
      messagePreview: cleanText.slice(0, 120),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}
