import {
  BoardConfig,
  BoardSelectionMode,
  DEFAULT_BOARD_CONFIGS,
  cloneBoardConfig,
  getDefaultBoardByTheme,
  pickRandomBoardConfig,
} from '../../shared/boardThemes';

const STORAGE_KEY = 'aether_serpent_board_collection_v1';

export interface BoardCollectionState {
  selectedBoardId: string;
  defaultBoardId: string;
  selectionMode: BoardSelectionMode;
  favoriteBoardIds: string[];
  customBoards: BoardConfig[];
  lastRandomBoardId: string | null;
}

const DEFAULT_COLLECTION_STATE: BoardCollectionState = {
  selectedBoardId: DEFAULT_BOARD_CONFIGS[0].id,
  defaultBoardId: DEFAULT_BOARD_CONFIGS[0].id,
  selectionMode: 'manual',
  favoriteBoardIds: ['default_enchanted_forest', 'default_dragon_volcano', 'default_celestial_sky'],
  customBoards: [],
  lastRandomBoardId: null,
};

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
export function resolveBoardForMatch(): BoardConfig {
  const state = loadBoardCollection();
  const allBoards = getAllAvailableBoards(state);

  if (state.selectionMode === 'random') {
    const chosen = pickRandomBoardConfig(allBoards, state.lastRandomBoardId);
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

  return getBoardById(state.selectedBoardId || state.defaultBoardId, state);
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
