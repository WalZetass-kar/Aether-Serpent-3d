import {
  ACHIEVEMENTS,
  DICE_SKINS,
  generateUniqueDevicePlayerName,
  getDailyChallengeForDate,
  getTodayDateString,
  isDiceSkinUnlocked,
  type BoardGameMode,
  type ConnectionMode,
  type DiceSkinId,
  type DifficultyMode,
} from '../../shared/gameConfig';
import { STARTER_UNLOCKED_BOARD_IDS } from '../../shared/boardThemes';

export interface LocalScoreEntry {
  id: string;
  playerName: string;
  score: number;
  turns: number;
  durationSec?: number;
  mode: ConnectionMode;
  boardMode?: BoardGameMode;
  difficulty: DifficultyMode;
  won: boolean;
  createdAt: string;
}

export interface PendingLeaderboardSubmission {
  playerName: string;
  score: number;
  turns: number;
  mode: ConnectionMode;
  boardMode?: BoardGameMode;
  difficulty: DifficultyMode;
}

export interface PlayerProfile {
  playerId: string;
  name: string;
  archetypeIndex: number;
  diceSkinId: DiceSkinId;
  totalGames: number;
  wins: number;
  losses: number;
  bestScore: number;
  fastestWinTurns: number | null;
  laddersClimbed: number;
  snakesBitten: number;
  shieldsUsed: number;
  specialTilesHit: number;
  onlineWins: number;
  unlockedAchievements: string[];
  recentResults: boolean[]; // recent solo/online wins/losses for adaptive AI
  dailyStreak: number;
  lastDailyCompletedDate: string | null;
  loginStreak: number;
  lastLoginDate: string | null;
  dailyActiveDate: string;
  dailyProgress: {
    games_played: number;
    ladders_climbed: number;
    wins: number;
    special_tiles: number;
  };
  dailyRewardClaimed: boolean;
  syncCode: string | null;
  syncPin: string | null;
  lastSyncedAt: string | null;
  notificationsEnabled: boolean;
  notificationHour: number;
  lastNotifiedDate: string | null;
  tutorialCompleted: boolean;
  muted: boolean;
  aetherCoins: number;
  unlockedBoardIds: string[];
}

const PROFILE_KEY = 'aether_serpent_profile_v1';
const SCORES_KEY = 'aether_serpent_local_scores_v1';
const PENDING_LB_KEY = 'aether_serpent_pending_lb_v1';

const GENERIC_DEFAULT_NAMES = new Set([
  'penjelajah aether',
  'penjelajah',
  'pemain',
  'pemain 1',
  'player',
  'player 1',
]);

function getYesterdayDateString(now: Date = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return getTodayDateString(yesterday);
}

export function evaluateLoginStreak(
  profile: PlayerProfile,
  now: Date = new Date(),
): { profile: PlayerProfile; changed: boolean } {
  const today = getTodayDateString(now);
  const yesterday = getYesterdayDateString(now);
  const currentStreak =
    typeof profile.loginStreak === 'number' && Number.isFinite(profile.loginStreak)
      ? Math.max(1, Math.floor(profile.loginStreak))
      : 1;

  if (!profile.lastLoginDate) {
    return {
      profile: {
        ...profile,
        loginStreak: currentStreak,
        lastLoginDate: today,
      },
      changed: true,
    };
  }

  if (profile.lastLoginDate === today) {
    if (profile.loginStreak !== currentStreak) {
      return {
        profile: { ...profile, loginStreak: currentStreak },
        changed: true,
      };
    }
    return { profile, changed: false };
  }

  if (profile.lastLoginDate === yesterday) {
    return {
      profile: {
        ...profile,
        loginStreak: currentStreak + 1,
        lastLoginDate: today,
      },
      changed: true,
    };
  }

  return {
    profile: {
      ...profile,
      loginStreak: 1,
      lastLoginDate: today,
    },
    changed: true,
  };
}

export function mergeLoginStreaks(
  local: PlayerProfile,
  remote?: Partial<PlayerProfile> | null,
  now: Date = new Date(),
): { loginStreak: number; lastLoginDate: string } {
  const today = getTodayDateString(now);
  const yesterday = getYesterdayDateString(now);

  const localStreak =
    local.lastLoginDate === today
      ? Math.max(1, local.loginStreak || 1)
      : local.lastLoginDate === yesterday
        ? Math.max(1, local.loginStreak || 1) + 1
        : 1;

  let remoteStreak = 1;
  if (remote && typeof remote.loginStreak === 'number') {
    const rawRemote = Math.max(1, Math.floor(remote.loginStreak));
    if (remote.lastLoginDate === today) {
      remoteStreak = rawRemote;
    } else if (remote.lastLoginDate === yesterday) {
      remoteStreak = rawRemote + 1;
    }
  }

  return {
    loginStreak: Math.max(localStreak, remoteStreak),
    lastLoginDate: today,
  };
}

