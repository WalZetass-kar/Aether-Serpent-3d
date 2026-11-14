import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ACHIEVEMENTS,
  BOARD_GAME_MODES,
  DICE_SKINS,
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  applyTurnEffectsToPlayers,
  buildJumpMap,
  getAdaptiveTierLabel,
  isDiceSkinUnlocked,
  pickTimeAttackWinner,
  resolveTurnMove,
  rollAdaptiveAIDice,
  type BoardGameMode,
  type ConnectionMode,
  type DiceSkinId,
  type DifficultyMode,
  type PlayerState,
  type SpecialTileType,
  type TeamId,
  type TurnResolution,
} from '../shared/gameConfig';
import { soundEngine } from './audio/soundEngine';
import { AchievementsDailyModal } from './components/AchievementsDailyModal';
import { AetherOracleChatDrawer } from './components/AetherOracleChatDrawer';
import { BoardManagerView } from './components/BoardManagerView';
import { BottomControlDock } from './components/BottomControlDock';
import { CameraSettingsModal } from './components/CameraSettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { ArchetypeEmblem } from './components/FantasyIcons';
import { GameConfigView } from './components/GameConfigView';
import { HUDTopBar } from './components/HUDTopBar';
import { InteractiveTutorialModal } from './components/InteractiveTutorialModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LoadingArenaScreen } from './components/LoadingArenaScreen';
import { MainMenuView } from './components/MainMenuView';
import { ModeSelectionView } from './components/ModeSelectionView';
import {
  MultiplayerLobbyView,
  type OnlineLobbyState,
} from './components/MultiplayerLobbyView';
import { PerfOverlay } from './components/PerfOverlay';
import { VictoryModal } from './components/VictoryModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  checkAndTriggerDailyReminder,
  dispatchAppNotification,
} from './services/notificationService';
import {
  appendLocalScore,
  evaluateAchievements,
  flushPendingLeaderboard,
  loadLocalScores,
  loadProfile,
  queuePendingLeaderboard,
  resetProfileSession,
  saveProfile,
  updateDailyChallengeProgress,
  type LocalScoreEntry,
  type PlayerProfile,
} from './services/storageService';
import {
  DEFAULT_BOARD_CONFIGS,
  type BoardConfig,
} from '../shared/boardThemes';
import {
  resolveBoardForMatch,
  selectBoard,
} from './services/boardStorageService';
import {
  DEFAULT_CAMERA_SETTINGS,
  FantasyBoardEngine,
  type CameraSettings,
  type TileInspectInfo,
} from './three/FantasyBoardEngine';
import { MainMenuEngine } from './three/MainMenuEngine';
import {
  probeDeviceCapabilities,
  resolvePresetTier,
  type BenchmarkSummary,
  type DeviceCapabilitiesReport,
  type LivePerfTelemetry,
} from './three/perf/PerformanceManager';
import {
  QUALITY_PRESETS,
  loadGraphicsPreferences,
  saveGraphicsPreferences,
  type GraphicsPreferences,
} from './three/perf/qualityPresets';

const CAMERA_SETTINGS_KEY = 'aether_serpent_camera_v1';

type AppScreen =
  | 'main_menu'
  | 'mode_selection'
  | 'game_config'
  | 'multiplayer_lobby'
  | 'board_manager'
  | 'loading_arena'
  | 'arena';

