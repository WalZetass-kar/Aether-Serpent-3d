import React, { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Clock,
  Cpu,
  Layers,
  Lock,
  Play,
  Shield,
  Shuffle,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import {
  BOARD_GAME_MODES,
  DICE_SKINS,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  disambiguatePlayerName,
  isDiceSkinUnlocked,
  type BoardGameMode,
  type DiceSkinId,
  type DifficultyMode,
  type TeamId,
} from '../../shared/gameConfig';
import {
  BOARD_THEME_LABELS,
  type BoardConfig,
  type BoardSelectionMode,
} from '../../shared/boardThemes';
import {
  getAllAvailableBoards,
  loadBoardCollection,
  selectBoard,
  setBoardSelectionMode,
} from '../services/boardStorageService';
import type { CameraMode, CameraSettings } from '../three/DynamicCameraController';
import { ArchetypeEmblem, DiceSkinCubePreview, SerpentCrestEmblem } from './FantasyIcons';

interface GameConfigViewProps {
  boardMode: BoardGameMode;
  defaultPlayerName: string;
  defaultArchetypeIndex: number;
  adaptiveTier: string;
  muted: boolean;
  selectedDiceSkinId: DiceSkinId;
  unlockedAchievements: string[];
  onSelectDiceSkin: (skinId: DiceSkinId) => void;
  cameraSettings: CameraSettings;
  onChangeCameraMode: (mode: CameraMode) => void;
  onOpenCameraSettings: () => void;
  onToggleMute: () => void;
  onBackToModeSelection: () => void;
  onStartSolo: (
    playerName: string,
    archetypeIndex: number,
    difficulty: DifficultyMode,
    aiCount: number,
    boardMode: BoardGameMode,
    timeLimitSec: number,
  ) => void;
  onStartLocal: (
    players: Array<{ name: string; archetypeIndex: number; team: TeamId }>,
    boardMode: BoardGameMode,
    timeLimitSec: number,
  ) => void;
  onOpenBoardManager?: (tab?: 'collection' | 'creator') => void;
}

const CAMERA_MODES: Array<{ id: CameraMode; label: string }> = [
  { id: 'auto_follow', label: 'Otomatis' },
  { id: 'cinematic', label: 'Sinematik' },
  { id: 'isometric', label: 'Isometrik' },
  { id: 'manual', label: 'Manual' },
];

const MODE_ICON: Record<BoardGameMode, React.ReactNode> = {
  classic: <Shield className="w-5 h-5 text-amber-300" />,
  battle: <Swords className="w-5 h-5 text-rose-400" />,
  team: <Users className="w-5 h-5 text-sky-400" />,
  time_attack: <Clock className="w-5 h-5 text-emerald-400" />,
};

export const GameConfigView: React.FC<GameConfigViewProps> = ({
  boardMode,
  defaultPlayerName,
  defaultArchetypeIndex,
  adaptiveTier,
  muted,
  selectedDiceSkinId,
  unlockedAchievements,
  onSelectDiceSkin,
  cameraSettings,
  onChangeCameraMode,
  onOpenCameraSettings,
  onToggleMute,
  onBackToModeSelection,
  onStartSolo,
  onStartLocal,
  onOpenBoardManager,
}) => {
  const [playStyle, setPlayStyle] = useState<'solo' | 'local'>('solo');
  const [boardCollection, setBoardCollection] = useState(() => loadBoardCollection());
  const availableBoards = getAllAvailableBoards(boardCollection);

  // Solo config
  const [soloName, setSoloName] = useState(defaultPlayerName);
  const [soloArchetype, setSoloArchetype] = useState(defaultArchetypeIndex);
  const [difficulty, setDifficulty] = useState<DifficultyMode>('adaptive');
  const [aiCount, setAiCount] = useState(1);

  // Local pass & play config
  const [localCount, setLocalCount] = useState(boardMode === 'team' ? 4 : 2);
  const [localNames, setLocalNames] = useState(() => [
    defaultPlayerName || 'Ksatria Aldebaran #108',
    'Penyihir Lyra #204',
    'Penjelajah Kael #518',
    'Alkemis Zephyr #839',
  ]);
  const [localTeams, setLocalTeams] = useState<TeamId[]>(['A', 'B', 'A', 'B']);

  // Relevant ONLY when boardMode === 'time_attack'
  const [timeLimitSec, setTimeLimitSec] = useState(TIME_ATTACK_DEFAULT_SEC);

  const handleQuickSelectBoard = (board: BoardConfig) => {
    const next = selectBoard(board.id, board.isCustom ? 'custom' : 'manual');
    setBoardCollection({ ...next });
  };

  const handleQuickModeChange = (mode: BoardSelectionMode) => {
    const next = setBoardSelectionMode(mode);
    setBoardCollection({ ...next });
  };

  const modeMeta = BOARD_GAME_MODES.find((m) => m.id === boardMode) ?? BOARD_GAME_MODES[0];
  const effectiveLocalCount = boardMode === 'team' && localCount < 4 ? 4 : localCount;

  const handleLaunch = () => {
    if (playStyle === 'solo') {
      onStartSolo(
        soloName.trim() || defaultPlayerName || 'Ksatria Aldebaran #108',
        soloArchetype,
        difficulty,
        boardMode === 'team' ? 3 : aiCount,
        boardMode,
        timeLimitSec,
      );
      return;
    }

    const usedNames: string[] = [];
    const list = Array.from({ length: effectiveLocalCount }).map((_, idx) => {
      const uniqueName = disambiguatePlayerName(
        localNames[idx] || `Penjelajah #${idx + 1}`,
        usedNames,
        `local-${idx + 1}`,
      );
      usedNames.push(uniqueName);
      return {
        name: uniqueName,
        archetypeIndex: idx,
        team: localTeams[idx],
      };
    });
    onStartLocal(list, boardMode, timeLimitSec);
  };

  return (
    <div className="relative z-10 flex flex-col w-full h-full p-4 sm:p-6 lg:px-10 lg:py-7 overflow-y-auto custom-scroll">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={onBackToModeSelection}
          className="glass-panel-soft inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          Kembali ke Pilih Mode
        </button>

        <div className="glass-panel-soft rounded-xl px-3.5 py-2 flex items-center gap-2.5">
          <SerpentCrestEmblem className="w-6 h-6 shrink-0" />
          <span className="font-display text-sm sm:text-base font-bold text-gold-gradient">
            Konfigurasi Pertandingan
          </span>
        </div>
      </header>

      {/* Configuration Card */}
      <main className="my-auto mx-auto w-full max-w-4xl glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
        {/* Selected Mode Banner */}
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/65 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
              {MODE_ICON[boardMode]}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest font-bold text-amber-300">
                Tahap 2 dari 2 · {modeMeta.label}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{modeMeta.rulesDesc}</p>
            </div>
          </div>

          {/* Play Style Segmented Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setPlayStyle('solo')}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                playStyle === 'solo'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Solo vs AI
            </button>
            <button
              type="button"
              onClick={() => setPlayStyle('local')}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                playStyle === 'local'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Multiplayer Lokal
            </button>
          </div>
        </div>

        {/* Time Attack Duration (shown ONLY for time_attack) */}
        {boardMode === 'time_attack' && (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-950/20 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-emerald-300">Durasi Pertandingan Time Attack</div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Pertandingan berakhir otomatis ketika penghitung waktu mencapai nol.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[120, 180, 300].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setTimeLimitSec(sec)}
                  className={`min-h-[38px] px-3.5 rounded-xl font-mono-num text-xs font-bold border transition-colors cursor-pointer ${
                    timeLimitSec === sec
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {sec / 60} Menit
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Solo Configuration */}
        {playStyle === 'solo' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Pahlawan
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={soloName}
                  onChange={(e) => setSoloName(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  placeholder="Nama pahlawan..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {boardMode === 'team' ? 'Formasi Tim (2v2)' : 'Jumlah Lawan AI'}
                </label>
                {boardMode === 'team' ? (
                  <div className="min-h-[42px] flex items-center rounded-xl border border-sky-500/40 bg-sky-950/30 px-3.5 text-xs text-sky-200">
                    Tim Surya (Anda + 1 AI Sekutu) vs Tim Bulan (2 AI)
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAiCount(n)}
                        className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                          aiCount === n
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {n} AI ({n + 1}P)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Bidak Pahlawan
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {PLAYER_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.archetypeIndex}
                    type="button"
                    onClick={() => setSoloArchetype(arch.archetypeIndex)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      soloArchetype === arch.archetypeIndex
                        ? 'border-amber-400 bg-amber-500/15 text-amber-100'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <ArchetypeEmblem archetypeIndex={arch.archetypeIndex} className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-semibold truncate">{arch.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300">Tingkat Kesulitan AI</label>
                <span className="text-xs font-semibold text-amber-300">
                  Tier Adaptif Saat Ini: {adaptiveTier}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    { id: 'adaptive', label: 'Adaptif', desc: 'Mengikuti performa Anda' },
                    { id: 'easy', label: 'Mudah', desc: 'Santai & ramah pemula' },
                    { id: 'medium', label: 'Sedang', desc: 'Bonus skor 1.25x' },
                    { id: 'hard', label: 'Sulit', desc: 'Bonus skor 1.5x' },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      difficulty === d.id
                        ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                        : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Local Pass & Play Configuration */}
        {playStyle === 'local' && (
          <div className="space-y-4">
            {boardMode !== 'team' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Jumlah Pemain (Satu Perangkat)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setLocalCount(cnt)}
                      className={`min-h-[42px] rounded-xl border text-sm font-bold transition-colors cursor-pointer ${
                        localCount === cnt
                          ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                          : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cnt} Pemain
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-sky-500/35 bg-sky-950/25 px-3.5 py-2.5 text-xs text-sky-200">
                Mode Team Lokal menggunakan 4 pemain (2v2). Ketuk label tim pada kartu pemain untuk menukar tim Surya / Bulan.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: effectiveLocalCount }).map((_, idx) => {
                const arch = PLAYER_ARCHETYPES[idx];
                const team = localTeams[idx];
                return (
                  <div
                    key={arch.archetypeIndex}
                    className="rounded-xl border border-slate-700 bg-slate-900/75 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ArchetypeEmblem archetypeIndex={arch.archetypeIndex} className="w-5 h-5 shrink-0" />
                        <span className="text-xs font-bold text-slate-200">{arch.title}</span>
                      </div>
                      {boardMode === 'team' && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...localTeams];
                            next[idx] = team === 'A' ? 'B' : 'A';
                            setLocalTeams(next);
                          }}
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer ${
                            team === 'A'
                              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                              : 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                          }`}
                        >
                          {team === 'A' ? 'Tim Surya' : 'Tim Bulan'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={24}
                      value={localNames[idx]}
                      onChange={(e) => {
                        const next = [...localNames];
                        next[idx] = e.target.value;
                        setLocalNames(next);
                      }}
                      className="w-full min-h-[40px] rounded-lg border border-slate-600 bg-slate-950 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                      placeholder={`Pemain ${idx + 1}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Multi-Board 3D World Theme Selection Strip */}
        <div className="rounded-2xl border border-emerald-500/25 bg-slate-950/60 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Pilih Dunia Papan 3D ({availableBoards.length} Papan)
              </div>
              <p className="text-[11px] text-slate-400">
                Mode aktif:{' '}
                <span className="font-bold text-amber-300 uppercase">
                  {boardCollection.selectionMode} mode
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'manual', label: 'Manual' },
                  { id: 'random', label: 'Random Acak' },
                  { id: 'custom', label: 'Custom' },
                ] as Array<{ id: BoardSelectionMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleQuickModeChange(m.id)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                    boardCollection.selectionMode === m.id
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {m.id === 'random' && <Shuffle className="w-3 h-3" />}
                  {m.label}
                </button>
              ))}

              {onOpenBoardManager && (
                <button
                  type="button"
                  onClick={() => onOpenBoardManager('creator')}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  3D Board Creator
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 custom-scroll">
            {availableBoards.map((b) => {
              const isSelected =
                boardCollection.selectionMode !== 'random' &&
                boardCollection.selectedBoardId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleQuickSelectBoard(b)}
                  className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15 text-white shadow'
                      : 'border-slate-800 bg-slate-900/75 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {b.previewSwatches.slice(0, 3).map((hex, i) => (
                      <span
                        key={`${b.id}_c_${i}`}
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-auto truncate">
                      {b.isCustom ? 'Custom' : BOARD_THEME_LABELS[b.themeId].split(' ')[0]}
                    </span>
                  </div>
                  <div className="text-xs font-bold truncate">{b.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{b.subtitle}</div>
                  <div className="text-[9px] text-amber-300/90 truncate mt-0.5">
                    ↑{b.ladders[0]?.from}→{b.ladders[0]?.to} · ↓{b.snakes[0]?.from}→{b.snakes[0]?.to}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom 3D Dice Skin Selection Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pilih Skin Dadu 3D
            </label>
            <span className="text-[11px] text-slate-400">
              Buka skin baru melalui menu Pencapaian
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DICE_SKINS.map((skin) => {
              const unlocked = isDiceSkinUnlocked(skin.id, unlockedAchievements);
              const selected = selectedDiceSkinId === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) onSelectDiceSkin(skin.id);
                  }}
                  title={
                    unlocked
                      ? `${skin.name} — ${skin.description}`
                      : `Terkunci — Syarat Pencapaian: ${skin.requiredAchievementTitle}`
                  }
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-500/15 text-amber-100 shadow-md'
                      : unlocked
                        ? 'border-slate-700 bg-slate-900/75 text-slate-200 hover:bg-slate-800 cursor-pointer'
                        : 'border-slate-800/80 bg-slate-950/50 text-slate-500 opacity-75 cursor-not-allowed'
                  }`}
                >
                  <DiceSkinCubePreview {...skin.previewColors} className="w-7 h-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{skin.name}</span>
                      {!unlocked && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {unlocked ? skin.subtitle : skin.requiredAchievementTitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Camera & Audio Settings Strip */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 mr-1">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Kamera:
            </span>
            {CAMERA_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeCameraMode(m.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                  cameraSettings.mode === m.id
                    ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCameraSettings}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer"
            >
              Detail Kamera
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-amber-400/50 cursor-pointer"
            >
              {muted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  Bisu
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Suara Aktif
                </>
              )}
            </button>
          </div>
        </div>

        {/* Start Match Primary Action */}
        <button
          type="button"
          onClick={handleLaunch}
          className="w-full min-h-[50px] inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-bold text-sm sm:text-base hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer shadow-xl"
        >
          <Play className="w-5 h-5" />
          Mulai Permainan
        </button>
      </main>
    </div>
  );
};
