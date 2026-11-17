import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { BoardGameMode, DiceSkinId, DifficultyMode } from '../../shared/gameConfig';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

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
  hostId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  turnCount: number;
  chatCount: number;
  createdAt: number;
  updatedAt: number;
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

export async function fetchAdminMembers(user: User): Promise<AdminMemberRecord[]> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan untuk memuat daftar member.');
  }
  try {
    const [usersSnap, publicSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), limit(150))),
      getDocs(query(collection(db, 'publicProfiles'), limit(150))),
    ]);

    const publicMap = new Map<string, boolean>();
    publicSnap.forEach((docSnap) => {
      const data = docSnap.data();
      publicMap.set(docSnap.id, Boolean(data.isPublic));
    });

    const list: AdminMemberRecord[] = [];
    usersSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const uid = String(d.uid || docSnap.id);
      list.push({
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
        isPublic: publicMap.has(uid) ? Boolean(publicMap.get(uid)) : null,
        createdAtMs: toEpochMs(d.createdAt),
        updatedAtMs: toEpochMs(d.updatedAt),
      });
    });

    return list.sort((a, b) => b.updatedAtMs - a.updatedAtMs || b.bestScore - a.bestScore);
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

export async function fetchAdminServerOverview(user: User): Promise<AdminServerOverview> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const token = await user.getIdToken();
  const res = await fetch('/api/admin/overview', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = (await res.json().catch(() => ({}))) as Partial<AdminServerOverview> & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal memuat ringkasan server admin.');
  }
  return {
    ok: true,
    serverTime: payload.serverTime ?? Date.now(),
    serverless: Boolean(payload.serverless),
    rooms: Array.isArray(payload.rooms) ? payload.rooms : [],
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
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal menutup room.');
  }
}

export async function adminDeclareRoomWinner(
  user: User,
  roomCode: string,
  playerId: string,
): Promise<{ roomCode: string; winnerId: string; winnerName: string }> {
  if (!isAdminAccount(user)) {
    throw new Error('Akses admin diperlukan.');
  }
  const token = await user.getIdToken();
  const res = await fetch(
    `/api/admin/rooms/${encodeURIComponent(roomCode)}/declare-winner`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ playerId }),
    },
  );
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    roomCode?: string;
    winnerId?: string;
    winnerName?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Gagal menetapkan pemenang room.');
  }
  return {
    roomCode: payload.roomCode || roomCode,
    winnerId: payload.winnerId || playerId,
    winnerName: payload.winnerName || 'Pemain',
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
