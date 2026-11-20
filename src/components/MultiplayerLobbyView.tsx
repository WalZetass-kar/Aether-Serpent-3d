import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Clock,
  Crown,
  DoorOpen,
  Globe,
  Hourglass,
  Lock,
  Play,
  PlusSquare,
  RefreshCw,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
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
  isPawnUnlocked,
  type BoardGameMode,
  type PlayerState,
  type TeamId,
} from '../../shared/gameConfig';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';
import { fetchPublicActiveRoomsFromFirebase } from '../services/firebaseAccountService';

export interface OnlineLobbyState {
  connected: boolean;
  connecting: boolean;
  transportMode?: 'ws' | 'http';
  wsReadyState?: 'open' | 'connecting' | 'closed';
  pingMs?: number | null;
  lastSyncAt?: number | null;
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
  chatMessages: Array<{ senderId?: string; senderName: string; text: string; timestamp: number }>;
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
  unlockedPawnIndices?: number[];
  isOnlineNetwork: boolean;
  muted: boolean;
  onlineLobby: OnlineLobbyState;
  onBack: () => void;
  onOpenPawnShowcase?: () => void;
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
  onOnlineReady: (ready: boolean, targetId?: string) => void;
  onOnlineReadyAll?: () => void;
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
  classic: <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
  battle: <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  team: <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  time_attack: <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
};

const PREVIEW_MODE_THEME: Record<
  BoardGameMode,
  { glow: string; rim: string; tileGlow: string; tag: string }
> = {
  classic: {
    glow: 'from-amber-500/20 via-emerald-500/10 to-slate-950/90',
    rim: 'border-amber-400/45 text-amber-200',
    tileGlow: 'rgba(245, 158, 11, 0.22)',
    tag: 'Suaka Klasik · 100 Petak',
  },
  battle: {
    glow: 'from-rose-500/22 via-amber-500/12 to-slate-950/90',
    rim: 'border-rose-400/45 text-rose-200',
    tileGlow: 'rgba(244, 63, 94, 0.24)',
    tag: 'Duel Arena · Tabrak Lawan',
  },
  team: {
    glow: 'from-sky-500/22 via-amber-500/12 to-slate-950/90',
    rim: 'border-sky-400/45 text-sky-200',
    tileGlow: 'rgba(56, 189, 248, 0.24)',
    tag: 'Sinergi 2v2 · Surya vs Bulan',
  },
  time_attack: {
    glow: 'from-emerald-500/22 via-cyan-500/12 to-slate-950/90',
    rim: 'border-emerald-400/45 text-emerald-200',
    tileGlow: 'rgba(16, 185, 129, 0.24)',
    tag: 'Pacu Waktu · Skor Tertinggi',
  },
};

const PREVIEW_GRID_TILES: Array<{
  num: number;
  kind?: 'start' | 'goal' | 'ladder' | 'snake' | 'blessing';
}> = [
  { num: 81 },
  { num: 84, kind: 'snake' },
  { num: 88, kind: 'ladder' },
  { num: 95, kind: 'snake' },
  { num: 100, kind: 'goal' },
  { num: 80 },
  { num: 74, kind: 'ladder' },
  { num: 68 },
  { num: 64, kind: 'blessing' },
  { num: 61 },
  { num: 41 },
  { num: 45, kind: 'ladder' },
  { num: 50, kind: 'blessing' },
  { num: 54, kind: 'snake' },
  { num: 60 },
  { num: 40 },
  { num: 35, kind: 'snake' },
  { num: 28, kind: 'ladder' },
  { num: 24 },
  { num: 21 },
  { num: 1, kind: 'start' },
  { num: 6, kind: 'ladder' },
  { num: 12 },
  { num: 16, kind: 'snake' },
  { num: 20 },
];

