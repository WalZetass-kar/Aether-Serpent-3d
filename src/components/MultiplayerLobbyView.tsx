import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Clock,
  Crown,
  Globe,
  Hourglass,
  Lock,
  Play,
  RefreshCw,
  Send,
  Share2,
  Shield,
  Swords,
  Unlock,
  UserCheck,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  BOARD_GAME_MODES,
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  type BoardGameMode,
  type PlayerState,
  type TeamId,
} from '../../shared/gameConfig';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';

export interface OnlineLobbyState {
  connected: boolean;
  connecting: boolean;
  roomCode: string | null;
  roomName: string;
  isPublic: boolean;
  boardMode: BoardGameMode;
  timeLimitSec: number;
  endsAt: number | null;
  hostId: string | null;
  myPlayerId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerState[];
  winningTeam: TeamId | null;
  error: string | null;
  chatMessages: Array<{ senderName: string; text: string; timestamp: number }>;
}

interface PublicRoomSummary {
  code: string;
  name: string;
  hostName: string;
  boardMode: BoardGameMode;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'playing' | 'finished';
}

interface MultiplayerLobbyViewProps {
  initialTab?: 'create' | 'join';
  defaultBoardMode?: BoardGameMode;
  defaultPlayerName: string;
  defaultArchetypeIndex: number;
  isOnlineNetwork: boolean;
  muted: boolean;
  onlineLobby: OnlineLobbyState;
  onBack: () => void;
  onToggleMute: () => void;
  onOpenCameraSettings: () => void;
  onOnlineCreateRoom: (opts: {
    playerName: string;
    archetypeIndex: number;
    roomName: string;
    isPublic: boolean;
    boardMode: BoardGameMode;
    timeLimitSec: number;
  }) => void;
  onOnlineJoinRoom: (code: string, playerName: string, archetypeIndex: number) => void;
  onOnlineReady: (ready: boolean) => void;
  onOnlineStart: () => void;
  onOnlineLeave: () => void;
  onOnlineChat: (text: string) => void;
  onOnlineUpdateSettings: (settings: {
    isPublic?: boolean;
    boardMode?: BoardGameMode;
    roomName?: string;
    timeLimitSec?: number;
  }) => void;
  onOnlineSetTeam: (targetId: string, team: TeamId) => void;
  onOnlineKick: (targetId: string) => void;
  onOnlineTransferHost: (targetId: string) => void;
}

const MODE_ICON: Record<BoardGameMode, React.ReactNode> = {
  classic: <Shield className="w-3.5 h-3.5 text-amber-300" />,
  battle: <Swords className="w-3.5 h-3.5 text-rose-400" />,
  team: <Users className="w-3.5 h-3.5 text-sky-400" />,
  time_attack: <Clock className="w-3.5 h-3.5 text-emerald-400" />,
};

const PREVIEW_MODE_THEME: Record<
  BoardGameMode,
  { glow: string; rim: string; tileGlow: string; tag: string }
> = {
  classic: {
    glow: 'from-amber-500/20 via-emerald-500/10 to-slate-950/80',
    rim: 'border-amber-400/40',
    tileGlow: 'rgba(245, 158, 11, 0.25)',
    tag: 'Suaka Klasik',
  },
  battle: {
    glow: 'from-rose-500/25 via-amber-500/15 to-slate-950/80',
    rim: 'border-rose-400/45',
    tileGlow: 'rgba(244, 63, 94, 0.28)',
    tag: 'Duel Arena',
  },
  team: {
    glow: 'from-sky-500/25 via-amber-500/12 to-slate-950/80',
    rim: 'border-sky-400/45',
    tileGlow: 'rgba(56, 189, 248, 0.28)',
    tag: 'Sinergi 2v2',
  },
  time_attack: {
    glow: 'from-emerald-500/25 via-cyan-500/12 to-slate-950/80',
    rim: 'border-emerald-400/45',
    tileGlow: 'rgba(16, 185, 129, 0.28)',
    tag: 'Pacu Waktu',
  },
};

