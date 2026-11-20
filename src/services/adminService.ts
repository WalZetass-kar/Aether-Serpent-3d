import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import type { BoardGameMode, DiceSkinId, DifficultyMode } from '../../shared/gameConfig';
import { BOARD_UNLOCK_RULES, STARTER_UNLOCKED_BOARD_IDS } from '../../shared/boardThemes';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { sendAdminTopUpReply } from './topUpChatService';

export const ADMIN_EMAIL = 'ihwalmaulana09@gmail.com';

export function isAdminAccount(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      typeof user.email === 'string' &&
      user.email.trim().toLowerCase() === ADMIN_EMAIL,
  );
}

export interface AdminMemberRecord {
  uid: string;
  email: string;
  displayName: string;
  archetypeIndex: number;
  diceSkinId: DiceSkinId;
  totalGames: number;
  wins: number;
  losses: number;
  bestScore: number;
  fastestWinTurns: number;
  laddersClimbed: number;
  snakesBitten: number;
  shieldsUsed: number;
  specialTilesHit: number;
  onlineWins: number;
  unlockedAchievements: string[];
  dailyStreak: number;
  loginStreak: number;
  lastLoginDate: string;
  tutorialCompleted: boolean;
  muted: boolean;
  selectedBoardId: string;
  aetherCoins: number;
  unlockedBoardIds: string[];
  isPublic: boolean | null;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface AdminMemberBoardSummary {
  id: string;
  name: string;
  themeId: string;
  ladderCount: number;
  snakeCount: number;
  updatedAtMs: number;
}

export interface AdminRoomPlayer {
  id: string;
  name: string;
  archetypeIndex?: number;
  tile: number;
  score: number;
  shields: number;
  connected: boolean;
  ready: boolean;
  pingMs: number;
  team?: 'A' | 'B';
}

export interface AdminRoomRecord {
  code: string;
  name: string;
  isPublic: boolean;
  boardMode: BoardGameMode;
  boardName: string;
  themeId: string;
  status: 'lobby' | 'playing' | 'finished';
  winnerId?: string | null;
  winningTeam?: 'A' | 'B' | null;
  designatedWinnerId?: string | null;
  hostId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  turnCount: number;
  chatCount: number;
  createdAt: number;
  updatedAt: number;
  lastActivityAt?: number;
  players: AdminRoomPlayer[];
}

export interface AdminLeaderboardRecord {
  id: string;
  playerName: string;
  score: number;
  turns: number;
  mode: string;
  difficulty: DifficultyMode;
  createdAt: string;
}

export interface AdminCloudSyncSummary {
  syncCode: string;
  playerName: string;
  bestScore: number;
  wins: number;
  updatedAt: string;
}

export interface AdminServerOverview {
  ok: boolean;
  serverTime: number;
  serverless: boolean;
  rooms: AdminRoomRecord[];
  leaderboard: AdminLeaderboardRecord[];
  cloudSyncCount: number;
  cloudSyncProfiles: AdminCloudSyncSummary[];
}

function toEpochMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'object' && val !== null && 'toMillis' in val) {
    const fn = (val as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn.call(val);
  }
  return 0;
}

export interface AdminMembersResult {
  members: AdminMemberRecord[];
  totalNetworkMembers: number;
}

