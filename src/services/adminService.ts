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
  designatedWinnerId?: string | null;
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

  const cutoffMs = Date.now() - 2 * 60 * 60 * 1000;
  if (firestoreRoomsSnap) {
    firestoreRoomsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const code = String(d.code || docSnap.id).trim().toUpperCase();
      if (!code) return;
      const updatedAt = toEpochMs(d.updatedAt) || Date.now();
      if (updatedAt < cutoffMs) return;

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