const SanctuaryPreviewCard: React.FC<{
  boardMode: BoardGameMode;
  roomTitle: string;
  isPublic: boolean;
  players: Array<{ name: string; archetypeIndex: number; ready?: boolean; isHost?: boolean }>;
  timeLimitSec?: number;
}> = ({ boardMode, roomTitle, isPublic, players, timeLimitSec }) => {
  const theme = PREVIEW_MODE_THEME[boardMode];
  const modeMeta = BOARD_GAME_MODES.find((m) => m.id === boardMode) ?? BOARD_GAME_MODES[0];

  const boardCells = Array.from({ length: 25 }, (_, i) => i);
  const ladderCells = new Set([6, 11, 16]);
  const snakeCells = new Set([8, 13, 18]);

  return (
    <div className="glass-panel-soft rounded-2xl border border-amber-500/28 p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
      {/* Ambient Sanctuary Atmospheric Backdrop */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-90`}
      />
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full blur-2xl"
        style={{ background: theme.tileGlow }}
      />

      {/* Top Metadata Strip */}
      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-amber-300">
            <SerpentCrestEmblem className="w-3.5 h-3.5 shrink-0" />
            <span>Pratinjau Arena 3D</span>
          </div>
          <div className="font-display text-sm font-bold text-gold-gradient truncate mt-0.5">
            {roomTitle || 'Arena Aether'}
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold bg-slate-950/75 text-slate-100 shrink-0 ${theme.rim}`}
        >
          {MODE_ICON[boardMode]}
          <span>{modeMeta.label.replace(' Mode', '')}</span>
        </span>
      </div>

      {/* 3D Isometric CSS Sanctuary Diorama */}
      <div className="relative z-10 h-44 flex items-center justify-center overflow-hidden rounded-xl border border-amber-500/20 bg-slate-950/65 shadow-inner">
        {/* Distant Waterfall & Mist Glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-sky-400/15 via-cyan-400/5 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1 w-10 h-12 rounded-b-full bg-gradient-to-b from-sky-300/35 to-transparent blur-sm" />

        {/* Perspective Stage */}
        <div
          className="relative w-44 h-44 flex items-center justify-center"
          style={{ perspective: '680px' }}
        >
          <div
            className="relative w-36 h-36 rounded-lg border-2 border-amber-400/55 bg-slate-900/95 p-1.5 shadow-[0_18px_28px_rgba(2,6,23,0.9)]"
            style={{
              transform: 'rotateX(52deg) rotateZ(-28deg)',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Beveled Stone Grid */}
            <div className="grid grid-cols-5 grid-rows-5 gap-0.5 w-full h-full">
              {boardCells.map((idx) => {
                const isAlt = (Math.floor(idx / 5) + (idx % 5)) % 2 === 0;
                const isLadder = ladderCells.has(idx);
                const isSnake = snakeCells.has(idx);
                const isGoal = idx === 4;
                return (
                  <div
                    key={idx}
                    className={`rounded-[2px] border ${
                      isGoal
                        ? 'bg-amber-400/40 border-amber-300/80'
                        : isLadder
                          ? 'bg-emerald-500/25 border-emerald-400/50'
                          : isSnake
                            ? 'bg-rose-500/25 border-rose-400/50'
                            : isAlt
                              ? 'bg-slate-800/90 border-slate-700/70'
                              : 'bg-slate-900/95 border-amber-500/20'
                    }`}
                  />
                );
              })}
            </div>

            {/* Golden Ladder Rail Overlay */}
            <div
              className="pointer-events-none absolute left-[24%] top-[24%] w-2 h-14 rounded-full border border-amber-300/80 bg-amber-500/45 shadow-[0_0_8px_rgba(251,191,36,0.65)]"
              style={{ transform: 'translateZ(6px) rotate(12deg)' }}
            />

            {/* Emerald Serpent Path Overlay */}
            <div
              className="pointer-events-none absolute right-[24%] top-[26%] w-2.5 h-16 rounded-full border border-emerald-300/80 bg-emerald-500/45 shadow-[0_0_10px_rgba(16,185,129,0.65)]"
              style={{ transform: 'translateZ(7px) rotate(-18deg)' }}
            />

            {/* Elevated 3D Player Crest Tokens */}
            {players.slice(0, 4).map((pl, pIdx) => {
              const positions = [
                'left-2 bottom-2',
                'left-7 bottom-4',
                'right-4 bottom-3',
                'left-4 top-5',
              ];
              return (
                <div
                  key={`${pl.name}-${pIdx}`}
                  className={`absolute ${positions[pIdx % positions.length]} w-6 h-6 rounded-full border border-amber-300/90 bg-slate-950/90 flex items-center justify-center shadow-[0_6px_10px_rgba(0,0,0,0.85)]`}
                  style={{ transform: 'translateZ(14px) rotateZ(28deg) rotateX(-32deg)' }}
                >
                  <ArchetypeEmblem archetypeIndex={pl.archetypeIndex} className="w-3.5 h-3.5" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Environment Caption */}
        <div className="pointer-events-none absolute bottom-2 inset-x-2.5 flex items-center justify-between text-[10px]">
          <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-amber-500/25 text-amber-200 font-semibold">
            {theme.tag}
            {boardMode === 'time_attack' && timeLimitSec ? ` · ${Math.round(timeLimitSec / 60)}m` : ''}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700/80 text-slate-300 inline-flex items-center gap-1">
            {isPublic ? (
              <>
                <Unlock className="w-2.5 h-2.5 text-emerald-400" />
                Publik
              </>
            ) : (
              <>
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                Privat
              </>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Active Slots Strip */}
      <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-1.5">
          {players.slice(0, 4).map((pl, idx) => (
            <div
              key={`${pl.name}-${idx}`}
              title={pl.name}
              className="w-7 h-7 rounded-lg border border-amber-500/35 bg-slate-950/80 flex items-center justify-center"
            >
              <ArchetypeEmblem archetypeIndex={pl.archetypeIndex} className="w-4 h-4" />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="w-7 h-7 rounded-lg border border-dashed border-slate-700/80 bg-slate-950/40 flex items-center justify-center text-[10px] text-slate-500"
            >
              +
            </div>
          ))}
        </div>
        <span className="font-mono-num text-[11px] font-semibold text-amber-200">
          {players.length}/4 Pahlawan
        </span>
      </div>
    </div>
  );
};

export const MultiplayerLobbyView: React.FC<MultiplayerLobbyViewProps> = ({
  initialTab = 'create',
  defaultBoardMode = 'classic',
  defaultPlayerName,
  defaultArchetypeIndex,
  isOnlineNetwork,
  muted,
  onlineLobby,
  onBack,
  onToggleMute,
  onOpenCameraSettings,
  onOnlineCreateRoom,
  onOnlineJoinRoom,
  onOnlineReady,
  onOnlineStart,
  onOnlineLeave,
  onOnlineChat,
  onOnlineUpdateSettings,
  onOnlineSetTeam,
  onOnlineKick,
  onOnlineTransferHost,
}) => {
  const [entryTab, setEntryTab] = useState<'create' | 'join'>(initialTab);
  const [playerName, setPlayerName] = useState(defaultPlayerName);
  const [archetypeIndex, setArchetypeIndex] = useState(defaultArchetypeIndex);
  const [roomTitle, setRoomTitle] = useState(`Arena ${defaultPlayerName}`);
  const [roomIsPublic, setRoomIsPublic] = useState(true);
  const [boardMode, setBoardMode] = useState<BoardGameMode>(defaultBoardMode);
  const [timeLimitSec, setTimeLimitSec] = useState(TIME_ATTACK_DEFAULT_SEC);

  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    setEntryTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setBoardMode(defaultBoardMode);
  }, [defaultBoardMode]);

  const fetchPublicRooms = async () => {
    if (!isOnlineNetwork) return;
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = (await res.json()) as { rooms?: PublicRoomSummary[] };
        setPublicRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch {
      // ignore transient room list error
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    if (!onlineLobby.roomCode && isOnlineNetwork) {
      void fetchPublicRooms();
    }
  }, [onlineLobby.roomCode, isOnlineNetwork, entryTab]);

  const isHost = onlineLobby.hostId === onlineLobby.myPlayerId;
  const meOnline = onlineLobby.players.find((p) => p.id === onlineLobby.myPlayerId);
  const allReady = onlineLobby.players.every((p) => p.id === onlineLobby.hostId || p.ready);
  const readyCount = onlineLobby.players.filter(
    (p) => p.id === onlineLobby.hostId || p.ready,
  ).length;
  const readinessDenominator = Math.max(2, onlineLobby.players.length);
  const readinessProgress = Math.min(1, readyCount / readinessDenominator);
  const canStartMatch =
    onlineLobby.players.length >= 2 && allReady && onlineLobby.status === 'lobby';

  const handleCopyInvite = async (kind: 'link' | 'code') => {
    if (!onlineLobby.roomCode) return;
    const text =
      kind === 'link'
        ? `${window.location.origin}/?room=${onlineLobby.roomCode}`
        : onlineLobby.roomCode;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(kind);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleInviteShare = async () => {
    if (!onlineLobby.roomCode) return;
    const url = `${window.location.origin}/?room=${onlineLobby.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Gabung ke Aether Serpent 3D!',
          text: `Ayo main ular tangga 3D di ruangan "${onlineLobby.roomName}" (Kode: ${onlineLobby.roomCode})`,
          url,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    await handleCopyInvite('link');
  };

  const renderModePicker = (
    selected: BoardGameMode,
    onSelect: (m: BoardGameMode) => void,
    durationSec: number,
    onDurationChange: (s: number) => void,
    disabled = false,
  ) => {
    const activeInfo = BOARD_GAME_MODES.find((m) => m.id === selected) ?? BOARD_GAME_MODES[0];
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-300">Aturan Mode Permainan</label>
          {selected === 'time_attack' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Durasi:</span>
              {[120, 180, 300].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={disabled}
                  onClick={() => onDurationChange(sec)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-num font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
                    durationSec === sec
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {sec / 60}m
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BOARD_GAME_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(m.id)}
              className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                selected === m.id
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                  : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {MODE_ICON[m.id]}
                <span className="truncate">{m.label.replace(' Mode', '')}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{m.shortDesc}</div>
            </button>
          ))}
        </div>
        <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
          {activeInfo.rulesDesc}
        </p>
      </div>
    );
  };

  return (
    <div className="relative z-10 flex flex-col w-full h-full p-4 sm:p-6 lg:px-10 lg:py-7 overflow-y-auto custom-scroll">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          className="glass-panel-soft inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          Kembali ke Menu Utama
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCameraSettings}
            className="glass-panel-soft inline-flex items-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-200 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Kamera</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="glass-panel-soft inline-flex items-center justify-center min-w-[42px] min-h-[42px] rounded-xl text-slate-200 hover:text-amber-200 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <div className="glass-panel-soft rounded-xl px-3.5 py-2 flex items-center gap-2">
            <SerpentCrestEmblem className="w-6 h-6 shrink-0" />
            <span className="font-display text-sm sm:text-base font-bold text-gold-gradient whitespace-nowrap">
              Lobi Multiplayer
            </span>
          </div>
        </div>
      </header>

      {/* Main Lobby Container */}
      <main className="my-auto mx-auto w-full max-w-5xl glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
        {!isOnlineNetwork && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3.5 text-xs text-amber-200">
            Koneksi internet sedang terputus. Hubungkan jaringan untuk membuat atau bergabung ke ruangan daring.
          </div>
        )}

        {onlineLobby.error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/50 p-3 text-xs text-rose-200">
            {onlineLobby.error}
          </div>
        )}

        {!onlineLobby.roomCode ? (
          <div className="space-y-5">
            {/* Sub-header & Create / Join Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-sky-300">
                  Arena Daring Real-Time
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white mt-0.5">
                  Buat atau Gabung Room
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-700">
                <button
                  type="button"
                  onClick={() => setEntryTab('create')}
                  className={`min-h-[38px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    entryTab === 'create'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Buat Room
                </button>
                <button
                  type="button"
                  onClick={() => setEntryTab('join')}
                  className={`min-h-[38px] px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    entryTab === 'join'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Gabung Room
                </button>
              </div>
            </div>

            {/* Player Identity Row */}
            <div className="grid sm:grid-cols-2 gap-3 glass-panel-soft rounded-2xl border border-amber-500/20 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Tampilan Daring
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Bidak Pahlawan
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PLAYER_ARCHETYPES.map((a) => (
                    <button
                      key={a.archetypeIndex}
                      type="button"
                      onClick={() => setArchetypeIndex(a.archetypeIndex)}
                      title={a.title}
                      className={`min-h-[42px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                        archetypeIndex === a.archetypeIndex
                          ? 'border-amber-400 bg-amber-500/20'
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800'
                      }`}
                    >
                      <ArchetypeEmblem archetypeIndex={a.archetypeIndex} className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {entryTab === 'create' ? (
              <div className="grid lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-7 glass-panel-soft rounded-2xl border border-amber-500/20 p-4 sm:p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-bold text-amber-300">
                      Konfigurasi Room Baru (Maks. 4 Pemain)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRoomIsPublic(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          roomIsPublic
                            ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Publik
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomIsPublic(false)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          !roomIsPublic
                            ? 'border-amber-400/60 bg-amber-500/15 text-amber-200'
                            : 'border-slate-700 bg-slate-900 text-slate-400'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Privat
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nama Ruangan
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={roomTitle}
                      onChange={(e) => setRoomTitle(e.target.value)}
                      placeholder="Contoh: Arena Naga Emas"
                      className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {renderModePicker(
                    boardMode,
                    setBoardMode,
                    timeLimitSec,
                    setTimeLimitSec,
                  )}

                  <button
                    type="button"
                    disabled={!isOnlineNetwork || onlineLobby.connecting}
                    onClick={() =>
                      onOnlineCreateRoom({
                        playerName: playerName.trim() || 'Tuan Rumah',
                        archetypeIndex,
                        roomName: roomTitle.trim() || `Arena ${playerName.trim() || 'Aether'}`,
                        isPublic: roomIsPublic,
                        boardMode,
                        timeLimitSec,
                      })
                    }
                    className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-lg"
                  >
                    <Globe className="w-4 h-4" />
                    {onlineLobby.connecting ? 'Menghubungkan ke Server...' : 'Buat Room Sekarang'}
                  </button>
                </div>

                <div className="lg:col-span-5">
                  <SanctuaryPreviewCard
                    boardMode={boardMode}
                    roomTitle={roomTitle.trim() || `Arena ${playerName.trim() || 'Aether'}`}
                    isPublic={roomIsPublic}
                    timeLimitSec={timeLimitSec}
                    players={[
                      {
                        name: playerName.trim() || 'Tuan Rumah',
                        archetypeIndex,
                        ready: true,
                        isHost: true,
                      },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-5 gap-4">
                {/* Join by Code */}
                <div className="lg:col-span-2 glass-panel-soft rounded-2xl border border-amber-500/20 p-4 space-y-3">
                  <div className="text-sm font-bold text-gold-gradient">Gabung via Kode Room</div>
                  <p className="text-xs text-slate-400">
                    Masukkan kode 6 karakter dari teman atau host ruangan privat.
                  </p>
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: A7K9P2"
                    className="w-full min-h-[44px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-base font-mono-num uppercase tracking-wider text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    disabled={!isOnlineNetwork || joinCode.trim().length < 4 || onlineLobby.connecting}
                    onClick={() =>
                      onOnlineJoinRoom(
                        joinCode.trim(),
                        playerName.trim() || 'Penjelajah',
                        archetypeIndex,
                      )
                    }
                    className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {onlineLobby.connecting ? 'Menghubungkan...' : 'Masuk ke Room'}
                  </button>
                </div>

                {/* Public Room Browser */}
                <div className="lg:col-span-3 glass-panel-soft rounded-2xl border border-amber-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">Ruang Publik Aktif</span>
                    <button
                      type="button"
                      onClick={() => void fetchPublicRooms()}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                      Segarkan
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto custom-scroll space-y-2">
                    {publicRooms.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-500">
                        Belum ada ruang publik aktif saat ini. Buat ruang baru atau masukkan kode privat.
                      </div>
                    ) : (
                      publicRooms.map((r) => {
                        const modeMeta = BOARD_GAME_MODES.find((m) => m.id === r.boardMode);
                        const fullOrBusy = r.playerCount >= r.maxPlayers || r.status !== 'lobby';
                        return (
                          <div
                            key={r.code}
                            className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-slate-900/80 px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white truncate">
                                <span className="truncate">{r.name}</span>
                                <span className="font-mono-num text-xs text-amber-300">
                                  ({r.code})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Host: {r.hostName} · {modeMeta?.label.replace(' Mode', '')} ·{' '}
                                {r.playerCount}/{r.maxPlayers} Pemain
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={!isOnlineNetwork || fullOrBusy || onlineLobby.connecting}
                              onClick={() =>
                                onOnlineJoinRoom(
                                  r.code,
                                  playerName.trim() || 'Penjelajah',
                                  archetypeIndex,
                                )
                              }
                              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {r.status === 'playing'
                                ? 'Berlangsung'
                                : r.playerCount >= r.maxPlayers
                                  ? 'Penuh'
                                  : 'Gabung'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Active Room Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 glass-panel-soft rounded-2xl border border-amber-500/28 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{onlineLobby.roomName}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-200 font-medium">
                    {onlineLobby.isPublic ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                        Publik
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        Privat
                      </>
                    )}
                  </span>
                  <span>·</span>
                  <span className="text-amber-300 font-semibold">
                    {onlineLobby.status === 'lobby'
                      ? 'Menunggu di Lobi'
                      : onlineLobby.status === 'playing'
                        ? 'Sedang Bermain'
                        : 'Selesai'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-mono-num text-2xl font-bold text-gold-gradient tracking-widest">
                    {onlineLobby.roomCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyInvite('code')}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                  >
                    {copiedType === 'code' ? 'Kode Disalin' : 'Salin Kode'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleInviteShare()}
                  className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 py-2 rounded-xl border border-amber-500/30 bg-slate-900/80 text-xs font-semibold text-slate-100 hover:bg-slate-800 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'link' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Share2 className="w-4 h-4 text-amber-300" />
                  )}
                  {copiedType === 'link' ? 'Tautan Disalin' : 'Undang Teman'}
                </button>
                <button
                  type="button"
                  onClick={onOnlineLeave}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs font-semibold text-rose-300 hover:bg-rose-950/75 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Keluar Ruang
                </button>
              </div>
            </div>

            {/* Animated Progress Rings: Room Readiness + 20s Turn Policy */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3.5 glass-panel-soft rounded-2xl border border-amber-500/20 p-3.5">
                <AnimatedProgressRing
                  progress={readinessProgress}
                  size={52}
                  strokeWidth={4}
                  tone={canStartMatch ? 'emerald' : 'amber'}
                  pulse
                >
                  <span className="font-mono-num text-xs font-bold text-white">
                    {readyCount}/{onlineLobby.players.length}
                  </span>
                </AnimatedProgressRing>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white">
                    {canStartMatch
                      ? 'Semua Pahlawan Siap!'
                      : onlineLobby.players.length < 2
                        ? 'Menunggu Pemain Lain'
                        : 'Menunggu Kesiapan Pemain'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    {canStartMatch
                      ? 'Host dapat memulai laga agar seluruh pemain masuk arena bersamaan.'
                      : 'Minimal 2 pemain & semua tamu wajib menekan tombol Siap.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 glass-panel-soft rounded-2xl border border-amber-500/25 p-3.5">
                <AnimatedProgressRing
                  progress={1}
                  size={52}
                  strokeWidth={4}
                  tone="amber"
                  pulse
                >
                  <span className="font-mono-num text-xs font-bold text-amber-200">
                    {ONLINE_TURN_TIMEOUT_SEC}d
                  </span>
                </AnimatedProgressRing>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                    <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                    Batas Waktu Giliran Daring
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Setiap pemain memiliki {ONLINE_TURN_TIMEOUT_SEC} detik untuk melempar dadu sebelum sistem melempar otomatis.
                  </p>
                </div>
              </div>
            </div>

            {/* Host Settings & Player Roster */}
            <div className="grid lg:grid-cols-12 gap-4">
              {/* Left: Sanctuary Preview + Mode & Host Settings + Chat */}
              <div className="lg:col-span-5 space-y-4">
                <SanctuaryPreviewCard
                  boardMode={onlineLobby.boardMode}
                  roomTitle={onlineLobby.roomName}
                  isPublic={onlineLobby.isPublic}
                  timeLimitSec={onlineLobby.timeLimitSec}
                  players={onlineLobby.players.map((p) => ({
                    name: p.name,
                    archetypeIndex: p.archetypeIndex,
                    ready: p.ready,
                    isHost: p.id === onlineLobby.hostId,
                  }))}
                />

                <div className="glass-panel-soft rounded-2xl border border-amber-500/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {isHost && onlineLobby.status === 'lobby'
                        ? 'Pengaturan Tuan Rumah'
                        : 'Aturan Pertandingan'}
                    </span>
                    {isHost && onlineLobby.status === 'lobby' && (
                      <button
                        type="button"
                        onClick={() => onOnlineUpdateSettings({ isPublic: !onlineLobby.isPublic })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-amber-400 cursor-pointer"
                      >
                        {onlineLobby.isPublic ? (
                          <>
                            <Lock className="w-3 h-3 text-amber-300" />
                            Set Privat
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-300" />
                            Set Publik
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {renderModePicker(
                    onlineLobby.boardMode,
                    (m) => onOnlineUpdateSettings({ boardMode: m }),
                    onlineLobby.timeLimitSec,
                    (s) => onOnlineUpdateSettings({ timeLimitSec: s }),
                    !isHost || onlineLobby.status !== 'lobby',
                  )}
                </div>

                {/* Lobby Chat */}
                <div className="glass-panel-soft rounded-2xl border border-amber-500/20 p-4 space-y-2.5">
                  <div className="text-xs font-bold text-slate-300">Obrolan Lobi</div>
                  <div className="h-28 overflow-y-auto custom-scroll space-y-1 text-xs pr-1">
                    {onlineLobby.chatMessages.length === 0 ? (
                      <div className="text-slate-500 text-[11px] py-4 text-center">
                        Sapa pemain lain sebelum pertandingan dimulai...
                      </div>
                    ) : (
                      onlineLobby.chatMessages.map((m, i) => (
                        <div key={`${m.timestamp}-${i}`} className="text-slate-300">
                          <span className="font-bold text-amber-300">{m.senderName}: </span>
                          <span>{m.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!chatInput.trim()) return;
                      onOnlineChat(chatInput.trim());
                      setChatInput('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      maxLength={140}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Kirim pesan ke lobi..."
                      className="flex-1 min-h-[38px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      aria-label="Kirim Pesan"
                      className="min-w-[40px] min-h-[38px] inline-flex items-center justify-center rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Right: Players in Room */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Daftar Pemain ({onlineLobby.players.length}/4)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Semua pemain akan masuk arena secara serentak
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  {onlineLobby.players.map((p) => {
                    const isPlayerHost = p.id === onlineLobby.hostId;
                    const isSelf = p.id === onlineLobby.myPlayerId;
                    const isPlayerReady = isPlayerHost || Boolean(p.ready);
                    const arch = PLAYER_ARCHETYPES[p.archetypeIndex % PLAYER_ARCHETYPES.length];
                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border p-3.5 space-y-2.5 ${
                          isSelf
                            ? 'border-amber-400/55 bg-slate-900/90'
                            : 'border-slate-700/80 bg-slate-900/65'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AnimatedProgressRing
                              progress={isPlayerReady ? 1 : 0.22}
                              size={42}
                              strokeWidth={3}
                              tone={isPlayerHost ? 'amber' : isPlayerReady ? 'emerald' : 'sky'}
                              pulse={isPlayerReady}
                            >
                              <ArchetypeEmblem
                                archetypeIndex={p.archetypeIndex}
                                className="w-4 h-4"
                              />
                            </AnimatedProgressRing>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                                <span className="truncate">{p.name}</span>
                                {isPlayerHost && (
                                  <Crown
                                    className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                    aria-label="Host"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span className="truncate">{arch.title}</span>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1">
                                  {p.connected !== false ? (
                                    <Wifi className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <WifiOff className="w-3 h-3 text-rose-400" />
                                  )}
                                  {typeof p.pingMs === 'number' ? `${p.pingMs}ms` : 'Online'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[11px] font-bold whitespace-nowrap ${
                              isPlayerHost
                                ? 'text-amber-300'
                                : p.ready
                                  ? 'text-emerald-300'
                                  : 'text-slate-400'
                            }`}
                          >
                            {isPlayerHost ? 'Host' : p.ready ? 'Siap' : 'Menunggu'}
                          </span>
                        </div>

                        {(onlineLobby.boardMode === 'team' || (isHost && !isSelf)) && (
                          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
                            {onlineLobby.boardMode === 'team' && (
                              <button
                                type="button"
                                disabled={!isHost && !isSelf}
                                onClick={() =>
                                  onOnlineSetTeam(p.id, p.team === 'A' ? 'B' : 'A')
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer disabled:opacity-60 disabled:cursor-default ${
                                  p.team === 'A'
                                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                                    : 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                                }`}
                              >
                                {p.team === 'A' ? 'Tim Surya' : 'Tim Bulan'}
                              </button>
                            )}

                            {isHost && !isSelf && onlineLobby.status === 'lobby' && (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <button
                                  type="button"
                                  onClick={() => onOnlineTransferHost(p.id)}
                                  title="Jadikan Host"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-amber-300 hover:bg-slate-700 cursor-pointer"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  Host
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onOnlineKick(p.id)}
                                  title="Keluarkan dari ruangan"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300 hover:bg-rose-900/70 cursor-pointer"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  Keluarkan
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Ready / Start CTA */}
                <div className="pt-2">
                  {isHost ? (
                    <button
                      type="button"
                      disabled={!canStartMatch}
                      onClick={onOnlineStart}
                      className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-sm hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg"
                    >
                      <Play className="w-4 h-4" />
                      {onlineLobby.players.length < 2
                        ? 'Menunggu Minimal 2 Pemain...'
                        : !allReady
                          ? 'Menunggu Semua Pemain Menekan Siap...'
                          : 'Mulai Laga Daring'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOnlineReady(!meOnline?.ready)}
                      className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
                        meOnline?.ready
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {meOnline?.ready ? 'Saya Siap! (Klik untuk Batal)' : 'Saya Siap Bertanding'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
