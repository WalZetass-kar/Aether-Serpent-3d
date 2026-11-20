import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Check,
  Coins,
  Copy,
  Crown,
  Edit3,
  Eye,
  Heart,
  Info,
  Layers,
  Lock,
  MessageCircle,
  Moon,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Sun,
  Sunset,
  Target,
  Trash2,
  Unlock,
  UserCheck,
  Wand2,
  X,
} from 'lucide-react';
import {
  BOARD_THEME_LABELS,
  BoardConfig,
  BoardSelectionMode,
  BoardThemeId,
  DEFAULT_BOARD_CONFIGS,
  cloneBoardConfig,
  generateRandomJumpsForTheme,
  getDefaultBoardByTheme,
} from '../../shared/boardThemes';
import {
  BoardCollectionState,
  claimBoardMission,
  createTemplateFromTheme,
  deleteCustomBoard,
  duplicateBoard,
  getAllAvailableBoards,
  getBoardById,
  getBoardUnlockStatus,
  getClaimableMissionBoards,
  isBoardUnlocked,
  isThemeUnlocked,
  loadBoardCollection,
  purchasePremiumBoard,
  renameCustomBoard,
  saveCustomBoard,
  selectBoard,
  setBoardSelectionMode,
  setDefaultBoard,
  toggleFavoriteBoard,
} from '../services/boardStorageService';
import type { PlayerProfile } from '../services/storageService';
import { subscribeToMemberTopUpThread } from '../services/topUpChatService';
import { soundEngine } from '../audio/soundEngine';
import { FantasyBoardEngine, type TileInspectInfo } from '../three/FantasyBoardEngine';
import type { DiceSkinId } from '../../shared/gameConfig';
import type { GraphicsPreferences } from '../three/perf/qualityPresets';
import { BoardUnlockedOverlay } from './BoardUnlockedOverlay';
import { PawnShowcase } from './PawnShowcase';
import { TopUpAdminChatModal } from './TopUpAdminChatModal';

interface BoardManagerViewProps {
  initialTab?: 'collection' | 'creator' | 'pawns';
  graphicsPrefs: GraphicsPreferences;
  diceSkinId: DiceSkinId;
  profile: PlayerProfile;
  user: User | null;
  onOpenAuth?: () => void;
  onUpdateProfile: (next: PlayerProfile) => void;
  onNotify?: (title: string, detail?: string) => void;
  onBack: () => void;
  onPlayWithBoard: (board: BoardConfig) => void;
  onBoardSelectionChanged?: (board: BoardConfig, mode: BoardSelectionMode) => void;
}

type CollectionCategory = 'all' | 'unlocked' | 'mission' | 'premium' | 'custom' | 'favorite';
type CreatorSection = 'board' | 'tile' | 'snake' | 'ladder' | 'environment' | 'vfx';

const RARITY_LABEL: Record<string, { text: string; colorClass: string }> = {
  starter: { text: 'Gratis', colorClass: 'text-emerald-400' },
  rare: { text: 'Langka', colorClass: 'text-sky-400' },
  epic: { text: 'Epik', colorClass: 'text-violet-400' },
  legendary: { text: 'Legendaris', colorClass: 'text-amber-300' },
  mythic: { text: 'Mitik', colorClass: 'text-fuchsia-300' },
};

function getBoardVisualSignature(b: BoardConfig): string {
  return JSON.stringify({
    themeId: b.themeId,
    ladders: b.ladders,
    snakes: b.snakes,
    boardSettings: b.boardSettings,
    tileConfig: b.tileConfig,
    snakeConfig: b.snakeConfig,
    ladderConfig: b.ladderConfig,
    environmentConfig: b.environmentConfig,
    visualEffects: b.visualEffects,
  });
}

function getBoardFastSyncSignature(b: BoardConfig): string {
  return JSON.stringify({
    skyPreset: b.environmentConfig.skyPreset,
    lightingPreset: b.environmentConfig.lightingPreset,
    fogIntensity: b.environmentConfig.fogIntensity,
    ambientIntensity: b.visualEffects.ambientIntensity,
    shadowsEnabled: b.visualEffects.shadowsEnabled,
  });
}

