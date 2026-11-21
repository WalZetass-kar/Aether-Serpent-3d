import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Camera,
  Check,
  Clock,
  Crown,
  DoorOpen,
  Flame,
  Globe,
  Headphones,
  Hourglass,
  Layers,
  Lock,
  Map as MapIcon,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  PlusSquare,
  RefreshCw,
  Send,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Unlock,
  UserCheck,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { VoiceChatSnapshot } from '../audio/voiceChatEngine';
import type { BoardConfig } from '../../shared/boardThemes';
import {
  BOARD_GAME_MODES,
  LADDERS,
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  SNAKES,
  SPECIAL_TILE_MAP,
  TIME_ATTACK_DEFAULT_SEC,
  isPawnUnlocked,
  type BoardGameMode,
  type PlayerState,
  type TeamId,
} from '../../shared/gameConfig';
import heroBoardArtwork from '../assets/images/hero_naga_tangga_1794911553591.jpg';
import clashBoardArtwork from '../assets/images/arena_elemental_clash_1794911554751.jpg';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { ArchetypeEmblem, SerpentCrestEmblem } from './FantasyIcons';
import { VoiceActivityBars } from './VoiceActivityBars';
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
  isSpectator?: boolean;
  spectatorCount?: number;
  voicePeers?: Array<{ playerId: string; muted: boolean }>;
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

interface LobbyPlayerStats {
  wins: number;
  onlineWins: number;
  totalGames: number;
  bestScore: number;
  loginStreak?: number;
}

interface MultiplayerLobbyViewProps {
  initialTab?: 'create' | 'join';
  defaultBoardMode?: BoardGameMode;
  defaultPlayerName: string;
  defaultArchetypeIndex: number;
  unlockedPawnIndices?: number[];
  playerStats?: LobbyPlayerStats;
  activeBoard?: BoardConfig;
  isOnlineNetwork: boolean;
  muted: boolean;
  onlineLobby: OnlineLobbyState;
  onBack: () => void;
  onOpenPawnShowcase?: () => void;
  onOpenBoardManager?: () => void;
  onOpenFriends?: () => void;
  friendBadgeCount?: number;
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
  voiceState?: VoiceChatSnapshot;
  onToggleVoiceMute?: () => void;
  onLeaveVoice?: () => void;
  onOpenAudioSettings?: () => void;
}

const MODE_ICON: Record<BoardGameMode, React.ReactNode> = {
  classic: <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
  battle: <Swords className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
  team: <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  time_attack: <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
};

const PREVIEW_MODE_THEME: Record<
  BoardGameMode,
  { glow: string; rim: string; tileGlow: string; tag: string; accentHex: string; artwork: string }
> = {
  classic: {
    glow: 'from-amber-500/22 via-emerald-500/12 to-slate-950/90',
    rim: 'border-amber-400/45 text-amber-200',
    tileGlow: 'rgba(245, 158, 11, 0.28)',
    tag: 'Suaka Klasik · 100 Petak',
    accentHex: '#f59e0b',
    artwork: heroBoardArtwork,
  },
  battle: {
    glow: 'from-rose-500/24 via-amber-500/12 to-slate-950/90',
    rim: 'border-rose-400/45 text-rose-200',
    tileGlow: 'rgba(244, 63, 94, 0.3)',
    tag: 'Duel Arena · Tabrak Lawan',
    accentHex: '#f43f5e',
    artwork: clashBoardArtwork,
  },
  team: {
    glow: 'from-sky-500/24 via-amber-500/12 to-slate-950/90',
    rim: 'border-sky-400/45 text-sky-200',
    tileGlow: 'rgba(56, 189, 248, 0.3)',
    tag: 'Sinergi 2v2 · Surya vs Bulan',
    accentHex: '#38bdf8',
    artwork: heroBoardArtwork,
  },
  time_attack: {
    glow: 'from-emerald-500/24 via-cyan-500/12 to-slate-950/90',
    rim: 'border-emerald-400/45 text-emerald-200',
    tileGlow: 'rgba(16, 185, 129, 0.3)',
    tag: 'Pacu Waktu · Skor Tertinggi',
    accentHex: '#10b981',
    artwork: clashBoardArtwork,
  },
};

function getTileCoord10x10(tile: number): { x: number; y: number } {
  const clamped = Math.max(1, Math.min(100, tile)) - 1;
  const rowFromBottom = Math.floor(clamped / 10);
  const colRaw = clamped % 10;
  const col = rowFromBottom % 2 === 0 ? colRaw : 9 - colRaw;
  const rowFromTop = 9 - rowFromBottom;
  return { x: col * 10 + 5, y: rowFromTop * 10 + 5 };
}

const TACTICAL_10X10_CELLS: number[] = (() => {
  const cells: number[] = [];
  for (let rowTop = 0; rowTop < 10; rowTop++) {
    const rowBottom = 9 - rowTop;
    for (let col = 0; col < 10; col++) {
      const num =
        rowBottom % 2 === 0
          ? rowBottom * 10 + col + 1
          : rowBottom * 10 + (9 - col) + 1;
      cells.push(num);
    }
  }
  return cells;
})();

