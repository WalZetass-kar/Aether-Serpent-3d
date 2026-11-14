import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Edit3,
  Eye,
  Heart,
  Layers,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  BOARD_THEME_LABELS,
  BoardConfig,
  BoardSelectionMode,
  BoardThemeId,
  cloneBoardConfig,
  generateRandomJumpsForTheme,
  getDefaultBoardByTheme,
} from '../../shared/boardThemes';
import {
  BoardCollectionState,
  createTemplateFromTheme,
  deleteCustomBoard,
  duplicateBoard,
  getAllAvailableBoards,
  getBoardById,
  loadBoardCollection,
  renameCustomBoard,
  saveCustomBoard,
  selectBoard,
  setBoardSelectionMode,
  setDefaultBoard,
  toggleFavoriteBoard,
} from '../services/boardStorageService';
import { FantasyBoardEngine } from '../three/FantasyBoardEngine';
import type { DiceSkinId } from '../../shared/gameConfig';
import type { GraphicsPreferences } from '../three/perf/qualityPresets';

interface BoardManagerViewProps {
  initialTab?: 'collection' | 'creator';
  graphicsPrefs: GraphicsPreferences;
  diceSkinId: DiceSkinId;
  onBack: () => void;
  onPlayWithBoard: (board: BoardConfig) => void;
  onBoardSelectionChanged?: (board: BoardConfig, mode: BoardSelectionMode) => void;
}

type CollectionCategory = 'default' | 'custom' | 'favorite';
type CreatorSection = 'board' | 'tile' | 'snake' | 'ladder' | 'environment' | 'vfx';

