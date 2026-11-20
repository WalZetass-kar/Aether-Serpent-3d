import {
  AETHER_COIN_PACKS,
  BOARD_UNLOCK_RULES,
  BoardConfig,
  BoardMissionMetric,
  BoardSelectionMode,
  BoardThemeId,
  BoardUnlockRule,
  DEFAULT_BOARD_CONFIGS,
  STARTER_UNLOCKED_BOARD_IDS,
  cloneBoardConfig,
  getBoardUnlockRule,
  getDefaultBoardByTheme,
  pickRandomBoardConfig,
} from '../../shared/boardThemes';
import { loadProfile, saveProfile, type PlayerProfile } from './storageService';

const STORAGE_KEY = 'aether_serpent_board_collection_v1';

export interface BoardCollectionState {
  selectedBoardId: string;
  defaultBoardId: string;
  selectionMode: BoardSelectionMode;
  favoriteBoardIds: string[];
  customBoards: BoardConfig[];
  lastRandomBoardId: string | null;
}

export interface BoardUnlockStatus {
  unlocked: boolean;
  canClaimMission: boolean;
  currentProgress: number;
  targetProgress: number;
  altCurrentProgress?: number;
  altTargetProgress?: number;
  progressPct: number;
  rule: BoardUnlockRule;
}

const DEFAULT_COLLECTION_STATE: BoardCollectionState = {
  selectedBoardId: DEFAULT_BOARD_CONFIGS[0].id,
  defaultBoardId: DEFAULT_BOARD_CONFIGS[0].id,
  selectionMode: 'manual',
  favoriteBoardIds: [...STARTER_UNLOCKED_BOARD_IDS],
  customBoards: [],
  lastRandomBoardId: null,
};

function readMissionMetric(profile: PlayerProfile, metric: BoardMissionMetric): number {
  switch (metric) {
    case 'totalGames':
      return profile.totalGames;
    case 'wins':
      return profile.wins;
    case 'laddersClimbed':
      return profile.laddersClimbed;
    case 'bestScore':
      return profile.bestScore;
    case 'onlineWins':
      return profile.onlineWins;
    case 'specialTilesHit':
      return profile.specialTilesHit;
    case 'loginStreak':
      return profile.loginStreak;
  }
}

export function getBoardUnlockStatus(
  boardId: string,
  profileArg?: PlayerProfile,
): BoardUnlockStatus {
  const profile = profileArg ?? loadProfile();
  if (!boardId.startsWith('default_')) {
    return {
      unlocked: true,
      canClaimMission: false,
      currentProgress: 1,
      targetProgress: 1,
      progressPct: 100,
      rule: getBoardUnlockRule(boardId),
    };
  }

  const rule = getBoardUnlockRule(boardId);
  const ownedSet = new Set([...STARTER_UNLOCKED_BOARD_IDS, ...(profile.unlockedBoardIds || [])]);
  if (rule.unlockType === 'free' || ownedSet.has(boardId)) {
    return {
      unlocked: true,
      canClaimMission: false,
      currentProgress: rule.mission?.target ?? 1,
      targetProgress: rule.mission?.target ?? 1,
      progressPct: 100,
      rule,
    };
  }

  if (rule.unlockType === 'mission' && rule.mission) {
    const cur = readMissionMetric(profile, rule.mission.metric);
    const target = rule.mission.target;
    const primaryMet = cur >= target;
    let altCur: number | undefined;
    let altTarget: number | undefined;
    let altMet = false;
    if (rule.mission.altMetric && rule.mission.altTarget) {
      altCur = readMissionMetric(profile, rule.mission.altMetric);
      altTarget = rule.mission.altTarget;
      altMet = altCur >= altTarget;
    }
    const met = primaryMet || altMet;
    const pct = met ? 100 : Math.min(99, Math.round((cur / Math.max(1, target)) * 100));
    return {
      unlocked: false,
      canClaimMission: met,
      currentProgress: cur,
      targetProgress: target,
      altCurrentProgress: altCur,
      altTargetProgress: altTarget,
      progressPct: pct,
      rule,
    };
  }

  return {
    unlocked: false,
    canClaimMission: false,
    currentProgress: 0,
    targetProgress: 1,
    progressPct: 0,
    rule,
  };
}

export function isBoardUnlocked(boardId: string, profileArg?: PlayerProfile): boolean {
  return getBoardUnlockStatus(boardId, profileArg).unlocked;
}

export function isThemeUnlocked(themeId: BoardThemeId, profileArg?: PlayerProfile): boolean {
  const defaultBoard = DEFAULT_BOARD_CONFIGS.find((b) => b.themeId === themeId);
  if (!defaultBoard) return true;
  return isBoardUnlocked(defaultBoard.id, profileArg);
}