export async function fetchAdminMembers(user: User): Promise<AdminMembersResult> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan untuk memuat daftar member.');
  }
  try {
    const [usersCountSnap, publicCountSnap, usersSnap, publicSnap] = await Promise.all([
      getCountFromServer(collection(db, 'users')).catch(() => null),
      getCountFromServer(collection(db, 'publicProfiles')).catch(() => null),
      getDocs(query(collection(db, 'users'), limit(500))),
      getDocs(query(collection(db, 'publicProfiles'), limit(500))),
    ]);

    const publicMap = new Map<string, Record<string, unknown>>();
    publicSnap.forEach((docSnap) => {
      publicMap.set(docSnap.id, docSnap.data());
    });

    const memberMap = new Map<string, AdminMemberRecord>();
    usersSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const uid = String(d.uid || docSnap.id);
      const pubData = publicMap.get(uid);
      memberMap.set(uid, {
        uid,
        email: String(d.email || '-'),
        displayName: String(d.displayName || 'Penjelajah Aether'),
        archetypeIndex: typeof d.archetypeIndex === 'number' ? d.archetypeIndex : 0,
        diceSkinId: (typeof d.diceSkinId === 'string'
          ? d.diceSkinId
          : 'royal_obsidian') as DiceSkinId,
        totalGames: typeof d.totalGames === 'number' ? d.totalGames : 0,
        wins: typeof d.wins === 'number' ? d.wins : 0,
        losses: typeof d.losses === 'number' ? d.losses : 0,
        bestScore: typeof d.bestScore === 'number' ? d.bestScore : 0,
        fastestWinTurns: typeof d.fastestWinTurns === 'number' ? d.fastestWinTurns : 0,
        laddersClimbed: typeof d.laddersClimbed === 'number' ? d.laddersClimbed : 0,
        snakesBitten: typeof d.snakesBitten === 'number' ? d.snakesBitten : 0,
        shieldsUsed: typeof d.shieldsUsed === 'number' ? d.shieldsUsed : 0,
        specialTilesHit: typeof d.specialTilesHit === 'number' ? d.specialTilesHit : 0,
        onlineWins: typeof d.onlineWins === 'number' ? d.onlineWins : 0,
        unlockedAchievements: Array.isArray(d.unlockedAchievements)
          ? d.unlockedAchievements.filter((v): v is string => typeof v === 'string')
          : [],
        dailyStreak: typeof d.dailyStreak === 'number' ? d.dailyStreak : 0,
        loginStreak: typeof d.loginStreak === 'number' ? d.loginStreak : 1,
        lastLoginDate: typeof d.lastLoginDate === 'string' ? d.lastLoginDate : '-',
        tutorialCompleted: Boolean(d.tutorialCompleted),
        muted: Boolean(d.muted),
        selectedBoardId: typeof d.selectedBoardId === 'string' ? d.selectedBoardId : '-',
        aetherCoins: typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250,
        unlockedBoardIds: Array.isArray(d.unlockedBoardIds)
          ? d.unlockedBoardIds.filter((v): v is string => typeof v === 'string')
          : [...STARTER_UNLOCKED_BOARD_IDS],
        isPublic: pubData ? Boolean(pubData.isPublic) : null,
        createdAtMs: toEpochMs(d.createdAt),
        updatedAtMs: toEpochMs(d.updatedAt),
      });
    });

    // Include any verified network member that has a publicProfile even if their /users doc was deferred
    publicMap.forEach((pubData, uid) => {
      if (memberMap.has(uid)) return;
      memberMap.set(uid, {
        uid,
        email: '(Profil Publik Jaringan)',
        displayName: String(pubData.displayName || 'Penjelajah Aether'),
        archetypeIndex: typeof pubData.archetypeIndex === 'number' ? pubData.archetypeIndex : 0,
        diceSkinId: (typeof pubData.diceSkinId === 'string'
          ? pubData.diceSkinId
          : 'royal_obsidian') as DiceSkinId,
        totalGames: typeof pubData.totalGames === 'number' ? pubData.totalGames : 0,
        wins: typeof pubData.wins === 'number' ? pubData.wins : 0,
        losses: 0,
        bestScore: typeof pubData.bestScore === 'number' ? pubData.bestScore : 0,
        fastestWinTurns: 0,
        laddersClimbed: 0,
        snakesBitten: 0,
        shieldsUsed: 0,
        specialTilesHit: 0,
        onlineWins: typeof pubData.onlineWins === 'number' ? pubData.onlineWins : 0,
        unlockedAchievements: [],
        dailyStreak: 0,
        loginStreak: 1,
        lastLoginDate: '-',
        tutorialCompleted: false,
        muted: false,
        selectedBoardId: '-',
        aetherCoins: 250,
        unlockedBoardIds: [...STARTER_UNLOCKED_BOARD_IDS],
        isPublic: Boolean(pubData.isPublic),
        createdAtMs: toEpochMs(pubData.createdAt),
        updatedAtMs: toEpochMs(pubData.updatedAt),
      });
    });

    const members = Array.from(memberMap.values()).sort(
      (a, b) => b.updatedAtMs - a.updatedAtMs || b.bestScore - a.bestScore,
    );
    const serverUsersCount = usersCountSnap?.data().count ?? 0;
    const serverPublicCount = publicCountSnap?.data().count ?? 0;
    const totalNetworkMembers = Math.max(members.length, serverUsersCount, serverPublicCount);

    return { members, totalNetworkMembers };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function fetchMemberCustomBoards(
  user: User,
  targetUid: string,
): Promise<AdminMemberBoardSummary[]> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const path = `users/${targetUid}/boards`;
  try {
    const snap = await getDocs(query(collection(db, 'users', targetUid, 'boards'), limit(30)));
    const boards: AdminMemberBoardSummary[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      boards.push({
        id: String(d.id || docSnap.id),
        name: String(d.name || 'Papan Kustom'),
        themeId: String(d.themeId || 'enchanted_forest'),
        ladderCount: Array.isArray(d.ladders) ? d.ladders.length : 0,
        snakeCount: Array.isArray(d.snakes) ? d.snakes.length : 0,
        updatedAtMs: toEpochMs(d.updatedAt),
      });
    });
    return boards.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function setMemberPublicVisibility(
  user: User,
  targetUid: string,
  isPublic: boolean,
): Promise<void> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const path = `publicProfiles/${targetUid}`;
  try {
    const ref = doc(db, 'publicProfiles', targetUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Profil publik pemain ini belum tercatat.');
    }
    await updateDoc(ref, {
      isPublic,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adminAdjustMemberCoins(
  adminUser: User,
  targetMember: { uid: string; email: string; displayName: string },
  deltaCoins: number,
  note?: string,
  postToChat = true,
): Promise<{ previousCoins: number; nextCoins: number; appliedDelta: number }> {
  if (!isAdminAccount(adminUser)) {
    throw new Error('Akses admin diperlukan untuk mengubah Koin Aether member.');
  }
  const cleanDelta = Math.trunc(deltaCoins);
  if (!cleanDelta || !Number.isFinite(cleanDelta)) {
    throw new Error('Nominal perubahan koin harus berupa angka selain 0.');
  }
  const path = `users/${targetMember.uid}`;
  const ref = doc(db, 'users', targetMember.uid);
  let previousCoins = 250;
  let nextCoins = 250;

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Dokumen akun member belum terdaftar di Firestore.');
    }
    const d = snap.data();
    previousCoins =
      typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250;
    nextCoins = Math.max(0, Math.min(10000000, previousCoins + cleanDelta));
    await updateDoc(ref, {
      aetherCoins: nextCoins,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }

  const appliedDelta = nextCoins - previousCoins;
  if (postToChat && appliedDelta !== 0) {
    const notePart = note?.trim() ? ` Catatan: ${note.trim()}` : '';
    const summaryText =
      appliedDelta > 0
        ? `Pembayaran diverifikasi! Admin menambahkan +${appliedDelta.toLocaleString('id-ID')} Koin Aether ke akunmu. Saldo baru: ${nextCoins.toLocaleString('id-ID')} Koin.${notePart}`
        : `Admin menyesuaikan saldo sebesar ${appliedDelta.toLocaleString('id-ID')} Koin Aether. Saldo baru: ${nextCoins.toLocaleString('id-ID')} Koin.${notePart}`;
    try {
      await sendAdminTopUpReply(adminUser, targetMember, summaryText, {
        coinDelta: appliedDelta,
        status: appliedDelta > 0 ? 'completed' : 'open',
      });
    } catch {
      // Balance update already succeeded; chat receipt is best-effort
    }
  }

  return { previousCoins, nextCoins, appliedDelta };
}

export async function adminGrantAllPremiumBoards(
  adminUser: User,
  targetMember: { uid: string; email: string; displayName: string },
  bonusCoins = 1000,
  note?: string,
): Promise<{ nextCoins: number; unlockedBoardIds: string[] }> {
  if (!isAdminAccount(adminUser)) {
    throw new Error('Akses admin diperlukan untuk mengaktifkan Royal Pass member.');
  }
  const path = `users/${targetMember.uid}`;
  const ref = doc(db, 'users', targetMember.uid);
  const safeBonus = Math.max(0, Math.min(1000000, Math.trunc(bonusCoins)));
  let nextCoins = 250;
  let nextUnlocked: string[] = [];

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Dokumen akun member belum terdaftar di Firestore.');
    }
    const d = snap.data();
    const prevCoins =
      typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250;
    const prevUnlocked = Array.isArray(d.unlockedBoardIds)
      ? d.unlockedBoardIds.filter((v): v is string => typeof v === 'string')
      : [];
    const mergedSet = new Set<string>([...STARTER_UNLOCKED_BOARD_IDS, ...prevUnlocked]);
    Object.values(BOARD_UNLOCK_RULES).forEach((rule) => {
      if (rule.unlockType === 'premium') {
        mergedSet.add(rule.boardId);
      }
    });
    nextUnlocked = Array.from(mergedSet).slice(0, 30);
    nextCoins = Math.max(0, Math.min(10000000, prevCoins + safeBonus));

    await updateDoc(ref, {
      aetherCoins: nextCoins,
      unlockedBoardIds: nextUnlocked,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }

  const premiumBoardCount = Object.values(BOARD_UNLOCK_RULES).filter(
    (r) => r.unlockType === 'premium',
  ).length;
  const notePart = note?.trim() ? ` Catatan: ${note.trim()}` : '';
  try {
    await sendAdminTopUpReply(
      adminUser,
      targetMember,
      `Royal Pass Aktif! Admin telah membuka seluruh ${premiumBoardCount} papan Premium + menambahkan +${safeBonus.toLocaleString('id-ID')} Koin Aether ke akunmu (Saldo: ${nextCoins.toLocaleString('id-ID')} Koin).${notePart}`,
      { coinDelta: safeBonus, status: 'completed' },
    );
  } catch {
    // Non-critical
  }

  return { nextCoins, unlockedBoardIds: nextUnlocked };
}

export interface AdminCoinGiftRecipientInfo {
  uid: string;
  displayName: string;
  email: string;
  aetherCoins: number;
  archetypeIndex: number;
}

export interface AdminCoinGiftResult {
  giftId: string;
  recipientUid: string;
  recipientName: string;
  recipientEmail: string;
  previousCoins: number;
  nextCoins: number;
  appliedAmount: number;
  message: string;
  sentAtMs: number;
}

const VALID_UID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export async function adminLookupMemberByUid(
  adminUser: User,
  rawUid: string,
): Promise<AdminCoinGiftRecipientInfo | null> {
  if (!isAdminAccount(adminUser)) {
    throw new Error('Akses admin diperlukan untuk mencari akun member.');
  }
  const cleanUid = rawUid.trim();
  if (!VALID_UID_REGEX.test(cleanUid)) {
    throw new Error('Format ID Pengguna (UID) tidak valid. Gunakan huruf, angka, tanda _ atau -.');
  }
  const path = `users/${cleanUid}`;
  try {
    const snap = await getDoc(doc(db, 'users', cleanUid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid: cleanUid,
      displayName: String(d.displayName || 'Penjelajah Aether'),
      email: String(d.email || '—'),
      aetherCoins:
        typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250,
      archetypeIndex: typeof d.archetypeIndex === 'number' ? d.archetypeIndex : 0,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function adminSendGiftCoins(
  adminUser: User,
  targetUid: string,
  amount: number,
  message?: string,
): Promise<AdminCoinGiftResult> {
  if (!isAdminAccount(adminUser)) {
    throw new Error('Akses admin diperlukan untuk mengirim Gift Coins.');
  }
  const cleanUid = targetUid.trim();
  if (!VALID_UID_REGEX.test(cleanUid)) {
    throw new Error('ID Pengguna (UID) tidak valid.');
  }
  const cleanAmount = Math.trunc(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount < 1 || cleanAmount > 10000000) {
    throw new Error('Jumlah Gift Coins harus antara 1 hingga 10.000.000 Koin.');
  }
  const safeMessage = (message ?? '').trim().slice(0, 200);
  const userPath = `users/${cleanUid}`;
  const userRef = doc(db, 'users', cleanUid);

  let recipientName = 'Penjelajah Aether';
  let recipientEmail = '—';
  let previousCoins = 250;
  let nextCoins = 250;
  let appliedAmount = 0;

  const giftId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const giftRef = doc(db, 'users', cleanUid, 'coinGifts', giftId);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error(`Pemain dengan ID "${cleanUid}" tidak ditemukan di database.`);
    }
    const d = snap.data();
    recipientName = String(d.displayName || 'Penjelajah Aether');
    recipientEmail = String(d.email || '—');
    previousCoins =
      typeof d.aetherCoins === 'number' ? Math.max(0, Math.floor(d.aetherCoins)) : 250;
    nextCoins = Math.min(10000000, previousCoins + cleanAmount);
    appliedAmount = nextCoins - previousCoins;

    if (appliedAmount <= 0) {
      throw new Error('Saldo koin pemain sudah mencapai batas maksimum (10.000.000 Koin).');
    }

    const batch = writeBatch(db);
    batch.update(userRef, {
      aetherCoins: nextCoins,
      updatedAt: serverTimestamp(),
    });
    batch.set(giftRef, {
      id: giftId,
      recipientUid: cleanUid,
      senderUid: adminUser.uid,
      senderName: 'Admin Resmi',
      amount: appliedAmount,
      message: safeMessage,
      acknowledged: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    if (err instanceof Error && (err.message.includes('tidak ditemukan') || err.message.includes('batas maksimum'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  return {
    giftId,
    recipientUid: cleanUid,
    recipientName,
    recipientEmail,
    previousCoins,
    nextCoins,
    appliedAmount,
    message: safeMessage,
    sentAtMs: Date.now(),
  };
}

export async function fetchAdminServerOverview(user: User): Promise<AdminServerOverview> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const token = await user.getIdToken();
  const [apiRes, firestoreRoomsSnap] = await Promise.all([
    fetch('/api/admin/overview', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    getDocs(query(collection(db, 'activeRooms'), limit(120))).catch(() => null),
  ]);

  const payload = (await apiRes.json().catch(() => ({}))) as Partial<AdminServerOverview> & {
    error?: string;
  };
  if (!apiRes.ok) {
    throw new Error(payload.error || 'Gagal memuat ringkasan server admin.');
  }

  // Merge server-memory rooms + Firestore cross-network rooms deduplicated by code & host
  const byCode = new Map<string, AdminRoomRecord>();
  const serverRooms = Array.isArray(payload.rooms) ? payload.rooms : [];
  for (const r of serverRooms) {
    if (r && r.code) {
      byCode.set(r.code.toUpperCase(), r);
    }
  }

  const cutoffMs = Date.now() - 2 * 60 * 1000;
  if (firestoreRoomsSnap) {
    firestoreRoomsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const code = String(d.code || docSnap.id).trim().toUpperCase();
      if (!code) return;
      const updatedAt = toEpochMs(d.updatedAt) || Date.now();
      if (updatedAt < cutoffMs) {
        // Automatically prune stale Firestore room docs idle for >= 2 minutes
        if (!byCode.has(code)) {
          void deleteDoc(doc(db, 'activeRooms', code)).catch(() => {});
        }
        return;
      }

      const rawPlayers = Array.isArray(d.players) ? d.players : [];
      const parsedPlayers: AdminRoomPlayer[] = rawPlayers.map((p: Record<string, unknown>) => ({
        id: String(p.id || ''),
        name: String(p.name || 'Pemain'),
        archetypeIndex: typeof p.archetypeIndex === 'number' ? p.archetypeIndex : 0,
        tile: typeof p.tile === 'number' ? p.tile : 1,
        score: typeof p.score === 'number' ? p.score : 0,
        shields: typeof p.shields === 'number' ? p.shields : 0,
        connected: Boolean(p.connected),
        ready: Boolean(p.ready),
        pingMs: typeof p.pingMs === 'number' ? p.pingMs : 20,
        team: p.team === 'B' ? 'B' : 'A',
      }));

      const existing = byCode.get(code);
      if (!existing) {
        byCode.set(code, {
          code,
          name: String(d.name || 'Arena Aether'),
          isPublic: Boolean(d.isPublic),
          boardMode: (['classic', 'battle', 'team', 'time_attack'].includes(String(d.boardMode))
            ? d.boardMode
            : 'classic') as BoardGameMode,
          boardName: String(d.boardName || 'Papan Standar'),
          themeId: String(d.themeId || 'enchanted_forest'),
          status:
            d.status === 'playing' || d.status === 'finished' ? d.status : 'lobby',
          winnerId: typeof d.winnerId === 'string' && d.winnerId ? d.winnerId : null,
          designatedWinnerId: null,
          hostId: String(d.hostUid || parsedPlayers[0]?.id || ''),
          hostName: String(d.hostName || parsedPlayers[0]?.name || 'Host'),
          playerCount: parsedPlayers.length || Number(d.playerCount || 1),
          maxPlayers: Number(d.maxPlayers || 4),
          turnCount: Number(d.turnCount || 0),
          chatCount: 0,
          createdAt: toEpochMs(d.createdAt) || updatedAt,
          updatedAt,
          lastActivityAt: updatedAt,
          players: parsedPlayers,
        });
      } else if (parsedPlayers.length > existing.players.length) {
        // Keep the fuller/newer participant roster while preserving server designatedWinnerId
        byCode.set(code, {
          ...existing,
          players: parsedPlayers,
          playerCount: parsedPlayers.length,
          updatedAt: Math.max(existing.updatedAt, updatedAt),
        });
      }
    });
  }

  // Deduplicate active rooms per hostId (keep the newest active room for any given host)
  const dedupedByHost = new Map<string, AdminRoomRecord>();
  const sortedRooms = Array.from(byCode.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const r of sortedRooms) {
    const hostKey = r.hostId || r.code;
    if (!dedupedByHost.has(hostKey)) {
      dedupedByHost.set(hostKey, r);
    } else {
      // Keep finished rooms separately if desired, or only keep latest active room per host
      const kept = dedupedByHost.get(hostKey)!;
      if (kept.status === 'finished' && r.status !== 'finished') {
        dedupedByHost.set(hostKey, r);
      }
    }
  }

  return {
    ok: true,
    serverTime: payload.serverTime ?? Date.now(),
    serverless: Boolean(payload.serverless),
    rooms: Array.from(dedupedByHost.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
    cloudSyncCount: typeof payload.cloudSyncCount === 'number' ? payload.cloudSyncCount : 0,
    cloudSyncProfiles: Array.isArray(payload.cloudSyncProfiles)
      ? payload.cloudSyncProfiles
      : [],
  };
}

export async function adminCloseRoom(user: User, roomCode: string): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch(`/api/admin/rooms/${encodeURIComponent(roomCode)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  // Also remove mirrored Firestore room document across the network
  try {
    await deleteDoc(doc(db, 'activeRooms', roomCode.trim().toUpperCase()));
  } catch {
    // ignore if already absent
  }
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal menutup room.');
  }
}

export async function adminDeclareRoomWinner(
  user: User,
  room: AdminRoomRecord,
  playerId: string | null,
): Promise<{ roomCode: string; designatedWinnerId: string | null; targetName: string | null }> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const token = await user.getIdToken();
  const clear = !playerId;
  const roomSnapshot = {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    boardMode: room.boardMode,
    hostId: room.hostId,
    status: room.status,
    winnerId: room.winnerId ?? null,
    winningTeam: room.winningTeam ?? null,
    turnCount: room.turnCount,
    players: room.players.map((p) => ({
      ...p,
      isAI: false,
      color: '#f59e0b',
      accentColor: '#fde68a',
      turnsTaken: 0,
      laddersClimbed: 0,
      snakesBitten: 0,
      specialTilesHit: 0,
      shieldsUsed: 0,
      battleHits: 0,
    })),
  };

  const res = await fetch(
    `/api/admin/rooms/${encodeURIComponent(room.code)}/declare-winner`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        playerId: playerId || '',
        clear,
        roomSnapshot,
      }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    roomCode?: string;
    designatedWinnerId?: string | null;
    targetName?: string | null;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal menyimpan target pemenang room.');
  }
  return {
    roomCode: payload.roomCode || room.code,
    designatedWinnerId: payload.designatedWinnerId ?? null,
    targetName: payload.targetName ?? null,
  };
}

export async function adminKickRoomPlayer(
  user: User,
  room: AdminRoomRecord,
  playerId: string,
  reason?: string,
): Promise<{ roomCode: string; roomClosed: boolean; kickedPlayerName: string }> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const token = await user.getIdToken();
  const roomSnapshot = {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    boardMode: room.boardMode,
    hostId: room.hostId,
    status: room.status,
    winnerId: room.winnerId ?? null,
    winningTeam: room.winningTeam ?? null,
    turnCount: room.turnCount,
    players: room.players.map((p) => ({
      ...p,
      isAI: false,
      color: '#f59e0b',
      accentColor: '#fde68a',
      turnsTaken: 0,
      laddersClimbed: 0,
      snakesBitten: 0,
      specialTilesHit: 0,
      shieldsUsed: 0,
      battleHits: 0,
    })),
  };

  const res = await fetch(
    `/api/admin/rooms/${encodeURIComponent(room.code)}/kick-player`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        playerId,
        reason:
          reason?.trim() ||
          'Anda dikeluarkan dari ruangan oleh Administrator (koneksi tidak stabil / lag).',
        roomSnapshot,
      }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    roomCode?: string;
    roomClosed?: boolean;
    kickedPlayerName?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal mengeluarkan pemain dari room.');
  }

  // Sync mirrored Firestore activeRooms document cleanly
  const remainingPlayers = room.players.filter((p) => p.id !== playerId);
  const fsRoomRef = doc(db, 'activeRooms', room.code.trim().toUpperCase());
  try {
    if (payload.roomClosed || remainingPlayers.length === 0) {
      await deleteDoc(fsRoomRef);
    } else {
      const nextHost =
        remainingPlayers.find((p) => p.id === room.hostId) ?? remainingPlayers[0];
      const nextStatus =
        room.status === 'playing' && remainingPlayers.length === 1 ? 'finished' : room.status;
      const nextWinnerId =
        nextStatus === 'finished' && remainingPlayers.length === 1
          ? remainingPlayers[0].id
          : room.winnerId || '';
      await updateDoc(fsRoomRef, {
        hostName: nextHost.name,
        status: nextStatus,
        winnerId: nextWinnerId,
        playerCount: remainingPlayers.length,
        players: remainingPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          archetypeIndex: p.archetypeIndex ?? 0,
          tile: p.tile,
          score: p.score,
          shields: p.shields,
          connected: p.connected,
          ready: p.ready,
          pingMs: p.pingMs,
          team: p.team ?? 'A',
        })),
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Non-critical if Firestore mirror doc already removed or absent
  }

  return {
    roomCode: payload.roomCode || room.code,
    roomClosed: Boolean(payload.roomClosed),
    kickedPlayerName: payload.kickedPlayerName || 'Pemain',
  };
}

export async function adminDeleteLeaderboardEntry(user: User, entryId: string): Promise<void> {
  const token = await user.getIdToken();
  const res = await fetch(`/api/admin/leaderboard/${encodeURIComponent(entryId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal menghapus entri leaderboard.');
  }
}
