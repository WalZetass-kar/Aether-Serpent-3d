import {
  ACHIEVEMENTS,
  getDailyChallengeForDate,
  getTodayDateString,
  type BoardGameMode,
  type ConnectionMode,
  type DifficultyMode,
} from '../../shared/gameConfig';

export interface LocalScoreEntry {
  id: string;
  playerName: string;
  score: number;
  turns: number;
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
}

const PROFILE_KEY = 'aether_serpent_profile_v1';
const SCORES_KEY = 'aether_serpent_local_scores_v1';
const PENDING_LB_KEY = 'aether_serpent_pending_lb_v1';

function createDefaultProfile(): PlayerProfile {
  const today = getTodayDateString();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    playerId: id,
    name: 'Penjelajah Aether',
    archetypeIndex: 0,
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
    const merged: PlayerProfile = {
      ...base,
      ...parsed,
      dailyProgress: {
        ...base.dailyProgress,
        ...(parsed.dailyProgress || {}),
      },
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      recentResults: Array.isArray(parsed.recentResults) ? parsed.recentResults : [],
    };
    const today = getTodayDateString();
    if (merged.dailyActiveDate !== today) {
      merged.dailyActiveDate = today;
      merged.dailyProgress = { games_played: 0, ladders_climbed: 0, wins: 0, special_tiles: 0 };
      merged.dailyRewardClaimed = false;
      saveProfile(merged);
    }
    return merged;
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