const SanctuaryPreviewCard: React.FC<{
  boardMode: BoardGameMode;
  roomTitle: string;
  isPublic: boolean;
  players: Array<{ name: string; archetypeIndex: number; ready?: boolean; isHost?: boolean }>;
  timeLimitSec?: number;
  activeBoard?: BoardConfig;
  onOpenBoardManager?: () => void;
}> = ({
  boardMode,
  roomTitle,
  isPublic,
  players,
  timeLimitSec,
  activeBoard,
  onOpenBoardManager,
}) => {
  const [viewKind, setViewKind] = useState<'diorama' | 'tactical'>('diorama');
  const [imgFailed, setImgFailed] = useState(false);

  const theme = PREVIEW_MODE_THEME[boardMode];
  const modeMeta = BOARD_GAME_MODES.find((m) => m.id === boardMode) ?? BOARD_GAME_MODES[0];

  const ladders = activeBoard?.ladders ?? LADDERS;
  const snakes = activeBoard?.snakes ?? SNAKES;
  const boardTitle = activeBoard?.name ?? 'Suaka Naga Aether';
  const boardSub = activeBoard?.subtitle ?? theme.tag;
  const swatchPrimary = activeBoard?.previewSwatches?.[0] ?? '#1e293b';
  const swatchSecondary = activeBoard?.previewSwatches?.[1] ?? theme.accentHex;
  const swatchAccent = activeBoard?.previewSwatches?.[2] ?? '#fbbf24';
  const tilePrimary = activeBoard?.tileConfig?.primaryColor ?? '#1e293b';
  const tileAlt = activeBoard?.tileConfig?.alternateColor ?? '#0f172a';
  const ladderColor = activeBoard?.ladderConfig?.primaryColor ?? '#fbbf24';
  const snakeColor = activeBoard?.snakeConfig?.primaryColor ?? '#10b981';

  return (
    <div className="w-full min-w-0 glass-panel-soft rounded-2xl border border-amber-500/28 p-3.5 sm:p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
      {/* Ambient Sanctuary Atmospheric Backdrop */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-90`}
      />
      <div
        className="pointer-events-none absolute -top-14 -right-14 w-44 h-44 rounded-full blur-2xl"
        style={{ background: theme.tileGlow }}
      />

      {/* Top Header: Room Title + View Toggle */}
      <div className="relative z-10 flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-300/95 min-w-0">
            <SerpentCrestEmblem className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Pratinjau Arena 3D · {modeMeta.label.replace(' Mode', '')}</span>
          </div>
          <div className="font-display text-sm sm:text-base font-bold text-gold-gradient truncate mt-0.5">
            {roomTitle || 'Arena Aether'}
          </div>
        </div>

        {/* Interactive Diorama / 10x10 Map Switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-slate-700/80 bg-slate-950/85 shrink-0">
          <button
            type="button"
            onClick={() => setViewKind('diorama')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              viewKind === 'diorama'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3 shrink-0" />
            <span>3D</span>
          </button>
          <button
            type="button"
            onClick={() => setViewKind('tactical')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              viewKind === 'tactical'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <MapIcon className="w-3 h-3 shrink-0" />
            <span>Peta 100</span>
          </button>
        </div>
      </div>

      {/* Main Showcase Stage: Cinematic 3D Diorama OR Real Isometric 10x10 Board */}
      <div className="relative z-10 flex-1 min-h-[218px] rounded-xl border border-amber-400/35 bg-slate-950/90 overflow-hidden shadow-[0_14px_30px_-10px_rgba(2,6,23,0.9)] flex flex-col justify-between">
        {viewKind === 'diorama' ? (
          <>
            {/* High-Resolution 3D Fantasy Tabletop Artwork */}
            {!imgFailed ? (
              <img
                src={theme.artwork}
                alt={`Pratinjau 3D ${boardTitle}`}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover object-center scale-[1.03] transition-transform duration-700"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${swatchSecondary}44, ${swatchPrimary} 72%, #020617 100%)`,
                }}
              />
            )}

            {/* Measured Contrast Scrim + Theme Rim Accent */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-slate-950/60" />
            <div
              className="pointer-events-none absolute inset-0 opacity-35 mix-blend-screen"
              style={{
                background: `radial-gradient(circle at 80% 18%, ${swatchAccent}55 0%, transparent 55%)`,
              }}
            />

            {/* Top Floating Metadata Strip inside Diorama */}
            <div className="relative z-10 flex items-center justify-between gap-2 px-3 pt-2.5 text-[10px]">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 border border-white/10 px-2 py-1 text-slate-100 font-semibold min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/25"
                  style={{ background: `linear-gradient(135deg, ${swatchPrimary}, ${swatchAccent})` }}
                />
                <span className="truncate">{boardTitle}</span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/80 border border-white/10 px-2 py-1 text-slate-200 font-semibold shrink-0">
                {isPublic ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Publik</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Privat</span>
                  </>
                )}
              </div>
            </div>

            {/* Center Floating Hero Staging Pins on the 3D Arena */}
            <div className="relative z-10 my-auto flex flex-col items-center justify-center px-3 py-2 text-center">
              <div className="flex items-center justify-center -space-x-2">
                {players.slice(0, 4).map((pl, pIdx) => {
                  const pArch =
                    PLAYER_ARCHETYPES[pl.archetypeIndex % PLAYER_ARCHETYPES.length];
                  return (
                    <div
                      key={`${pl.name}-${pIdx}`}
                      title={`${pl.name} · ${pArch.title}`}
                      className="relative w-10 h-10 rounded-xl border-2 bg-slate-950/92 flex items-center justify-center shadow-[0_8px_18px_rgba(2,6,23,0.9)]"
                      style={{
                        borderColor: pl.isHost ? '#fbbf24' : pArch.color,
                        boxShadow: `0 6px 18px ${pArch.color}40`,
                      }}
                    >
                      <ArchetypeEmblem
                        archetypeIndex={pl.archetypeIndex}
                        className="w-5 h-5"
                      />
                      {pl.isHost && (
                        <Crown className="w-3 h-3 text-amber-300 absolute -top-2 -right-1.5 drop-shadow" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 px-2.5 py-0.5 rounded-md bg-slate-950/78 border border-amber-400/25 text-[11px] font-semibold text-amber-100 max-w-full truncate">
                {boardSub}
              </div>
            </div>

            {/* Bottom Board Telemetry Footer inside Diorama */}
            <div className="relative z-10 px-3 pb-2.5 pt-1.5 flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
              <div className="flex items-center gap-2 text-slate-200 font-mono-num min-w-0 truncate">
                <span className="text-amber-300 font-bold">{ladders.length} Tangga</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-300 font-bold">{snakes.length} Ular</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-300">
                  {boardMode === 'time_attack' && timeLimitSec
                    ? `${Math.round(timeLimitSec / 60)}m`
                    : `${ONLINE_TURN_TIMEOUT_SEC}d`}
                </span>
              </div>

              {onOpenBoardManager && (
                <button
                  type="button"
                  onClick={onOpenBoardManager}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span>Ganti Papan</span>
                </button>
              )}
            </div>
          </>
        ) : (
          /* Interactive Isometric 10x10 Tactical Map of the REAL Active BoardConfig */
          <div className="relative flex-1 flex flex-col justify-between p-2.5 sm:p-3 gap-2">
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${swatchSecondary}45 0%, transparent 72%)`,
              }}
            />

            <div
              className="relative z-10 mx-auto my-auto w-full max-w-[208px] aspect-square"
              style={{ perspective: '620px' }}
            >
              <div
                className="relative w-full h-full rounded-xl border-2 border-amber-400/55 bg-slate-950/95 p-1 shadow-[0_18px_28px_rgba(2,6,23,0.9)] overflow-hidden"
                style={{ transform: 'rotateX(22deg) rotateZ(-2deg)' }}
              >
                <div className="grid grid-cols-10 grid-rows-10 gap-[1.5px] w-full h-full">
                  {TACTICAL_10X10_CELLS.map((num, idx) => {
                    const isAlt = (Math.floor(idx / 10) + (idx % 10)) % 2 === 0;
                    const special = SPECIAL_TILE_MAP.get(num);
                    return (
                      <div
                        key={num}
                        className="relative rounded-[2px] flex items-center justify-center text-[6px] font-mono-num leading-none select-none border border-white/5"
                        style={{
                          backgroundColor:
                            num === 100
                              ? '#b45309'
                              : num === 1
                                ? '#047857'
                                : special
                                  ? '#1d4ed8'
                                  : isAlt
                                    ? tilePrimary
                                    : tileAlt,
                          color: num === 100 || num === 1 ? '#fef9c3' : 'rgba(226,232,240,0.68)',
                        }}
                      >
                        {num === 100 || num === 1 || num % 10 === 0 ? num : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Real Ladders & Serpents SVG overlay from active BoardConfig */}
                <svg
                  viewBox="0 0 100 100"
                  className="pointer-events-none absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
                  aria-hidden="true"
                >
                  {ladders.map((l, i) => {
                    const a = getTileCoord10x10(l.from);
                    const b = getTileCoord10x10(l.to);
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const len = Math.hypot(dx, dy) || 1;
                    const nx = (-dy / len) * 1.35;
                    const ny = (dx / len) * 1.35;
                    const rungs = 4;
                    return (
                      <g key={`lad-${i}`} stroke={ladderColor} strokeLinecap="round" opacity="0.92">
                        <line x1={a.x + nx} y1={a.y + ny} x2={b.x + nx} y2={b.y + ny} strokeWidth="1.1" />
                        <line x1={a.x - nx} y1={a.y - ny} x2={b.x - nx} y2={b.y - ny} strokeWidth="1.1" />
                        {Array.from({ length: rungs }).map((_, rIdx) => {
                          const t = (rIdx + 1) / (rungs + 1);
                          const rx = a.x + dx * t;
                          const ry = a.y + dy * t;
                          return (
                            <line
                              key={rIdx}
                              x1={rx + nx}
                              y1={ry + ny}
                              x2={rx - nx}
                              y2={ry - ny}
                              strokeWidth="0.75"
                            />
                          );
                        })}
                      </g>
                    );
                  })}
                  {snakes.map((s, i) => {
                    const a = getTileCoord10x10(s.from);
                    const b = getTileCoord10x10(s.to);
                    const mx = (a.x + b.x) / 2;
                    const my = (a.y + b.y) / 2;
                    const curveOffset = i % 2 === 0 ? 7 : -7;
                    return (
                      <g key={`snk-${i}`} opacity="0.9">
                        <path
                          d={`M ${a.x} ${a.y} Q ${mx + curveOffset} ${my - curveOffset * 0.6}, ${b.x} ${b.y}`}
                          fill="none"
                          stroke={snakeColor}
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <circle cx={a.x} cy={a.y} r="1.6" fill={snakeColor} stroke="#fef08a" strokeWidth="0.55" />
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2 text-[10px] text-slate-300">
              <span className="truncate font-semibold text-amber-200">{boardTitle}</span>
              <span className="font-mono-num shrink-0">
                {ladders.length} Tangga · {snakes.length} Ular
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom 4 Symmetrical Player Slots (Compact & Consistent) */}
      <div className="relative z-10 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold text-slate-400 truncate">Slot Pahlawan Ruangan</span>
          <span className="font-mono-num font-bold text-amber-300 shrink-0">
            {players.length}/4 Terisi
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {Array.from({ length: 4 }).map((_, idx) => {
            const pl = players[idx];
            return pl ? (
              <div
                key={`slot-${idx}`}
                title={pl.name}
                className="min-w-0 overflow-hidden flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-slate-950/90 px-2 py-1.5"
              >
                <div className="w-6 h-6 rounded-lg bg-slate-900 border border-amber-400/35 flex items-center justify-center shrink-0">
                  <ArchetypeEmblem archetypeIndex={pl.archetypeIndex} className="w-3.5 h-3.5 shrink-0" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-[10px] font-bold text-slate-100 truncate leading-tight">
                    {pl.name}
                  </div>
                  <div className="text-[9px] text-amber-300/90 leading-tight truncate">
                    {pl.isHost ? 'Host' : pl.ready ? 'Siap' : `Slot #${idx + 1}`}
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`slot-empty-${idx}`}
                className="min-w-0 overflow-hidden flex items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/45 px-2 py-1.5 text-center min-h-[38px]"
              >
                <span className="text-[10px] font-mono-num font-bold text-slate-500">#{idx + 1}</span>
                <span className="text-[10px] text-slate-500 truncate">Terbuka</span>
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
  playerStats,
  activeBoard,
  isOnlineNetwork,
  muted,
  onlineLobby,
  onBack,
  onOpenPawnShowcase,
  onOpenBoardManager,
  onOpenFriends,
  friendBadgeCount = 0,
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
  voiceState,
  onToggleVoiceMute,
  onLeaveVoice,
  onOpenAudioSettings,
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

        {/* 4 Compact Mode Cards (2x2 on mobile, 4-col on sm+) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-stretch">
          {BOARD_GAME_MODES.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(m.id)}
                className={`h-full min-w-0 overflow-hidden p-2 sm:p-2.5 rounded-xl border flex flex-col items-start justify-between gap-1 text-left transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/15 text-amber-200 shadow-sm'
                    : 'border-slate-700 bg-slate-900/75 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="w-full min-w-0 flex items-center gap-1.5 text-[11px] sm:text-xs font-bold">
                  {MODE_ICON[m.id]}
                  <span className="min-w-0 flex-1 truncate">
                    {m.label.replace(' Mode', '')}
                  </span>
                </div>
                <div className="w-full text-[10px] text-slate-400 truncate">
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
      <header className="mx-auto w-full max-w-6xl flex items-center justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-3.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="glass-panel-soft inline-flex items-center gap-1.5 sm:gap-2 min-h-[42px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 hover:text-amber-200 hover:border-amber-400/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Menu Utama</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenFriends && (
            <button
              type="button"
              onClick={onOpenFriends}
              className="glass-panel-soft inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 rounded-xl border border-sky-400/40 bg-sky-500/12 text-xs font-bold text-sky-200 hover:bg-sky-500/22 cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-sky-300 shrink-0" />
              <span className="hidden sm:inline">Teman</span>
              {friendBadgeCount > 0 && (
                <span className="font-mono-num text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500 text-white leading-none">
                  {friendBadgeCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCameraSettings}
            className="glass-panel-soft inline-flex items-center justify-center gap-1.5 min-h-[42px] px-3 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-200 cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Kamera</span>
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            className="glass-panel-soft inline-flex items-center justify-center w-[42px] h-[42px] rounded-xl text-slate-200 hover:text-amber-200 cursor-pointer shrink-0"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <div className="glass-panel-soft rounded-xl min-h-[42px] px-3 sm:px-3.5 py-2 flex items-center gap-2 shrink-0">
            <SerpentCrestEmblem className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
            <span className="font-display text-xs sm:text-base font-bold text-gold-gradient whitespace-nowrap">
              Lobi Daring
            </span>
          </div>
        </div>
      </header>

      {/* Main Lobby Container — Top-anchored directly below header (zero top dead gap) */}
      <main className="mx-auto w-full max-w-6xl shrink-0 overflow-x-hidden overflow-y-hidden glass-panel-lobby rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
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

        {/* Network Transport Status, Live Player Stats & Cloud Deployment Strip */}
        <div className="rounded-2xl border border-amber-500/25 bg-slate-950/80 px-3.5 py-2.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
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
                    ? 'Cloud HTTP Sync'
                    : 'WebSocket Real-Time'}
                </span>
              </span>
              {onlineLobby.pingMs ? (
                <span className="font-mono-num text-[11px] text-slate-400">
                  ~{onlineLobby.pingMs}ms
                </span>
              ) : null}
            </div>

            {/* Middle Inline Player & Board Telemetry (Zero Empty Bar Gap) */}
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono-num font-bold text-white">
                  {playerStats?.onlineWins ?? 0}
                </span>
                <span className="text-slate-400">Menang Daring</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono-num font-bold text-white">
                  {(playerStats?.bestScore ?? 0).toLocaleString('id-ID')}
                </span>
                <span className="text-slate-400">Skor Terbaik</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1.5 max-w-[190px]">
                <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-200 font-medium truncate">
                  {activeBoard?.name ?? 'Suaka Naga Aether'}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => setDeployGuideOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{deployGuideOpen ? 'Tutup Info Deploy' : 'Tips Main Daring'}</span>
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

            {/* Player Identity Row — Balanced 12-Column Grid with Zero Dead Space */}
            {(() => {
              const unlockedPawns = PLAYER_ARCHETYPES.filter((a) =>
                isPawnUnlocked(a.archetypeIndex, unlockedPawnIndices),
              );
              const selectedArch =
                PLAYER_ARCHETYPES[archetypeIndex % PLAYER_ARCHETYPES.length] ??
                PLAYER_ARCHETYPES[0];
              const rarityLabel =
                selectedArch.rarity === 'legendary'
                  ? 'Legendaris'
                  : selectedArch.rarity === 'epic'
                    ? 'Epik'
                    : selectedArch.rarity === 'rare'
                      ? 'Langka'
                      : 'Dasar';

              return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 glass-panel-soft rounded-2xl border border-amber-500/20 p-3 sm:p-4 items-stretch">
                  <div className="md:col-span-5 min-w-0 flex flex-col gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label className="block text-xs font-semibold text-slate-300">
                          Nama Tampilan Daring
                        </label>
                        <span className="text-[11px] font-mono-num text-slate-400 shrink-0">
                          {playerName.trim().length}/24
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={24}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Masukkan nama pahlawan Anda"
                        className="w-full min-h-[42px] rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Live Selected Hero Card — Fills remaining height with purposeful identity details */}
                    <div className="flex-1 min-w-0 rounded-xl border border-slate-800/90 bg-slate-950/65 p-3 flex flex-col justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-slate-900/90 shadow-inner"
                          style={{
                            borderColor: `${selectedArch.color}88`,
                            boxShadow: `inset 0 0 14px ${selectedArch.color}28`,
                          }}
                        >
                          <ArchetypeEmblem
                            archetypeIndex={selectedArch.archetypeIndex}
                            className="w-6 h-6 shrink-0"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-bold text-white truncate">
                            {selectedArch.title}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                            <span className="text-amber-300/95 font-medium truncate">
                              {selectedArch.role}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="shrink-0">{rarityLabel}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300/90 leading-relaxed line-clamp-2">
                        {selectedArch.description}
                      </p>

                      {/* Compact 3-Metric Player Quick Stats Strip */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80">
                        <div className="rounded-lg bg-slate-900/75 px-2 py-1.5 min-w-0">
                          <div className="text-[9px] text-slate-400 truncate">Menang</div>
                          <div className="font-mono-num text-xs font-bold text-amber-300 truncate">
                            {playerStats?.wins ?? 0}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-900/75 px-2 py-1.5 min-w-0">
                          <div className="text-[9px] text-slate-400 truncate">Skor Rekor</div>
                          <div className="font-mono-num text-xs font-bold text-sky-300 truncate">
                            {(playerStats?.bestScore ?? 0).toLocaleString('id-ID')}
                          </div>
                        </div>
                        <div className="rounded-lg bg-slate-900/75 px-2 py-1.5 min-w-0">
                          <div className="text-[9px] text-slate-400 truncate">Koleksi</div>
                          <div className="font-mono-num text-xs font-bold text-emerald-300 truncate">
                            {unlockedPawns.length}/{PLAYER_ARCHETYPES.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-7 min-w-0 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300">
                        Bidak Pahlawan
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-amber-300 truncate">
                          {selectedArch.title}
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 content-start">
                      {unlockedPawns.map((a) => {
                        const selected = archetypeIndex === a.archetypeIndex;
                        return (
                          <button
                            key={a.archetypeIndex}
                            type="button"
                            onClick={() => setArchetypeIndex(a.archetypeIndex)}
                            title={a.title}
                            className={`min-h-[42px] px-2.5 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-w-0 ${
                              selected
                                ? 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-sm'
                                : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <ArchetypeEmblem
                              archetypeIndex={a.archetypeIndex}
                              className="w-5 h-5 shrink-0"
                            />
                            <span className="text-[11px] font-semibold truncate">
                              {a.title.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

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
                    activeBoard={activeBoard}
                    onOpenBoardManager={onOpenBoardManager}
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
                {/* Left Card: Join by Room Code + Player Ready Profile Summary (Zero Middle Void) */}
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

                  {/* Quick Challenger Profile & Online Stats Card */}
                  <div className="rounded-xl border border-slate-800/90 bg-slate-950/65 p-3 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl border border-amber-400/40 bg-slate-900 flex items-center justify-center shrink-0">
                        <ArchetypeEmblem archetypeIndex={archetypeIndex} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {playerName.trim() || 'Penjelajah'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {PLAYER_ARCHETYPES[archetypeIndex % PLAYER_ARCHETYPES.length]?.title}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono-num shrink-0">
                      <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                        <Trophy className="w-3 h-3 shrink-0" />
                        {playerStats?.onlineWins ?? 0}
                      </span>
                      {(playerStats?.loginStreak ?? 0) >= 2 && (
                        <span className="inline-flex items-center gap-0.5 text-orange-300 font-bold">
                          <Flame className="w-3 h-3 shrink-0" />
                          {playerStats?.loginStreak}h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-2.5">
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
                      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${loadingRooms ? 'animate-spin' : ''}`} />
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-2.5 items-stretch">
                        {publicRooms.map((r) => {
                          const modeMeta = BOARD_GAME_MODES.find((m) => m.id === r.boardMode);
                          const fullOrBusy = r.playerCount >= r.maxPlayers || r.status !== 'lobby';
                          return (
                            <div
                              key={r.code}
                              className="h-full flex flex-col justify-between gap-2.5 rounded-xl border border-amber-500/20 bg-slate-900/85 p-3 min-w-0 hover:border-amber-400/40 transition-colors"
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
                {onOpenFriends && (
                  <button
                    type="button"
                    onClick={onOpenFriends}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl border border-sky-400/45 bg-sky-500/15 text-xs font-bold text-sky-200 hover:bg-sky-500/25 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Users className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>Undang dari Teman</span>
                  </button>
                )}
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
                  <span>{copiedType === 'link' ? 'Tautan Disalin' : 'Salin Tautan'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOnlineLeave}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center min-h-[40px] sm:min-h-[42px] px-3 sm:px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs font-semibold text-rose-300 hover:bg-rose-950/75 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Keluar Ruang
                </button>
              </div>
            </div>

            {/* Active-Room Voice Chat Status Indicator & Mute/Unmute Bar (Strictly rendered only in an active room) */}
            {onToggleVoiceMute && !onlineLobby.isSpectator && (
              <div className="min-w-0 glass-panel-soft rounded-2xl border border-slate-700/80 bg-slate-950/75 px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      voiceState?.status === 'connected'
                        ? 'border-emerald-400/55 bg-emerald-500/18 text-emerald-300'
                        : voiceState?.status === 'muted'
                          ? 'border-rose-400/55 bg-rose-500/18 text-rose-300'
                          : voiceState?.status === 'connecting'
                            ? 'border-amber-400/55 bg-amber-500/18 text-amber-300'
                            : voiceState?.status === 'denied' || voiceState?.status === 'error'
                              ? 'border-rose-500/50 bg-rose-950/50 text-rose-300'
                              : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                  >
                    {voiceState?.status === 'connected' ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm font-bold text-white">
                      <span>Obrolan Suara Ruang</span>
                      {voiceState?.joined && (
                        <VoiceActivityBars
                          level={voiceState.localLevel}
                          active={voiceState.localSpeaking}
                          muted={voiceState.isMuted}
                          size="sm"
                          tone="emerald"
                        />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          voiceState?.status === 'connected'
                            ? 'text-emerald-300'
                            : voiceState?.status === 'muted'
                              ? 'text-rose-300'
                              : voiceState?.status === 'connecting'
                                ? 'text-amber-300'
                                : voiceState?.status === 'denied' || voiceState?.status === 'error'
                                  ? 'text-rose-300'
                                  : 'text-slate-400'
                        }`}
                      >
                        ·{' '}
                        {voiceState?.status === 'connected'
                          ? voiceState.localSpeaking
                            ? 'Berbicara'
                            : 'Terhubung'
                          : voiceState?.status === 'muted'
                            ? 'Mikrofon Dibisukan'
                            : voiceState?.status === 'connecting'
                              ? 'Menghubungkan Mikrofon...'
                              : voiceState?.status === 'denied'
                                ? 'Izin Mikrofon Ditolak'
                                : voiceState?.status === 'unsupported'
                                  ? 'Peramban Tidak Mendukung'
                                  : voiceState?.status === 'error'
                                    ? 'Koneksi Suara Gagal'
                                    : 'Belum Terhubung'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono-num">
                        {(onlineLobby.voicePeers?.length ?? 0)} pemain di suara
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Headphones className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>
                          Audio Spasial 3D:{' '}
                          <strong
                            className={
                              voiceState?.spatialEnabled ? 'text-emerald-300' : 'text-slate-400'
                            }
                          >
                            {voiceState?.spatialEnabled ? 'Aktif' : 'Nonaktif'}
                          </strong>
                        </span>
                      </span>
                      {voiceState?.errorMessage && (
                        <>
                          <span>·</span>
                          <span className="text-rose-300">{voiceState.errorMessage}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onOpenAudioSettings && (
                    <button
                      type="button"
                      onClick={onOpenAudioSettings}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-slate-700 bg-slate-900/90 text-xs font-semibold text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Headphones className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Setelan 3D</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onToggleVoiceMute}
                    disabled={voiceState?.status === 'connecting'}
                    className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${
                      voiceState?.status === 'connected'
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                        : voiceState?.status === 'muted'
                          ? 'border-rose-400/60 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
                          : 'border-amber-400/60 bg-amber-500/18 text-amber-200 hover:bg-amber-500/28'
                    }`}
                  >
                    {voiceState?.status === 'connected' ? (
                      <>
                        <Mic className="w-4 h-4 shrink-0" />
                        <span>Bisukan Mic</span>
                      </>
                    ) : voiceState?.status === 'muted' ? (
                      <>
                        <MicOff className="w-4 h-4 shrink-0" />
                        <span>Aktifkan Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 shrink-0" />
                        <span>Gabung Suara</span>
                      </>
                    )}
                  </button>

                  {voiceState?.joined && onLeaveVoice && (
                    <button
                      type="button"
                      onClick={onLeaveVoice}
                      title="Keluar dari obrolan suara"
                      aria-label="Keluar dari obrolan suara"
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-rose-500/40 bg-rose-950/45 text-xs font-semibold text-rose-300 hover:bg-rose-950/75 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <PhoneOff className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden md:inline">Putuskan</span>
                    </button>
                  )}
                </div>
              </div>
            )}

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

            {/* Section 2: Tight, Symmetrical 4-Slot Player Cards Grid (1-col mobile, 2x2 tablet, 4-col desktop — Zero Orphan Gaps) */}
            <div className="min-w-0 overflow-hidden glass-panel-soft rounded-2xl border border-amber-500/20 p-3.5 sm:p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                    Daftar Pahlawan di Lobi ({onlineLobby.players.length}/4)
                  </span>
                  <span className="text-[11px] font-mono-num text-amber-300 font-semibold shrink-0">
                    · {readyCount}/{onlineLobby.players.length} Siap
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  4 Slot Urutan Giliran · Status Koneksi &amp; Suara
                </span>
              </div>

              {/* Symmetrical 4-Slot Grid so every room state (1, 2, 3, or 4 players) fills the row evenly */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 items-stretch">
                {Array.from({ length: 4 }).map((_, slotIdx) => {
                  const p = onlineLobby.players[slotIdx];
                  if (!p) {
                    return (
                      <button
                        key={`open-slot-${slotIdx}`}
                        type="button"
                        onClick={() => void handleInviteShare()}
                        className="h-full min-w-0 overflow-hidden rounded-xl border border-dashed border-amber-500/25 bg-slate-950/40 hover:bg-slate-900/65 hover:border-amber-400/50 p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer min-h-[138px]"
                      >
                        <div className="w-8 h-8 rounded-lg border border-amber-400/35 bg-amber-500/10 flex items-center justify-center text-amber-300">
                          <Share2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-bold text-amber-200 truncate">
                            Slot #{slotIdx + 1} Terbuka
                          </div>
                          <p className="text-[10px] text-slate-400 leading-snug">
                            Undang teman ke{' '}
                            <span className="font-mono-num font-bold text-amber-300">
                              #{onlineLobby.roomCode}
                            </span>
                          </p>
                        </div>
                      </button>
                    );
                  }

                  const idx = slotIdx;
                  const isPlayerHost = p.id === onlineLobby.hostId || idx === 0;
                  const isSelf = p.id === onlineLobby.myPlayerId;
                  const isPlayerReady = isPlayerHost || Boolean(p.ready);
                  const arch = PLAYER_ARCHETYPES[p.archetypeIndex % PLAYER_ARCHETYPES.length];
                  const voicePeer = onlineLobby.voicePeers?.find((v) => v.playerId === p.id);
                  const isPlayerSpeaking = isSelf
                    ? Boolean(voiceState?.localSpeaking)
                    : Boolean(voiceState?.speakingPeerIds.includes(p.id));
                  const playerVoiceLevel = isSelf
                    ? (voiceState?.localLevel ?? 0)
                    : (voiceState?.peerLevels?.[p.id] ?? 0);
                  const isPlayerVoiceMuted = isSelf
                    ? Boolean(voiceState?.isMuted)
                    : Boolean(voicePeer?.muted);

                  return (
                    <div
                      key={p.id}
                      className={`h-full min-w-0 overflow-hidden rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-colors ${
                        isPlayerSpeaking && !isPlayerVoiceMuted && voicePeer
                          ? 'border-emerald-400/75 bg-slate-900/95 shadow-[0_0_20px_-6px_rgba(52,211,153,0.45)]'
                          : isSelf
                            ? 'border-amber-400/60 bg-slate-900/95 shadow-md'
                            : isPlayerReady
                              ? 'border-emerald-500/35 bg-slate-900/80'
                              : 'border-slate-700/80 bg-slate-900/65'
                      }`}
                    >
                      {/* Compact Card Header: Avatar Ring + Name + Ready Indicator */}
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <AnimatedProgressRing
                            progress={isPlayerReady ? 1 : 0.25}
                            size={38}
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
                            <div className="flex items-center gap-1 text-xs font-bold text-white min-w-0">
                              <span className="truncate">{p.name}</span>
                              {isPlayerHost && (
                                <Crown
                                  className="w-3.5 h-3.5 text-amber-400 shrink-0"
                                  aria-label="Host"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate mt-0.5">
                              <span className="text-amber-200/90 font-medium truncate">
                                {arch.title}
                              </span>
                              {isSelf && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-300 font-semibold shrink-0">Anda</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold whitespace-nowrap ${
                              isPlayerHost
                                ? 'text-amber-300'
                                : isPlayerReady
                                  ? 'text-emerald-300'
                                  : 'text-slate-400'
                            }`}
                          >
                            {isPlayerHost ? (
                              <>
                                <Crown className="w-3 h-3 shrink-0" />
                                <span>Host</span>
                              </>
                            ) : isPlayerReady ? (
                              <>
                                <Check className="w-3 h-3 shrink-0" />
                                <span>Siap</span>
                              </>
                            ) : (
                              <span>Menunggu</span>
                            )}
                          </span>
                          {voicePeer && (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] ${
                                isPlayerVoiceMuted
                                  ? 'bg-rose-500/12 text-rose-300'
                                  : isPlayerSpeaking
                                    ? 'bg-emerald-500/20 text-emerald-200'
                                    : 'bg-slate-950/70 text-emerald-400/80'
                              }`}
                            >
                              {isPlayerVoiceMuted ? (
                                <MicOff className="w-2.5 h-2.5" />
                              ) : (
                                <Mic className="w-2.5 h-2.5" />
                              )}
                              <VoiceActivityBars
                                level={playerVoiceLevel}
                                active={isPlayerSpeaking}
                                muted={isPlayerVoiceMuted}
                                size="xs"
                                tone={isSelf ? 'amber' : 'emerald'}
                              />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tight 3-Column Inline Stats Strip */}
                      <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-800/90 bg-slate-950/65 px-2 py-1.5 text-[10px] min-w-0">
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] leading-tight">
                            Giliran
                          </span>
                          <span className="font-mono-num font-bold text-amber-300 truncate block">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] leading-tight">
                            Ping
                          </span>
                          <span className="inline-flex items-center gap-0.5 font-mono-num font-semibold text-slate-200 truncate">
                            {p.connected !== false ? (
                              <Wifi className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                            ) : (
                              <WifiOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                            )}
                            <span>{p.pingMs ? `${p.pingMs}ms` : 'Stabil'}</span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] leading-tight">
                            {onlineLobby.boardMode === 'team' ? 'Tim' : 'Peran'}
                          </span>
                          <span className="font-semibold text-slate-200 truncate block">
                            {onlineLobby.boardMode === 'team'
                              ? p.team === 'A'
                                ? 'Surya'
                                : 'Bulan'
                              : isPlayerHost
                                ? 'Host'
                                : 'Tamu'}
                          </span>
                        </div>
                      </div>

                      {/* Consistent Footer: Moderation / Team Actions OR Hero Role Line */}
                      {onlineLobby.boardMode === 'team' || (isHost && !isSelf) ? (
                        <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-slate-800/90">
                          {onlineLobby.boardMode === 'team' && (
                            <button
                              type="button"
                              disabled={!isHost && !isSelf}
                              onClick={() =>
                                onOnlineSetTeam(p.id, p.team === 'A' ? 'B' : 'A')
                              }
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer disabled:opacity-60 disabled:cursor-default whitespace-nowrap ${
                                p.team === 'A'
                                  ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                                  : 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                              }`}
                            >
                              {p.team === 'A' ? 'Tim Surya' : 'Tim Bulan'}
                            </button>
                          )}

                          {isHost && !isSelf && onlineLobby.status === 'lobby' && (
                            <div className="flex flex-wrap items-center gap-1 ml-auto">
                              {!isPlayerReady && (
                                <button
                                  type="button"
                                  onClick={() => onOnlineReady(true, p.id)}
                                  title="Tandai pemain ini Siap"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/45 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-900/80 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Siap</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onOnlineTransferHost(p.id)}
                                title="Jadikan Host"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[10px] text-amber-300 hover:bg-slate-700 cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3" />
                                <span>Host</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onOnlineKick(p.id)}
                                title="Keluarkan dari ruangan"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[10px] text-rose-300 hover:bg-rose-900/70 cursor-pointer"
                              >
                                <UserMinus className="w-3 h-3" />
                                <span>Kick</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                          <span className="truncate">{arch.role}</span>
                          <span className="text-emerald-300/90 font-semibold shrink-0">
                            {isPlayerReady ? 'Siap Laga' : 'Persiapan'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  activeBoard={activeBoard}
                  onOpenBoardManager={isHost ? onOpenBoardManager : undefined}
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

      <footer className="mt-auto pt-3 pb-1 shrink-0 text-center text-xs text-slate-400">
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