export function getClaimableMissionBoards(profileArg?: PlayerProfile): BoardConfig[] {
  const profile = profileArg ?? loadProfile();
  return DEFAULT_BOARD_CONFIGS.filter((b) => getBoardUnlockStatus(b.id, profile).canClaimMission);
}

export function claimBoardMission(
  boardId: string,
  profileArg?: PlayerProfile,
): { ok: boolean; profile: PlayerProfile; rewardCoins: number; reason?: string } {
  const profile = profileArg ?? loadProfile();
  const status = getBoardUnlockStatus(boardId, profile);
  if (status.unlocked) {
    return { ok: false, profile, rewardCoins: 0, reason: 'Papan sudah terbuka.' };
  }
  if (!status.canClaimMission || !status.rule.mission) {
    return { ok: false, profile, rewardCoins: 0, reason: 'Misi papan ini belum selesai.' };
  }
  const rewardCoins = status.rule.mission.rewardCoins;
  const nextProfile: PlayerProfile = {
    ...profile,
    aetherCoins: (profile.aetherCoins ?? 0) + rewardCoins,
    unlockedBoardIds: Array.from(
      new Set([...STARTER_UNLOCKED_BOARD_IDS, ...(profile.unlockedBoardIds || []), boardId]),
    ),
  };
  saveProfile(nextProfile);
  return { ok: true, profile: nextProfile, rewardCoins };
}

export function purchasePremiumBoard(
  boardId: string,
  profileArg?: PlayerProfile,
): { ok: boolean; profile: PlayerProfile; spentCoins: number; reason?: string } {
  const profile = profileArg ?? loadProfile();
  const status = getBoardUnlockStatus(boardId, profile);
  if (status.unlocked) {
    return { ok: false, profile, spentCoins: 0, reason: 'Papan ini sudah kamu miliki.' };
  }
  if (status.rule.unlockType !== 'premium' || !status.rule.premium) {
    return { ok: false, profile, spentCoins: 0, reason: 'Papan ini bukan papan berbayar.' };
  }
  const price = status.rule.premium.priceCoins;
  const currentCoins = profile.aetherCoins ?? 0;
  const hasUnlimitedCoins = Boolean(profile.unlimitedCoins);
  if (!hasUnlimitedCoins && currentCoins < price) {
    return {
      ok: false,
      profile,
      spentCoins: 0,
      reason: `Koin Aether belum cukup (butuh ${price.toLocaleString('id-ID')} Koin).`,
    };
  }
  const nextProfile: PlayerProfile = {
    ...profile,
    aetherCoins: hasUnlimitedCoins ? currentCoins : currentCoins - price,
    unlockedBoardIds: Array.from(
      new Set([...STARTER_UNLOCKED_BOARD_IDS, ...(profile.unlockedBoardIds || []), boardId]),
    ),
  };
  saveProfile(nextProfile);
  return { ok: true, profile: nextProfile, spentCoins: hasUnlimitedCoins ? 0 : price };
}

export function applyAetherCoinPack(
  packId: string,
  profileArg?: PlayerProfile,
): { ok: boolean; profile: PlayerProfile; addedCoins: number; unlockedCount: number } {
  const profile = profileArg ?? loadProfile();
  const pack = AETHER_COIN_PACKS.find((p) => p.id === packId);
  if (!pack) {
    return { ok: false, profile, addedCoins: 0, unlockedCount: 0 };
  }
  const addedCoins = pack.coins + pack.bonusCoins;
  const currentUnlocked = new Set([
    ...STARTER_UNLOCKED_BOARD_IDS,
    ...(profile.unlockedBoardIds || []),
  ]);
  let unlockedCount = 0;
  if (pack.unlockAllPremium) {
    Object.values(BOARD_UNLOCK_RULES).forEach((rule) => {
      if (rule.unlockType === 'premium' && !currentUnlocked.has(rule.boardId)) {
        currentUnlocked.add(rule.boardId);
        unlockedCount += 1;
      }
    });
  }
  const nextProfile: PlayerProfile = {
    ...profile,
    aetherCoins: (profile.aetherCoins ?? 0) + addedCoins,
    unlockedBoardIds: Array.from(currentUnlocked),
  };
  saveProfile(nextProfile);
  return { ok: true, profile: nextProfile, addedCoins, unlockedCount };
}

