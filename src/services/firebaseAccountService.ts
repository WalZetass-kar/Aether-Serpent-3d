import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { BoardConfig } from '../../shared/boardThemes';
import type { BoardGameMode, DiceSkinId, PlayerState } from '../../shared/gameConfig';
import { DICE_SKINS, isDiceSkinUnlocked } from '../../shared/gameConfig';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { PlayerProfile } from './storageService';

export interface CloudPublicProfile {
  uid: string;
  displayName: string;
  archetypeIndex: number;
  diceSkinId: DiceSkinId;
  wins: number;
  totalGames: number;
  bestScore: number;
  onlineWins: number;
}

function sanitizeDisplayName(raw: string | null | undefined): string {
  const clean = (raw || 'Penjelajah Aether').trim().slice(0, 32);
  return clean.length > 0 ? clean : 'Penjelajah Aether';
}

function sanitizeBoardId(id: string | undefined): string {
  const clean = (id || 'default_enchanted_forest').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  return clean.length > 0 ? clean : 'default_enchanted_forest';
}

export async function loadProfileFromFirebase(user: User): Promise<Partial<PlayerProfile> | null> {
  if (!user.emailVerified) return null;
  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const unlockedAchievements = Array.isArray(data.unlockedAchievements)
      ? data.unlockedAchievements.filter((v): v is string => typeof v === 'string').slice(0, 24)
      : [];
    const validSkins = new Set<string>(DICE_SKINS.map((s) => s.id));
    const rawSkin = typeof data.diceSkinId === 'string' ? data.diceSkinId : 'royal_obsidian';
    const candidateSkin = validSkins.has(rawSkin) ? (rawSkin as DiceSkinId) : 'royal_obsidian';
    const resolvedSkin = isDiceSkinUnlocked(candidateSkin, unlockedAchievements)
      ? candidateSkin
      : 'royal_obsidian';

    return {
      playerId: user.uid,
      name: sanitizeDisplayName(typeof data.displayName === 'string' ? data.displayName : user.displayName),
      archetypeIndex:
        typeof data.archetypeIndex === 'number' && data.archetypeIndex >= 0 && data.archetypeIndex <= 3
          ? Math.floor(data.archetypeIndex)
          : 0,
      diceSkinId: resolvedSkin,
      totalGames: typeof data.totalGames === 'number' ? Math.max(0, Math.floor(data.totalGames)) : 0,
      wins: typeof data.wins === 'number' ? Math.max(0, Math.floor(data.wins)) : 0,
      losses: typeof data.losses === 'number' ? Math.max(0, Math.floor(data.losses)) : 0,
      bestScore: typeof data.bestScore === 'number' ? Math.max(0, Math.floor(data.bestScore)) : 0,
      fastestWinTurns:
        typeof data.fastestWinTurns === 'number' && data.fastestWinTurns > 0
          ? Math.floor(data.fastestWinTurns)
          : null,
      laddersClimbed:
        typeof data.laddersClimbed === 'number' ? Math.max(0, Math.floor(data.laddersClimbed)) : 0,
      snakesBitten:
        typeof data.snakesBitten === 'number' ? Math.max(0, Math.floor(data.snakesBitten)) : 0,
      shieldsUsed:
        typeof data.shieldsUsed === 'number' ? Math.max(0, Math.floor(data.shieldsUsed)) : 0,
      specialTilesHit:
        typeof data.specialTilesHit === 'number' ? Math.max(0, Math.floor(data.specialTilesHit)) : 0,
      onlineWins: typeof data.onlineWins === 'number' ? Math.max(0, Math.floor(data.onlineWins)) : 0,
      unlockedAchievements,
      dailyStreak: typeof data.dailyStreak === 'number' ? Math.max(0, Math.floor(data.dailyStreak)) : 0,
      loginStreak: typeof data.loginStreak === 'number' ? Math.max(1, Math.floor(data.loginStreak)) : 1,
      lastLoginDate:
        typeof data.lastLoginDate === 'string' && data.lastLoginDate.length <= 16
          ? data.lastLoginDate
          : null,
      tutorialCompleted: Boolean(data.tutorialCompleted),
      muted: Boolean(data.muted),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function syncProfileToFirebase(
  user: User,
  profile: PlayerProfile,
  selectedBoardId: string,
): Promise<boolean> {
  if (!user.emailVerified || !user.email) {
    return false;
  }

  const userPath = `users/${user.uid}`;
  const publicPath = `publicProfiles/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const publicRef = doc(db, 'publicProfiles', user.uid);

  const safeName = sanitizeDisplayName(profile.name || user.displayName);
  const safeArch = Math.min(3, Math.max(0, Math.floor(profile.archetypeIndex || 0)));
  const safeAchievements = (profile.unlockedAchievements || []).slice(0, 24);
  const safeBoardId = sanitizeBoardId(selectedBoardId);
  const safeLoginStreak = Math.max(1, Math.floor(profile.loginStreak || 1));
  const safeLastLoginDate = (profile.lastLoginDate || new Date().toISOString().slice(0, 10)).slice(0, 16);

  try {
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: safeName,
        archetypeIndex: safeArch,
        diceSkinId: profile.diceSkinId,
        totalGames: Math.max(0, Math.floor(profile.totalGames)),
        wins: Math.max(0, Math.floor(profile.wins)),
        losses: Math.max(0, Math.floor(profile.losses)),
        bestScore: Math.max(0, Math.floor(profile.bestScore)),
        fastestWinTurns: profile.fastestWinTurns ? Math.max(0, Math.floor(profile.fastestWinTurns)) : 0,
        laddersClimbed: Math.max(0, Math.floor(profile.laddersClimbed)),
        snakesBitten: Math.max(0, Math.floor(profile.snakesBitten)),
        shieldsUsed: Math.max(0, Math.floor(profile.shieldsUsed)),
        specialTilesHit: Math.max(0, Math.floor(profile.specialTilesHit)),
        onlineWins: Math.max(0, Math.floor(profile.onlineWins)),
        unlockedAchievements: safeAchievements,
        dailyStreak: Math.max(0, Math.floor(profile.dailyStreak)),
        loginStreak: safeLoginStreak,
        lastLoginDate: safeLastLoginDate,
        tutorialCompleted: Boolean(profile.tutorialCompleted),
        muted: Boolean(profile.muted),
        selectedBoardId: safeBoardId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        displayName: safeName,
        archetypeIndex: safeArch,
        diceSkinId: profile.diceSkinId,
        totalGames: Math.max(0, Math.floor(profile.totalGames)),
        wins: Math.max(0, Math.floor(profile.wins)),
        losses: Math.max(0, Math.floor(profile.losses)),
        bestScore: Math.max(0, Math.floor(profile.bestScore)),
        fastestWinTurns: profile.fastestWinTurns ? Math.max(0, Math.floor(profile.fastestWinTurns)) : 0,
        laddersClimbed: Math.max(0, Math.floor(profile.laddersClimbed)),
        snakesBitten: Math.max(0, Math.floor(profile.snakesBitten)),
        shieldsUsed: Math.max(0, Math.floor(profile.shieldsUsed)),
        specialTilesHit: Math.max(0, Math.floor(profile.specialTilesHit)),
        onlineWins: Math.max(0, Math.floor(profile.onlineWins)),
        unlockedAchievements: safeAchievements,
        dailyStreak: Math.max(0, Math.floor(profile.dailyStreak)),
        loginStreak: safeLoginStreak,
        lastLoginDate: safeLastLoginDate,
        tutorialCompleted: Boolean(profile.tutorialCompleted),
        muted: Boolean(profile.muted),
        selectedBoardId: safeBoardId,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userPath);
  }

  try {
    const publicSnap = await getDoc(publicRef);
    if (!publicSnap.exists()) {
      await setDoc(publicRef, {
        uid: user.uid,
        displayName: safeName,
        archetypeIndex: safeArch,
        diceSkinId: profile.diceSkinId,
        wins: Math.max(0, Math.floor(profile.wins)),
        totalGames: Math.max(0, Math.floor(profile.totalGames)),
        bestScore: Math.max(0, Math.floor(profile.bestScore)),
        onlineWins: Math.max(0, Math.floor(profile.onlineWins)),
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(publicRef, {
        displayName: safeName,
        archetypeIndex: safeArch,
        diceSkinId: profile.diceSkinId,
        wins: Math.max(0, Math.floor(profile.wins)),
        totalGames: Math.max(0, Math.floor(profile.totalGames)),
        bestScore: Math.max(0, Math.floor(profile.bestScore)),
        onlineWins: Math.max(0, Math.floor(profile.onlineWins)),
        isPublic: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, publicPath);
  }

  return true;
}

export async function syncCustomBoardToFirebase(user: User, board: BoardConfig): Promise<void> {
  if (!user.emailVerified) return;
  const safeId = sanitizeBoardId(board.id);
  const path = `users/${user.uid}/boards/${safeId}`;
  const boardRef = doc(db, 'users', user.uid, 'boards', safeId);

  const safeLadders = board.ladders.slice(0, 20).map((l) => ({
    id: String(l.id || `l_${l.from}_${l.to}`),
    name: String(l.name || 'Tangga Aether').slice(0, 40),
    from: Number(l.from),
    to: Number(l.to),
    type: 'ladder' as const,
  }));
  const safeSnakes = board.snakes.slice(0, 20).map((s) => ({
    id: String(s.id || `s_${s.from}_${s.to}`),
    name: String(s.name || 'Ular Mistis').slice(0, 40),
    from: Number(s.from),
    to: Number(s.to),
    type: 'snake' as const,
  }));

  try {
    const existing = await getDoc(boardRef);
    if (!existing.exists()) {
      await setDoc(boardRef, {
        id: safeId,
        ownerUid: user.uid,
        name: String(board.name || 'Papan Kustom').slice(0, 60),
        themeId: String(board.themeId || 'enchanted_forest').slice(0, 40),
        ladders: safeLadders,
        snakes: safeSnakes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(boardRef, {
        name: String(board.name || 'Papan Kustom').slice(0, 60),
        themeId: String(board.themeId || 'enchanted_forest').slice(0, 40),
        ladders: safeLadders,
        snakes: safeSnakes,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteCustomBoardFromFirebase(user: User, boardId: string): Promise<void> {
  if (!user.emailVerified) return;
  const safeId = sanitizeBoardId(boardId);
  const path = `users/${user.uid}/boards/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'boards', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchTopPublicProfiles(maxCount = 15): Promise<CloudPublicProfile[]> {
  const path = 'publicProfiles';
  try {
    const q = query(
      collection(db, 'publicProfiles'),
      where('isPublic', '==', true),
      limit(40),
    );
    const snap = await getDocs(q);
    const list: CloudPublicProfile[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        uid: String(d.uid || docSnap.id),
        displayName: String(d.displayName || 'Penjelajah'),
        archetypeIndex: typeof d.archetypeIndex === 'number' ? d.archetypeIndex : 0,
        diceSkinId: (typeof d.diceSkinId === 'string' ? d.diceSkinId : 'royal_obsidian') as DiceSkinId,
        wins: typeof d.wins === 'number' ? d.wins : 0,
        totalGames: typeof d.totalGames === 'number' ? d.totalGames : 0,
        bestScore: typeof d.bestScore === 'number' ? d.bestScore : 0,
        onlineWins: typeof d.onlineWins === 'number' ? d.onlineWins : 0,
      });
    });
    return list.sort((a, b) => b.bestScore - a.bestScore || b.wins - a.wins).slice(0, maxCount);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export interface ActiveRoomSyncPayload {
  code: string;
  name: string;
  isPublic: boolean;
  boardMode: BoardGameMode;
  boardName: string;
  themeId: string;
  status: 'lobby' | 'playing' | 'finished';
  winnerId?: string | null;
  turnCount?: number;
  players: PlayerState[];
}

export async function syncActiveRoomToFirebase(
  user: User | null | undefined,
  room: ActiveRoomSyncPayload,
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const cleanCode = String(room.code || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  if (cleanCode.length < 4 || !Array.isArray(room.players) || room.players.length === 0) {
    return;
  }

  const hostPlayer = room.players[0];
  const safeName = String(room.name || 'Arena Aether').trim().slice(0, 60) || 'Arena Aether';
  const safeHostName =
    String(hostPlayer?.name || user.displayName || 'Host').trim().slice(0, 40) || 'Host';
  const safeBoardMode: BoardGameMode = ['classic', 'battle', 'team', 'time_attack'].includes(
    room.boardMode,
  )
    ? room.boardMode
    : 'classic';
  const safeStatus =
    room.status === 'playing' || room.status === 'finished' ? room.status : 'lobby';
  const safePlayers = room.players.slice(0, 4).map((p) => ({
    id: String(p.id || '').slice(0, 128),
    name: String(p.name || 'Pemain').slice(0, 40),
    archetypeIndex: Math.min(3, Math.max(0, Math.floor(p.archetypeIndex || 0))),
    tile: Math.max(1, Math.min(100, Math.floor(p.tile || 1))),
    score: Math.max(0, Math.floor(p.score || 0)),
    shields: Math.max(0, Math.floor(p.shields || 0)),
    connected: Boolean(p.connected),
    ready: Boolean(p.ready),
    pingMs: Math.max(1, Math.min(999, Math.floor(p.pingMs || 20))),
    team: p.team === 'B' ? 'B' : 'A',
  }));

  const mutableFields = {
    name: safeName,
    hostName: safeHostName,
    isPublic: Boolean(room.isPublic),
    boardMode: safeBoardMode,
    boardName: String(room.boardName || 'Papan Standar').trim().slice(0, 60) || 'Papan Standar',
    themeId: String(room.themeId || 'enchanted_forest').trim().slice(0, 40) || 'enchanted_forest',
    status: safeStatus,
    winnerId: String(room.winnerId || '').slice(0, 128),
    playerCount: safePlayers.length,
    maxPlayers: 4,
    turnCount: Math.max(0, Math.min(100000, Math.floor(room.turnCount || 0))),
    players: safePlayers,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(db, 'activeRooms', cleanCode);
  const path = `activeRooms/${cleanCode}`;
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        code: cleanCode,
        hostUid: user.uid,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
    } else if (snap.data().hostUid === user.uid) {
      await updateDoc(ref, mutableFields);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteActiveRoomFromFirebase(
  user: User | null | undefined,
  roomCode: string | null | undefined,
): Promise<void> {
  if (!user || !user.emailVerified || !roomCode) return;
  const cleanCode = String(roomCode)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  if (cleanCode.length < 4) return;
  try {
    await deleteDoc(doc(db, 'activeRooms', cleanCode));
  } catch {
    // Non-host or already deleted
  }
}

export async function fetchPublicActiveRoomsFromFirebase(): Promise<
  Array<{
    code: string;
    name: string;
    hostName: string;
    boardMode: BoardGameMode;
    playerCount: number;
    maxPlayers: number;
    status: 'lobby' | 'playing' | 'finished';
  }>
> {
  try {
    const snap = await getDocs(
      query(collection(db, 'activeRooms'), where('isPublic', '==', true), limit(40)),
    );
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    const out: Array<{
      code: string;
      name: string;
      hostName: string;
      boardMode: BoardGameMode;
      playerCount: number;
      maxPlayers: number;
      status: 'lobby' | 'playing' | 'finished';
    }> = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const status =
        d.status === 'playing' || d.status === 'finished' ? d.status : 'lobby';
      if (status === 'finished') return;
      const updatedMs =
        d.updatedAt && typeof d.updatedAt === 'object' && 'toMillis' in d.updatedAt
          ? (d.updatedAt as { toMillis: () => number }).toMillis()
          : Date.now();
      if (updatedMs < cutoff) return;
      out.push({
        code: String(d.code || docSnap.id),
        name: String(d.name || 'Arena Aether'),
        hostName: String(d.hostName || 'Host'),
        boardMode: (['classic', 'battle', 'team', 'time_attack'].includes(String(d.boardMode))
          ? d.boardMode
          : 'classic') as BoardGameMode,
        playerCount: typeof d.playerCount === 'number' ? d.playerCount : 1,
        maxPlayers: typeof d.maxPlayers === 'number' ? d.maxPlayers : 4,
        status,
      });
    });
    return out;
  } catch {
    return [];
  }
}