function createDefaultProfile(): PlayerProfile {
  const today = getTodayDateString();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const uniqueName = generateUniqueDevicePlayerName(id);
  const archSeed = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;
  return {
    playerId: id,
    name: uniqueName,
    archetypeIndex: archSeed,
    diceSkinId: 'royal_obsidian',
    totalGames: 0,
    wins: 0,
    losses: 0,
    bestScore: 0,
    fastestWinTurns: null,
    laddersClimbed: 0,
    snakesBitten: 0,
    shieldsUsed: 0,
    specialTilesHit: 0,
    onlineWins: 0,
    unlockedAchievements: [],
    recentResults: [],
    dailyStreak: 0,
    lastDailyCompletedDate: null,
    loginStreak: 1,
    lastLoginDate: today,
    dailyActiveDate: today,
    dailyProgress: {
      games_played: 0,
      ladders_climbed: 0,
      wins: 0,
      special_tiles: 0,
    },
    dailyRewardClaimed: false,
    syncCode: null,
    syncPin: null,
    lastSyncedAt: null,
    notificationsEnabled: false,
    notificationHour: 19,
    lastNotifiedDate: null,
    tutorialCompleted: false,
    muted: false,
    aetherCoins: 250,
    unlockedBoardIds: [...STARTER_UNLOCKED_BOARD_IDS],
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      const def = createDefaultProfile();
      saveProfile(def);
      return def;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createDefaultProfile();
    const unlockedAchievements = Array.isArray(parsed.unlockedAchievements)
      ? parsed.unlockedAchievements
      : [];
    const validSkinIds = new Set<string>(DICE_SKINS.map((s) => s.id));
    const candidateSkin: DiceSkinId =
      parsed.diceSkinId && validSkinIds.has(parsed.diceSkinId)
        ? parsed.diceSkinId
        : 'royal_obsidian';
    const resolvedSkin: DiceSkinId = isDiceSkinUnlocked(candidateSkin, unlockedAchievements)
      ? candidateSkin
      : 'royal_obsidian';

    const resolvedPlayerId = parsed.playerId || base.playerId;
    const rawName = (parsed.name || '').trim();
    const isGenericName = !rawName || GENERIC_DEFAULT_NAMES.has(rawName.toLowerCase());
    const resolvedName = isGenericName
      ? generateUniqueDevicePlayerName(resolvedPlayerId)
      : rawName;

    const merged: PlayerProfile = {
      ...base,
      ...parsed,
      playerId: resolvedPlayerId,
      name: resolvedName,
      diceSkinId: resolvedSkin,
      loginStreak:
        typeof parsed.loginStreak === 'number' && Number.isFinite(parsed.loginStreak)
          ? Math.max(1, Math.floor(parsed.loginStreak))
          : 1,
      lastLoginDate: typeof parsed.lastLoginDate === 'string' ? parsed.lastLoginDate : null,
      dailyProgress: {
        ...base.dailyProgress,
        ...(parsed.dailyProgress || {}),
      },
      unlockedAchievements,
      recentResults: Array.isArray(parsed.recentResults) ? parsed.recentResults : [],
      aetherCoins:
        typeof parsed.aetherCoins === 'number' && Number.isFinite(parsed.aetherCoins)
          ? Math.max(0, Math.floor(parsed.aetherCoins))
          : base.aetherCoins,
      unlockedBoardIds: Array.from(
        new Set([
          ...STARTER_UNLOCKED_BOARD_IDS,
          ...(Array.isArray(parsed.unlockedBoardIds)
            ? parsed.unlockedBoardIds.filter((id): id is string => typeof id === 'string')
            : []),
        ]),
      ),
    };
    const today = getTodayDateString();
    let dirty = isGenericName;
    if (merged.dailyActiveDate !== today) {
      merged.dailyActiveDate = today;
      merged.dailyProgress = { games_played: 0, ladders_climbed: 0, wins: 0, special_tiles: 0 };
      merged.dailyRewardClaimed = false;
      dirty = true;
    }
    const streakEval = evaluateLoginStreak(merged);
    if (streakEval.changed || dirty) {
      saveProfile(streakEval.profile);
    }
    return streakEval.profile;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Could not save profile to localStorage', err);
  }
}

export function resetProfileSession(): PlayerProfile {
  const fresh = createDefaultProfile();
  saveProfile(fresh);
  return fresh;
}