function loadCameraSettings(): CameraSettings {
  try {
    const raw = localStorage.getItem(CAMERA_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_CAMERA_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<CameraSettings>;
    return { ...DEFAULT_CAMERA_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_CAMERA_SETTINGS };
  }
}

function makePlayer(
  id: string,
  name: string,
  archetypeIndex: number,
  isAI: boolean,
  team: TeamId = 'A',
): PlayerState {
  const arch = PLAYER_ARCHETYPES[archetypeIndex % PLAYER_ARCHETYPES.length];
  return {
    id,
    name,
    isAI,
    archetypeIndex: arch.archetypeIndex,
    color: arch.color,
    accentColor: arch.accentColor,
    team,
    tile: 1,
    score: 0,
    shields: 0,
    turnsTaken: 0,
    laddersClimbed: 0,
    snakesBitten: 0,
    specialTilesHit: 0,
    shieldsUsed: 0,
    battleHits: 0,
    connected: true,
    ready: true,
    pingMs: 18,
  };
}

interface SerializedRoomPayload {
  code: string;
  name?: string;
  isPublic?: boolean;
  boardMode?: BoardGameMode;
  boardConfig?: BoardConfig;
  timeLimitSec?: number;
  endsAt?: number | null;
  turnDeadlineAt?: number | null;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerState[];
  currentTurnIndex: number;
  winnerId?: string | null;
  winningTeam?: TeamId | null;
  lastEventId: number;
}

export default function App() {
  const menuCanvasRef = useRef<HTMLDivElement | null>(null);
  const menuEngineRef = useRef<MainMenuEngine | null>(null);
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FantasyBoardEngine | null>(null);

  const isOnline = useOnlineStatus();
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [localScores, setLocalScores] = useState<LocalScoreEntry[]>(() => loadLocalScores());

  // Structured Multi-Stage Screen Navigation (Entry -> Main Menu -> Mode -> Config/Lobby -> Loading -> Arena)
  const initialRoomCode =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room')?.trim() ?? ''
      : '';
  const hasInitialRoom = initialRoomCode.length >= 4;
  const [screen, setScreen] = useState<AppScreen>(
    hasInitialRoom ? 'multiplayer_lobby' : 'main_menu',
  );
  const screenRef = useRef<AppScreen>(screen);
  screenRef.current = screen;
  const [selectedBoardMode, setSelectedBoardMode] = useState<BoardGameMode>('classic');
  const [multiplayerTabIntent, setMultiplayerTabIntent] = useState<'create' | 'join'>(
    hasInitialRoom ? 'join' : 'create',
  );
  const [boardManagerTab, setBoardManagerTab] = useState<'collection' | 'creator'>('collection');
  const [boardManagerReturnScreen, setBoardManagerReturnScreen] =
    useState<AppScreen>('main_menu');
  const [activeBoardConfig, setActiveBoardConfig] = useState<BoardConfig>(() =>
    resolveBoardForMatch(),
  );
  const activeBoardRef = useRef<BoardConfig>(activeBoardConfig);
  activeBoardRef.current = activeBoardConfig;
  const loadingTimerRef = useRef<number>(0);

  // Core game state
  const [mode, setMode] = useState<ConnectionMode>('solo');
  const [boardMode, setBoardMode] = useState<BoardGameMode>('classic');
  const [difficulty, setDifficulty] = useState<DifficultyMode>('adaptive');
  const [timeLimitSec, setTimeLimitSec] = useState<number>(TIME_ATTACK_DEFAULT_SEC);
  const [players, setPlayers] = useState<PlayerState[]>(() => {
    const p = loadProfile();
    const aiArch = (p.archetypeIndex + 1) % 4;
    return [
      makePlayer(p.playerId, p.name, p.archetypeIndex, false, 'A'),
      makePlayer('ai-1', 'Penjaga Aether (AI)', aiArch, true, 'B'),
    ];
  });
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [winner, setWinner] = useState<PlayerState | null>(null);
  const [winningTeam, setWinningTeam] = useState<TeamId | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  // Time Attack & Online Turn Countdown clock states
  const [timeEndsAt, setTimeEndsAt] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null);
  const [turnDeadlineAt, setTurnDeadlineAt] = useState<number | null>(null);
  const [turnTimeLeftSec, setTurnTimeLeftSec] = useState<number | null>(null);

  // UI overlays, graphics preferences & modals
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(() => loadCameraSettings());
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
  const [graphicsPrefs, setGraphicsPrefs] = useState<GraphicsPreferences>(() =>
    loadGraphicsPreferences(),
  );
  const graphicsPrefsRef = useRef<GraphicsPreferences>(graphicsPrefs);
  graphicsPrefsRef.current = graphicsPrefs;
  const [deviceCaps] = useState<DeviceCapabilitiesReport>(() => probeDeviceCapabilities());
  const [arenaLoadProgress, setArenaLoadProgress] = useState(0.15);
  const [arenaLoadStage, setArenaLoadStage] = useState('Menyiapkan pencahayaan & atmosfer WebGL2...');
  const [perfTelemetry, setPerfTelemetry] = useState<LivePerfTelemetry | null>(null);
  const [inspectedTile, setInspectedTile] = useState<TileInspectInfo | null>(null);
  const [toast, setToast] = useState<{ title: string; subtitle?: string } | null>(null);
  const [arenaEmote, setArenaEmote] = useState<{
    id: number;
    senderName: string;
    text: string;
  } | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [oracleAiOpen, setOracleAiOpen] = useState(false);
  const [victoryOpen, setVictoryOpen] = useState(false);

  // WebSocket Online Multiplayer State
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectPromiseRef = useRef<Promise<WebSocket> | null>(null);
  const lastProcessedEventIdRef = useRef<number>(0);
  const lastPingRttRef = useRef<number | null>(null);
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobbyState>(() => ({
    connected: false,
    connecting: false,
    roomCode: null,
    roomName: 'Arena Aether',
    isPublic: true,
    boardMode: 'classic',
    timeLimitSec: TIME_ATTACK_DEFAULT_SEC,
    endsAt: null,
    hostId: null,
    myPlayerId: loadProfile().playerId,
    status: 'lobby',
    players: [],
    winningTeam: null,
    error: null,
    chatMessages: [],
  }));

  // Mutable refs for stable WebGL callbacks & keyboard shortcuts
  const rollActionRef = useRef<() => void>(() => {});
  const toastTimerRef = useRef<number>(0);
  const emoteTimerRef = useRef<number>(0);
  const playersRef = useRef<PlayerState[]>(players);
  playersRef.current = players;
  const currentTurnIndexRef = useRef<number>(currentTurnIndex);
  currentTurnIndexRef.current = currentTurnIndex;
  const winnerRef = useRef<PlayerState | null>(winner);
  winnerRef.current = winner;
  const diceSkinIdRef = useRef<DiceSkinId>(profile.diceSkinId);
  diceSkinIdRef.current = profile.diceSkinId;
  const modeRef = useRef<ConnectionMode>(mode);
  modeRef.current = mode;
  const boardModeRef = useRef<BoardGameMode>(boardMode);
  boardModeRef.current = boardMode;
  const timeLimitSecRef = useRef<number>(timeLimitSec);
  timeLimitSecRef.current = timeLimitSec;

  const showToast = useCallback((title: string, subtitle?: string) => {
    setToast({ title, subtitle });
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3800);
  }, []);

  const enterArenaWithTransition = useCallback(() => {
    if (screenRef.current === 'arena') return;
    if (screenRef.current === 'loading_arena') {
      if (engineRef.current?.isReady()) {
        setArenaLoadProgress(1);
        setArenaLoadStage('Arena siap!');
        setScreen('arena');
      }
      return;
    }
    window.clearTimeout(loadingTimerRef.current);
    setInspectedTile(null);
    setArenaEmote(null);
    setArenaLoadProgress(0.08);
    setArenaLoadStage('Menginisialisasi konteks WebGL2 Arena...');
    setScreen('loading_arena');
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(loadingTimerRef.current);
      window.clearTimeout(toastTimerRef.current);
      window.clearTimeout(emoteTimerRef.current);
    };
  }, []);

  // Sync mute state with soundEngine
  useEffect(() => {
    soundEngine.setMuted(profile.muted);
  }, [profile.muted]);

  // Flush offline queue & check daily reminder when online
  useEffect(() => {
    if (isOnline) {
      void flushPendingLeaderboard();
    }
  }, [isOnline]);

  useEffect(() => {
    void checkAndTriggerDailyReminder(profile, (dateStr) => {
      setProfile((prev) => {
        const next = { ...prev, lastNotifiedDate: dateStr };
        saveProfile(next);
        return next;
      });
    });
  }, [profile.notificationsEnabled, profile.notificationHour]);

  const handleUpdateCameraSettings = useCallback((next: CameraSettings) => {
    setCameraSettings(next);
    try {
      localStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
    engineRef.current?.updateCameraSettings(next);
  }, []);

  const handleUpdateGraphicsPrefs = useCallback((next: GraphicsPreferences) => {
    setGraphicsPrefs(next);
    saveGraphicsPreferences(next);
    menuEngineRef.current?.setGraphicsPreferences(next);
    engineRef.current?.setGraphicsPreferences(next);
    if (!next.showDevOverlay) {
      setPerfTelemetry(null);
    }
  }, []);

  const handleRunBenchmark = useCallback(async (): Promise<BenchmarkSummary | null> => {
    const activeEngine = engineRef.current ?? menuEngineRef.current;
    if (!activeEngine) return null;
    return activeEngine.runBenchmark(3000);
  }, []);

  const handleSelectDiceSkin = useCallback(
    (skinId: DiceSkinId) => {
      soundEngine.playUiClick();
      setProfile((prev) => {
        if (!isDiceSkinUnlocked(skinId, prev.unlockedAchievements)) {
          return prev;
        }
        const next: PlayerProfile = { ...prev, diceSkinId: skinId };
        saveProfile(next);
        return next;
      });
      engineRef.current?.setDiceSkin(skinId);
      const skinMeta = DICE_SKINS.find((s) => s.id === skinId);
      if (skinMeta) {
        showToast(`Skin Dadu 3D Aktif: ${skinMeta.name}`, skinMeta.subtitle);
      }
    },
    [showToast],
  );

  const isArenaMounted = screen === 'loading_arena' || screen === 'arena';
  const isMenuBackdropMounted = !isArenaMounted && screen !== 'board_manager';

  // 1. Mount MainMenuEngine ONLY when outside the 3D Arena, Loading Screen & 3D Board Manager
  useEffect(() => {
    if (!isMenuBackdropMounted) {
      menuEngineRef.current?.dispose();
      menuEngineRef.current = null;
      return;
    }

    const mount = menuCanvasRef.current;
    if (!mount || menuEngineRef.current) return;

    const menuEngine = new MainMenuEngine(mount, graphicsPrefsRef.current);
    menuEngineRef.current = menuEngine;

    return () => {
      menuEngine.dispose();
      menuEngineRef.current = null;
    };
  }, [isMenuBackdropMounted]);

  // 2. Mount FantasyBoardEngine during Loading & Arena (staged progressive build)
  useEffect(() => {
    if (!isArenaMounted) {
      engineRef.current?.dispose();
      engineRef.current = null;
      return;
    }

    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new FantasyBoardEngine(
      mount,
      {
        onDiceClicked: () => {
          rollActionRef.current();
        },
        onTileInspected: (info) => {
          setInspectedTile(info);
        },
        onWebGLContextLost: (lost) => {
          setContextLost(lost);
        },
      },
      {
        graphicsPrefs: graphicsPrefsRef.current,
        diceSkinId: diceSkinIdRef.current,
        boardConfig: activeBoardRef.current ?? DEFAULT_BOARD_CONFIGS[0],
        onBuildProgress: (pct, stage) => {
          setArenaLoadProgress(pct);
          setArenaLoadStage(stage);
        },
        onBuildReady: () => {
          window.clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = window.setTimeout(() => {
            if (screenRef.current === 'loading_arena') {
              if (modeRef.current !== 'online' && boardModeRef.current === 'time_attack') {
                setTimeEndsAt(Date.now() + timeLimitSecRef.current * 1000);
                setTimeLeftSec(timeLimitSecRef.current);
              }
              setScreen('arena');
            }
          }, 260);
        },
      },
    );
    engine.updateCameraSettings(loadCameraSettings());
    const active = playersRef.current[currentTurnIndexRef.current] ?? null;
    engine.syncPlayers(playersRef.current, active ? active.id : null);
    engine.resetCameraPhase();
    engineRef.current = engine;

    return () => {
      window.clearTimeout(loadingTimerRef.current);
      engine.dispose();
      engineRef.current = null;
    };
  }, [isArenaMounted]);

  // Poll live WebGL telemetry ONLY when Developer Performance Overlay is enabled
  useEffect(() => {
    if (!graphicsPrefs.showDevOverlay) {
      setPerfTelemetry(null);
      return;
    }
    const poll = () => {
      const activeEngine = engineRef.current ?? menuEngineRef.current;
      if (activeEngine) {
        setPerfTelemetry(activeEngine.getTelemetry());
      }
    };
    poll();
    const id = window.setInterval(poll, 400);
    return () => window.clearInterval(id);
  }, [graphicsPrefs.showDevOverlay, isArenaMounted, screen]);

  // Sync 3D pawns whenever players or active turn changes inside Arena
  useEffect(() => {
    if (!isArenaMounted) return;
    const active = players[currentTurnIndex] ?? null;
    engineRef.current?.syncPlayers(players, active ? active.id : null);
  }, [players, currentTurnIndex, isArenaMounted]);

  // Finalize match stats, local scores, global leaderboard, achievements, daily quest & cloud sync
  const finalizeMatchProgress = useCallback(
    async (
      winningPlayer: PlayerState,
      allPlayers: PlayerState[],
      matchMode: ConnectionMode,
      matchBoardMode: BoardGameMode,
      matchDifficulty: DifficultyMode,
      matchWinningTeam?: TeamId | null,
    ) => {
      const localHero =
        matchMode === 'solo'
          ? allPlayers.find((p) => !p.isAI) ?? winningPlayer
          : matchMode === 'online'
            ? allPlayers.find((p) => p.id === onlineLobby.myPlayerId) ?? winningPlayer
            : winningPlayer;

      const didHumanWin =
        matchBoardMode === 'team' && matchWinningTeam
          ? localHero.team === matchWinningTeam
          : matchMode === 'solo'
            ? !winningPlayer.isAI
            : matchMode === 'online'
              ? winningPlayer.id === onlineLobby.myPlayerId
              : true;

      // Save local browser scoreboard
      const updatedScores = appendLocalScore({
        playerName: localHero.name,
        score: localHero.score,
        turns: Math.max(1, localHero.turnsTaken),
        mode: matchMode,
        boardMode: matchBoardMode,
        difficulty: matchDifficulty,
        won: didHumanWin,
      });
      setLocalScores(updatedScores);

      // Update profile stats, daily challenge, and achievements
      let nextProfile = loadProfile();
      nextProfile = {
        ...nextProfile,
        totalGames: nextProfile.totalGames + 1,
        wins: nextProfile.wins + (didHumanWin ? 1 : 0),
        losses: nextProfile.losses + (didHumanWin ? 0 : 1),
        bestScore: Math.max(nextProfile.bestScore, localHero.score),
        fastestWinTurns:
          didHumanWin &&
          (nextProfile.fastestWinTurns === null || localHero.turnsTaken < nextProfile.fastestWinTurns)
            ? localHero.turnsTaken
            : nextProfile.fastestWinTurns,
        laddersClimbed: nextProfile.laddersClimbed + localHero.laddersClimbed,
        snakesBitten: nextProfile.snakesBitten + localHero.snakesBitten,
        shieldsUsed: nextProfile.shieldsUsed + localHero.shieldsUsed,
        specialTilesHit: nextProfile.specialTilesHit + localHero.specialTilesHit,
        onlineWins: nextProfile.onlineWins + (matchMode === 'online' && didHumanWin ? 1 : 0),
        recentResults:
          matchMode === 'solo'
            ? [...nextProfile.recentResults.slice(-11), didHumanWin]
            : nextProfile.recentResults,
      };

      const dailyRes = updateDailyChallengeProgress(nextProfile, {
        gamesPlayed: 1,
        laddersClimbed: localHero.laddersClimbed,
        wins: didHumanWin ? 1 : 0,
        specialTiles: localHero.specialTilesHit,
      });
      nextProfile = dailyRes.updatedProfile;

      const achRes = evaluateAchievements(nextProfile, {
        won: didHumanWin,
        score: localHero.score,
        turns: localHero.turnsTaken,
        mode: matchMode,
        difficulty: matchDifficulty,
      });
      nextProfile = achRes.updatedProfile;
      saveProfile(nextProfile);
      setProfile(nextProfile);

      if (dailyRes.challengeJustCompleted) {
        showToast(
          'Tantangan Harian Selesai!',
          `+${dailyRes.bonusAwarded} poin bonus · Streak ${nextProfile.dailyStreak} hari`,
        );
      } else if (achRes.newlyUnlocked.length > 0) {
        const firstAch = ACHIEVEMENTS.find((a) => a.id === achRes.newlyUnlocked[0]);
        const rewardSkin = DICE_SKINS.find((s) =>
          achRes.newlyUnlocked.includes(s.requiredAchievementId ?? ''),
        );
        if (firstAch) {
          showToast(
            `Pencapaian Terbuka: ${firstAch.title}`,
            rewardSkin
              ? `Skin Dadu 3D baru terbuka: ${rewardSkin.name}!`
              : firstAch.description,
          );
        }
      }

      // Submit to global leaderboard (or queue offline)
      const lbPayload = {
        playerName: winningPlayer.name,
        score: winningPlayer.score,
        turns: Math.max(1, winningPlayer.turnsTaken),
        mode: matchMode,
        boardMode: matchBoardMode,
        difficulty: matchDifficulty,
      };

      if (navigator.onLine) {
        try {
          const res = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lbPayload),
          });
          if (res.ok) {
            const data = (await res.json()) as { rank?: number };
            if (data.rank) setGlobalRank(data.rank);
          } else {
            queuePendingLeaderboard(lbPayload);
          }
        } catch {
          queuePendingLeaderboard(lbPayload);
        }

        if (nextProfile.syncCode && nextProfile.syncPin) {
          try {
            const syncRes = await fetch('/api/cloud-sync/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                syncCode: nextProfile.syncCode,
                pin: nextProfile.syncPin,
                profile: nextProfile,
              }),
            });
            if (syncRes.ok) {
              const sData = (await syncRes.json()) as { updatedAt?: string };
              const synced = {
                ...nextProfile,
                lastSyncedAt: sData.updatedAt || new Date().toISOString(),
              };
              saveProfile(synced);
              setProfile(synced);
            }
          } catch {
            // ignore transient cloud error
          }
        }
      } else {
        queuePendingLeaderboard(lbPayload);
      }
    },
    [onlineLobby.myPlayerId, showToast],
  );

  // Time Attack Countdown Loop (only active inside Arena)
  useEffect(() => {
    if (screen !== 'arena' || boardMode !== 'time_attack' || !timeEndsAt || winner) {
      if (boardMode !== 'time_attack') {
        setTimeLeftSec(null);
      }
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((timeEndsAt - Date.now()) / 1000));
      setTimeLeftSec(remaining);

      if (remaining === 0 && mode !== 'online' && !winnerRef.current && !isAnimating) {
        const picked = pickTimeAttackWinner(playersRef.current);
        if (picked) {
          const didWin = mode === 'solo' ? !picked.isAI : true;
          if (didWin) soundEngine.playVictory();
          else soundEngine.playDefeat();
          engineRef.current?.triggerVictoryCamera(picked.id);
          setTimeExpired(true);
          setWinner(picked);
          setVictoryOpen(true);
          void finalizeMatchProgress(picked, playersRef.current, mode, boardMode, difficulty);
        }
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 500);
    return () => window.clearInterval(interval);
  }, [boardMode, difficulty, finalizeMatchProgress, isAnimating, mode, screen, timeEndsAt, winner]);

  // Online Turn Countdown Loop (syncs with server-authoritative turnDeadlineAt)
  useEffect(() => {
    if (screen !== 'arena' || mode !== 'online' || winner || turnDeadlineAt === null) {
      setTurnTimeLeftSec(null);
      return;
    }

    const updateTurnTimer = () => {
      const remaining = Math.max(0, Math.ceil((turnDeadlineAt - Date.now()) / 1000));
      setTurnTimeLeftSec(Math.min(ONLINE_TURN_TIMEOUT_SEC, remaining));
    };

    updateTurnTimer();
    const interval = window.setInterval(updateTurnTimer, 250);
    return () => window.clearInterval(interval);
  }, [mode, screen, turnDeadlineAt, winner]);

  // Execute a local or AI turn animation & state update
  const executeLocalTurn = useCallback(
    async (actorIndex: number, forcedRoll?: number) => {
      const actor = players[actorIndex];
      if (!actor || isAnimating || winner || screen !== 'arena') return;

      setIsAnimating(true);
      soundEngine.playDiceRoll();

      const activeJumpMap = buildJumpMap(
        activeBoardRef.current.ladders,
        activeBoardRef.current.snakes,
      );
      const bestHumanTile = Math.max(
        1,
        ...players.filter((p) => !p.isAI).map((p) => p.tile),
      );
      const roll =
        forcedRoll ??
        (actor.isAI
          ? rollAdaptiveAIDice(
              actor.tile,
              bestHumanTile,
              difficulty,
              profile.recentResults,
              activeJumpMap,
            )
          : Math.floor(Math.random() * 6) + 1);

      const resolution = resolveTurnMove(actor.tile, roll, actor.shields, {
        boardMode,
        actorId: actor.id,
        actorTeam: actor.team,
        otherPlayers: players,
        customJumpMap: activeJumpMap,
      });

      const nextPlayers = applyTurnEffectsToPlayers(players, actor.id, resolution, difficulty);

      if (engineRef.current) {
        await engineRef.current.enqueueTurnAnimation(actor.id, resolution, nextPlayers, {
          archetypeIndex: actor.archetypeIndex,
          onDiceRolled: (val) => setLastRoll(val),
          onHopStep: (stepIdx) => soundEngine.playHop(stepIdx),
          onRungStep: (rungIdx) => soundEngine.playLadderStep(rungIdx),
          onSnakeBite: () => soundEngine.playSnakeSwallow(),
          onSkillVfx: (skillType) => {
            if (skillType === 'shield' || skillType === 'shield_block') {
              soundEngine.playSkillCast('defensive');
            } else if (skillType === 'battle_attack' || skillType === 'curse') {
              soundEngine.playSkillCast('offensive');
            } else if (skillType === 'boost') {
              soundEngine.playSkillCast('movement');
            } else {
              soundEngine.playSkillCast('support');
            }
          },
          onSpecialTriggered: (type: SpecialTileType, shieldBlocked: boolean) => {
            if (shieldBlocked) {
              soundEngine.playShieldBlock();
              showToast('Perisai Suci Aktif!', 'Kutukan kabut berhasil ditangkal.');
            } else {
              soundEngine.playSpecial(type);
              if (resolution.specialHit) {
                showToast(resolution.specialHit.label, resolution.specialHit.description);
              }
            }
          },
          onJumpTriggered: (jumpType, shieldBlocked) => {
            if (jumpType === 'ladder') {
              soundEngine.playLadder();
              showToast(
                resolution.jumpTriggered?.name || 'Naik Tangga Suci!',
                `Melompat naik ke petak ${resolution.finalTile}`,
              );
            } else if (shieldBlocked) {
              soundEngine.playShieldBlock();
              showToast('Perisai Suci Menahan Ular!', 'Gigitan ular mistis gagal menjatuhkanmu.');
            } else {
              soundEngine.playSnake();
              showToast(
                resolution.jumpTriggered?.name || 'Terkena Ular Mistis!',
                `Meluncur turun ke petak ${resolution.finalTile}`,
              );
            }
          },
          onBattlePush: () => {
            const bp = resolution.battlePush;
            if (!bp) return;
            if (bp.blockedByShield) {
              soundEngine.playShieldBlock();
              showToast(
                `${bp.targetPlayerName} Menangkis Duel!`,
                'Perisai Suci melindungi lawan dari dorongan.',
              );
            } else {
              soundEngine.playClash();
              showToast(
                'Duel Battle Mode!',
                `${actor.name} mendorong ${bp.targetPlayerName} ke petak ${bp.toTile} (+75 poin)!`,
              );
            }
          },
          onTeamSynergy: () => {
            const syn = resolution.teamSynergy;
            if (!syn) return;
            soundEngine.playSpecial('extra_roll');
            showToast(
              'Sinergi Tim Aktif!',
              `${actor.name} & ${syn.allyPlayerName} mendapat +${syn.bonusScore} poin!`,
            );
          },
        });
      }

      setPlayers(nextPlayers);

      if (resolution.won) {
        const winPlayer = nextPlayers[actorIndex];
        const winTeam = boardMode === 'team' ? winPlayer.team ?? 'A' : null;
        const localHero =
          mode === 'solo' ? nextPlayers.find((p) => !p.isAI) ?? winPlayer : winPlayer;
        const didHumanWin =
          boardMode === 'team' && winTeam
            ? localHero.team === winTeam
            : mode === 'solo'
              ? !winPlayer.isAI
              : true;

        if (didHumanWin) soundEngine.playVictory();
        else soundEngine.playDefeat();

        setTimeExpired(false);
        setWinningTeam(winTeam);
        setWinner(winPlayer);
        setVictoryOpen(true);
        setIsAnimating(false);
        void finalizeMatchProgress(winPlayer, nextPlayers, mode, boardMode, difficulty, winTeam);
        return;
      }

      if (resolution.extraTurn) {
        showToast(`${actor.name} Dapat Lempar Lagi!`, `Dadu ${roll} / Berkah Aether`);
      } else {
        setCurrentTurnIndex((actorIndex + 1) % nextPlayers.length);
      }
      setIsAnimating(false);
    },
    [
      boardMode,
      difficulty,
      finalizeMatchProgress,
      isAnimating,
      mode,
      players,
      profile.recentResults,
      screen,
      showToast,
      winner,
    ],
  );

  // Trigger AI turn automatically in Solo mode (only inside Arena)
  useEffect(() => {
    if (screen !== 'arena' || mode !== 'solo' || isAnimating || winner) return;
    const active = players[currentTurnIndex];
    if (active?.isAI) {
      const timer = window.setTimeout(() => {
        void executeLocalTurn(currentTurnIndex);
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [currentTurnIndex, executeLocalTurn, isAnimating, mode, players, screen, winner]);

  // ---------------------------------------------------------------------------
  // WebSocket Online Multiplayer Client + Ping Heartbeat
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'room:ping',
            ts: Date.now(),
            lastRtt: lastPingRttRef.current,
          }),
        );
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const ensureWebSocket = useCallback((): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return Promise.resolve(wsRef.current);
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING && wsConnectPromiseRef.current) {
      return wsConnectPromiseRef.current;
    }

    const promise = new Promise<WebSocket>((resolve, reject) => {
      setOnlineLobby((prev) => ({ ...prev, connecting: true, error: null }));
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectPromiseRef.current = null;
        setOnlineLobby((prev) => ({ ...prev, connected: true, connecting: false, error: null }));
        resolve(ws);
      };

      ws.onerror = () => {
        wsConnectPromiseRef.current = null;
        setOnlineLobby((prev) => ({
          ...prev,
          connected: false,
          connecting: false,
          error: 'Gagal terhubung ke server multiplayer daring.',
        }));
        reject(new Error('WebSocket error'));
      };

      ws.onclose = () => {
        wsConnectPromiseRef.current = null;
        setOnlineLobby((prev) => ({ ...prev, connected: false, connecting: false }));
      };

      ws.onmessage = (evt) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = String(msg.type || '');

        if (type === 'room:pong') {
          const sentTs = Number(msg.ts || 0);
          if (sentTs > 0) {
            lastPingRttRef.current = Math.max(1, Date.now() - sentTs);
          }
          return;
        }

        if (type === 'error') {
          setOnlineLobby((prev) => ({ ...prev, error: String(msg.message || 'Terjadi kesalahan') }));
          return;
        }

        if (type === 'room:kicked') {
          setTurnDeadlineAt(null);
          setTurnTimeLeftSec(null);
          setOnlineLobby((prev) => ({
            ...prev,
            roomCode: null,
            players: [],
            status: 'lobby',
            chatMessages: [],
            error: String(msg.message || 'Anda dikeluarkan dari ruangan.'),
          }));
          if (screenRef.current === 'arena' || screenRef.current === 'loading_arena') {
            setScreen('multiplayer_lobby');
          }
          showToast('Dikeluarkan dari Ruangan', String(msg.message || 'Host mengeluarkan Anda.'));
          return;
        }

        if (type === 'room:joined' || type === 'room:state' || type === 'room:started') {
          const room = msg.room as SerializedRoomPayload | undefined;
          if (!room) return;

          const nextBoardMode = room.boardMode ?? 'classic';
          const nextTimeLimit = room.timeLimitSec ?? TIME_ATTACK_DEFAULT_SEC;
          setOnlineLobby((prev) => ({
            ...prev,
            roomCode: room.code,
            roomName: room.name || prev.roomName,
            isPublic: room.isPublic ?? prev.isPublic,
            boardMode: nextBoardMode,
            timeLimitSec: nextTimeLimit,
            endsAt: room.endsAt ?? null,
            hostId: room.hostId,
            myPlayerId: msg.playerId ? String(msg.playerId) : prev.myPlayerId,
            status: room.status,
            players: room.players,
            winningTeam: room.winningTeam ?? null,
            error: null,
          }));

          if (room.boardConfig) {
            setActiveBoardConfig(room.boardConfig);
            activeBoardRef.current = room.boardConfig;
          }

          if (type === 'room:started' || room.status === 'playing') {
            lastProcessedEventIdRef.current = room.lastEventId || 0;
            setMode('online');
            setBoardMode(nextBoardMode);
            setTimeLimitSec(nextTimeLimit);
            setTimeEndsAt(room.endsAt ?? null);
            setTurnDeadlineAt(room.turnDeadlineAt ?? null);
            if (room.endsAt) {
              setTimeLeftSec(Math.max(0, Math.ceil((room.endsAt - Date.now()) / 1000)));
            } else {
              setTimeLeftSec(null);
            }
            setPlayers(room.players);
            setCurrentTurnIndex(room.currentTurnIndex);
            setWinner(null);
            setWinningTeam(null);
            setTimeExpired(false);
            setVictoryOpen(false);
            setGlobalRank(null);
            setLastRoll(null);
            if (type === 'room:started') {
              if (screenRef.current !== 'arena') {
                enterArenaWithTransition();
              } else {
                if (room.boardConfig) {
                  engineRef.current?.updateBoardConfig(room.boardConfig);
                }
                engineRef.current?.resetCameraPhase();
              }
            }
          } else {
            setTurnDeadlineAt(null);
          }
          return;
        }

        if (type === 'room:chat_msg') {
          const senderName = String(msg.senderName || 'Pemain');
          const text = String(msg.text || '');
          const timestamp = Number(msg.timestamp || Date.now());
          setOnlineLobby((prev) => ({
            ...prev,
            chatMessages: [
              ...prev.chatMessages.slice(-24),
              {
                senderName,
                text,
                timestamp,
              },
            ],
          }));
          if (screenRef.current === 'arena' && text) {
            setArenaEmote({ id: timestamp, senderName, text });
            window.clearTimeout(emoteTimerRef.current);
            emoteTimerRef.current = window.setTimeout(() => setArenaEmote(null), 3200);
          }
          return;
        }

        if (type === 'game:time_up') {
          const room = msg.room as SerializedRoomPayload | undefined;
          if (!room) return;
          const winP =
            room.players.find((p) => p.id === room.winnerId) ?? pickTimeAttackWinner(room.players);
          setTurnDeadlineAt(null);
          setTurnTimeLeftSec(null);
          setPlayers(room.players);
          setOnlineLobby((prev) => ({
            ...prev,
            status: 'finished',
            players: room.players,
            winningTeam: room.winningTeam ?? null,
          }));
          setTimeLeftSec(0);
          setTimeExpired(true);
          if (winP) {
            const didWin = winP.id === profile.playerId;
            if (didWin) soundEngine.playVictory();
            else soundEngine.playDefeat();
            engineRef.current?.triggerVictoryCamera(winP.id);
            setWinner(winP);
            setWinningTeam(room.winningTeam ?? null);
            setVictoryOpen(true);
            void finalizeMatchProgress(
              winP,
              room.players,
              'online',
              room.boardMode ?? 'time_attack',
              'medium',
              room.winningTeam ?? null,
            );
          }
          return;
        }

        if (type === 'game:turn_event') {
          const eventId = Number(msg.eventId || 0);
          if (eventId <= lastProcessedEventIdRef.current) return;
          lastProcessedEventIdRef.current = eventId;

          const actorId = String(msg.actorId || '');
          const autoRolled = Boolean(msg.autoRolled);
          const resolution = msg.resolution as TurnResolution;
          const room = msg.room as SerializedRoomPayload;
          const actorPlayer = room.players.find((p) => p.id === actorId);

          setIsAnimating(true);
          soundEngine.playDiceRoll();
          if (autoRolled) {
            showToast(
              'Waktu Giliran Habis',
              `Dadu ${actorPlayer?.name ?? 'Pemain'} dilempar otomatis (${resolution.roll}).`,
            );
          }

          void (async () => {
            if (engineRef.current) {
              await engineRef.current.enqueueTurnAnimation(actorId, resolution, room.players, {
                eventId,
                archetypeIndex: actorPlayer?.archetypeIndex,
                onDiceRolled: (val) => setLastRoll(val),
                onHopStep: (stepIdx) => soundEngine.playHop(stepIdx),
                onRungStep: (rungIdx) => soundEngine.playLadderStep(rungIdx),
                onSnakeBite: () => soundEngine.playSnakeSwallow(),
                onSkillVfx: (skillType) => {
                  if (skillType === 'shield' || skillType === 'shield_block') {
                    soundEngine.playSkillCast('defensive');
                  } else if (skillType === 'battle_attack' || skillType === 'curse') {
                    soundEngine.playSkillCast('offensive');
                  } else if (skillType === 'boost') {
                    soundEngine.playSkillCast('movement');
                  } else {
                    soundEngine.playSkillCast('support');
                  }
                },
                onSpecialTriggered: (sType, shieldBlocked) => {
                  if (shieldBlocked) {
                    soundEngine.playShieldBlock();
                  } else {
                    soundEngine.playSpecial(sType);
                    if (resolution.specialHit) {
                      showToast(resolution.specialHit.label, resolution.specialHit.description);
                    }
                  }
                },
                onJumpTriggered: (jType, shieldBlocked) => {
                  if (jType === 'ladder') soundEngine.playLadder();
                  else if (shieldBlocked) soundEngine.playShieldBlock();
                  else soundEngine.playSnake();
                },
                onBattlePush: () => {
                  const bp = resolution.battlePush;
                  if (!bp) return;
                  if (bp.blockedByShield) {
                    soundEngine.playShieldBlock();
                  } else {
                    soundEngine.playClash();
                    showToast(
                      'Serangan Battle Mode!',
                      `${actorPlayer?.name ?? 'Pemain'} mendorong ${bp.targetPlayerName} ke petak ${bp.toTile}`,
                    );
                  }
                },
                onTeamSynergy: () => {
                  if (resolution.teamSynergy) {
                    soundEngine.playSpecial('extra_roll');
                    showToast(
                      'Sinergi Tim!',
                      `+${resolution.teamSynergy.bonusScore} poin kolaborasi tim`,
                    );
                  }
                },
              });
            }

            setPlayers(room.players);
            setCurrentTurnIndex(room.currentTurnIndex);
            setTurnDeadlineAt(room.status === 'playing' ? (room.turnDeadlineAt ?? null) : null);
            setOnlineLobby((prev) => ({
              ...prev,
              status: room.status,
              players: room.players,
              winningTeam: room.winningTeam ?? null,
            }));

            const nextTurnPlayer = room.players[room.currentTurnIndex];
            if (
              document.hidden &&
              room.status === 'playing' &&
              nextTurnPlayer?.id === profile.playerId &&
              profile.notificationsEnabled
            ) {
              void dispatchAppNotification(
                'Giliran Anda di Aether Serpent 3D!',
                'Pemain lain baru saja melempar dadu. Ayo lempar dadu Anda!',
                'online-turn',
              );
            }

            if (room.status === 'finished' && room.winnerId) {
              const winP = room.players.find((p) => p.id === room.winnerId) ?? null;
              if (winP) {
                const winTeam = room.winningTeam ?? null;
                const me = room.players.find((p) => p.id === profile.playerId);
                const didWin =
                  (room.boardMode === 'team' && winTeam && me?.team === winTeam) ||
                  winP.id === profile.playerId;

                if (didWin) soundEngine.playVictory();
                else soundEngine.playDefeat();

                setTimeExpired(false);
                setWinningTeam(winTeam);
                setWinner(winP);
                setVictoryOpen(true);
                void finalizeMatchProgress(
                  winP,
                  room.players,
                  'online',
                  room.boardMode ?? 'classic',
                  'medium',
                  winTeam,
                );
              }
            }
            setIsAnimating(false);
          })();
        }
      };
    });

    wsConnectPromiseRef.current = promise;
    return promise;
  }, [enterArenaWithTransition, finalizeMatchProgress, profile.notificationsEnabled, profile.playerId, showToast]);

  // Auto-open Multiplayer Lobby screen if URL has ?room=CODE (still never drops into arena directly)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.trim().length >= 4) {
      setMultiplayerTabIntent('join');
      setScreen('multiplayer_lobby');
      void ensureWebSocket()
        .then((ws) => {
          ws.send(
            JSON.stringify({
              type: 'room:join',
              code: roomParam.trim().toUpperCase(),
              playerName: profile.name,
              playerId: profile.playerId,
              archetypeIndex: profile.archetypeIndex,
            }),
          );
        })
        .catch(() => {
          // Handled in onlineLobby error state
        });
    }
  }, []);

  // Unified Roll Handler (Solo, Local, or Online)
  const handleRollDice = useCallback(() => {
    if (screen !== 'arena' || isAnimating || winner) return;
    const active = players[currentTurnIndex];
    if (!active) return;

    if (mode === 'online') {
      if (active.id !== onlineLobby.myPlayerId) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'game:roll' }));
      }
      return;
    }

    if (active.isAI) return;
    void executeLocalTurn(currentTurnIndex);
  }, [
    currentTurnIndex,
    executeLocalTurn,
    isAnimating,
    mode,
    onlineLobby.myPlayerId,
    players,
    screen,
    winner,
  ]);

  useEffect(() => {
    rollActionRef.current = handleRollDice;
  }, [handleRollDice]);

  // Keyboard shortcuts inside Arena (Space = Roll, H = Toggle Dock)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'arena') return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (
        e.code === 'Space' &&
        !cameraSettingsOpen &&
        !leaderboardOpen &&
        !achievementsOpen &&
        !cloudOpen &&
        !tutorialOpen &&
        !victoryOpen
      ) {
        e.preventDefault();
        rollActionRef.current();
      } else if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [achievementsOpen, cameraSettingsOpen, cloudOpen, leaderboardOpen, screen, tutorialOpen, victoryOpen]);

  const leaveOnlineRoomIfAny = useCallback(() => {
    if (onlineLobby.roomCode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    setTurnDeadlineAt(null);
    setTurnTimeLeftSec(null);
    setOnlineLobby((prev) => ({
      ...prev,
      roomCode: null,
      players: [],
      status: 'lobby',
      chatMessages: [],
      error: null,
    }));
  }, [onlineLobby.roomCode]);

  const handleReturnToMenu = useCallback(() => {
    window.clearTimeout(loadingTimerRef.current);
    leaveOnlineRoomIfAny();
    setVictoryOpen(false);
    setWinner(null);
    setWinningTeam(null);
    setTimeExpired(false);
    setTimeEndsAt(null);
    setTimeLeftSec(null);
    setInspectedTile(null);
    setIsAnimating(false);
    setScreen('main_menu');
  }, [leaveOnlineRoomIfAny]);

  const handleLogout = useCallback(() => {
    leaveOnlineRoomIfAny();
    const fresh = resetProfileSession();
    setProfile(fresh);
    setOnlineLobby((prev) => ({
      ...prev,
      myPlayerId: fresh.playerId,
    }));
    showToast('Sesi Direset', `Selamat datang kembali, ${fresh.name}`);
  }, [leaveOnlineRoomIfAny, showToast]);

  // Mode Starters (GameConfigView -> LoadingArenaScreen -> Arena)
  const handleStartSolo = (
    playerName: string,
    archetypeIndex: number,
    diff: DifficultyMode,
    aiCount: number,
    nextBoardMode: BoardGameMode,
    nextTimeLimitSec: number,
  ) => {
    const updated = { ...profile, name: playerName, archetypeIndex };
    saveProfile(updated);
    setProfile(updated);

    const human = makePlayer(profile.playerId, playerName, archetypeIndex, false, 'A');
    const list: PlayerState[] = [human];

    if (nextBoardMode === 'team') {
      const allyArch = (archetypeIndex + 1) % 4;
      const opp1Arch = (archetypeIndex + 2) % 4;
      const opp2Arch = (archetypeIndex + 3) % 4;
      list.push(makePlayer('ai-ally', 'Sekutu Surya (AI)', allyArch, true, 'A'));
      list.push(makePlayer('ai-opp-1', 'Penjaga Bulan 1 (AI)', opp1Arch, true, 'B'));
      list.push(makePlayer('ai-opp-2', 'Penjaga Bulan 2 (AI)', opp2Arch, true, 'B'));
    } else {
      for (let i = 0; i < aiCount; i++) {
        const archIdx = (archetypeIndex + i + 1) % 4;
        list.push(makePlayer(`ai-${i + 1}`, `Penjaga ${i + 1} (AI)`, archIdx, true, 'B'));
      }
    }

    setMode('solo');
    setBoardMode(nextBoardMode);
    setDifficulty(diff);
    setTimeLimitSec(nextTimeLimitSec);
    setTurnDeadlineAt(null);
    setTurnTimeLeftSec(null);
    setPlayers(list);
    setCurrentTurnIndex(0);
    setWinner(null);
    setWinningTeam(null);
    setTimeExpired(false);
    setVictoryOpen(false);
    setLastRoll(null);
    setGlobalRank(null);
    if (nextBoardMode === 'time_attack') {
      setTimeEndsAt(Date.now() + nextTimeLimitSec * 1000);
      setTimeLeftSec(nextTimeLimitSec);
    } else {
      setTimeEndsAt(null);
      setTimeLeftSec(null);
    }
    const resolvedBoard = resolveBoardForMatch();
    setActiveBoardConfig(resolvedBoard);
    activeBoardRef.current = resolvedBoard;

    const modeLabel = BOARD_GAME_MODES.find((m) => m.id === nextBoardMode)?.label ?? 'Classic';
    showToast(
      `${modeLabel} · ${resolvedBoard.name}`,
      `Kesulitan AI: ${diff === 'adaptive' ? 'Adaptif' : diff}`,
    );
    enterArenaWithTransition();
  };

  const handleStartLocal = (
    localList: Array<{ name: string; archetypeIndex: number; team: TeamId }>,
    nextBoardMode: BoardGameMode,
    nextTimeLimitSec: number,
  ) => {
    const nextPlayers = localList.map((item, idx) =>
      makePlayer(`local-${idx + 1}`, item.name, item.archetypeIndex, false, item.team),
    );
    setMode('local');
    setBoardMode(nextBoardMode);
    setDifficulty('medium');
    setTimeLimitSec(nextTimeLimitSec);
    setTurnDeadlineAt(null);
    setTurnTimeLeftSec(null);
    setPlayers(nextPlayers);
    setCurrentTurnIndex(0);
    setWinner(null);
    setWinningTeam(null);
    setTimeExpired(false);
    setVictoryOpen(false);
    setLastRoll(null);
    setGlobalRank(null);
    if (nextBoardMode === 'time_attack') {
      setTimeEndsAt(Date.now() + nextTimeLimitSec * 1000);
      setTimeLeftSec(nextTimeLimitSec);
    } else {
      setTimeEndsAt(null);
      setTimeLeftSec(null);
    }

    const resolvedBoard = resolveBoardForMatch();
    setActiveBoardConfig(resolvedBoard);
    activeBoardRef.current = resolvedBoard;

    const modeLabel = BOARD_GAME_MODES.find((m) => m.id === nextBoardMode)?.label ?? 'Classic';
    showToast(
      `${modeLabel} · ${resolvedBoard.name}`,
      `${nextPlayers.length} pemain siap bertanding!`,
    );
    enterArenaWithTransition();
  };

  const handleRematch = () => {
    if (mode === 'online') {
      if (wsRef.current?.readyState === WebSocket.OPEN && onlineLobby.hostId === onlineLobby.myPlayerId) {
        const nextOnlineBoard = resolveBoardForMatch();
        wsRef.current.send(JSON.stringify({ type: 'room:rematch', boardConfig: nextOnlineBoard }));
      }
      setVictoryOpen(false);
      return;
    }
    const reset = players.map((p) => ({
      ...p,
      tile: 1,
      score: 0,
      shields: 0,
      turnsTaken: 0,
      laddersClimbed: 0,
      snakesBitten: 0,
      specialTilesHit: 0,
      shieldsUsed: 0,
      battleHits: 0,
    }));
    const nextBoard = resolveBoardForMatch();
    setActiveBoardConfig(nextBoard);
    activeBoardRef.current = nextBoard;
    engineRef.current?.updateBoardConfig(nextBoard);

    setTurnDeadlineAt(null);
    setTurnTimeLeftSec(null);
    setPlayers(reset);
    setCurrentTurnIndex(0);
    setWinner(null);
    setWinningTeam(null);
    setTimeExpired(false);
    setVictoryOpen(false);
    setLastRoll(null);
    setGlobalRank(null);
    engineRef.current?.resetCameraPhase();
    if (boardMode === 'time_attack') {
      setTimeEndsAt(Date.now() + timeLimitSec * 1000);
      setTimeLeftSec(timeLimitSec);
    }
  };

  const adaptiveInfo = getAdaptiveTierLabel(profile.recentResults);
  const activePlayer = players[currentTurnIndex] ?? players[0];
  const isMyOnlineTurn = mode === 'online' && activePlayer?.id === onlineLobby.myPlayerId;
  const myOnlinePlayer =
    mode === 'online' ? players.find((p) => p.id === onlineLobby.myPlayerId) : undefined;
  const localHero =
    mode === 'solo'
      ? players.find((p) => !p.isAI)
      : mode === 'online'
        ? myOnlinePlayer
        : winner;
  const isLocalWinner = Boolean(
    winner &&
      (boardMode === 'team' && winningTeam
        ? localHero?.team === winningTeam
        : mode === 'solo'
          ? !winner.isAI
          : mode === 'online'
            ? winner.id === onlineLobby.myPlayerId
            : true),
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 1. Dedicated 3D Fantasy Forest / Waterfall / Serpent Mascot Backdrop (outside Arena, Loading & 3D Board Studio) */}
      {isMenuBackdropMounted && <div ref={menuCanvasRef} className="fixed inset-0 z-0" />}

      {/* 2. Dedicated 3D Snakes & Ladders Board Canvas (mounted during Loading & Arena) */}
      {isArenaMounted && (
        <div
          ref={canvasMountRef}
          className={`w-full h-full transition-opacity duration-300 ${
            screen === 'arena' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* 3. Pre-Arena Screens */}
      {screen === 'main_menu' && (
        <MainMenuView
          profile={profile}
          isOnline={isOnline}
          onUpdateProfile={(name, archetypeIndex) => {
            const next = { ...profile, name, archetypeIndex };
            saveProfile(next);
            setProfile(next);
            showToast('Profil Disimpan', name);
          }}
          onToggleMute={() => {
            soundEngine.playUiClick();
            const next = { ...profile, muted: !profile.muted };
            saveProfile(next);
            setProfile(next);
          }}
          onOpenCameraSettings={() => setCameraSettingsOpen(true)}
          onLogout={handleLogout}
          onNavigateModeSelection={() => {
            soundEngine.playUiClick();
            setScreen('mode_selection');
          }}
          onQuickSelectMode={(chosen) => {
            soundEngine.playUiClick();
            setSelectedBoardMode(chosen);
            setScreen('game_config');
          }}
          onOpenMultiplayer={(tab) => {
            soundEngine.playUiClick();
            setMultiplayerTabIntent(tab);
            setScreen('multiplayer_lobby');
          }}
          onOpenTutorial={() => setTutorialOpen(true)}
          onOpenLeaderboard={() => setLeaderboardOpen(true)}
          onOpenAchievements={() => setAchievementsOpen(true)}
          onOpenCloud={() => setCloudOpen(true)}
          onOpenBoardManager={(tab = 'collection') => {
            soundEngine.playUiClick();
            setBoardManagerTab(tab);
            setBoardManagerReturnScreen('main_menu');
            setScreen('board_manager');
          }}
          onOpenOracleAI={() => {
            soundEngine.playUiClick();
            setOracleAiOpen(true);
          }}
        />
      )}

      {screen === 'board_manager' && (
        <BoardManagerView
          initialTab={boardManagerTab}
          graphicsPrefs={graphicsPrefs}
          diceSkinId={profile.diceSkinId}
          onBack={() => {
            soundEngine.playUiClick();
            setScreen(boardManagerReturnScreen);
          }}
          onBoardSelectionChanged={(board) => {
            setActiveBoardConfig(board);
            activeBoardRef.current = board;
          }}
          onPlayWithBoard={(board) => {
            soundEngine.playUiClick();
            selectBoard(board.id, board.isCustom ? 'custom' : 'manual');
            setActiveBoardConfig(board);
            activeBoardRef.current = board;
            setScreen('game_config');
          }}
        />
      )}

      {screen === 'mode_selection' && (
        <ModeSelectionView
          selectedMode={selectedBoardMode}
          onSelectMode={(m) => {
            soundEngine.playUiClick();
            setSelectedBoardMode(m);
          }}
          onBack={() => {
            soundEngine.playUiClick();
            setScreen('main_menu');
          }}
          onProceedToConfig={(chosen) => {
            soundEngine.playUiClick();
            setSelectedBoardMode(chosen);
            setScreen('game_config');
          }}
          onProceedToMultiplayer={(chosen) => {
            soundEngine.playUiClick();
            setSelectedBoardMode(chosen);
            setMultiplayerTabIntent('create');
            setScreen('multiplayer_lobby');
          }}
        />
      )}

      {screen === 'game_config' && (
        <GameConfigView
          boardMode={selectedBoardMode}
          defaultPlayerName={profile.name}
          defaultArchetypeIndex={profile.archetypeIndex}
          adaptiveTier={adaptiveInfo.tier}
          muted={profile.muted}
          selectedDiceSkinId={profile.diceSkinId}
          unlockedAchievements={profile.unlockedAchievements}
          onSelectDiceSkin={handleSelectDiceSkin}
          cameraSettings={cameraSettings}
          onChangeCameraMode={(nextMode) =>
            handleUpdateCameraSettings({ ...cameraSettings, mode: nextMode })
          }
          onOpenCameraSettings={() => setCameraSettingsOpen(true)}
          onToggleMute={() => {
            soundEngine.playUiClick();
            const next = { ...profile, muted: !profile.muted };
            saveProfile(next);
            setProfile(next);
          }}
          onBackToModeSelection={() => {
            soundEngine.playUiClick();
            setScreen('mode_selection');
          }}
          onStartSolo={handleStartSolo}
          onStartLocal={handleStartLocal}
          onOpenBoardManager={(tab = 'creator') => {
            soundEngine.playUiClick();
            setBoardManagerTab(tab);
            setBoardManagerReturnScreen('game_config');
            setScreen('board_manager');
          }}
        />
      )}

      {screen === 'multiplayer_lobby' && (
        <MultiplayerLobbyView
          initialTab={multiplayerTabIntent}
          defaultBoardMode={selectedBoardMode}
          defaultPlayerName={profile.name}
          defaultArchetypeIndex={profile.archetypeIndex}
          isOnlineNetwork={isOnline}
          muted={profile.muted}
          onlineLobby={onlineLobby}
          onBack={() => {
            soundEngine.playUiClick();
            setScreen('main_menu');
          }}
          onToggleMute={() => {
            soundEngine.playUiClick();
            const next = { ...profile, muted: !profile.muted };
            saveProfile(next);
            setProfile(next);
          }}
          onOpenCameraSettings={() => setCameraSettingsOpen(true)}
          onOnlineCreateRoom={(opts) => {
            const chosenBoard = resolveBoardForMatch();
            setActiveBoardConfig(chosenBoard);
            activeBoardRef.current = chosenBoard;
            void ensureWebSocket().then((ws) => {
              ws.send(
                JSON.stringify({
                  type: 'room:create',
                  playerName: opts.playerName,
                  playerId: profile.playerId,
                  archetypeIndex: opts.archetypeIndex,
                  roomName: opts.roomName,
                  isPublic: opts.isPublic,
                  boardMode: opts.boardMode,
                  timeLimitSec: opts.timeLimitSec,
                  boardConfig: chosenBoard,
                }),
              );
            });
          }}
          onOnlineJoinRoom={(code, name, arch) => {
            void ensureWebSocket().then((ws) => {
              ws.send(
                JSON.stringify({
                  type: 'room:join',
                  code,
                  playerName: name,
                  playerId: profile.playerId,
                  archetypeIndex: arch,
                }),
              );
            });
          }}
          onOnlineReady={(ready) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:ready', ready }));
          }}
          onOnlineStart={() => {
            const chosenBoard = resolveBoardForMatch();
            setActiveBoardConfig(chosenBoard);
            activeBoardRef.current = chosenBoard;
            wsRef.current?.send(JSON.stringify({ type: 'room:start', boardConfig: chosenBoard }));
          }}
          onOnlineLeave={leaveOnlineRoomIfAny}
          onOnlineChat={(text) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:chat', text }));
          }}
          onOnlineUpdateSettings={(settings) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:update_settings', ...settings }));
          }}
          onOnlineSetTeam={(targetId, team) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:set_team', targetId, team }));
          }}
          onOnlineKick={(targetId) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:kick', targetId }));
          }}
          onOnlineTransferHost={(targetId) => {
            wsRef.current?.send(JSON.stringify({ type: 'room:transfer_host', targetId }));
          }}
        />
      )}

      {screen === 'loading_arena' && (
        <LoadingArenaScreen
          boardMode={boardMode}
          boardConfig={activeBoardConfig}
          connectionMode={mode}
          difficulty={difficulty}
          players={players}
          progress={arenaLoadProgress}
          stageText={arenaLoadStage}
          qualityLabel={
            QUALITY_PRESETS[resolvePresetTier(graphicsPrefs.preset, deviceCaps)].label
          }
        />
      )}

      {/* 4. Arena-Only HUD & 3D Gameplay Controls */}
      {screen === 'arena' && (
        <>
          {contextLost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 text-center">
              <div className="max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6">
                <h2 className="font-display text-lg font-bold text-amber-300">Tampilan 3D Dijeda</h2>
                <p className="mt-2 text-sm text-slate-300">
                  Konteks grafis WebGL sedang memulihkan diri. Muat ulang halaman jika tampilan tidak segera kembali.
                </p>
              </div>
            </div>
          )}

          <HUDTopBar
            mode={mode}
            boardMode={boardMode}
            difficulty={difficulty}
            adaptiveTier={adaptiveInfo.tier}
            isOnline={isOnline}
            muted={profile.muted}
            onlineRoomCode={mode === 'online' ? onlineLobby.roomCode : null}
            pingMs={mode === 'online' ? myOnlinePlayer?.pingMs ?? lastPingRttRef.current : null}
            timeLeftSec={timeLeftSec}
            timeLimitSec={timeLimitSec}
            turnTimeLeftSec={turnTimeLeftSec}
            isMyOnlineTurn={isMyOnlineTurn}
            isAnimating={isAnimating}
            onToggleMute={() => {
              soundEngine.playUiClick();
              const next = { ...profile, muted: !profile.muted };
              saveProfile(next);
              setProfile(next);
            }}
            onOpenTutorial={() => setTutorialOpen(true)}
            onOpenOracleAI={() => {
              soundEngine.playUiClick();
              setOracleAiOpen(true);
            }}
            onReturnToMenu={handleReturnToMenu}
          />

          <aside className="pointer-events-none fixed top-16 right-4 z-10 hidden lg:flex flex-col gap-1.5 w-56">
            {players.map((p, idx) => {
              const isTurn = idx === currentTurnIndex && !winner;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    isTurn
                      ? 'border-amber-400/75 bg-slate-900/95 text-white shadow-md'
                      : 'border-amber-500/20 bg-slate-900/85 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ArchetypeEmblem archetypeIndex={p.archetypeIndex} className="w-4 h-4 shrink-0" />
                    <span className="truncate font-medium">{p.name}</span>
                    {boardMode === 'team' && p.team && (
                      <span
                        className={`text-[10px] font-bold ${
                          p.team === 'A' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {p.team}
                      </span>
                    )}
                  </div>
                  <span className="font-mono-num text-[11px] font-semibold text-amber-300 shrink-0">
                    P{p.tile}
                  </span>
                </div>
              );
            })}
          </aside>

          {arenaEmote && (
            <div className="pointer-events-none fixed top-16 left-2.5 sm:left-4 z-30 animate-emote-pop">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-slate-950/92 backdrop-blur-md px-3 py-1.5 shadow-xl">
                <span className="text-xl leading-none">{arenaEmote.text}</span>
                <span className="text-xs font-semibold text-amber-200 max-w-[140px] truncate">
                  {arenaEmote.senderName}
                </span>
              </div>
            </div>
          )}

          {inspectedTile && (
            <div className="fixed top-16 left-2.5 right-20 sm:right-auto sm:top-24 sm:left-4 z-20 sm:max-w-xs rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-300">{inspectedTile.title}</div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                    {inspectedTile.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setInspectedTile(null);
                    engineRef.current?.highlightTile(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          <BottomControlDock
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed((c) => !c)}
            players={players}
            currentTurnIndex={currentTurnIndex}
            lastRoll={lastRoll}
            canRoll={!winner}
            isAnimating={isAnimating}
            isMyOnlineTurn={isMyOnlineTurn}
            turnTimeLeftSec={turnTimeLeftSec}
            mode={mode}
            boardMode={boardMode}
            cameraMode={cameraSettings.mode}
            onChangeCameraMode={(nextMode) =>
              handleUpdateCameraSettings({ ...cameraSettings, mode: nextMode })
            }
            onOpenCameraSettings={() => setCameraSettingsOpen(true)}
            onRollDice={handleRollDice}
            onSendEmote={
              mode === 'online'
                ? (emoji) => {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({ type: 'room:chat', text: emoji }));
                    }
                  }
                : undefined
            }
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenAchievements={() => setAchievementsOpen(true)}
            onOpenCloud={() => setCloudOpen(true)}
          />
        </>
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92vw]">
          <div className="rounded-xl border border-amber-500/40 bg-slate-900/95 px-4 py-2.5 text-center shadow-xl">
            <div className="text-xs sm:text-sm font-bold text-amber-300">{toast.title}</div>
            {toast.subtitle && (
              <div className="text-[11px] sm:text-xs text-slate-300 mt-0.5">{toast.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Shared Modals */}
      <LeaderboardModal
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        localScores={localScores}
        isOnline={isOnline}
        currentPlayerName={profile.name}
      />

      <AchievementsDailyModal
        open={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
        profile={profile}
        onUpdateNotifications={(enabled, hour) => {
          const next = { ...profile, notificationsEnabled: enabled, notificationHour: hour };
          saveProfile(next);
          setProfile(next);
        }}
        onSelectDiceSkin={handleSelectDiceSkin}
      />

      <CloudSyncModal
        open={cloudOpen}
        onClose={() => setCloudOpen(false)}
        profile={profile}
        isOnline={isOnline}
        onSyncLinked={(syncCode, pin, updatedAt) => {
          const next = { ...profile, syncCode, syncPin: pin, lastSyncedAt: updatedAt };
          saveProfile(next);
          setProfile(next);
        }}
        onProfileRestored={(restored, syncCode, pin, updatedAt) => {
          const merged: PlayerProfile = {
            ...loadProfile(),
            ...restored,
            syncCode,
            syncPin: pin,
            lastSyncedAt: updatedAt,
          };
          saveProfile(merged);
          setProfile(merged);
        }}
      />

      <InteractiveTutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onComplete={() => {
          if (!profile.tutorialCompleted) {
            const next = { ...profile, tutorialCompleted: true };
            saveProfile(next);
            setProfile(next);
          }
        }}
      />

      <VictoryModal
        open={victoryOpen}
        winner={winner}
        players={players}
        boardMode={boardMode}
        winningTeam={winningTeam}
        timeExpired={timeExpired}
        isLocalWinner={isLocalWinner}
        canRematch={mode !== 'online' || onlineLobby.hostId === onlineLobby.myPlayerId}
        globalRank={globalRank}
        boardName={activeBoardConfig.name}
        onRematch={handleRematch}
        onMainMenu={handleReturnToMenu}
        onClose={() => setVictoryOpen(false)}
      />

      {graphicsPrefs.showDevOverlay && (
        <PerfOverlay
          telemetry={perfTelemetry}
          onRunBenchmark={handleRunBenchmark}
          onClose={() =>
            handleUpdateGraphicsPrefs({ ...graphicsPrefs, showDevOverlay: false })
          }
        />
      )}

      <CameraSettingsModal
        open={cameraSettingsOpen}
        onClose={() => setCameraSettingsOpen(false)}
        settings={cameraSettings}
        onChange={handleUpdateCameraSettings}
        onSnapOverview={(kind) => engineRef.current?.snapCameraOverview(kind)}
        graphicsPrefs={graphicsPrefs}
        onGraphicsChange={handleUpdateGraphicsPrefs}
        deviceCaps={deviceCaps}
      />

      <AetherOracleChatDrawer
        open={oracleAiOpen}
        onClose={() => setOracleAiOpen(false)}
        screen={screen}
        boardConfig={activeBoardConfig}
        boardMode={boardMode}
        difficulty={difficulty}
        players={players}
        currentTurnIndex={currentTurnIndex}
      />
    </div>
  );
}