export function loadBoardCollection(): BoardCollectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_COLLECTION_STATE,
        favoriteBoardIds: [...DEFAULT_COLLECTION_STATE.favoriteBoardIds],
        customBoards: [],
      };
    }
    const parsed = JSON.parse(raw) as Partial<BoardCollectionState>;
    const customBoards = Array.isArray(parsed.customBoards) ? parsed.customBoards : [];
    const favoriteBoardIds = Array.isArray(parsed.favoriteBoardIds)
      ? parsed.favoriteBoardIds
      : [...DEFAULT_COLLECTION_STATE.favoriteBoardIds];
    const selectionMode: BoardSelectionMode =
      parsed.selectionMode === 'random' || parsed.selectionMode === 'custom'
        ? parsed.selectionMode
        : 'manual';

    return {
      selectedBoardId: parsed.selectedBoardId || DEFAULT_COLLECTION_STATE.selectedBoardId,
      defaultBoardId: parsed.defaultBoardId || DEFAULT_COLLECTION_STATE.defaultBoardId,
      selectionMode,
      favoriteBoardIds,
      customBoards,
      lastRandomBoardId: parsed.lastRandomBoardId || null,
    };
  } catch {
    return {
      ...DEFAULT_COLLECTION_STATE,
      favoriteBoardIds: [...DEFAULT_COLLECTION_STATE.favoriteBoardIds],
      customBoards: [],
    };
  }
}

export function saveBoardCollection(state: BoardCollectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function getAllAvailableBoards(state?: BoardCollectionState): BoardConfig[] {
  const current = state || loadBoardCollection();
  const defaults = DEFAULT_BOARD_CONFIGS.map((b) => ({
    ...cloneBoardConfig(b),
    isFavorite: current.favoriteBoardIds.includes(b.id),
  }));
  const customs = current.customBoards.map((b) => ({
    ...cloneBoardConfig(b),
    isCustom: true,
    isFavorite: current.favoriteBoardIds.includes(b.id),
  }));
  return [...defaults, ...customs];
}

export function getBoardById(boardId: string, state?: BoardCollectionState): BoardConfig {
  const all = getAllAvailableBoards(state);
  const found = all.find((b) => b.id === boardId);
  if (found) return found;
  const fallback = all.find((b) => b.id === (state?.defaultBoardId || DEFAULT_BOARD_CONFIGS[0].id));
  return fallback || cloneBoardConfig(DEFAULT_BOARD_CONFIGS[0]);
}

export function selectBoard(boardId: string, mode?: BoardSelectionMode): BoardCollectionState {
  const state = loadBoardCollection();
  state.selectedBoardId = boardId;
  if (mode) {
    state.selectionMode = mode;
  }
  saveBoardCollection(state);
  return state;
}

export function setBoardSelectionMode(mode: BoardSelectionMode): BoardCollectionState {
  const state = loadBoardCollection();
  state.selectionMode = mode;
  if (mode === 'custom' && state.customBoards.length > 0) {
    const isSelectedCustom = state.customBoards.some((b) => b.id === state.selectedBoardId);
    if (!isSelectedCustom) {
      state.selectedBoardId = state.customBoards[0].id;
    }
  }
  saveBoardCollection(state);
  return state;
}

export function toggleFavoriteBoard(boardId: string): BoardCollectionState {
  const state = loadBoardCollection();
  if (state.favoriteBoardIds.includes(boardId)) {
    state.favoriteBoardIds = state.favoriteBoardIds.filter((id) => id !== boardId);
  } else {
    state.favoriteBoardIds = [...state.favoriteBoardIds, boardId];
  }
  saveBoardCollection(state);
  return state;
}

export function setDefaultBoard(boardId: string): BoardCollectionState {
  const state = loadBoardCollection();
  state.defaultBoardId = boardId;
  state.selectedBoardId = boardId;
  saveBoardCollection(state);
  return state;
}

export function saveCustomBoard(board: BoardConfig): { state: BoardCollectionState; saved: BoardConfig } {
  const state = loadBoardCollection();
  const now = Date.now();
  const isNew = !board.isCustom || board.id.startsWith('default_') || !state.customBoards.some((b) => b.id === board.id);
  const saved: BoardConfig = {
    ...cloneBoardConfig(board),
    id: isNew ? `custom_${now}_${Math.random().toString(36).slice(2, 7)}` : board.id,
    isCustom: true,
    createdAt: isNew ? now : board.createdAt || now,
    updatedAt: now,
  };

  const existingIdx = state.customBoards.findIndex((b) => b.id === saved.id);
  if (existingIdx >= 0) {
    state.customBoards[existingIdx] = saved;
  } else {
    state.customBoards = [saved, ...state.customBoards];
  }

  state.selectedBoardId = saved.id;
  saveBoardCollection(state);
  return { state, saved };
}

export function saveDownloadedCommunityBoard(
  board: BoardConfig,
  communityBoardId: string,
  authorName: string,
): { state: BoardCollectionState; saved: BoardConfig; alreadyExisted: boolean } {
  const state = loadBoardCollection();
  const now = Date.now();
  const cleanCommunityId = communityBoardId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70);
  const localId = `community_${cleanCommunityId}`;
  const existingIdx = state.customBoards.findIndex((b) => b.id === localId);
  const alreadyExisted = existingIdx >= 0;

  const saved: BoardConfig = {
    ...cloneBoardConfig(board),
    id: localId,
    subtitle: board.subtitle || `Komunitas · oleh ${authorName}`,
    isCustom: true,
    createdAt: alreadyExisted ? state.customBoards[existingIdx].createdAt || now : now,
    updatedAt: now,
  };

  if (alreadyExisted) {
    state.customBoards[existingIdx] = saved;
  } else {
    state.customBoards = [saved, ...state.customBoards];
  }

  state.selectedBoardId = saved.id;
  saveBoardCollection(state);
  return { state, saved, alreadyExisted };
}