export function loadLocalScores(): LocalScoreEntry[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalScoreEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendLocalScore(entry: Omit<LocalScoreEntry, 'id' | 'createdAt'>): LocalScoreEntry[] {
  const scores = loadLocalScores();
  const next: LocalScoreEntry = {
    ...entry,
    id: `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [next, ...scores].sort((a, b) => b.score - a.score).slice(0, 50);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save local scores', err);
  }
  return updated;
}

export function queuePendingLeaderboard(item: PendingLeaderboardSubmission): void {
  try {
    const raw = localStorage.getItem(PENDING_LB_KEY);
    const list = raw ? (JSON.parse(raw) as PendingLeaderboardSubmission[]) : [];
    list.push(item);
    localStorage.setItem(PENDING_LB_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    // ignore storage quota errors
  }
}

export async function flushPendingLeaderboard(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  try {
    const raw = localStorage.getItem(PENDING_LB_KEY);
    if (!raw) return 0;
    const list = JSON.parse(raw) as PendingLeaderboardSubmission[];
    if (!Array.isArray(list) || list.length === 0) return 0;

    const remaining: PendingLeaderboardSubmission[] = [];
    let flushed = 0;
    for (const item of list) {
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (res.ok) flushed += 1;
        else remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    localStorage.setItem(PENDING_LB_KEY, JSON.stringify(remaining));
    return flushed;
  } catch {
    return 0;
  }
}

export function evaluateAchievements(
  profile: PlayerProfile,
  matchContext?: {
    won: boolean;
    score: number;
    turns: number;
    mode: ConnectionMode;
    difficulty: DifficultyMode;
  },
): { updatedProfile: PlayerProfile; newlyUnlocked: string[] } {
  const unlocked = new Set(profile.unlockedAchievements);
  const newlyUnlocked: string[] = [];

  const grant = (id: string) => {
    if (!unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  };

  if (profile.totalGames >= 1) grant('first_step');
  if (profile.laddersClimbed >= 10) grant('ladder_climber');
  if (profile.shieldsUsed >= 1) grant('serpent_shield');
  if (profile.specialTilesHit >= 15) grant('blessing_collector');
  if (profile.onlineWins >= 1) grant('online_champion');
  if (profile.dailyStreak >= 3) grant('daily_devotee');
  if (profile.wins >= 5) grant('board_monarch');

  if (matchContext?.won) {
    if (matchContext.turns <= 22) grant('speed_runner');
    if (matchContext.score >= 2200) grant('high_scorer');
    if (
      matchContext.mode === 'solo' &&
      (matchContext.difficulty === 'adaptive' || matchContext.difficulty === 'hard')
    ) {
      grant('adaptive_master');
    }
  }

  const validIds = new Set(ACHIEVEMENTS.map((a) => a.id));
  const filtered = Array.from(unlocked).filter((id) => validIds.has(id));

  return {
    updatedProfile: {
      ...profile,
      unlockedAchievements: filtered,
    },
    newlyUnlocked,
  };
}

export function updateDailyChallengeProgress(
  profile: PlayerProfile,
  delta: {
    gamesPlayed?: number;
    laddersClimbed?: number;
    wins?: number;
    specialTiles?: number;
  },
): { updatedProfile: PlayerProfile; challengeJustCompleted: boolean; bonusAwarded: number } {
  const today = getTodayDateString();
  const challenge = getDailyChallengeForDate(today);

  const nextProgress =
    profile.dailyActiveDate === today
      ? { ...profile.dailyProgress }
      : { games_played: 0, ladders_climbed: 0, wins: 0, special_tiles: 0 };

  nextProgress.games_played += delta.gamesPlayed ?? 0;
  nextProgress.ladders_climbed += delta.laddersClimbed ?? 0;
  nextProgress.wins += delta.wins ?? 0;
  nextProgress.special_tiles += delta.specialTiles ?? 0;

  const currentMetricVal = nextProgress[challenge.metric];
  let challengeJustCompleted = false;
  let bonusAwarded = 0;
  let dailyStreak = profile.dailyStreak;
  let lastDailyCompletedDate = profile.lastDailyCompletedDate;
  let dailyRewardClaimed = profile.dailyActiveDate === today ? profile.dailyRewardClaimed : false;

  if (currentMetricVal >= challenge.target && !dailyRewardClaimed) {
    dailyRewardClaimed = true;
    challengeJustCompleted = true;
    bonusAwarded = challenge.bonusScore;

    // Check yesterday for streak continuation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getTodayDateString(yesterday);

    if (lastDailyCompletedDate === yesterdayStr) {
      dailyStreak += 1;
    } else if (lastDailyCompletedDate !== today) {
      dailyStreak = 1;
    }
    lastDailyCompletedDate = today;
  }

  return {
    updatedProfile: {
      ...profile,
      dailyActiveDate: today,
      dailyProgress: nextProgress,
      dailyRewardClaimed,
      dailyStreak,
      lastDailyCompletedDate,
    },
    challengeJustCompleted,
    bonusAwarded,
  };
}

export function calculateMatchCoinReward(params: {
  won: boolean;
  laddersClimbed: number;
  mode: ConnectionMode;
  dailyCompleted: boolean;
  newAchievementCount: number;
}): { total: number; breakdown: string } {
  const baseCoins = 45;
  const winBonus = params.won ? (params.mode === 'online' ? 120 : 85) : 0;
  const ladderBonus = Math.min(90, Math.max(0, params.laddersClimbed) * 15);
  const dailyBonus = params.dailyCompleted ? 120 : 0;
  const achBonus = Math.max(0, params.newAchievementCount) * 80;
  const total = baseCoins + winBonus + ladderBonus + dailyBonus + achBonus;

  const parts: string[] = [`+${baseCoins} laga`];
  if (winBonus > 0) parts.push(`+${winBonus} menang`);
  if (ladderBonus > 0) parts.push(`+${ladderBonus} tangga`);
  if (dailyBonus > 0) parts.push(`+${dailyBonus} harian`);
  if (achBonus > 0) parts.push(`+${achBonus} pencapaian`);

  return { total, breakdown: parts.join(' · ') };
}