export const BoardManagerView: React.FC<BoardManagerViewProps> = ({
  initialTab = 'collection',
  graphicsPrefs,
  diceSkinId,
  onBack,
  onPlayWithBoard,
  onBoardSelectionChanged,
}) => {
  const [collection, setCollection] = useState<BoardCollectionState>(() => loadBoardCollection());
  const [activeModeTab, setActiveModeTab] = useState<'collection' | 'creator'>(initialTab);
  const [category, setCategory] = useState<CollectionCategory>('default');
  const [creatorSection, setCreatorSection] = useState<CreatorSection>('board');

  const allBoards = useMemo(() => getAllAvailableBoards(collection), [collection]);
  const selectedBoard = useMemo(
    () => getBoardById(collection.selectedBoardId, collection),
    [collection],
  );

  const [previewBoard, setPreviewBoard] = useState<BoardConfig>(() =>
    cloneBoardConfig(selectedBoard),
  );
  const [draftBoard, setDraftBoard] = useState<BoardConfig>(() =>
    createTemplateFromTheme(selectedBoard.themeId, `Kustom ${selectedBoard.name}`),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FantasyBoardEngine | null>(null);

  const active3DBoard = activeModeTab === 'creator' ? draftBoard : previewBoard;

  // Mount live 3D preview engine once
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    setPreviewReady(false);
    const engine = new FantasyBoardEngine(
      container,
      {},
      {
        graphicsPrefs,
        diceSkinId,
        boardConfig: active3DBoard,
        onBuildReady: () => {
          setPreviewReady(true);
        },
      },
    );
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Live-update 3D preview whenever active3DBoard changes
  useEffect(() => {
    if (!engineRef.current || !previewReady) return;
    const timer = window.setTimeout(() => {
      engineRef.current?.updateBoardConfig(active3DBoard);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [active3DBoard, previewReady]);

  const showNotice = (msg: string) => {
    setSaveToast(msg);
    window.setTimeout(() => {
      setSaveToast((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  const filteredBoards = useMemo(() => {
    if (category === 'default') {
      return allBoards.filter((b) => !b.isCustom);
    }
    if (category === 'custom') {
      return allBoards.filter((b) => b.isCustom);
    }
    return allBoards.filter((b) => collection.favoriteBoardIds.includes(b.id));
  }, [allBoards, category, collection.favoriteBoardIds]);

  const handleSelectBoard = (board: BoardConfig, modeOverride?: BoardSelectionMode) => {
    const nextMode = modeOverride ?? (board.isCustom ? 'custom' : 'manual');
    const nextState = selectBoard(board.id, nextMode);
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    showNotice(`Papan "${board.name}" dipilih.`);
  };

  const handleRandomPick = () => {
    const candidates = allBoards.filter((b) => b.id !== previewBoard.id);
    const pool = candidates.length > 0 ? candidates : allBoards;
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
    const active = getBoardById(nextState.selectedBoardId, nextState);
    setPreviewBoard(cloneBoardConfig(active));
    onBoardSelectionChanged?.(active, mode);
    showNotice(
      mode === 'random'
        ? 'Mode Pemilihan Papan: RANDOM MODE aktif'
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
    const nextState = setDefaultBoard(board.id);
    setCollection({ ...nextState });
    setPreviewBoard(cloneBoardConfig(board));
    onBoardSelectionChanged?.(board, nextState.selectionMode);
    showNotice(`"${board.name}" dijadikan papan utama (Default).`);
  };

  const handleDuplicate = (board: BoardConfig) => {
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
    const cloned = cloneBoardConfig(board);
    if (asNewCopy || !board.isCustom) {
      cloned.id = `draft_${Date.now()}`;
      cloned.name = board.isCustom ? `${board.name} (Edit)` : `Kustom ${board.name}`;
      cloned.isCustom = true;
    }
    setDraftBoard(cloned);
    setActiveModeTab('creator');
  };

  const handleApplyBaseThemeToDraft = (themeId: BoardThemeId) => {
    const base = getDefaultBoardByTheme(themeId);
    setDraftBoard((prev) => ({
      ...base,
      id: prev.id,
      name: prev.name,
      isCustom: true,
      createdAt: prev.createdAt,
      updatedAt: Date.now(),
    }));
    showNotice(`Preset tema ${BOARD_THEME_LABELS[themeId]} diterapkan ke editor.`);
  };

  const handleSaveCustomBoard = () => {
    const { state, saved } = saveCustomBoard(draftBoard);
    setCollection({ ...state });
    setDraftBoard(cloneBoardConfig(saved));
    setPreviewBoard(cloneBoardConfig(saved));
    onBoardSelectionChanged?.(saved, state.selectionMode);
    showNotice(`Papan "${saved.name}" berhasil disimpan ke My Custom Boards!`);
  };

  const handleRandomizeJumps = (target: 'both' | 'ladders' | 'snakes') => {
    const generated = generateRandomJumpsForTheme(
      draftBoard.themeId,
      draftBoard.ladders.length || 7,
      draftBoard.snakes.length || 7,
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
      if (prev.ladders.length >= 10) return prev;
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
      if (prev.snakes.length >= 10) return prev;
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Navigation Header */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/25 bg-slate-950/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            Kembali
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                Multi Board System & 3D Studio
              </span>
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {allBoards.length} Papan Tersedia
              </span>
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-gold-gradient">
              Koleksi Dunia Papan & Custom Board Creator
            </h1>
          </div>
        </div>

        {/* Mode Switcher Tabs: Collection vs Custom Creator */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            <button
              type="button"
              onClick={() => setActiveModeTab('collection')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeModeTab === 'collection'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Koleksi Papan ({allBoards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveModeTab('creator')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeModeTab === 'creator'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Custom Board Creator
            </button>
          </div>

          <button
            type="button"
            onClick={() => onPlayWithBoard(active3DBoard)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Mainkan Papan Ini
          </button>
        </div>
      </header>

      {/* Main Split Workspace: Left Controls + Right Interactive 3D Viewport */}
      <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Control Column (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 border-r border-slate-800/80 bg-slate-950/95 overflow-y-auto p-4 sm:p-5 space-y-4">
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

              {/* Category Filter Tabs + Create New Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-xl border border-slate-800 bg-slate-900/80 p-1">
                  <button
                    type="button"
                    onClick={() => setCategory('default')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      category === 'default'
                        ? 'bg-slate-800 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Default Boards (8)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('custom')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      category === 'custom'
                        ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    My Custom Boards ({collection.customBoards.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('favorite')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      category === 'favorite'
                        ? 'bg-slate-800 text-rose-300 border border-rose-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Favorite Boards ({collection.favoriteBoardIds.length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const fresh = createTemplateFromTheme('enchanted_forest', 'Papan Fantasi Baru');
                    setDraftBoard(fresh);
                    setActiveModeTab('creator');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buat Papan Baru
                </button>
              </div>

              {/* Board Cards Grid */}
              {filteredBoards.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                  <p className="text-sm font-semibold text-slate-300">
                    {category === 'custom'
                      ? 'Belum ada Papan Kustom yang disimpan.'
                      : 'Belum ada papan di daftar Favorit.'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Gunakan Custom Board Creator atau duplikat papan yang ada untuk membuat kreasi dunia 3D milikmu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveModeTab('creator')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Buka Custom Board Creator
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBoards.map((board) => {
                    const isSelected = collection.selectedBoardId === board.id;
                    const isDefault = collection.defaultBoardId === board.id;
                    const isFav = collection.favoriteBoardIds.includes(board.id);
                    const isPreviewing = previewBoard.id === board.id;

                    return (
                      <div
                        key={board.id}
                        className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-400/70 bg-slate-900/95 shadow-lg shadow-amber-500/5'
                            : isPreviewing
                              ? 'border-cyan-400/60 bg-slate-900/85'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          {/* Swatch Banner & Badges */}
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                              {board.previewSwatches.map((hex, sIdx) => (
                                <span
                                  key={`${board.id}_sw_${sIdx}`}
                                  className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                                {BOARD_THEME_LABELS[board.themeId]}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {isDefault && (
                                <span className="rounded-md bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  Default
                                </span>
                              )}
                              {board.isCustom && (
                                <span className="rounded-md bg-emerald-500/20 border border-emerald-400/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                  Custom
                                </span>
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

                          {/* Unique Ladder & Snake Route Summary */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="rounded-md border border-amber-500/30 bg-amber-950/50 px-1.5 py-0.5 font-semibold text-amber-300">
                              ↑ {board.ladders.length} Tangga (
                              {board.ladders
                                .slice(0, 3)
                                .map((l) => `${l.from}→${l.to}`)
                                .join(', ')}
                              )
                            </span>
                            <span className="rounded-md border border-emerald-500/30 bg-emerald-950/50 px-1.5 py-0.5 font-semibold text-emerald-300">
                              ↓ {board.snakes.length} Ular (
                              {board.snakes
                                .slice(0, 3)
                                .map((s) => `${s.from}→${s.to}`)
                                .join(', ')}
                              )
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="mt-3.5 pt-3 border-t border-slate-800/80 space-y-2">
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectBoard(board)}
                              className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
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
                              onClick={() => setPreviewBoard(cloneBoardConfig(board))}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              3D Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => onPlayWithBoard(board)}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Play
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
                        Tema Dasar Dunia (8 Tema)
                      </label>
                      <select
                        value={draftBoard.themeId}
                        onChange={(e) =>
                          handleApplyBaseThemeToDraft(e.target.value as BoardThemeId)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-amber-400 focus:outline-none"
                      >
                        {(Object.keys(BOARD_THEME_LABELS) as BoardThemeId[]).map((tId) => (
                          <option key={tId} value={tId}>
                            {BOARD_THEME_LABELS[tId]}
                          </option>
                        ))}
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
                          disabled={draftBoard.snakes.length >= 10}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Ular
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {draftBoard.snakes.map((snake, idx) => (
                        <div
                          key={snake.id}
                          className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2"
                        >
                          <div className="col-span-1 text-center text-[11px] font-bold text-emerald-400">
                            #{idx + 1}
                          </div>
                          <div className="col-span-5">
                            <label className="block text-[10px] text-slate-400">Nama Ular</label>
                            <input
                              type="text"
                              value={snake.name}
                              onChange={(e) => handleUpdateSnake(idx, 'name', e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-rose-300 font-semibold">
                              Kepala (Dari)
                            </label>
                            <input
                              type="number"
                              min={12}
                              max={99}
                              value={snake.from}
                              onChange={(e) => handleUpdateSnake(idx, 'from', Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-amber-300"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[10px] text-emerald-300 font-semibold">
                              Ekor (Turun ke)
                            </label>
                            <input
                              type="number"
                              min={2}
                              max={Math.max(2, snake.from - 5)}
                              value={snake.to}
                              onChange={(e) => handleUpdateSnake(idx, 'to', Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-emerald-300"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
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
                          disabled={draftBoard.ladders.length >= 10}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-950/50 px-2.5 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-900/60 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          Tambah Tangga
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {draftBoard.ladders.map((ladder, idx) => (
                        <div
                          key={ladder.id}
                          className="grid grid-cols-12 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-2"
                        >
                          <div className="col-span-1 text-center text-[11px] font-bold text-amber-400">
                            #{idx + 1}
                          </div>
                          <div className="col-span-5">
                            <label className="block text-[10px] text-slate-400">Nama Tangga</label>
                            <input
                              type="text"
                              value={ladder.name}
                              onChange={(e) => handleUpdateLadder(idx, 'name', e.target.value)}
                              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-amber-300 font-semibold">
                              Bawah (Dari)
                            </label>
                            <input
                              type="number"
                              min={2}
                              max={94}
                              value={ladder.from}
                              onChange={(e) => handleUpdateLadder(idx, 'from', Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-amber-300"
                            />
                          </div>
                          <div className="col-span-3">
                            <label className="block text-[10px] text-emerald-300 font-semibold">
                              Atas (Naik ke)
                            </label>
                            <input
                              type="number"
                              min={Math.min(99, ladder.from + 4)}
                              max={99}
                              value={ladder.to}
                              onChange={(e) => handleUpdateLadder(idx, 'to', Number(e.target.value))}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-emerald-300"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
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
                  <h3 className="text-sm font-bold text-amber-300">
                    E. Kustomisasi Lingkungan 3D (Environment Customization)
                  </h3>
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
                        <option value="twilight_forest">Twilight Enchanted Forest</option>
                        <option value="volcanic_ash">Volcanic Magma Sky</option>
                        <option value="aurora_frost">Arctic Aurora Borealis</option>
                        <option value="golden_mirage">Golden Desert Mirage</option>
                        <option value="abyssal_sea">Deep Atlantis Ocean</option>
                        <option value="eclipse_void">Shadow Realm Eclipse</option>
                        <option value="astral_dawn">Celestial Astral Dawn</option>
                        <option value="temple_sunset">Ancient Temple Sunset</option>
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

        {/* Right Column: Live Interactive 3D Preview Viewport (5 cols on desktop) */}
        <div className="lg:col-span-5 relative flex flex-col min-h-[320px] lg:min-h-0 bg-slate-950">
          <div ref={previewContainerRef} className="relative flex-1 w-full h-full" />

          {/* Top-Left Live 3D Preview Overlay Badge */}
          <div className="pointer-events-none absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <div className="rounded-xl border border-amber-500/35 bg-slate-950/85 px-3.5 py-2 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Live 3D Preview · Putar & Zoom Kamera
                </span>
              </div>
              <div className="font-display text-sm font-bold text-white mt-0.5">
                {active3DBoard.name}
              </div>
              <div className="text-[11px] text-slate-300">
                Tema: {BOARD_THEME_LABELS[active3DBoard.themeId]}
              </div>
            </div>
          </div>

          {/* Bottom Toast / Quick Info Overlay */}
          {saveToast && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-center">
              <div className="rounded-xl border border-emerald-400/50 bg-slate-950/90 px-4 py-2 text-xs font-bold text-emerald-300 shadow-xl">
                {saveToast}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