export function deleteCustomBoard(boardId: string): BoardCollectionState {
  const state = loadBoardCollection();
  state.customBoards = state.customBoards.filter((b) => b.id !== boardId);
  state.favoriteBoardIds = state.favoriteBoardIds.filter((id) => id !== boardId);
  if (state.defaultBoardId === boardId) {
    state.defaultBoardId = DEFAULT_BOARD_CONFIGS[0].id;
  }
  if (state.selectedBoardId === boardId) {
    state.selectedBoardId = state.defaultBoardId;
  }
  saveBoardCollection(state);
  return state;
}

export function duplicateBoard(boardId: string): { state: BoardCollectionState; duplicated: BoardConfig } {
  const state = loadBoardCollection();
  const source = getBoardById(boardId, state);
  const now = Date.now();
  const duplicated: BoardConfig = {
    ...cloneBoardConfig(source),
    id: `custom_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${source.name} (Salinan)`,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
  state.customBoards = [duplicated, ...state.customBoards];
  state.selectedBoardId = duplicated.id;
  saveBoardCollection(state);
  return { state, duplicated };
}

export function renameCustomBoard(boardId: string, newName: string): BoardCollectionState {
  const state = loadBoardCollection();
  const trimmed = newName.trim();
  if (!trimmed) return state;
  const idx = state.customBoards.findIndex((b) => b.id === boardId);
  if (idx >= 0) {
    state.customBoards[idx] = {
      ...state.customBoards[idx],
      name: trimmed,
      updatedAt: Date.now(),
    };
    saveBoardCollection(state);
  }
  return state;
}

/**
 * Resolves the active board when a new game starts according to the selection mode:
 * - 'random': Picks a random board from all available boards without repeating the last random board
 * - 'custom': Uses the selected custom board (or first custom board if none selected)
 * - 'manual': Uses the currently selected board (or default board)
 */
export function resolveBoardForMatch(profileArg?: PlayerProfile): BoardConfig {
  const profile = profileArg ?? loadProfile();
  const state = loadBoardCollection();
  const allBoards = getAllAvailableBoards(state);
  const unlockedBoards = allBoards.filter((b) => isBoardUnlocked(b.id, profile));
  const safePool = unlockedBoards.length > 0 ? unlockedBoards : [cloneBoardConfig(DEFAULT_BOARD_CONFIGS[0])];

  if (state.selectionMode === 'random') {
    const chosen = pickRandomBoardConfig(safePool, state.lastRandomBoardId);
    state.lastRandomBoardId = chosen.id;
    state.selectedBoardId = chosen.id;
    saveBoardCollection(state);
    return chosen;
  }

  if (state.selectionMode === 'custom' && state.customBoards.length > 0) {
    const customMatch = state.customBoards.find((b) => b.id === state.selectedBoardId);
    const chosen = customMatch || state.customBoards[0];
    return cloneBoardConfig(chosen);
  }

  const candidateId = state.selectedBoardId || state.defaultBoardId;
  if (isBoardUnlocked(candidateId, profile)) {
    return getBoardById(candidateId, state);
  }
  const fallback = safePool[0];
  state.selectedBoardId = fallback.id;
  saveBoardCollection(state);
  return cloneBoardConfig(fallback);
}

export function createTemplateFromTheme(themeId: BoardConfig['themeId'], customName?: string): BoardConfig {
  const base = getDefaultBoardByTheme(themeId);
  const now = Date.now();
  return {
    ...base,
    id: `draft_${now}`,
    name: customName || `Kustom ${base.name}`,
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };
}