export const BoardManagerView: React.FC<BoardManagerViewProps> = ({
  initialTab = 'collection',
  graphicsPrefs,
  diceSkinId,
  profile,
  user,
  onOpenAuth,
  onUpdateProfile,
  onNotify,
  onBack,
  onPlayWithBoard,
  onBoardSelectionChanged,
}) => {
  const [collection, setCollection] = useState<BoardCollectionState>(() => loadBoardCollection());
  const [activeModeTab, setActiveModeTab] = useState<'collection' | 'creator' | 'pawns'>(initialTab);
  const [category, setCategory] = useState<CollectionCategory>('all');
  const [creatorSection, setCreatorSection] = useState<CreatorSection>('board');
  const [unlockGuideBoard, setUnlockGuideBoard] = useState<BoardConfig | null>(null);
  const [topUpChatOpen, setTopUpChatOpen] = useState(false);
  const [topUpBoardContext, setTopUpBoardContext] = useState<string | null>(null);
  const [unreadAdminReplies, setUnreadAdminReplies] = useState(0);
  const [celebrationOverlay, setCelebrationOverlay] = useState<{
    board: BoardConfig;
    unlockSource: 'mission' | 'premium';
    bonusCoins: number;
  } | null>(null);

  const allBoards = useMemo(() => getAllAvailableBoards(collection), [collection]);
  const selectedBoard = useMemo(() => {
    const raw = getBoardById(collection.selectedBoardId, collection);
    if (isBoardUnlocked(raw.id, profile)) return raw;
    return DEFAULT_BOARD_CONFIGS[0];
  }, [collection, profile]);

  const unlockedDefaultCount = useMemo(
    () => DEFAULT_BOARD_CONFIGS.filter((b) => isBoardUnlocked(b.id, profile)).length,
    [profile],
  );
  const lockedSpotlightBoards = useMemo(
    () => DEFAULT_BOARD_CONFIGS.filter((b) => !isBoardUnlocked(b.id, profile)),
    [profile],
  );
  const claimableMissionBoards = useMemo(() => getClaimableMissionBoards(profile), [profile]);
  const currentCoins = profile.aetherCoins ?? 0;

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setUnreadAdminReplies(0);
      return;
    }
    return subscribeToMemberTopUpThread(user, (thread) => {
      setUnreadAdminReplies(thread?.unreadByMember ?? 0);
    });
  }, [user]);

  const [previewBoard, setPreviewBoard] = useState<BoardConfig>(() =>
    cloneBoardConfig(selectedBoard),
  );
  const [draftBoard, setDraftBoard] = useState<BoardConfig>(() =>
    createTemplateFromTheme(selectedBoard.themeId, `Kustom ${selectedBoard.name}`),
  );
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStage, setBuildStage] = useState('Menyiapkan Studio Papan 3D...');
  const [webglLost, setWebglLost] = useState(false);
  const [engineMountKey, setEngineMountKey] = useState(0);
  const [inspectedTile, setInspectedTile] = useState<TileInspectInfo | null>(null);
  const [mobilePreviewSize, setMobilePreviewSize] = useState<'compact' | 'expanded' | 'hidden'>('compact');

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FantasyBoardEngine | null>(null);
  const lastBuiltSigRef = useRef<string>('');
  const lastFastSigRef = useRef<string>('');

  const active3DBoard = activeModeTab === 'creator' ? draftBoard : previewBoard;
  const activeVisualSignature = useMemo(() => getBoardVisualSignature(active3DBoard), [active3DBoard]);
  const activeFastSignature = useMemo(() => getBoardFastSyncSignature(active3DBoard), [active3DBoard]);

  const activeBoardRef = useRef<BoardConfig>(active3DBoard);
  activeBoardRef.current = active3DBoard;

  // Mount live 3D preview engine (skipped on 'pawns' tab so PawnShowcase has dedicated WebGL canvas)
  useEffect(() => {
    if (activeModeTab === 'pawns') {
      return;
    }
    const container = previewContainerRef.current;
    if (!container) return;

    setPreviewReady(false);
    setBuildProgress(0.08);
    setWebglLost(false);
    const initialBoard = cloneBoardConfig(activeBoardRef.current);
    const initialSig = getBoardVisualSignature(initialBoard);
    const initialFastSig = getBoardFastSyncSignature(initialBoard);

    const engine = new FantasyBoardEngine(
      container,
      {
        onTileInspected: (info) => {
          setInspectedTile(info);
        },
        onWebGLContextLost: (lost) => {
          setWebglLost(lost);
        },
      },
      {
        graphicsPrefs,
        diceSkinId,
        boardConfig: initialBoard,
        onBuildProgress: (progress, stage) => {
          setBuildProgress(progress);
          setBuildStage(stage);
        },
        onBuildReady: () => {
          lastBuiltSigRef.current = initialSig;
          lastFastSigRef.current = initialFastSig;
          setPreviewReady(true);
        },
      },
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [engineMountKey, activeModeTab]);

  // Smartly debounced live-update of 3D preview whenever visual configuration changes
  useEffect(() => {
    if (!engineRef.current || !previewReady) return;
    if (lastBuiltSigRef.current === activeVisualSignature) return;

    const onlyFastAtmosphere = lastFastSigRef.current !== activeFastSignature;
    const delayMs = onlyFastAtmosphere ? 65 : 240;

    const timer = window.setTimeout(() => {
      try {
        engineRef.current?.updateBoardConfig(activeBoardRef.current);
        lastBuiltSigRef.current = activeVisualSignature;
        lastFastSigRef.current = activeFastSignature;
      } catch {
        // Keep UI responsive even if a WebGL texture update hits transient state
      }
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [activeVisualSignature, activeFastSignature, previewReady]);

  const showNotice = (msg: string) => {
    setSaveToast(msg);
    window.setTimeout(() => {
      setSaveToast((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  const filteredBoards = useMemo(() => {
    if (category === 'all') {
      return allBoards;
    }
    if (category === 'unlocked') {
      return allBoards.filter((b) => isBoardUnlocked(b.id, profile));
    }
    if (category === 'mission') {
      return allBoards.filter(
        (b) => !b.isCustom && getBoardUnlockStatus(b.id, profile).rule.unlockType === 'mission',
      );
    }
    if (category === 'premium') {
      return allBoards.filter(
        (b) => !b.isCustom && getBoardUnlockStatus(b.id, profile).rule.unlockType === 'premium',
      );
    }
    if (category === 'custom') {
      return allBoards.filter((b) => b.isCustom);
    }
    return allBoards.filter((b) => collection.favoriteBoardIds.includes(b.id));
  }, [allBoards, category, collection.favoriteBoardIds, profile]);

  const handleClaimMissionBoard = (board: BoardConfig) => {
    const res = claimBoardMission(board.id, profile);
    if (!res.ok) {
      showNotice(res.reason || 'Misi belum selesai.');
      return;
    }
    soundEngine.playVictory();
    onUpdateProfile(res.profile);
    const nextState = selectBoard(board.id, 'manual');
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    setUnlockGuideBoard(null);
    setCelebrationOverlay({
      board,
      unlockSource: 'mission',
      bonusCoins: res.rewardCoins,
    });
    const msg = `Papan "${board.name}" terbuka! Bonus +${res.rewardCoins.toLocaleString('id-ID')} Koin Aether.`;
    showNotice(msg);
    onNotify?.(`Papan Baru Terbuka: ${board.name}`, `+${res.rewardCoins.toLocaleString('id-ID')} Koin Aether`);
  };

  const handleConfirmPurchasePremium = (board: BoardConfig) => {
    const res = purchasePremiumBoard(board.id, profile);
    if (!res.ok) {
      showNotice(res.reason || 'Koin Aether belum mencukupi.');
      return;
    }
    soundEngine.playVictory();
    onUpdateProfile(res.profile);
    const nextState = selectBoard(board.id, 'manual');
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    setUnlockGuideBoard(null);
    setCelebrationOverlay({
      board,
      unlockSource: 'premium',
      bonusCoins: 0,
    });
    showNotice(`Papan Premium "${board.name}" berhasil dibuka!`);
    onNotify?.(
      `Papan Premium Terbuka: ${board.name}`,
      `Menggunakan ${res.spentCoins.toLocaleString('id-ID')} Koin Aether`,
    );
  };

  const handleOpenTopUpChat = (boardName?: string | null) => {
    soundEngine.playUiClick();
    setUnlockGuideBoard(null);
    setTopUpBoardContext(boardName ?? null);
    setTopUpChatOpen(true);
  };

  const handleLockedBoardAttempt = (board: BoardConfig) => {
    soundEngine.playUiClick();
    setPreviewBoard(cloneBoardConfig(board));
    if (mobilePreviewSize === 'hidden') {
      setMobilePreviewSize('compact');
    }
    setUnlockGuideBoard(board);
  };

  const handleSelectBoard = (board: BoardConfig, modeOverride?: BoardSelectionMode) => {
    if (!isBoardUnlocked(board.id, profile)) {
      handleLockedBoardAttempt(board);
      return;
    }
    const nextMode = modeOverride ?? (board.isCustom ? 'custom' : 'manual');
    const nextState = selectBoard(board.id, nextMode);
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    showNotice(`Papan "${board.name}" dipilih.`);
  };

  const handleRandomPick = () => {
    const unlockedPool = allBoards.filter((b) => isBoardUnlocked(b.id, profile));
    const safePool = unlockedPool.length > 0 ? unlockedPool : [DEFAULT_BOARD_CONFIGS[0]];
    const candidates = safePool.filter((b) => b.id !== previewBoard.id);
    const pool = candidates.length > 0 ? candidates : safePool;
    const randomBoard = pool[Math.floor(Math.random() * pool.length)];
    const nextState = selectBoard(randomBoard.id, 'random');
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(randomBoard));
    onBoardSelectionChanged?.(randomBoard, 'random');
    showNotice(`Mode Acak memilih: ${randomBoard.name}`);
  };

  const handleModeSwitch = (mode: BoardSelectionMode) => {
    const nextState = setBoardSelectionMode(mode);
    setCollection({ ...nextState });
    const rawActive = getBoardById(nextState.selectedBoardId, nextState);
    const active = isBoardUnlocked(rawActive.id, profile) ? rawActive : DEFAULT_BOARD_CONFIGS[0];
    setPreviewBoard(cloneBoardConfig(active));
    onBoardSelectionChanged?.(active, mode);
    showNotice(
      mode === 'random'
        ? 'Mode Pemilihan Papan: RANDOM MODE aktif (khusus papan terbuka)'
        : mode === 'custom'
          ? 'Mode Pemilihan Papan: CUSTOM MODE aktif'
          : 'Mode Pemilihan Papan: MANUAL MODE aktif',
    );
  };

  const handleToggleFavorite = (boardId: string) => {
    const nextState = toggleFavoriteBoard(boardId);
    setCollection({ ...nextState });
  };

  const handleSetDefault = (board: BoardConfig) => {
    if (!isBoardUnlocked(board.id, profile)) {
      handleLockedBoardAttempt(board);
      return;
    }
    const nextState = setDefaultBoard(board.id);
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    showNotice(`"${board.name}" dijadikan papan utama (Default).`);
  };

  const handleDuplicate = (board: BoardConfig) => {
    if (!isBoardUnlocked(board.id, profile)) {
      handleLockedBoardAttempt(board);
      return;
    }
    const { state, duplicated } = duplicateBoard(board.id);
    setCollection({ ...state });
    setPreviewBoard(cloneBoardConfig(duplicated));
    setCategory('custom');
    showNotice(`Salinan "${duplicated.name}" ditambahkan ke My Custom Boards.`);
  };

  const handleDeleteCustom = (board: BoardConfig) => {
    if (!board.isCustom) return;
    const nextState = deleteCustomBoard(board.id);
    setCollection({ ...nextState });
    const fallback = getBoardById(nextState.selectedBoardId, nextState);
    setPreviewBoard(cloneBoardConfig(fallback));
    showNotice(`Papan kustom "${board.name}" dihapus.`);
  };

  const handleStartRename = (board: BoardConfig) => {
    setRenamingId(board.id);
    setRenameValue(board.name);
  };

  const handleCommitRename = (boardId: string) => {
    if (renameValue.trim()) {
      const nextState = renameCustomBoard(boardId, renameValue);
      setCollection({ ...nextState });
      if (previewBoard.id === boardId) {
        setPreviewBoard((prev) => ({ ...prev, name: renameValue.trim() }));
      }
      showNotice('Nama papan diperbarui.');
    }
    setRenamingId(null);
  };

  const handleOpenCreatorWithBoard = (board: BoardConfig, asNewCopy = false) => {
    if (!isBoardUnlocked(board.id, profile)) {
      handleLockedBoardAttempt(board);
      return;
    }
    const cloned = cloneBoardConfig(board);
    if (asNewCopy || !board.isCustom) {
      cloned.id = `draft_${Date.now()}`;
      cloned.name = board.isCustom ? `${board.name} (Edit)` : `Kustom ${board.name}`;
      cloned.isCustom = true;
      setHasUnsavedDraft(true);
    } else {
      setHasUnsavedDraft(false);
    }
    setDraftBoard(cloned);
    setActiveModeTab('creator');
  };

  const handleApplyBaseThemeToDraft = (themeId: BoardThemeId) => {
    if (!isThemeUnlocked(themeId, profile)) {
      const targetBoard = DEFAULT_BOARD_CONFIGS.find((b) => b.themeId === themeId);
      if (targetBoard) {
        handleLockedBoardAttempt(targetBoard);
      } else {
        showNotice(`Tema ${BOARD_THEME_LABELS[themeId]} masih terkunci.`);
      }
      return;
    }
    const base = getDefaultBoardByTheme(themeId);
    setDraftBoard((prev) => ({
      ...base,
      id: prev.id,
      name: prev.name,
      isCustom: true,
      createdAt: prev.createdAt,
      updatedAt: Date.now(),
    }));
    setHasUnsavedDraft(true);
    showNotice(`Preset tema ${BOARD_THEME_LABELS[themeId]} diterapkan ke editor.`);
  };

  const handleSaveCustomBoard = () => {
    const { state, saved } = saveCustomBoard(draftBoard);
    setCollection({ ...state });
    setDraftBoard(cloneBoardConfig(saved));
    setPreviewBoard(cloneBoardConfig(saved));
    setHasUnsavedDraft(false);
    onBoardSelectionChanged?.(saved, state.selectionMode);
    showNotice(`Papan "${saved.name}" berhasil disimpan ke My Custom Boards!`);
  };

  const handlePlayBoard = (boardToPlay: BoardConfig) => {
    if (!boardToPlay.isCustom && !isBoardUnlocked(boardToPlay.id, profile)) {
      handleLockedBoardAttempt(boardToPlay);
      return;
    }
    const isDraftOrCreator =
      boardToPlay.id.startsWith('draft_') || (activeModeTab === 'creator' && hasUnsavedDraft);
    if (isDraftOrCreator || (activeModeTab === 'creator' && boardToPlay.isCustom)) {
      const { state, saved } = saveCustomBoard(boardToPlay);
      setCollection({ ...state });
      setDraftBoard(cloneBoardConfig(saved));
      setPreviewBoard(cloneBoardConfig(saved));
      setHasUnsavedDraft(false);
      onBoardSelectionChanged?.(saved, 'custom');
      onPlayWithBoard(saved);
      return;
    }
    onPlayWithBoard(boardToPlay);
  };

  const handleRandomizeJumps = (target: 'both' | 'ladders' | 'snakes') => {
    const generated = generateRandomJumpsForTheme(
      draftBoard.themeId,
      draftBoard.ladders.length || 12,
      draftBoard.snakes.length || 12,
    );
    setDraftBoard((prev) => ({
      ...prev,
      ladders: target === 'snakes' ? prev.ladders : generated.ladders,
      snakes: target === 'ladders' ? prev.snakes : generated.snakes,
      updatedAt: Date.now(),
    }));
    showNotice(
      target === 'both'
        ? 'Posisi seluruh Tangga & Ular diacak secara otomatis!'
        : target === 'ladders'
          ? 'Posisi Tangga berhasil diacak!'
          : 'Posisi Ular berhasil diacak!',
    );
  };

  const handleUpdateLadder = (
    idx: number,
    field: 'from' | 'to' | 'name',
    rawVal: number | string,
  ) => {
    setDraftBoard((prev) => {
      const next = prev.ladders.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'name') {
          return { ...item, name: String(rawVal) };
        }
        const num = Math.max(2, Math.min(99, Math.round(Number(rawVal) || 2)));
        if (field === 'from') {
          const from = Math.min(94, num);
          const to = Math.max(from + 4, item.to);
          return { ...item, from, to: Math.min(99, to) };
        } else {
          const to = Math.max(6, num);
          const from = Math.min(to - 4, item.from);
          return { ...item, from: Math.max(2, from), to };
        }
      });
      return { ...prev, ladders: next, updatedAt: Date.now() };
    });
  };

  const handleAddLadder = () => {
    setDraftBoard((prev) => {
      if (prev.ladders.length >= 20) return prev;
      const used = new Set<number>([
        1,
        100,
        ...prev.ladders.map((l) => l.from),
        ...prev.snakes.map((s) => s.from),
      ]);
      let from = 10;
      while (used.has(from) && from < 80) from += 3;
      const to = Math.min(98, from + 21);
      const nextId = `L${prev.ladders.length + 1}`;
      return {
        ...prev,
        ladders: [
          ...prev.ladders,
          {
            id: nextId,
            from,
            to,
            name: `Tangga Kustom #${prev.ladders.length + 1}`,
            type: 'ladder',
          },
        ],
        updatedAt: Date.now(),
      };
    });
  };

  const handleRemoveLadder = (idx: number) => {
    setDraftBoard((prev) => {
      if (prev.ladders.length <= 2) return prev;
      const next = prev.ladders
        .filter((_, i) => i !== idx)
        .map((l, i) => ({ ...l, id: `L${i + 1}` }));
      return { ...prev, ladders: next, updatedAt: Date.now() };
    });
  };

  const handleUpdateSnake = (
    idx: number,
    field: 'from' | 'to' | 'name',
    rawVal: number | string,
  ) => {
    setDraftBoard((prev) => {
      const next = prev.snakes.map((item, i) => {
        if (i !== idx) return item;
        if (field === 'name') {
          return { ...item, name: String(rawVal) };
        }
        const num = Math.max(2, Math.min(99, Math.round(Number(rawVal) || 20)));
        if (field === 'from') {
          const from = Math.max(12, num);
          const to = Math.min(from - 5, item.to);
          return { ...item, from, to: Math.max(2, to) };
        } else {
          const to = Math.min(92, num);
          const from = Math.max(to + 5, item.from);
          return { ...item, from: Math.min(99, from), to };
        }
      });
      return { ...prev, snakes: next, updatedAt: Date.now() };
    });
  };

  const handleAddSnake = () => {
    setDraftBoard((prev) => {
      if (prev.snakes.length >= 20) return prev;
      const used = new Set<number>([
        1,
        100,
        ...prev.ladders.map((l) => l.from),
        ...prev.snakes.map((s) => s.from),
      ]);
      let from = 93;
      while (used.has(from) && from > 25) from -= 4;
      const to = Math.max(4, from - 23);
      const nextId = `S${prev.snakes.length + 1}`;
      return {
        ...prev,
        snakes: [
          ...prev.snakes,
          {
            id: nextId,
            from,
            to,
            name: `Ular Kustom #${prev.snakes.length + 1}`,
            type: 'snake',
          },
        ],
        updatedAt: Date.now(),
      };
    });
  };

  const handleRemoveSnake = (idx: number) => {
    setDraftBoard((prev) => {
      if (prev.snakes.length <= 2) return prev;
      const next = prev.snakes
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, id: `S${i + 1}` }));
      return { ...prev, snakes: next, updatedAt: Date.now() };
    });
  };

  const activePreviewStatus = getBoardUnlockStatus(active3DBoard.id, profile);

  return (
    <div className="relative safe-viewport bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Navigation Header */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 bg-slate-950/92 safe-header-bar pb-2 sm:px-4 sm:py-3 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-white transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden xs:inline sm:inline">Kembali</span>
          </button>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-[11px]">
              <span className="font-bold uppercase tracking-widest text-emerald-400">
                Studio Papan 3D
              </span>
              <span className="text-slate-600">·</span>
              <span className="font-mono-num font-semibold text-amber-300">
                {unlockedDefaultCount}/{DEFAULT_BOARD_CONFIGS.length} Tema Terbuka
              </span>
              {claimableMissionBoards.length > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="font-bold text-emerald-300">
                    {claimableMissionBoards.length} Misi Siap Klaim!
                  </span>
                </>
              )}
            </div>
            <h1 className="font-display text-sm sm:text-xl font-bold text-gold-gradient truncate">
              {activeModeTab === 'pawns'
                ? 'Toko & Pratinjau Pion 3D'
                : 'Koleksi Papan & 3D Creator'}
            </h1>
          </div>
        </div>

        {/* Right Controls: Wallet + Mode Switcher + Play/Unlock CTA */}
        <div className="flex flex-wrap items-center justify-between w-full sm:w-auto gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => handleOpenTopUpChat(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-amber-200 hover:bg-amber-900/50 hover:border-amber-400 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Beli Koin Aether & Royal Pass melalui Chat Admin Resmi"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono-num">{currentCoins.toLocaleString('id-ID')}</span>
            <span className="text-amber-400/90 font-semibold">· Beli Koin</span>
            {unreadAdminReplies > 0 && (
              <span className="font-mono-num text-[10px] font-bold text-emerald-300">
                ({unreadAdminReplies})
              </span>
            )}
          </button>

          <div className="inline-flex flex-1 sm:flex-initial rounded-xl border border-slate-800 bg-slate-900/90 p-0.5 sm:p-1">
            <button
              type="button"
              onClick={() => setActiveModeTab('collection')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeModeTab === 'collection'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Koleksi ({allBoards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModeTab('creator')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeModeTab === 'creator'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              <span>3D Creator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModeTab('pawns')}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeModeTab === 'pawns'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Pion (14)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              handlePlayBoard(activeModeTab === 'pawns' ? selectedBoard : active3DBoard)
            }
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold shadow-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              activeModeTab === 'collection' && !activePreviewStatus.unlocked
                ? activePreviewStatus.canClaimMission
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-violet-500 text-white hover:bg-violet-400'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            }`}
          >
            {activeModeTab === 'collection' && !activePreviewStatus.unlocked ? (
              activePreviewStatus.canClaimMission ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Klaim Misi</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Buka Papan</span>
                </>
              )
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{activeModeTab === 'creator' ? 'Simpan & Main' : 'Mainkan'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      {activeModeTab === 'pawns' ? (
        <PawnShowcase
          profile={profile}
          onUpdateProfile={onUpdateProfile}
          onOpenTopUpChat={(itemName) => handleOpenTopUpChat(itemName)}
          onNotify={onNotify}
        />
      ) : (
        <div className="relative flex-1 flex flex-col lg:grid lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)] min-h-0 overflow-hidden">
        {/* Left Control Column (7 cols on desktop, scrollable bottom panel on mobile) */}
        <div className="order-2 lg:order-1 flex-1 lg:col-span-7 lg:h-full flex flex-col min-h-0 border-r border-slate-800/80 bg-slate-950/95 overflow-y-auto custom-scroll p-3 sm:p-5 space-y-3.5 sm:space-y-4">
          {activeModeTab === 'collection' ? (
            <>
              {/* Board Selection Mode Bar (Manual / Random / Custom) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Sistem Pemilihan Papan Saat Mulai Game
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Pilih cara penentuan papan saat memulai pertandingan baru.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRandomPick}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Acak Papan Sekarang
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'manual',
                        title: 'MANUAL MODE',
                        desc: 'Gunakan papan yang dipilih',
                      },
                      {
                        id: 'random',
                        title: 'RANDOM MODE',
                        desc: 'Acak otomatis tanpa ulang',
                      },
                      {
                        id: 'custom',
                        title: 'CUSTOM MODE',
                        desc: 'Prioritaskan papan kustom',
                      },
                    ] as Array<{ id: BoardSelectionMode; title: string; desc: string }>
                  ).map((m) => {
                    const active = collection.selectionMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleModeSwitch(m.id)}
                        className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                          active
                            ? 'border-emerald-400/70 bg-emerald-950/40 text-white shadow-md'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-300">{m.title}</span>
                          {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dedicated Locked Boards Showcase: Mission-Locked & Premium Exclusive */}
              {lockedSpotlightBoards.length > 0 && (
                <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Sorotan Papan Terkunci · Misi &amp; Eksklusif Premium</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Selesaikan misi pencapaian atau gunakan Koin Aether untuk membuka{' '}
                        <span className="font-mono-num text-slate-200 font-semibold">
                          {lockedSpotlightBoards.length}
                        </span>{' '}
                        papan legendaris. Klik kartu untuk panduan buka &amp; pratinjau 3D.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTopUpChat(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/45 px-3 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-900/55 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Chat Admin Beli Koin</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {lockedSpotlightBoards.map((board) => {
                      const status = getBoardUnlockStatus(board.id, profile);
                      const isMission = status.rule.unlockType === 'mission';
                      const isSelectedPreview = previewBoard.id === board.id;

                      return (
                        <button
                          key={`locked_spot_${board.id}`}
                          type="button"
                          onClick={() => handleLockedBoardAttempt(board)}
                          className={`group text-left rounded-xl border p-3 transition-all cursor-pointer flex items-center gap-3 ${
                            status.canClaimMission
                              ? 'border-emerald-400/70 bg-emerald-950/25 hover:bg-emerald-950/40'
                              : isSelectedPreview
                                ? 'border-amber-400/65 bg-slate-950/90'
                                : 'border-slate-800 bg-slate-950/70 hover:border-amber-500/45 hover:bg-slate-900/90'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                              status.canClaimMission
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                                : isMission
                                  ? 'border-sky-500/40 bg-sky-950/60 text-sky-300'
                                  : 'border-amber-500/45 bg-amber-950/60 text-amber-300'
                            }`}
                          >
                            {status.canClaimMission ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 shrink-0">
                                {board.previewSwatches.slice(0, 3).map((hex, idx) => (
                                  <span
                                    key={`spot_sw_${board.id}_${idx}`}
                                    className="w-2 h-2 rounded-full border border-white/20"
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </span>
                              <span className="font-display text-xs sm:text-sm font-bold text-white truncate">
                                {board.name}
                              </span>
                            </div>

                            {isMission && status.rule.mission ? (
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <span
                                    className={`truncate font-semibold ${
                                      status.canClaimMission ? 'text-emerald-300' : 'text-sky-300'
                                    }`}
                                  >
                                    {status.canClaimMission
                                      ? 'Misi Selesai · Klik untuk Klaim!'
                                      : `Misi · ${status.rule.mission.title}`}
                                  </span>
                                  <span className="font-mono-num text-[10px] text-slate-300 shrink-0">
                                    {status.progressPct}%
                                  </span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      status.canClaimMission ? 'bg-emerald-400' : 'bg-sky-400'
                                    }`}
                                    style={{ width: `${status.progressPct}%` }}
                                  />
                                </div>
                              </div>
                            ) : status.rule.premium ? (
                              <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 text-amber-300 font-semibold truncate">
                                  <Crown className="w-3 h-3 shrink-0" />
                                  <span>{status.rule.premium.tierLabel}</span>
                                </span>
                                <span className="font-mono-num font-bold text-amber-200 shrink-0">
                                  {status.rule.premium.priceCoins.toLocaleString('id-ID')} Koin
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <Info className="w-4 h-4 text-slate-500 group-hover:text-amber-300 transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Category Filter Tabs + Create New & Coin Chat Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                  {(
                    [
                      { id: 'all', label: `Semua (${allBoards.length})`, activeCls: 'bg-slate-800 text-amber-300 border border-amber-500/30' },
                      {
                        id: 'unlocked',
                        label: `Terbuka (${allBoards.filter((b) => isBoardUnlocked(b.id, profile)).length})`,
                        activeCls: 'bg-slate-800 text-emerald-300 border border-emerald-500/30',
                      },
                      {
                        id: 'mission',
                        label:
                          claimableMissionBoards.length > 0
                            ? `Misi (5 · ${claimableMissionBoards.length} Klaim)`
                            : 'Misi (5)',
                        activeCls: 'bg-slate-800 text-sky-300 border border-sky-500/30',
                      },
                      {
                        id: 'premium',
                        label: 'Premium (5)',
                        activeCls: 'bg-slate-800 text-fuchsia-300 border border-fuchsia-500/30',
                      },
                      {
                        id: 'custom',
                        label: `Kustom (${collection.customBoards.length})`,
                        activeCls: 'bg-slate-800 text-emerald-300 border border-emerald-500/30',
                      },
                      {
                        id: 'favorite',
                        label: `Favorit (${collection.favoriteBoardIds.length})`,
                        activeCls: 'bg-slate-800 text-rose-300 border border-rose-500/30',
                      },
                    ] as Array<{ id: CollectionCategory; label: string; activeCls: string }>
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCategory(tab.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        category === tab.id ? tab.activeCls : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenTopUpChat(null)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-900/50 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Beli Koin (Chat Admin)</span>
                    {unreadAdminReplies > 0 && (
                      <span className="font-mono-num text-[10px] font-bold text-emerald-300">
                        ({unreadAdminReplies})
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = createTemplateFromTheme('enchanted_forest', 'Papan Fantasi Baru');
                      setDraftBoard(fresh);
                      setHasUnsavedDraft(true);
                      setActiveModeTab('creator');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buat Papan
                  </button>
                </div>
              </div>

              {/* Board Cards Grid */}
              {filteredBoards.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-300">
                    {category === 'custom'
                      ? 'Belum ada Papan Kustom yang disimpan.'
                      : 'Belum ada papan di kategori ini.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Gunakan 3D Creator atau duplikat papan yang sudah terbuka untuk merancang dunia 3D milikmu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModeTab('creator')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Buka 3D Board Creator
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBoards.map((board) => {
                    const unlockStatus = getBoardUnlockStatus(board.id, profile);
                    const isUnlocked = unlockStatus.unlocked;
                    const isSelected = isUnlocked && collection.selectedBoardId === board.id;
                    const isDefault = isUnlocked && collection.defaultBoardId === board.id;
                    const isFav = collection.favoriteBoardIds.includes(board.id);
                    const isPreviewing = previewBoard.id === board.id;
                    const rarityMeta = RARITY_LABEL[unlockStatus.rule.rarity] ?? RARITY_LABEL.starter;

                    return (
                      <div
                        key={board.id}
                        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-400/70 bg-slate-900/95 shadow-lg shadow-amber-500/5'
                            : unlockStatus.canClaimMission
                              ? 'border-emerald-400/70 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                              : isPreviewing
                                ? 'border-cyan-400/60 bg-slate-900/85'
                                : !isUnlocked
                                  ? 'border-slate-800/90 bg-slate-900/50 hover:border-slate-700'
                                  : 'border-slate-800 bg-slate-900/65 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Swatch Banner & Clean Status Header */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {board.previewSwatches.map((hex, sIdx) => (
                                <span
                                  key={`${board.id}_sw_${sIdx}`}
                                  className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                              <span className={`text-[10px] font-bold uppercase tracking-wider ml-1 truncate ${rarityMeta.colorClass}`}>
                                {board.isCustom
                                  ? 'Kustom'
                                  : unlockStatus.rule.unlockType === 'free'
                                    ? 'Starter Gratis'
                                    : unlockStatus.rule.unlockType === 'mission'
                                      ? `Misi · ${rarityMeta.text}`
                                      : `Premium · ${rarityMeta.text}`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isDefault && (
                                <span className="text-[10px] font-bold text-amber-300">Default</span>
                              )}
                              {!isUnlocked && (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleFavorite(board.id)}
                                title="Favoritkan Papan"
                                className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                                  isFav
                                    ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                                    : 'border-slate-800 bg-slate-950/60 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Title or Inline Rename */}
                          {renamingId === board.id ? (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="flex-1 rounded-lg border border-amber-400/60 bg-slate-950 px-2.5 py-1 text-xs font-bold text-white focus:outline-none"
                                maxLength={36}
                              />
                              <button
                                type="button"
                                onClick={() => handleCommitRename(board.id)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white cursor-pointer"
                              >
                                Simpan
                              </button>
                            </div>
                          ) : (
                            <h3 className="font-display text-base font-bold text-white truncate">
                              {board.name}
                            </h3>
                          )}

                          <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                            {board.subtitle} — {board.description}
                          </p>

                          {/* Mission Progress Panel OR Premium Unlock Panel OR Route Summary */}
                          {!isUnlocked && unlockStatus.rule.unlockType === 'mission' && unlockStatus.rule.mission ? (
                            <div className="mt-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5 space-y-1.5">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 font-bold text-sky-300 truncate">
                                  <Target className="w-3.5 h-3.5 shrink-0" />
                                  {unlockStatus.rule.mission.title}
                                </span>
                                <span className="font-mono-num font-bold text-amber-300 shrink-0">
                                  +{unlockStatus.rule.mission.rewardCoins} Koin
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {unlockStatus.rule.mission.description}
                              </p>
                              <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
                                <span>
                                  Progres: {Math.min(unlockStatus.currentProgress, unlockStatus.targetProgress).toLocaleString('id-ID')} /{' '}
                                  {unlockStatus.targetProgress.toLocaleString('id-ID')} {unlockStatus.rule.mission.metricUnit}
                                  {unlockStatus.rule.mission.altLabel && unlockStatus.altTargetProgress !== undefined
                                    ? ` · atau ${Math.min(unlockStatus.altCurrentProgress ?? 0, unlockStatus.altTargetProgress)}/${unlockStatus.altTargetProgress} Online`
                                    : ''}
                                </span>
                                <span className={unlockStatus.canClaimMission ? 'text-emerald-300 font-bold' : 'text-slate-300'}>
                                  {unlockStatus.progressPct}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    unlockStatus.canClaimMission ? 'bg-emerald-400' : 'bg-sky-400'
                                  }`}
                                  style={{ width: `${unlockStatus.progressPct}%` }}
                                />
                              </div>
                            </div>
                          ) : !isUnlocked && unlockStatus.rule.unlockType === 'premium' && unlockStatus.rule.premium ? (
                            <div className="mt-2.5 rounded-xl border border-amber-500/25 bg-slate-950/80 p-2.5 space-y-1">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                                  <Crown className="w-3.5 h-3.5 shrink-0" />
                                  {unlockStatus.rule.premium.tierLabel}
                                </span>
                                <span className="font-mono-num font-bold text-amber-200">
                                  {unlockStatus.rule.premium.priceCoins.toLocaleString('id-ID')} Koin · {unlockStatus.rule.premium.priceIdr}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 leading-snug">
                                {unlockStatus.rule.premium.perks}
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono-num text-slate-400">
                              <span className="text-amber-300/90">
                                ↑ {board.ladders.length} Tangga ({board.ladders.slice(0, 2).map((l) => `${l.from}→${l.to}`).join(', ')})
                              </span>
                              <span className="text-emerald-300/90">
                                ↓ {board.snakes.length} Ular ({board.snakes.slice(0, 2).map((s) => `${s.from}→${s.to}`).join(', ')})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2">
                          {!isUnlocked ? (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick();
                                  setPreviewBoard(cloneBoardConfig(board));
                                  if (mobilePreviewSize === 'hidden') {
                                    setMobilePreviewSize('compact');
                                  }
                                }}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 cursor-pointer whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                3D Preview
                              </button>

                              {unlockStatus.rule.unlockType === 'mission' ? (
                                unlockStatus.canClaimMission ? (
                                  <button
                                    type="button"
                                    onClick={() => handleClaimMissionBoard(board)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer whitespace-nowrap shadow"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    Klaim & Buka
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleLockedBoardAttempt(board)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-sky-400/50 hover:text-white cursor-pointer whitespace-nowrap"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-sky-400" />
                                    Cara Buka ({unlockStatus.progressPct}%)
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleLockedBoardAttempt(board)}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer whitespace-nowrap shadow"
                                >
                                  <Coins className="w-3.5 h-3.5" />
                                  Buka ({unlockStatus.rule.premium?.priceCoins.toLocaleString('id-ID')})
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-3 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSelectBoard(board)}
                                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                                  }`}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  {isSelected ? 'Terpilih' : 'Pilih'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewBoard(cloneBoardConfig(board));
                                    if (mobilePreviewSize === 'hidden') {
                                      setMobilePreviewSize('compact');
                                    }
                                  }}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 cursor-pointer whitespace-nowrap"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePlayBoard(board)}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer whitespace-nowrap"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  Main
                                </button>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCreatorWithBoard(board, !board.isCustom)}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  {board.isCustom ? 'Edit' : 'Kustomisasi'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicate(board)}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-cyan-300 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  Duplikat
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetDefault(board)}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                                >
                                  <Crown className="w-3 h-3" />
                                  Set Default
                                </button>
                                {board.isCustom && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartRename(board)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustom(board)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Hapus
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ==================== CUSTOM BOARD CREATOR ==================== */
            <div className="space-y-4">
              {/* Creator Header Bar */}
              <div className="rounded-2xl border border-amber-500/35 bg-slate-900/90 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    Custom Board Creator · Live 3D Editor
                  </span>
                  <h2 className="font-display text-lg font-bold text-white">
                    {draftBoard.name || 'Papan Fantasi Kustom'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRandomizeJumps('both')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/50 px-3 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Acak Posisi Ular & Tangga
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyBaseThemeToDraft(draftBoard.themeId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset ke Tema
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomBoard}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan ke My Boards
                  </button>
                </div>
              </div>

              {/* 6 Customization Category Tabs (A - F) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { id: 'board', label: 'A. Papan' },
                    { id: 'tile', label: 'B. Tile' },
                    { id: 'snake', label: 'C. Ular' },
                    { id: 'ladder', label: 'D. Tangga' },
                    { id: 'environment', label: 'E. Dunia' },
                    { id: 'vfx', label: 'F. Efek VFX' },
                  ] as Array<{ id: CreatorSection; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCreatorSection(tab.id)}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      creatorSection === tab.id
                        ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
                        : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Section A: BOARD SETTINGS */}
              {creatorSection === 'board' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    A. Pengaturan Papan Utama (Board Settings)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nama Papan Permainan
                      </label>
                      <input
                        type="text"
                        value={draftBoard.name}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({ ...prev, name: e.target.value }))
                        }
                        maxLength={36}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tema Dasar Dunia (12 Tema)
                      </label>
                      <select
                        value={draftBoard.themeId}
                        onChange={(e) =>
                          handleApplyBaseThemeToDraft(e.target.value as BoardThemeId)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                      >
                        {(Object.keys(BOARD_THEME_LABELS) as BoardThemeId[]).map((tId) => {
                          const unlockedTheme = isThemeUnlocked(tId, profile);
                          return (
                            <option key={tId} value={tId} disabled={!unlockedTheme}>
                              {BOARD_THEME_LABELS[tId]}
                              {unlockedTheme ? '' : ' (Terkunci)'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Bentuk Plinth Papan
                      </label>
                      <select
                        value={draftBoard.boardSettings.shape}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            boardSettings: {
                              ...prev.boardSettings,
                              shape: e.target.value as BoardConfig['boardSettings']['shape'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="classic_square">Classic Square Sanctuary</option>
                        <option value="octagon_bastion">Octagon Royal Bastion</option>
                        <option value="citadel_terrace">Citadel Stepped Terrace</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Material Permukaan Papan
                      </label>
                      <select
                        value={draftBoard.boardSettings.material}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            boardSettings: {
                              ...prev.boardSettings,
                              material: e.target.value as BoardConfig['boardSettings']['material'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="matte">Matte Ancient Stone</option>
                        <option value="satin">Satin Carved Masonry</option>
                        <option value="glossy">Glossy Polished Crystal/Marble</option>
                        <option value="metallic">Metallic Forged Alloy</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ukuran Bingkai Papan ({draftBoard.boardSettings.sizeScale.toFixed(2)}x)
                      </label>
                      <input
                        type="range"
                        min={0.9}
                        max={1.12}
                        step={0.02}
                        value={draftBoard.boardSettings.sizeScale}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            boardSettings: {
                              ...prev.boardSettings,
                              sizeScale: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Utama Papan
                        </label>
                        <input
                          type="color"
                          value={draftBoard.boardSettings.primaryColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              boardSettings: {
                                ...prev.boardSettings,
                                primaryColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Sekunder (Trim)
                        </label>
                        <input
                          type="color"
                          value={draftBoard.boardSettings.secondaryColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              boardSettings: {
                                ...prev.boardSettings,
                                secondaryColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section B: TILE CUSTOMIZATION */}
              {creatorSection === 'tile' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-amber-300">
                    B. Kustomisasi Petak / Tile (Tile Customization)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Bentuk 3D Tile
                      </label>
                      <select
                        value={draftBoard.tileConfig.shape}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            tileConfig: {
                              ...prev.tileConfig,
                              shape: e.target.value as BoardConfig['tileConfig']['shape'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="beveled_square">Beveled Chiseled Square</option>
                        <option value="rounded_tablet">Rounded Ancient Tablet</option>
                        <option value="octagon_cut">Octagon Gem-Cut Slab</option>
                        <option value="crystal_facet">Deep Crystal Facet</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tekstur & Motif Tile
                      </label>
                      <select
                        value={draftBoard.tileConfig.textureStyle}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            tileConfig: {
                              ...prev.tileConfig,
                              textureStyle:
                                e.target.value as BoardConfig['tileConfig']['textureStyle'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="mossy_stone">Mossy Forest Stone</option>
                        <option value="basalt_lava">Volcanic Basalt & Lava Cracks</option>
                        <option value="frosted_ice">Frosted Glacier Crystal</option>
                        <option value="sandstone_carved">Carved Golden Sandstone</option>
                        <option value="coral_mosaic">Atlantis Coral Mosaic</option>
                        <option value="obsidian_runes">Shadow Obsidian Runes</option>
                        <option value="celestial_marble">Celestial Astral Marble</option>
                        <option value="temple_gold_inlay">Ancient Temple Gold Inlay</option>
                        <option value="sakura_lacquer">Sakura Shogunate Lacquer</option>
                        <option value="brass_clockwork">Clockwork Aether Brass</option>
                        <option value="imperial_jade">Imperial Dragon Jade</option>
                        <option value="nebula_crystal">Cosmic Nebula Star-Crystal</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Tile Ganjil
                        </label>
                        <input
                          type="color"
                          value={draftBoard.tileConfig.primaryColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              tileConfig: {
                                ...prev.tileConfig,
                                primaryColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Tile Genap
                        </label>
                        <input
                          type="color"
                          value={draftBoard.tileConfig.alternateColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              tileConfig: {
                                ...prev.tileConfig,
                                alternateColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Material Permukaan Tile
                      </label>
                      <select
                        value={draftBoard.tileConfig.material}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            tileConfig: {
                              ...prev.tileConfig,
                              material: e.target.value as BoardConfig['tileConfig']['material'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="matte">Matte Stone</option>
                        <option value="satin">Satin Carved</option>
                        <option value="glossy">Glossy Crystal</option>
                        <option value="metallic">Metallic Gold-Veined</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Desain Angka Tile (1–100)
                      </label>
                      <select
                        value={draftBoard.tileConfig.numeralStyle}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            tileConfig: {
                              ...prev.tileConfig,
                              numeralStyle:
                                e.target.value as BoardConfig['tileConfig']['numeralStyle'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="mono_bold">Tactical Bold Mono</option>
                        <option value="cinzel_royal">Cinzel Royal Serif</option>
                        <option value="serif_antique">Antique Carved Serif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Efek Visual pada Tile
                      </label>
                      <select
                        value={draftBoard.tileConfig.visualEffect}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            tileConfig: {
                              ...prev.tileConfig,
                              visualEffect:
                                e.target.value as BoardConfig['tileConfig']['visualEffect'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="none">Tanpa Glow</option>
                        <option value="subtle_rune_glow">Subtle Rune Glow</option>
                        <option value="corner_sparks">Corner Ember Sparks</option>
                        <option value="edge_pulse">Arcane Edge Pulse</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Section C: SNAKE CUSTOMIZATION */}
              {creatorSection === 'snake' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-amber-300">
                    C. Kustomisasi Ular / Naga (Snake Customization)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Model Kepala Ular / Naga
                      </label>
                      <select
                        value={draftBoard.snakeConfig.headModel}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            snakeConfig: {
                              ...prev.snakeConfig,
                              headModel: e.target.value as BoardConfig['snakeConfig']['headModel'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="oriental_dragon">Oriental Sovereign Dragon</option>
                        <option value="horned_viper">Horned Fang Viper</option>
                        <option value="crowned_cobra">Royal Hooded Cobra</option>
                        <option value="abyssal_wyrm">Abyssal Finned Wyrm</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pola Tekstur Sisik PBR
                      </label>
                      <select
                        value={draftBoard.snakeConfig.scalePattern}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            snakeConfig: {
                              ...prev.snakeConfig,
                              scalePattern:
                                e.target.value as BoardConfig['snakeConfig']['scalePattern'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="diamond_keel">Diamond Keeled Scales</option>
                        <option value="royal_hex">Royal Hexagonal Scales</option>
                        <option value="draconic_plate">Draconic Heavy Armor Plates</option>
                        <option value="frost_shard">Crystalline Frost Shards</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Kulit Utama
                        </label>
                        <input
                          type="color"
                          value={draftBoard.snakeConfig.primaryColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              snakeConfig: {
                                ...prev.snakeConfig,
                                primaryColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Belang / Corak
                        </label>
                        <input
                          type="color"
                          value={draftBoard.snakeConfig.stripeColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              snakeConfig: {
                                ...prev.snakeConfig,
                                stripeColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Perut (Belly)
                        </label>
                        <input
                          type="color"
                          value={draftBoard.snakeConfig.bellyColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              snakeConfig: {
                                ...prev.snakeConfig,
                                bellyColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Tanduk & Duri
                        </label>
                        <input
                          type="color"
                          value={draftBoard.snakeConfig.hornColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              snakeConfig: {
                                ...prev.snakeConfig,
                                hornColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ukuran Tubuh Ular ({draftBoard.snakeConfig.sizeScale.toFixed(2)}x)
                      </label>
                      <input
                        type="range"
                        min={0.8}
                        max={1.28}
                        step={0.04}
                        value={draftBoard.snakeConfig.sizeScale}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            snakeConfig: {
                              ...prev.snakeConfig,
                              sizeScale: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Material Permukaan Ular
                      </label>
                      <select
                        value={draftBoard.snakeConfig.materialFinish}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            snakeConfig: {
                              ...prev.snakeConfig,
                              materialFinish:
                                e.target.value as BoardConfig['snakeConfig']['materialFinish'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="glossy_scales">Glossy Wet Scales</option>
                        <option value="matte_reptile">Matte Desert Reptile</option>
                        <option value="metallic_drake">Metallic Armored Drake</option>
                        <option value="crystalline">Translucent Crystalline</option>
                      </select>
                    </div>
                  </div>

                  {/* Interactive Snake Board Coordinates Editor */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                          Atur Posisi Ular di Papan ({draftBoard.snakes.length} Ular)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Tentukan petak Kepala Ular (awal gigitan) dan petak Ekor (tempat pion turun).
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRandomizeJumps('snakes')}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
                        >
                          <Shuffle className="w-3 h-3" />
                          Acak Posisi Ular
                        </button>
                        <button
                          type="button"
                          onClick={handleAddSnake}
                          disabled={draftBoard.snakes.length >= 20}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Ular
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                      {draftBoard.snakes.map((snake, idx) => (
                        <div
                          key={snake.id}
                          className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5"
                        >
                          <div className="flex items-center gap-2 sm:col-span-6">
                            <span className="text-[11px] font-bold text-emerald-400 shrink-0 w-6">
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] text-slate-400">Nama Ular</label>
                              <input
                                type="text"
                                value={snake.name}
                                onChange={(e) => handleUpdateSnake(idx, 'name', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSnake(idx)}
                              disabled={draftBoard.snakes.length <= 2}
                              title="Hapus Ular"
                              className="sm:hidden p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 disabled:opacity-30 cursor-pointer shrink-0 mt-3"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:col-span-5">
                            <div>
                              <label className="block text-[10px] text-rose-300 font-semibold truncate">
                                Kepala (Dari)
                              </label>
                              <input
                                type="number"
                                min={12}
                                max={99}
                                value={snake.from}
                                onChange={(e) => handleUpdateSnake(idx, 'from', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-300"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-emerald-300 font-semibold truncate">
                                Ekor (Turun ke)
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={Math.max(2, snake.from - 5)}
                                value={snake.to}
                                onChange={(e) => handleUpdateSnake(idx, 'to', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-emerald-300"
                              />
                            </div>
                          </div>

                          <div className="hidden sm:flex sm:col-span-1 justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveSnake(idx)}
                              disabled={draftBoard.snakes.length <= 2}
                              title="Hapus Ular"
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section D: LADDER CUSTOMIZATION */}
              {creatorSection === 'ladder' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-amber-300">
                    D. Kustomisasi Tangga (Ladder Customization)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Material Tangga
                      </label>
                      <select
                        value={draftBoard.ladderConfig.materialStyle}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            ladderConfig: {
                              ...prev.ladderConfig,
                              materialStyle:
                                e.target.value as BoardConfig['ladderConfig']['materialStyle'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="ancient_oak">Ancient Hewn Oak Timber</option>
                        <option value="obsidian_iron">Volcanic Obsidian & Iron</option>
                        <option value="glacier_crystal">Glacier Ice Crystal</option>
                        <option value="sandstone_gold">Carved Sandstone & Gold</option>
                        <option value="coral_pearl">Atlantis Coral & Pearl</option>
                        <option value="shadow_wrought">Shadow Wrought Darkmetal</option>
                        <option value="celestial_marble">Celestial White Marble</option>
                        <option value="temple_bronze">Ancient Temple Bronze</option>
                        <option value="lacquer_gold">Vermilion Lacquer & Gold</option>
                        <option value="gilded_brass">Gilded Clockwork Brass</option>
                        <option value="imperial_jade_stone">Carved Imperial Jade</option>
                        <option value="astral_prism">Astral Nebula Prism</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Model Arsitektur Tangga
                      </label>
                      <select
                        value={draftBoard.ladderConfig.modelStyle}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            ladderConfig: {
                              ...prev.ladderConfig,
                              modelStyle:
                                e.target.value as BoardConfig['ladderConfig']['modelStyle'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="arch_bridge">Arched Sanctuary Bridge</option>
                        <option value="royal_steps">Low-Profile Royal Steps</option>
                        <option value="crystal_spire">High-Arc Crystal Spire</option>
                        <option value="chain_link">Heavy Forged Chain Bridge</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Tiang & Anak Tangga
                        </label>
                        <input
                          type="color"
                          value={draftBoard.ladderConfig.primaryColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              ladderConfig: {
                                ...prev.ladderConfig,
                                primaryColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Warna Ornamen / Soket
                        </label>
                        <input
                          type="color"
                          value={draftBoard.ladderConfig.accentColor}
                          onChange={(e) =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              ladderConfig: {
                                ...prev.ladderConfig,
                                accentColor: e.target.value,
                              },
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 p-1 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ukuran Lebar Tangga ({draftBoard.ladderConfig.widthScale.toFixed(2)}x)
                      </label>
                      <input
                        type="range"
                        min={0.8}
                        max={1.3}
                        step={0.04}
                        value={draftBoard.ladderConfig.widthScale}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            ladderConfig: {
                              ...prev.ladderConfig,
                              widthScale: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  {/* Interactive Ladder Board Coordinates Editor */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                          Atur Posisi Tangga di Papan ({draftBoard.ladders.length} Tangga)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Tentukan petak Kaki Tangga (awal naik) dan petak Puncak Tangga (tujuan naik).
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRandomizeJumps('ladders')}
                          className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
                        >
                          <Shuffle className="w-3 h-3" />
                          Acak Posisi Tangga
                        </button>
                        <button
                          type="button"
                          onClick={handleAddLadder}
                          disabled={draftBoard.ladders.length >= 20}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/50 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-900/60 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Tangga
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                      {draftBoard.ladders.map((ladder, idx) => (
                        <div
                          key={ladder.id}
                          className="flex flex-col sm:grid sm:grid-cols-12 sm:items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5"
                        >
                          <div className="flex items-center gap-2 sm:col-span-6">
                            <span className="text-[11px] font-bold text-amber-400 shrink-0 w-6">
                              #{idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <label className="block text-[10px] text-slate-400">Nama Tangga</label>
                              <input
                                type="text"
                                value={ladder.name}
                                onChange={(e) => handleUpdateLadder(idx, 'name', e.target.value)}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveLadder(idx)}
                              disabled={draftBoard.ladders.length <= 2}
                              title="Hapus Tangga"
                              className="sm:hidden p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 disabled:opacity-30 cursor-pointer shrink-0 mt-3"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:col-span-5">
                            <div>
                              <label className="block text-[10px] text-amber-300 font-semibold truncate">
                                Bawah (Dari)
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={94}
                                value={ladder.from}
                                onChange={(e) => handleUpdateLadder(idx, 'from', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-300"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-emerald-300 font-semibold truncate">
                                Atas (Naik ke)
                              </label>
                              <input
                                type="number"
                                min={Math.min(99, ladder.from + 4)}
                                max={99}
                                value={ladder.to}
                                onChange={(e) => handleUpdateLadder(idx, 'to', Number(e.target.value))}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-emerald-300"
                              />
                            </div>
                          </div>

                          <div className="hidden sm:flex sm:col-span-1 justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveLadder(idx)}
                              disabled={draftBoard.ladders.length <= 2}
                              title="Hapus Tangga"
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section E: ENVIRONMENT CUSTOMIZATION */}
              {creatorSection === 'environment' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-amber-300">
                      E. Kustomisasi Lingkungan 3D & Langit (Sky & Environment)
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              skyPreset: 'radiant_day',
                              lightingPreset: 'emerald_canopy',
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                          draftBoard.environmentConfig.skyPreset === 'radiant_day' ||
                          draftBoard.environmentConfig.skyPreset === 'twilight_forest' ||
                          draftBoard.environmentConfig.skyPreset === 'aurora_frost' ||
                          draftBoard.environmentConfig.skyPreset === 'golden_mirage' ||
                          draftBoard.environmentConfig.skyPreset === 'astral_dawn'
                            ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-300" />
                        Siang
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              skyPreset: 'temple_sunset',
                              lightingPreset: 'torchlit_sanctum',
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                          draftBoard.environmentConfig.skyPreset === 'temple_sunset' ||
                          draftBoard.environmentConfig.skyPreset === 'sakura_dusk' ||
                          draftBoard.environmentConfig.skyPreset === 'aether_twilight'
                            ? 'border-orange-400/70 bg-orange-500/20 text-orange-200'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Sunset className="w-3.5 h-3.5 text-orange-300" />
                        Senja
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              skyPreset: 'starlit_night',
                              lightingPreset: 'shadow_moon',
                            },
                          }))
                        }
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                          draftBoard.environmentConfig.skyPreset === 'starlit_night' ||
                          draftBoard.environmentConfig.skyPreset === 'eclipse_void' ||
                          draftBoard.environmentConfig.skyPreset === 'volcanic_ash' ||
                          draftBoard.environmentConfig.skyPreset === 'abyssal_sea' ||
                          draftBoard.environmentConfig.skyPreset === 'jade_mist' ||
                          draftBoard.environmentConfig.skyPreset === 'cosmic_nebula_sky'
                            ? 'border-indigo-400/70 bg-indigo-500/20 text-indigo-200'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:text-white'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-300" />
                        Malam
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Background / Langit (Sky Dome)
                      </label>
                      <select
                        value={draftBoard.environmentConfig.skyPreset}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              skyPreset:
                                e.target.value as BoardConfig['environmentConfig']['skyPreset'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="twilight_forest">Siang Cerah · Lembah Zamrud (Matahari, Awan, Pelangi)</option>
                        <option value="radiant_day">Siang Cerah · Cakrawala Biru (Matahari, Awan, Burung)</option>
                        <option value="aurora_frost">Siang Kutub · Kerajaan Es (Matahari & Awan Salju)</option>
                        <option value="golden_mirage">Siang Terik · Gurun Emas (Matahari & Awan Pasir)</option>
                        <option value="astral_dawn">Siang Surgawi · Langit Astral (Matahari & Pelangi)</option>
                        <option value="temple_sunset">Senja Keemasan · Kuil Kuno (Matahari Terbenam)</option>
                        <option value="sakura_dusk">Senja Sakura · Shogunate (Langit Merah Muda & Lentera)</option>
                        <option value="aether_twilight">Senja Kuningan · Clockwork Aether (Langit Tembaga)</option>
                        <option value="jade_mist">Malam Kabut Giok · Istana Naga (Bulan Zamrud)</option>
                        <option value="cosmic_nebula_sky">Malam Galaksi · Cosmic Nebula (Aurora & Bintang Jatuh)</option>
                        <option value="eclipse_void">Malam Berbintang · Gerhana (Bulan & Bintang Jatuh)</option>
                        <option value="volcanic_ash">Malam Vulkanik · Kaldera (Bulan Merah & Meteor)</option>
                        <option value="abyssal_sea">Malam Samudra · Atlantis (Bulan, Aurora & Bintang Jatuh)</option>
                        <option value="starlit_night">Malam Berbintang · Galaksi (Bulan, Bintang & Bintang Jatuh)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Dekorasi Monumen Sekeliling Papan
                      </label>
                      <select
                        value={draftBoard.environmentConfig.decorations}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              decorations:
                                e.target.value as BoardConfig['environmentConfig']['decorations'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="runic_obelisks">Runic Sanctuary Obelisks</option>
                        <option value="volcano_braziers">Volcano Magma Braziers</option>
                        <option value="ice_crystals">Towering Ice Crystals</option>
                        <option value="desert_pyramids">Ancient Pyramids & Obelisks</option>
                        <option value="atlantis_pillars">Atlantis Marble Pillars</option>
                        <option value="shadow_monoliths">Shadow Obsidian Monoliths</option>
                        <option value="floating_islands">Floating Sky Islands</option>
                        <option value="temple_columns">Carved Temple Columns</option>
                        <option value="sakura_torii">Vermilion Torii Shrines</option>
                        <option value="clockwork_gears">Giant Brass Clockwork Gears</option>
                        <option value="jade_pagodas">Imperial Jade Pagodas</option>
                        <option value="nebula_rings">Orbiting Astrolabe Rings</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Pencahayaan / Lighting Atmosfer
                      </label>
                      <select
                        value={draftBoard.environmentConfig.lightingPreset}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              lightingPreset:
                                e.target.value as BoardConfig['environmentConfig']['lightingPreset'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="emerald_canopy">Emerald Forest Canopy</option>
                        <option value="magma_glow">Crimson Magma Glow</option>
                        <option value="arctic_noon">Crystal Arctic Light</option>
                        <option value="desert_sun">Warm Golden Desert Sun</option>
                        <option value="bioluminescent">Bioluminescent Deep Sea</option>
                        <option value="shadow_moon">Violet Shadow Moon</option>
                        <option value="divine_radiance">Divine Celestial Radiance</option>
                        <option value="torchlit_sanctum">Torchlit Temple Sanctum</option>
                        <option value="blossom_lantern">Sakura Blossom Lantern</option>
                        <option value="brass_atelier">Golden Brass Atelier</option>
                        <option value="jade_sanctuary">Imperial Jade Sanctuary</option>
                        <option value="nebula_aurora">Cosmic Nebula Aurora</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ketebalan Kabut / Fog ({Math.round(draftBoard.environmentConfig.fogIntensity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={draftBoard.environmentConfig.fogIntensity}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            environmentConfig: {
                              ...prev.environmentConfig,
                              fogIntensity: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  {/* Environment Object Toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {(
                      [
                        { key: 'showTrees', label: 'Pepohonan & Rumput' },
                        { key: 'showRocks', label: 'Bebatuan & Tebing' },
                        { key: 'showCastle', label: 'Kastil Fantasi' },
                        { key: 'showWaterfall', label: 'Air Terjun / Lava' },
                      ] as const
                    ).map((item) => {
                      const checked = draftBoard.environmentConfig[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() =>
                            setDraftBoard((prev) => ({
                              ...prev,
                              environmentConfig: {
                                ...prev.environmentConfig,
                                [item.key]: !prev.environmentConfig[item.key],
                              },
                            }))
                          }
                          className={`rounded-xl border px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer ${
                            checked
                              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                              : 'border-slate-800 bg-slate-950/60 text-slate-500'
                          }`}
                        >
                          <span className="truncate">{item.label}</span>
                          <Check className={`w-3.5 h-3.5 shrink-0 ${checked ? 'opacity-100' : 'opacity-20'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section F: VISUAL EFFECTS */}
              {creatorSection === 'vfx' && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-4 space-y-4">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    F. Efek Visual & Partikel Magis (Visual Effects)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Jenis Partikel Magis (Magical Particles)
                      </label>
                      <select
                        value={draftBoard.visualEffects.particleStyle}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            visualEffects: {
                              ...prev.visualEffects,
                              particleStyle:
                                e.target.value as BoardConfig['visualEffects']['particleStyle'],
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      >
                        <option value="fireflies">Enchanted Forest Fireflies</option>
                        <option value="lava_embers">Rising Volcanic Lava Embers</option>
                        <option value="snowflakes">Crystalline Snowflakes</option>
                        <option value="sand_sparks">Golden Mirage Sand Sparks</option>
                        <option value="sea_bubbles">Luminous Ocean Bubbles</option>
                        <option value="shadow_wisps">Violet Shadow Wisps</option>
                        <option value="starlight">Celestial Starlight Motes</option>
                        <option value="golden_runes">Sacred Temple Golden Spores</option>
                        <option value="sakura_petals">Drifting Sakura Petals</option>
                        <option value="brass_sparks">Clockwork Brass Sparks</option>
                        <option value="jade_lanterns">Floating Jade Lanterns</option>
                        <option value="cosmic_stardust">Cosmic Nebula Stardust</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Kepadatan Partikel ({Math.round(draftBoard.visualEffects.particleDensity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={draftBoard.visualEffects.particleDensity}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            visualEffects: {
                              ...prev.visualEffects,
                              particleDensity: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Intensitas Glow Effect ({Math.round(draftBoard.visualEffects.glowIntensity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={draftBoard.visualEffects.glowIntensity}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            visualEffects: {
                              ...prev.visualEffects,
                              glowIntensity: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Ambient Lighting ({Math.round(draftBoard.visualEffects.ambientIntensity * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0.5}
                        max={1.4}
                        step={0.05}
                        value={draftBoard.visualEffects.ambientIntensity}
                        onChange={(e) =>
                          setDraftBoard((prev) => ({
                            ...prev,
                            visualEffects: {
                              ...prev.visualEffects,
                              ambientIntensity: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-amber-400"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setDraftBoard((prev) => ({
                          ...prev,
                          visualEffects: {
                            ...prev.visualEffects,
                            shadowsEnabled: !prev.visualEffects.shadowsEnabled,
                          },
                        }))
                      }
                      className={`rounded-xl border px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2 cursor-pointer ${
                        draftBoard.visualEffects.shadowsEnabled
                          ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Bayangan 3D Dinamis (Real-Time Shadows):{' '}
                      {draftBoard.visualEffects.shadowsEnabled ? 'AKTIF' : 'NONAKTIF'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Desktop) / Top Docked Bar (Mobile): Live Interactive 3D Preview Viewport */}
        <div
          className={`order-1 lg:order-2 lg:col-span-5 lg:h-full lg:min-h-0 relative flex flex-col shrink-0 border-b lg:border-b-0 border-amber-500/25 bg-slate-950 overflow-hidden transition-all duration-200 ${
            mobilePreviewSize === 'hidden'
              ? 'h-11'
              : mobilePreviewSize === 'expanded'
                ? 'h-[290px] sm:h-[340px]'
                : 'h-[195px] sm:h-[240px]'
          }`}
        >
          <div
            ref={previewContainerRef}
            className={`relative flex-1 w-full h-full min-h-0 overflow-hidden ${
              mobilePreviewSize === 'hidden' ? 'invisible lg:visible' : ''
            }`}
          />

          {/* 3D Studio Loading Overlay while initial scene builds */}
          {!previewReady && !webglLost && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 px-4 text-center">
              <div className="w-9 h-9 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin mb-3" />
              <div className="text-xs font-bold text-amber-300">{buildStage}</div>
              <div className="mt-2 w-44 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-200"
                  style={{ width: `${Math.round(Math.max(10, buildProgress * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* WebGL Context Lost Recovery Overlay */}
          {webglLost && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 px-4 text-center">
              <p className="text-xs font-bold text-rose-300 mb-2">
                Konteks WebGL 3D sempat terputus.
              </p>
              <button
                type="button"
                onClick={() => setEngineMountKey((k) => k + 1)}
                className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                Muat Ulang Pratinjau 3D
              </button>
            </div>
          )}

          {/* Top-Left Live 3D Preview Overlay Badge & Mobile Size Controls */}
          <div className="pointer-events-none absolute top-2 left-2.5 right-2.5 sm:top-3 sm:left-3 sm:right-3 flex items-start justify-between gap-2 z-10">
            <div className="pointer-events-auto rounded-xl border border-amber-500/35 bg-slate-950/88 px-2.5 py-1.5 sm:px-3.5 sm:py-2 max-w-[62%] sm:max-w-none">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate">
                  Live 3D Preview
                </span>
              </div>
              {mobilePreviewSize !== 'hidden' && (
                <>
                  <div className="font-display text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                    {active3DBoard.name}
                  </div>
                  <div className="hidden sm:block text-[11px] text-slate-300 truncate">
                    Tema: {BOARD_THEME_LABELS[active3DBoard.themeId]}
                  </div>
                </>
              )}
            </div>

            <div className="pointer-events-auto flex flex-col items-end gap-1.5">
              {/* Mobile Preview Height Switcher */}
              <div className="inline-flex lg:hidden rounded-lg border border-slate-700/90 bg-slate-950/90 p-0.5">
                {(
                  [
                    { id: 'compact', label: 'Ringkas' },
                    { id: 'expanded', label: 'Luas' },
                    { id: 'hidden', label: 'Tutup' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMobilePreviewSize(opt.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      mobilePreviewSize === opt.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Camera Quick Snap Buttons */}
              <div
                className={`inline-flex rounded-lg border border-slate-700/80 bg-slate-950/85 p-0.5 ${
                  mobilePreviewSize === 'hidden' ? 'hidden lg:inline-flex' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => engineRef.current?.snapCameraOverview('isometric')}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-200 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                >
                  Isometrik
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.snapCameraOverview('topdown')}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-200 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
                >
                  Tampak Atas
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Inspected Tile Chip (when user clicks a tile on 3D board) */}
          {inspectedTile && mobilePreviewSize !== 'hidden' && (
            <div className="pointer-events-auto absolute bottom-3 left-3 z-10 max-w-[85%] rounded-xl border border-amber-500/45 bg-slate-950/92 px-3 py-1.5 text-[11px] shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-amber-300 truncate">{inspectedTile.title}</span>
                <button
                  type="button"
                  onClick={() => {
                    setInspectedTile(null);
                    engineRef.current?.highlightTile(null);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
              <p className="text-[10px] text-slate-300 truncate">{inspectedTile.description}</p>
            </div>
          )}

          {/* Bottom Toast / Quick Info Overlay */}
          {saveToast && (
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex justify-center">
              <div className="rounded-xl border border-emerald-400/50 bg-slate-950/92 px-3.5 py-1.5 text-[11px] sm:text-xs font-bold text-emerald-300 shadow-xl text-center">
                {saveToast}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal 1: Panduan Buka Papan Terkunci (Misi & Premium) */}
      {unlockGuideBoard && (() => {
        const status = getBoardUnlockStatus(unlockGuideBoard.id, profile);
        const isMission = status.rule.unlockType === 'mission' && Boolean(status.rule.mission);
        const isPremium = status.rule.unlockType === 'premium' && Boolean(status.rule.premium);
        const prem = status.rule.premium;
        const mission = status.rule.mission;
        const canAfford = prem ? currentCoins >= prem.priceCoins : false;
        const shortfall = prem ? Math.max(0, prem.priceCoins - currentCoins) : 0;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/82 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-5 shadow-2xl space-y-4">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                      status.canClaimMission
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
                        : isMission
                          ? 'border-sky-400/50 bg-sky-950/60 text-sky-300'
                          : 'border-amber-400/55 bg-amber-950/60 text-amber-300'
                    }`}
                  >
                    {status.canClaimMission ? (
                      <Unlock className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={`text-[11px] font-bold uppercase tracking-widest ${
                        isMission ? 'text-sky-300' : 'text-amber-300'
                      }`}
                    >
                      {isMission
                        ? 'Panduan Buka · Papan Misi Pencapaian'
                        : prem?.tierLabel || 'Panduan Buka · Papan Premium'}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white mt-0.5 truncate">
                      {unlockGuideBoard.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">{unlockGuideBoard.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlockGuideBoard(null)}
                  aria-label="Tutup Panduan"
                  className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Theme Swatches */}
              <div className="flex items-center gap-2">
                {unlockGuideBoard.previewSwatches.map((hex, idx) => (
                  <span
                    key={`guide_sw_${idx}`}
                    className="h-2.5 flex-1 rounded-full border border-white/15"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {unlockGuideBoard.description}
              </p>

              {/* Mission-Locked Guide Body */}
              {isMission && mission && (
                <div className="rounded-xl border border-sky-500/30 bg-slate-950/85 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-sky-300">
                      <Target className="w-4 h-4 shrink-0" />
                      <span>{mission.title}</span>
                    </span>
                    <span className="font-mono-num font-bold text-amber-300 shrink-0">
                      Bonus +{mission.rewardCoins} Koin
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{mission.description}</p>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono-num">
                      <span className="text-slate-300">
                        Progres:{' '}
                        <strong className="text-white">
                          {Math.min(status.currentProgress, status.targetProgress).toLocaleString('id-ID')}
                        </strong>{' '}
                        / {status.targetProgress.toLocaleString('id-ID')} {mission.metricUnit}
                      </span>
                      <span
                        className={
                          status.canClaimMission ? 'text-emerald-300 font-bold' : 'text-sky-300 font-bold'
                        }
                      >
                        {status.progressPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          status.canClaimMission ? 'bg-emerald-400' : 'bg-sky-400'
                        }`}
                        style={{ width: `${status.progressPct}%` }}
                      />
                    </div>
                    {mission.altLabel && status.altTargetProgress !== undefined && (
                      <div className="text-[11px] font-mono-num text-slate-400">
                        Jalur alternatif: {Math.min(status.altCurrentProgress ?? 0, status.altTargetProgress)}/
                        {status.altTargetProgress} {mission.altLabel}
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2">
                    {status.canClaimMission
                      ? 'Target misi telah tercapai! Klik tombol Klaim di bawah untuk membuka papan ini secara permanen dan dapatkan bonus Koin Aether.'
                      : 'Terus bermain di Mode Klasik, Battle, atau Multiplayer Daring untuk menyelesaikan target misi ini.'}
                  </p>
                </div>
              )}

              {/* Premium Guide Body */}
              {isPremium && prem && (
                <div className="rounded-xl border border-amber-500/30 bg-slate-950/85 p-3.5 space-y-2.5 text-xs">
                  <p className="text-slate-200 leading-relaxed">{prem.perks}</p>
                  <div className="space-y-1.5 border-t border-slate-800 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Biaya Buka Papan</span>
                      <span className="font-mono-num font-bold text-amber-300">
                        {prem.priceCoins.toLocaleString('id-ID')} Koin ({prem.priceIdr})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Saldo Koin Aether Kamu</span>
                      <span
                        className={`font-mono-num font-bold ${
                          canAfford ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {currentCoins.toLocaleString('id-ID')} Koin
                      </span>
                    </div>
                  </div>
                  {!canAfford && (
                    <p className="text-[11px] text-amber-200/90 border-t border-slate-800 pt-2 leading-relaxed">
                      Kurang{' '}
                      <strong className="font-mono-num">
                        {shortfall.toLocaleString('id-ID')} Koin
                      </strong>{' '}
                      lagi. Kumpulkan Koin dari pertandingan &amp; klaim misi, atau hubungi Admin resmi melalui fitur Chat Top-Up untuk membeli paket Koin / Royal Pass berbayar.
                    </p>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUnlockGuideBoard(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                >
                  Tutup
                </button>

                {isMission && status.canClaimMission && (
                  <button
                    type="button"
                    onClick={() => handleClaimMissionBoard(unlockGuideBoard)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 cursor-pointer whitespace-nowrap shadow-lg"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Klaim &amp; Buka Papan</span>
                  </button>
                )}

                {isPremium && prem && (
                  canAfford ? (
                    <button
                      type="button"
                      onClick={() => handleConfirmPurchasePremium(unlockGuideBoard)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer whitespace-nowrap shadow-lg"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Sekarang ({prem.priceCoins.toLocaleString('id-ID')} Koin)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenTopUpChat(unlockGuideBoard.name)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer whitespace-nowrap shadow-lg"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Beli Koin via Chat Admin</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 2: Pembelian Koin Aether & Royal Pass Berbayar via Chat Admin */}
      {topUpChatOpen && (
        <TopUpAdminChatModal
          user={user}
          displayName={profile.name}
          currentCoins={currentCoins}
          initialBoardRequestName={topUpBoardContext}
          onOpenAuth={onOpenAuth}
          onClose={() => setTopUpChatOpen(false)}
        />
      )}

      {/* Particle-Based Board Unlocked Celebration Overlay */}
      {celebrationOverlay && (
        <BoardUnlockedOverlay
          board={celebrationOverlay.board}
          unlockSource={celebrationOverlay.unlockSource}
          bonusCoins={celebrationOverlay.bonusCoins}
          onClose={() => setCelebrationOverlay(null)}
        />
      )}
    </div>
  );
};