const SanctuaryPreviewCard: React.FC<{
  boardMode: BoardGameMode;
  roomTitle: string;
  isPublic: boolean;
  players: Array<{ name: string; archetypeIndex: number; ready?: boolean; isHost?: boolean }>;
  timeLimitSec?: number;
}> = ({ boardMode, roomTitle, isPublic, players, timeLimitSec }) => {
  const theme = PREVIEW_MODE_THEME[boardMode];
  const modeMeta = BOARD_GAME_MODES.find((m) => m.id === boardMode) ?? BOARD_GAME_MODES[0];

  return (
    <div className="w-full min-w-0 glass-panel-soft rounded-2xl border border-amber-500/28 p-3.5 sm:p-5 flex flex-col justify-between gap-3 relative overflow-hidden">
      {/* Ambient Sanctuary Atmospheric Backdrop */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-90`}
      />
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl"
        style={{ background: theme.tileGlow }}
      />

      {/* Top Metadata Strip */}
      <div className="relative z-10 flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-amber-300 min-w-0">
            <SerpentCrestEmblem className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pratinjau Papan 3D</span>
          </div>
          <div className="font-display text-xs sm:text-sm font-bold text-gold-gradient truncate mt-0.5">
            {roomTitle || 'Arena Aether'}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold bg-slate-950/85 ${theme.rim}`}
          >
            {MODE_ICON[boardMode]}
            <span className="truncate max-w-[70px]">{modeMeta.label.replace(' Mode', '')}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-950/85 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
            {isPublic ? (
              <>
                <Unlock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span>Publik</span>
              </>
            ) : (
              <>
                <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>Privat</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Crisp Sanctuary Board Stage with SVG Ladders & Serpents */}
      <div className="relative z-10 flex-1 flex flex-col justify-between rounded-xl border border-amber-500/25 bg-slate-950/85 p-2 sm:p-3 shadow-inner overflow-hidden gap-2">
        {/* Subtle Sanctuary Horizon Glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-amber-400/10 via-sky-400/5 to-transparent" />

        {/* Precision 5x5 Sanctuary Board Grid + Crisp Vector Ladders & Snakes */}
        <div className="relative my-auto mx-auto w-full max-w-[164px] sm:max-w-[196px] aspect-square rounded-xl border-2 border-amber-400/45 bg-slate-900/95 p-1.5 shadow-[0_10px_24px_rgba(2,6,23,0.85)] overflow-hidden shrink-0">
          <div className="grid grid-cols-5 grid-rows-5 gap-1 w-full h-full">
            {PREVIEW_GRID_TILES.map((cell, idx) => {
              const isAlt = (Math.floor(idx / 5) + (idx % 5)) % 2 === 0;
              return (
                <div
                  key={cell.num}
                  className={`relative min-w-0 min-h-0 overflow-hidden rounded border flex items-center justify-center text-[9px] font-mono-num select-none ${
                    cell.kind === 'goal'
                      ? 'bg-gradient-to-br from-amber-400/35 to-amber-600/25 border-amber-300/80 text-amber-200 font-bold'
                      : cell.kind === 'start'
                        ? 'bg-emerald-500/20 border-emerald-400/65 text-emerald-200 font-bold'
                        : cell.kind === 'ladder'
                          ? 'bg-amber-500/15 border-amber-400/45 text-amber-200'
                          : cell.kind === 'snake'
                            ? 'bg-rose-500/15 border-rose-400/45 text-rose-200'
                            : cell.kind === 'blessing'
                              ? 'bg-sky-500/15 border-sky-400/45 text-sky-200'
                              : isAlt
                                ? 'bg-slate-800/90 border-slate-700/75 text-slate-300'
                                : 'bg-slate-900/95 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="leading-none">{cell.num}</span>
                </div>
              );
            })}
          </div>

          {/* Crisp SVG Golden Ladders & Glowing Emerald Serpents Overlay */}
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 w-full h-full"
            aria-hidden="true"
          >
            {/* Golden Ladder 1 (Bottom-Left to Mid-Left) */}
            <g stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
              <line x1="27" y1="86" x2="31" y2="32" />
              <line x1="33" y1="86" x2="37" y2="32" />
              <line x1="27.5" y1="76" x2="33.5" y2="76" strokeWidth="1.2" />
              <line x1="28.3" y1="64" x2="34.3" y2="64" strokeWidth="1.2" />
              <line x1="29.2" y1="52" x2="35.2" y2="52" strokeWidth="1.2" />
              <line x1="30.1" y1="40" x2="36.1" y2="40" strokeWidth="1.2" />
            </g>

            {/* Golden Ladder 2 (Mid-Center to Top-Center) */}
            <g stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" opacity="0.85">
              <line x1="48" y1="66" x2="54" y2="14" />
              <line x1="53" y1="66" x2="59" y2="14" />
              <line x1="49" y1="55" x2="54" y2="55" strokeWidth="1.1" />
              <line x1="50.5" y1="42" x2="55.5" y2="42" strokeWidth="1.1" />
              <line x1="52" y1="28" x2="57" y2="28" strokeWidth="1.1" />
            </g>

            {/* Emerald Serpent Path (Top-Right to Lower-Right) */}
            <path
              d="M 74 14 C 62 28, 86 44, 70 60 C 58 72, 78 80, 68 88"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d="M 74 14 C 62 28, 86 44, 70 60 C 58 72, 78 80, 68 88"
              fill="none"
              stroke="#a7f3d0"
              strokeWidth="0.9"
              strokeDasharray="2 2.5"
              strokeLinecap="round"
            />
            <circle cx="74" cy="14" r="2.6" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />
          </svg>

          {/* Active Player Tokens on Start Tile */}
          <div className="pointer-events-none absolute left-1.5 bottom-1.5 flex items-center -space-x-1.5">
            {players.slice(0, 4).map((pl, pIdx) => (
              <div
                key={`${pl.name}-${pIdx}`}
                className="w-5 h-5 rounded-full border border-amber-300 bg-slate-950/95 flex items-center justify-center shadow-md"
              >
                <ArchetypeEmblem archetypeIndex={pl.archetypeIndex} className="w-3 h-3" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Stage Caption */}
        <div className="relative z-10 flex items-center justify-between gap-1.5 text-[10px] min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-amber-500/25 text-amber-200 font-semibold truncate min-w-0">
            {theme.tag}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300 font-mono-num shrink-0">
            {boardMode === 'time_attack' && timeLimitSec
              ? `${Math.round(timeLimitSec / 60)} Menit`
              : `${ONLINE_TURN_TIMEOUT_SEC}d / Giliran`}
          </span>
        </div>
      </div>

      {/* Bottom 4 Symmetrical Player Slots */}
      <div className="relative z-10 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold text-slate-400 truncate">Slot Pahlawan Ruangan</span>
          <span className="font-mono-num font-bold text-amber-300 shrink-0">
            {players.length}/4 Pemain
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, idx) => {
            const pl = players[idx];
            return pl ? (
              <div
                key={`slot-${idx}`}
                title={pl.name}
                className="min-w-0 overflow-hidden flex flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/35 bg-slate-950/85 px-2 py-1.5 text-center"
              >
                <ArchetypeEmblem archetypeIndex={pl.archetypeIndex} className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-semibold text-slate-200 truncate w-full">
                  {pl.name}
                </span>
              </div>
            ) : (
              <div
                key={`slot-empty-${idx}`}
                className="min-w-0 overflow-hidden flex flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/40 px-2 py-1.5 text-center"
              >
                <span className="text-xs font-bold text-slate-500 leading-none">+</span>
                <span className="text-[10px] text-slate-500 truncate w-full">Kosong</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const MultiplayerLobbyView: React.FC<MultiplayerLobbyViewProps> = ({
  initialTab = 'create',
  defaultBoardMode = 'classic',
  defaultPlayerName,
  defaultArchetypeIndex,
  unlockedPawnIndices,
  isOnlineNetwork,
  muted,
  onlineLobby,
  onBack,
  onOpenPawnShowcase,
  onToggleMute,
  onOpenCameraSettings,
  onOnlineCreateRoom,
  onOnlineJoinRoom,
  onOnlineReady,
  onOnlineReadyAll,
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

  const meOnline = onlineLobby.players.find((p) => p.id === onlineLobby.myPlayerId);

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
      const [apiRes, fbRooms] = await Promise.all([
        fetch('/api/rooms').catch(() => null),
        fetchPublicActiveRoomsFromFirebase().catch(() => []),
      ]);
      const byCode = new Map<string, PublicRoomSummary>();
      if (apiRes && apiRes.ok) {
        const data = (await apiRes.json()) as { rooms?: PublicRoomSummary[] };
        for (const r of Array.isArray(data.rooms) ? data.rooms : []) {
          if (r && r.code && r.status !== 'finished') {
            byCode.set(r.code.toUpperCase(), r);
          }
        }
      }
      for (const fr of fbRooms) {
        if (!fr || !fr.code || fr.status === 'finished') continue;
        const codeKey = fr.code.toUpperCase();
        if (!byCode.has(codeKey)) {
          byCode.set(codeKey, fr);
        }
      }
      setPublicRooms(Array.from(byCode.values()));
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

  const isHost =
    Boolean(
      onlineLobby.hostId &&
        onlineLobby.myPlayerId &&
        onlineLobby.hostId === onlineLobby.myPlayerId,
    ) || onlineLobby.players[0]?.id === onlineLobby.myPlayerId;
  const hasMinPlayers = onlineLobby.players.length >= 2;
  const allReady =
    hasMinPlayers &&
    onlineLobby.players.every(
      (p, idx) => p.id === onlineLobby.hostId || idx === 0 || Boolean(p.ready),
    );
  const readyCount = onlineLobby.players.filter(
    (p, idx) => p.id === onlineLobby.hostId || idx === 0 || Boolean(p.ready),
  ).length;
  const unreadyGuests = onlineLobby.players.filter(
    (p, idx) => p.id !== onlineLobby.hostId && idx !== 0 && !p.ready,
  );
  const readinessDenominator = Math.max(2, onlineLobby.players.length);
  const readinessProgress = Math.min(1, readyCount / readinessDenominator);
  // Allow Host to click Start as soon as >= 2 players are in the lobby (starting automatically marks all players ready)
  const canStartMatch =
    hasMinPlayers && onlineLobby.status === 'lobby' && !onlineLobby.connecting;

  const [deployGuideOpen, setDeployGuideOpen] = useState(false);

  const buildInviteUrl = () => {
    const params = new URLSearchParams();
    params.set('room', onlineLobby.roomCode || '');
    if (onlineLobby.roomName) params.set('name', onlineLobby.roomName);
    if (onlineLobby.boardMode) params.set('mode', onlineLobby.boardMode);
    return `${window.location.origin}/?${params.toString()}`;
  };

  const handleCopyInvite = async (kind: 'link' | 'code') => {
    if (!onlineLobby.roomCode) return;
    const text = kind === 'link' ? buildInviteUrl() : onlineLobby.roomCode;
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
    const url = buildInviteUrl();
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
      <div className="space-y-2.5 min-w-0">
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
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono-num font-bold border transition-colors cursor-pointer disabled:opacity-50 ${
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

        {/* 4 Compact Mode Cards Side-by-Side (Bounded with min-w-0 & overflow-hidden) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 items-stretch">
          {BOARD_GAME_MODES.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(m.id)}
                className={`h-full min-w-0 overflow-hidden p-1.5 sm:p-2.5 rounded-xl border flex flex-col items-center sm:items-start justify-center gap-1 text-center sm:text-left transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-sm'
                    : 'border-slate-700 bg-slate-900/75 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="w-full min-w-0 flex flex-col sm:flex-row items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold">
                  {MODE_ICON[m.id]}
                  <span className="min-w-0 w-full sm:w-auto sm:flex-1 truncate">
                    {m.label.replace(' Mode', '')}
                  </span>
                </div>
                <div className="hidden md:block w-full text-[10px] text-slate-400 truncate">
                  {m.shortDesc}
                </div>
              </button>
            );
          })}
        </div>

        <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-300 leading-relaxed">
          {activeInfo.rulesDesc}
        </p>
      </div>
    );
  };

  return (
    <div className="relative z-10 flex flex-col w-full h-full safe-page-scroll overflow-x-hidden overflow-y-auto custom-scroll">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-4 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="glass-panel-soft inline-flex items-center gap-1.5 sm:gap-2 min-h-[40px] sm:min-h-[44px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Menu Utama</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenCameraSettings}
            className="glass-panel-soft inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[42px] px-2.5 sm:px-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-200 cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Kamera</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="glass-panel-soft inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-[42px] sm:min-h-[42px] rounded-xl text-slate-200 hover:text-amber-200 cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <div className="glass-panel-soft rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2">
            <SerpentCrestEmblem className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <span className="font-display text-xs sm:text-base font-bold text-gold-gradient whitespace-nowrap">
              Lobi Daring
            </span>
          </div>
        </div>
      </header>

      {/* Main Lobby Container (shrink-0 & overflow-x-hidden prevents horizontal scrolling or card clipping) */}
      <main className="my-auto mx-auto w-full max-w-6xl shrink-0 overflow-x-hidden overflow-y-hidden glass-panel-lobby rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 space-y-4">
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

        {/* Network Transport Status & Cloud Deployment Helper Strip */}
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/80 px-3.5 py-2.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-bold ${
                  onlineLobby.transportMode === 'http'
                    ? 'border-sky-400/45 bg-sky-500/15 text-sky-200'
                    : 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {onlineLobby.transportMode === 'http'
                    ? 'Mode Cloud HTTP Sync (Kompatibel Vercel Serverless)'
                    : 'Mode WebSocket Real-Time + Cloud Sync'}
                </span>
              </span>
              {onlineLobby.pingMs ? (
                <span className="font-mono-num text-[11px] text-slate-400">
                  Ping ~{onlineLobby.pingMs}ms
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setDeployGuideOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{deployGuideOpen ? 'Tutup Info Deploy' : 'Tips Main Daring & Deploy'}</span>
            </button>
          </div>

          {deployGuideOpen && (
            <div className="grid sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/90 text-[11px] text-slate-300 leading-relaxed">
              <div className="rounded-xl border border-sky-500/25 bg-slate-900/80 p-3 space-y-1">
                <div className="font-bold text-sky-300">
                  1. Bermain di Vercel (Serverless HTTP Sync)
                </div>
                <p className="text-slate-400">
                  Vercel tidak menyediakan server WebSocket permanen, sehingga game ini otomatis beralih ke{' '}
                  <strong className="text-slate-200">HTTP Cloud Sync (`/api/mp/*`)</strong> dengan sinkronisasi cadangan antar-pemain setiap 1 detik. Gunakan tombol{' '}
                  <strong className="text-amber-300">Undang Teman</strong> atau{' '}
                  <strong className="text-amber-300">Kode 6 Digit</strong> untuk langsung bergabung.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/25 bg-slate-900/80 p-3 space-y-1">
                <div className="font-bold text-emerald-300">
                  2. Rekomendasi Hosting Full WebSocket (&lt;30ms)
                </div>
                <p className="text-slate-400">
                  Ingin koneksi WebSocket penuh tanpa batas serverless? Deploy repo yang sama (sudah ada{' '}
                  <code className="text-amber-200">npm start</code>) secara gratis/mudah ke{' '}
                  <strong className="text-white">Render.com</strong> (Web Service),{' '}
                  <strong className="text-white">Railway.app</strong>,{' '}
                  <strong className="text-white">Koyeb</strong>, atau{' '}
                  <strong className="text-white">Fly.io</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {!onlineLobby.roomCode ? (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Sub-header & Symmetric Buat Room / Gabung Room Segmented Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-sky-300">
                  Arena Multiplayer Daring
                </div>
                <h2 className="font-display text-lg sm:text-2xl font-bold text-white mt-0.5 truncate">
                  Buat atau Gabung Room
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-amber-500/25 w-full sm:w-80 shrink-0">
                <button
                  type="button"
                  onClick={() => setEntryTab('create')}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    entryTab === 'create'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/70'
                  }`}
                >
                  <PlusSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>Buat Room</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryTab('join')}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    entryTab === 'join'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/70'
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Gabung Room</span>
                </button>
              </div>
            </div>

            {/* Player Identity Row — Flexible 12-Column CSS Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 glass-panel-soft rounded-2xl border border-amber-500/20 p-3 sm:p-4 items-end">
              <div className="md:col-span-5 min-w-0">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Tampilan Daring
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Masukkan nama pahlawan Anda"
                  className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="md:col-span-7 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Bidak Pahlawan
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-300 truncate">
                      {PLAYER_ARCHETYPES[archetypeIndex % PLAYER_ARCHETYPES.length]?.title}
                    </span>
                    {onOpenPawnShowcase && (
                      <button
                        type="button"
                        onClick={onOpenPawnShowcase}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/45 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-200 hover:bg-sky-500/25 cursor-pointer whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3 h-3" />
                        <span>Toko Pion 3D</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PLAYER_ARCHETYPES.filter((a) =>
                    isPawnUnlocked(a.archetypeIndex, unlockedPawnIndices),
                  ).map((a) => {
                    const selected = archetypeIndex === a.archetypeIndex;
                    return (
                      <button
                        key={a.archetypeIndex}
                        type="button"
                        onClick={() => setArchetypeIndex(a.archetypeIndex)}
                        title={a.title}
                        className={`min-h-[42px] px-2 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 ${
                          selected
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                            : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <ArchetypeEmblem
                          archetypeIndex={a.archetypeIndex}
                          className="w-5 h-5 shrink-0"
                        />
                        <span className="hidden sm:inline text-[11px] font-semibold truncate">
                          {a.title.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {entryTab === 'create' ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
                {/* Left Card: Room Configuration */}
                <div className="md:col-span-7 min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/25 p-3.5 sm:p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3.5 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-amber-300 truncate">
                          Konfigurasi Room Baru
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Kapasitas maksimal 4 pemain daring
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-950/90 border border-slate-800 shrink-0">
                        <button
                          type="button"
                          onClick={() => setRoomIsPublic(true)}
                          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            roomIsPublic
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Unlock className="w-3.5 h-3.5 shrink-0" />
                          <span>Publik</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoomIsPublic(false)}
                          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            !roomIsPublic
                              ? 'bg-amber-500/20 border border-amber-400/60 text-amber-200'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Lock className="w-3.5 h-3.5 shrink-0" />
                          <span>Privat</span>
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
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
                  </div>

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
                    className="w-full min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-bold text-sm hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-lg shrink-0"
                  >
                    <PlusSquare className="w-4 h-4 shrink-0" />
                    <span>
                      {onlineLobby.connecting ? 'Menyiapkan Room...' : 'Buat Room Sekarang'}
                    </span>
                  </button>
                </div>

                {/* Right Card: Sanctuary 3D Preview */}
                <div className="md:col-span-5 min-w-0 flex">
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
                {/* Left Card: Join by Room Code (Compact & Mobile-Friendly) */}
                <div className="md:col-span-5 min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/25 p-3.5 sm:p-5 flex flex-col justify-between gap-3.5">
                  <div className="space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gold-gradient truncate">
                        Gabung via Kode Room
                      </span>
                      <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 shrink-0">
                        Kode 6 Digit
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Masukkan kode undangan dari teman atau host untuk langsung masuk ke lobi privat maupun publik.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 mt-auto">
                    <div className="flex-1 min-w-0">
                      <label className="sr-only">Kode Ruangan</label>
                      <input
                        type="text"
                        maxLength={8}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="KODE ROOM (CONTOH: A7K9P2)"
                        className="w-full min-h-[46px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-center text-sm sm:text-base font-mono-num font-bold uppercase tracking-widest text-amber-200 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={
                        !isOnlineNetwork || joinCode.trim().length < 4 || onlineLobby.connecting
                      }
                      onClick={() =>
                        onOnlineJoinRoom(
                          joinCode.trim(),
                          playerName.trim() || 'Penjelajah',
                          archetypeIndex,
                        )
                      }
                      className="w-full sm:w-auto md:w-full min-h-[46px] px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 font-bold text-sm hover:brightness-105 disabled:opacity-50 transition-all cursor-pointer shadow-lg shrink-0"
                    >
                      <DoorOpen className="w-4 h-4 shrink-0" />
                      <span>{onlineLobby.connecting ? 'Menghubungkan...' : 'Gabung ke Room'}</span>
                    </button>
                  </div>
                </div>

                {/* Right Card: Public Room Browser */}
                <div className="md:col-span-7 min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/25 p-3.5 sm:p-5 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-slate-200 block truncate">
                        Daftar Ruang Publik Aktif ({publicRooms.length})
                      </span>
                      <p className="text-[11px] text-slate-400 truncate">
                        Ketuk ruang terbuka di bawah untuk langsung masuk ke lobi
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void fetchPublicRooms()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                      <span>Segarkan</span>
                    </button>
                  </div>

                  <div className="flex-1 min-h-[168px] max-h-64 overflow-y-auto custom-scroll pr-0.5">
                    {publicRooms.length === 0 ? (
                      <div className="h-full min-h-[156px] flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center">
                        <Globe className="w-5 h-5 text-slate-500 mb-1.5" />
                        <div className="text-xs font-semibold text-slate-300">
                          Belum Ada Ruang Publik Aktif
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs">
                          Klik tab Buat Room untuk membuka arena baru atau masukkan kode 6 digit dari teman Anda.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-2.5">
                        {publicRooms.map((r) => {
                          const modeMeta = BOARD_GAME_MODES.find((m) => m.id === r.boardMode);
                          const fullOrBusy = r.playerCount >= r.maxPlayers || r.status !== 'lobby';
                          return (
                            <div
                              key={r.code}
                              className="flex flex-col justify-between gap-2.5 rounded-xl border border-amber-500/20 bg-slate-900/85 p-3 min-w-0 hover:border-amber-400/40 transition-colors"
                            >
                              <div className="min-w-0 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                                    {r.name}
                                  </span>
                                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-amber-300 shrink-0">
                                    #{r.code}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
                                  <span className="truncate max-w-[130px] text-slate-400">
                                    Host: <strong className="text-slate-200">{r.hostName}</strong>
                                  </span>
                                  <span>·</span>
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                                    {modeMeta?.label.replace(' Mode', '')}
                                  </span>
                                  <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono-num text-[10px] font-semibold text-emerald-300 ml-auto">
                                    {r.playerCount}/{r.maxPlayers} Pemain
                                  </span>
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
                                className="w-full inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {r.status === 'playing'
                                    ? 'Sedang Berlangsung'
                                    : r.playerCount >= r.maxPlayers
                                      ? 'Ruangan Penuh'
                                      : 'Gabung ke Lobi'}
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {/* Active Room Header Bar — Responsive Flexbox & Mobile Action Grid */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 glass-panel-soft rounded-2xl border border-amber-500/28 p-3.5 sm:p-4">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-400">
                  <span className="font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                    {onlineLobby.roomName}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-slate-200 font-medium">
                    {onlineLobby.isPublic ? (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Publik</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Privat</span>
                      </>
                    )}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                    <Hourglass className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{ONLINE_TURN_TIMEOUT_SEC}d/Giliran</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-slate-950/80 px-2.5 py-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      Kode
                    </span>
                    <span className="font-mono-num text-base sm:text-xl font-bold text-gold-gradient tracking-widest">
                      {onlineLobby.roomCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyInvite('code')}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
                  >
                    {copiedType === 'code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kode Disalin</span>
                      </>
                    ) : (
                      <span>Salin Kode</span>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => void handleInviteShare()}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl border border-amber-500/30 bg-slate-900/80 text-xs font-semibold text-slate-100 hover:bg-slate-800 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {copiedType === 'link' ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Share2 className="w-4 h-4 text-amber-300 shrink-0" />
                  )}
                  <span>{copiedType === 'link' ? 'Tautan Disalin' : 'Undang Teman'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOnlineLeave}
                  className="inline-flex items-center justify-center min-h-[40px] sm:min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs font-semibold text-rose-300 hover:bg-rose-950/75 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Keluar Ruang
                </button>
              </div>
            </div>

            {/* Section 1: Readiness Progress & Match Launch Action Card (Immediate Access on All Screens) */}
            <div className="min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/30 p-3.5 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                <div className="lg:col-span-7 flex flex-wrap items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <AnimatedProgressRing
                      progress={readinessProgress}
                      size={48}
                      strokeWidth={4}
                      tone={allReady ? 'emerald' : hasMinPlayers ? 'amber' : 'sky'}
                      pulse
                    >
                      <span className="font-mono-num text-xs font-bold text-white">
                        {readyCount}/{onlineLobby.players.length}
                      </span>
                    </AnimatedProgressRing>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-white">
                          {allReady
                            ? 'Semua Pahlawan Siap Bertanding!'
                            : hasMinPlayers
                              ? 'Ruangan Siap Dimulai oleh Host'
                              : 'Menunggu Pemain Lain Bergabung'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {allReady
                          ? 'Seluruh pahlawan sudah menekan Siap. Host dapat langsung meluncurkan arena!'
                          : hasMinPlayers
                            ? 'Minimal 2 pemain terpenuhi. Host dapat menekan Mulai atau menunggu tamu Siap.'
                            : 'Undang minimal 1 teman lagi (total 2–4 pemain) untuk memulai pertandingan.'}
                      </p>
                    </div>
                  </div>

                  {isHost && hasMinPlayers && !allReady && onOnlineReadyAll && (
                    <button
                      type="button"
                      onClick={onOnlineReadyAll}
                      className="inline-flex items-center gap-1 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>Siapkan Semua</span>
                    </button>
                  )}
                </div>

                {/* Primary Action CTA Button (Start for Host / Ready Toggle for Guest) */}
                <div className="lg:col-span-5 min-w-0">
                  {isHost ? (
                    <button
                      type="button"
                      disabled={!canStartMatch}
                      onClick={onOnlineStart}
                      className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg disabled:opacity-45 disabled:cursor-not-allowed ${
                        allReady
                          ? 'bg-gradient-to-r from-emerald-400 via-amber-400 to-amber-500 text-slate-950 hover:brightness-105'
                          : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-105'
                      }`}
                    >
                      <Play className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 fill-current" />
                      <span className="truncate">
                        {!hasMinPlayers
                          ? 'Menunggu Min. 2 Pemain...'
                          : allReady
                            ? `Mulai Laga Daring (${onlineLobby.players.length} Pemain)`
                            : `Mulai Laga Daring (${readyCount}/${onlineLobby.players.length} Siap)`}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOnlineReady(!meOnline?.ready)}
                      className={`w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-lg ${
                        meOnline?.ready
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/60'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-105'
                      }`}
                    >
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      <span className="truncate">
                        {meOnline?.ready
                          ? 'SIAP BERTANDING! (Ketuk Batal)'
                          : 'Saya Siap Bertanding — Ketuk di Sini'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Player Cards CSS Grid (grid-cols-1 on Mobile, grid-cols-2 on Tablet/Medium, lg:grid-cols-3 on Desktop) */}
            <div className="min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/20 p-3.5 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                    Daftar Pahlawan di Lobi ({onlineLobby.players.length}/4)
                  </span>
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono-num font-bold text-amber-300 shrink-0">
                    {readyCount}/{onlineLobby.players.length} Siap
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Statistik pahlawan, jaringan &amp; urutan giliran #1–#4
                </span>
              </div>

              {/* Player Cards Grid: grid-cols-1 (mobile) -> md:grid-cols-2 -> lg:grid-cols-3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onlineLobby.players.map((p, idx) => {
                  const isPlayerHost = p.id === onlineLobby.hostId || idx === 0;
                  const isSelf = p.id === onlineLobby.myPlayerId;
                  const isPlayerReady = isPlayerHost || Boolean(p.ready);
                  const arch = PLAYER_ARCHETYPES[p.archetypeIndex % PLAYER_ARCHETYPES.length];
                  return (
                    <div
                      key={p.id}
                      className={`min-w-0 overflow-hidden rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                        isSelf
                          ? 'border-amber-400/60 bg-slate-900/95 shadow-md'
                          : isPlayerReady
                            ? 'border-emerald-500/35 bg-slate-900/80'
                            : 'border-slate-700/80 bg-slate-900/65'
                      }`}
                    >
                      {/* Card Header: Avatar Ring + Name + Ready Badge */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <AnimatedProgressRing
                            progress={isPlayerReady ? 1 : 0.25}
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white min-w-0">
                              <span className="truncate">{p.name}</span>
                              {isSelf && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-200 shrink-0">
                                  Anda
                                </span>
                              )}
                              {isPlayerHost && (
                                <Crown
                                  className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                  aria-label="Host"
                                />
                              )}
                            </div>
                            <div className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                              {arch.title}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold whitespace-nowrap shrink-0 ${
                            isPlayerHost
                              ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                              : isPlayerReady
                                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                                : 'border-slate-700 bg-slate-950/70 text-slate-400'
                          }`}
                        >
                          {isPlayerHost ? (
                            <>
                              <Crown className="w-3 h-3 text-amber-300" />
                              <span>Host · Siap</span>
                            </>
                          ) : isPlayerReady ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-300" />
                              <span>Siap</span>
                            </>
                          ) : (
                            <span>Menunggu</span>
                          )}
                        </span>
                      </div>

                      {/* Structured Player Stats CSS Grid (2x2 compact stat cells, zero horizontal scroll) */}
                      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-800/90 bg-slate-950/60 p-2 text-[10px] sm:text-[11px] min-w-0">
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">
                            Urutan Giliran
                          </span>
                          <span className="font-mono-num font-bold text-amber-300 truncate block">
                            Slot #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">
                            Koneksi / Ping
                          </span>
                          <span className="inline-flex items-center gap-1 font-mono-num font-semibold text-slate-200 truncate">
                            {p.connected !== false ? (
                              <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                            ) : (
                              <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
                            )}
                            <span>{p.pingMs ? `${p.pingMs}ms` : 'Stabil'}</span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">
                            Bidak Pahlawan
                          </span>
                          <span className="text-slate-300 truncate block">
                            {arch.title}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-semibold">
                            {onlineLobby.boardMode === 'team' ? 'Alokasi Tim' : 'Peran Lobi'}
                          </span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {onlineLobby.boardMode === 'team'
                              ? p.team === 'A'
                                ? 'Tim Surya (A)'
                                : 'Tim Bulan (B)'
                              : isPlayerHost
                                ? 'Tuan Rumah'
                                : 'Penantang'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Controls: Team Switch & Host Moderation Actions */}
                      {(onlineLobby.boardMode === 'team' || (isHost && !isSelf)) && (
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-800/90">
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
                            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                              {!isPlayerReady && (
                                <button
                                  type="button"
                                  onClick={() => onOnlineReady(true, p.id)}
                                  title="Tandai pemain ini Siap"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/45 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-900/80 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Set Siap</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOnlineTransferHost(p.id)}
                                title="Jadikan Host"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-amber-300 hover:bg-slate-700 cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Host</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOnlineKick(p.id)}
                                title="Keluarkan dari ruangan"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[11px] text-rose-300 hover:bg-rose-900/70 cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Keluarkan</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Open Slot Card when fewer than 4 players are in the room */}
                {onlineLobby.players.length < 4 && (
                  <button
                    type="button"
                    onClick={() => void handleInviteShare()}
                    className="min-w-0 overflow-hidden rounded-2xl border border-dashed border-amber-500/30 bg-slate-950/45 hover:bg-slate-900/70 hover:border-amber-400/50 p-3.5 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer min-h-[148px]"
                  >
                    <div className="w-9 h-9 rounded-full border border-amber-400/40 bg-amber-500/10 flex items-center justify-center text-amber-300">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-xs font-bold text-amber-200 truncate">
                        Slot Pahlawan Terbuka ({4 - onlineLobby.players.length} Tersisa)
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Ketuk untuk menyalin tautan undangan atau bagikan kode{' '}
                        <span className="font-mono-num font-bold text-amber-300">
                          #{onlineLobby.roomCode}
                        </span>
                      </p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Section 3: Settings, Chat & 3D Sanctuary Preview Grid (grid-cols-1 on Mobile, grid-cols-2 on Tablet, lg:grid-cols-3 on Desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
              {/* Panel 1: Lobby Chat Card */}
              <div className="min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/20 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                    Obrolan Lobi ({onlineLobby.chatMessages.length})
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    Pesan instan lobi
                  </span>
                </div>

                <div className="flex-1 min-h-[148px] max-h-48 overflow-y-auto custom-scroll space-y-1.5 text-xs pr-1 rounded-xl border border-slate-800/80 bg-slate-950/55 p-2.5">
                  {onlineLobby.chatMessages.length === 0 ? (
                    <div className="h-full min-h-[120px] flex items-center justify-center text-slate-500 text-[11px] text-center px-2">
                      Sapa pemain lain atau koordinasikan tim sebelum pertandingan dimulai...
                    </div>
                  ) : (
                    onlineLobby.chatMessages.map((m, i) => (
                      <div
                        key={`${m.timestamp}-${i}`}
                        className="text-slate-200 leading-relaxed break-words"
                      >
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
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    maxLength={140}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Kirim pesan ke lobi..."
                    className="flex-1 min-w-0 min-h-[40px] rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    aria-label="Kirim Pesan"
                    className="min-w-[42px] min-h-[40px] px-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </div>

              {/* Panel 2: Room Settings Card */}
              <div className="min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/20 p-3.5 sm:p-4 flex flex-col justify-between gap-3">
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-200 block truncate">
                        {isHost && onlineLobby.status === 'lobby'
                          ? 'Pengaturan Tuan Rumah'
                          : 'Aturan Pertandingan'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {isHost
                          ? 'Ubah mode papan atau visibilitas ruangan'
                          : 'Dikonfigurasi oleh Tuan Rumah (Host)'}
                      </span>
                    </div>
                    {isHost && onlineLobby.status === 'lobby' && (
                      <button
                        type="button"
                        onClick={() => onOnlineUpdateSettings({ isPublic: !onlineLobby.isPublic })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-200 hover:border-amber-400 cursor-pointer shrink-0"
                      >
                        {onlineLobby.isPublic ? (
                          <>
                            <Lock className="w-3 h-3 text-amber-300" />
                            <span>Set Privat</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3 text-emerald-300" />
                            <span>Set Publik</span>
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
              </div>

              {/* Panel 3: 3D Sanctuary Preview Card (Spans 2 cols on md tablet, 1 col on lg 3-column desktop) */}
              <div className="md:col-span-2 lg:col-span-1 min-w-0 flex">
                <SanctuaryPreviewCard
                  boardMode={onlineLobby.boardMode}
                  roomTitle={onlineLobby.roomName}
                  isPublic={onlineLobby.isPublic}
                  timeLimitSec={onlineLobby.timeLimitSec}
                  players={onlineLobby.players.map((p, idx) => ({
                    name: p.name,
                    archetypeIndex: p.archetypeIndex,
                    ready: p.id === onlineLobby.hostId || idx === 0 || p.ready,
                    isHost: p.id === onlineLobby.hostId || idx === 0,
                  }))}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-3 pb-1 shrink-0 text-center text-xs text-slate-400">
        Developed By{' '}
        <a
          href="https://portfolionyaihwal.my.id"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          WalZetass
        </a>
      </footer>
    </div>
  );
};
