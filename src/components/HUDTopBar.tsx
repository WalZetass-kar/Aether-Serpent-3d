import React, { useState } from 'react';
import { BookOpen, Camera, Compass, Eye, Home, Menu, MessageSquare, Mic, MicOff, PhoneOff, Smile, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react';
import {
  BOARD_GAME_MODES,
  ONLINE_TURN_TIMEOUT_SEC,
  type BoardGameMode,
  type ConnectionMode,
  type DifficultyMode,
} from '../../shared/gameConfig';
import type { VoiceChatSnapshot } from '../audio/voiceChatEngine';
import type { QualityPresetId } from '../three/perf/qualityPresets';
import { AnimatedProgressRing } from './AnimatedProgressRing';
import { useEmoteLongPress, type EmoteWheelAnchor } from './EmoteWheel';
import { SerpentCrestEmblem } from './FantasyIcons';
import { VoiceActivityBars } from './VoiceActivityBars';

export interface VoiceHudParticipant {
  id: string;
  name: string;
  inVoice: boolean;
  muted: boolean;
}

interface HUDTopBarProps {
  mode: ConnectionMode;
  boardMode: BoardGameMode;
  difficulty: DifficultyMode;
  adaptiveTier: string;
  isOnline: boolean;
  muted: boolean;
  onlineRoomCode: string | null;
  pingMs: number | null;
  timeLeftSec: number | null;
  timeLimitSec: number;
  turnTimeLeftSec: number | null;
  isMyOnlineTurn: boolean;
  isAnimating: boolean;
  graphicsPreset?: QualityPresetId;
  unreadChatCount?: number;
  isSpectator?: boolean;
  spectatorCount?: number;
  voiceState?: VoiceChatSnapshot;
  voicePeerCount?: number;
  voiceParticipants?: VoiceHudParticipant[];
  myPlayerId?: string;
  onToggleVoiceMute?: () => void;
  onLeaveVoice?: () => void;
  onQuickToggleLightweight?: () => void;
  onOpenChat?: () => void;
  onOpenEmoteWheel?: (anchor: EmoteWheelAnchor) => void;
  onToggleMute: () => void;
  onOpenTutorial: () => void;
  onOpenCameraSettings?: () => void;
  onResetOverview?: () => void;
  onOpenOracleAI?: () => void;
  onReturnToMenu: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const HUDTopBar: React.FC<HUDTopBarProps> = ({
  mode,
  boardMode,
  difficulty,
  adaptiveTier,
  muted,
  onlineRoomCode,
  pingMs,
  timeLeftSec,
  timeLimitSec,
  turnTimeLeftSec,
  isMyOnlineTurn,
  isAnimating,
  graphicsPreset = 'auto',
  unreadChatCount = 0,
  isSpectator = false,
  spectatorCount = 0,
  voiceState,
  voicePeerCount = 0,
  voiceParticipants = [],
  myPlayerId,
  onToggleVoiceMute,
  onLeaveVoice,
  onQuickToggleLightweight,
  onOpenChat,
  onOpenEmoteWheel,
  onToggleMute,
  onOpenTutorial,
  onOpenCameraSettings,
  onResetOverview,
  onOpenOracleAI,
  onReturnToMenu,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const chatLongPress = useEmoteLongPress({
    enabled: Boolean(onOpenEmoteWheel),
    onLongPress: (anchor) => onOpenEmoteWheel?.(anchor),
  });

  const handleOpenEmoteFromButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onOpenEmoteWheel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onOpenEmoteWheel({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 128,
      openedByHold: false,
    });
  };

  const isLightMode = graphicsPreset === 'potato' || graphicsPreset === 'low';

  const modeLabel =
    BOARD_GAME_MODES.find((m) => m.id === boardMode)?.label ?? 'Classic';
  const showTurnClock = mode === 'online' && turnTimeLeftSec !== null && !isAnimating;
  const turnUrgent = showTurnClock && (turnTimeLeftSec ?? 99) <= 5;
  const turnProgress = showTurnClock
    ? Math.max(0, Math.min(1, (turnTimeLeftSec ?? 0) / ONLINE_TURN_TIMEOUT_SEC))
    : 1;

  const showMatchClock = timeLeftSec !== null;
  const matchUrgent = showMatchClock && (timeLeftSec ?? 999) <= 20;
  const matchProgress = showMatchClock
    ? Math.max(0, Math.min(1, (timeLeftSec ?? 0) / Math.max(1, timeLimitSec)))
    : 1;

  const pingTone =
    pingMs === null
      ? 'text-slate-400'
      : pingMs < 90
        ? 'text-emerald-300'
        : pingMs < 180
          ? 'text-amber-300'
          : 'text-rose-300';

  const showVoiceControls =
    mode === 'online' && Boolean(onlineRoomCode) && !isSpectator && Boolean(onToggleVoiceMute);

  const voiceStatusMeta = (() => {
    const status = voiceState?.status ?? 'idle';
    if (status === 'connected') {
      return {
        label: voiceState?.localSpeaking ? 'Berbicara' : voiceState?.spatialEnabled ? 'Suara 3D' : 'Suara Aktif',
        actionLabel: 'Bisukan',
        tone: 'border-emerald-400/55 bg-emerald-500/18 text-emerald-200',
        statusColor: 'text-emerald-300',
        isActiveMic: true,
      };
    }
    if (status === 'muted') {
      return {
        label: 'Mic Dibisukan',
        actionLabel: 'Aktifkan',
        tone: 'border-rose-400/55 bg-rose-500/18 text-rose-200',
        statusColor: 'text-rose-300',
        isActiveMic: false,
      };
    }
    if (status === 'connecting') {
      return {
        label: 'Menghubungkan',
        actionLabel: 'Tunggu',
        tone: 'border-amber-400/55 bg-amber-500/18 text-amber-200',
        statusColor: 'text-amber-300',
        isActiveMic: false,
      };
    }
    if (status === 'denied' || status === 'error' || status === 'unsupported') {
      return {
        label: status === 'denied' ? 'Izin Mic Ditolak' : 'Suara Tidak Tersedia',
        actionLabel: 'Coba Lagi',
        tone: 'border-rose-500/50 bg-rose-950/55 text-rose-200',
        statusColor: 'text-rose-300',
        isActiveMic: false,
      };
    }
    return {
      label: voicePeerCount > 0 ? `Suara (${voicePeerCount})` : 'Suara Siap',
      actionLabel: 'Aktifkan Mic',
      tone: 'border-slate-700/85 bg-slate-950/90 text-slate-200',
      statusColor: 'text-slate-300',
      isActiveMic: false,
    };
  })();

  const activeVoiceMeters = showVoiceControls && voiceState?.joined
    ? voiceParticipants
        .filter((vp) => vp.inVoice)
        .map((vp) => {
          const isSelf = vp.id === myPlayerId;
          const level = isSelf ? voiceState.localLevel : (voiceState.peerLevels[vp.id] ?? 0);
          const speaking = isSelf
            ? voiceState.localSpeaking
            : voiceState.speakingPeerIds.includes(vp.id);
          const isMutedPeer = isSelf ? voiceState.isMuted : vp.muted;
          return { ...vp, isSelf, level, speaking, isMutedPeer };
        })
    : [];

  return (
    <>
      <header className="pointer-events-none fixed safe-hud-top z-20 px-2 sm:px-4 pt-1.5 sm:pt-3 animate-hud-slide-in">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Slim Brand & Active Match Title */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 rounded-xl border border-amber-500/25 bg-slate-950/82 sm:bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 shadow-md min-w-0">
            <SerpentCrestEmblem className="w-4 h-4 sm:w-6 sm:h-6 shrink-0" />
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[11px] sm:text-sm font-bold text-gold-gradient truncate">
                  Aether Serpent 3D
                </span>
                {mode === 'online' && onlineRoomCode && (
                  <span className="font-mono-num text-[9px] sm:text-[11px] font-semibold text-amber-300 shrink-0">
                    #{onlineRoomCode}
                  </span>
                )}
                {isSpectator && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-sky-400/50 bg-sky-500/20 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-sky-200 shrink-0">
                    <Eye className="w-3 h-3 shrink-0" />
                    <span>MENONTON</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[9px] sm:text-[11px] text-slate-400 truncate">
                <span className="truncate">{modeLabel}</span>
                <span>·</span>
                <span className="truncate">
                  {isSpectator
                    ? `Read-Only${spectatorCount > 0 ? ` · ${spectatorCount} Penonton` : ''}`
                    : mode === 'solo'
                      ? difficulty === 'adaptive'
                        ? `AI ${adaptiveTier}`
                        : `AI ${difficulty}`
                      : mode === 'local'
                        ? 'Lokal'
                        : 'Online'}
                </span>
                {mode === 'online' && pingMs !== null && (
                  <span className={`hidden sm:inline font-mono-num ${pingTone}`}>
                    · {pingMs} ms
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Timers + Tablet/Desktop Actions + Mobile Quick Controls */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {showMatchClock && (
              <div
                className={`flex items-center gap-1 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-md bg-slate-950/80 sm:bg-slate-950/90 backdrop-blur-md ${
                  matchUrgent ? 'border-rose-500/60' : 'border-amber-500/35'
                }`}
                title="Sisa Waktu Time Attack"
              >
                <AnimatedProgressRing
                  progress={matchProgress}
                  size={28}
                  strokeWidth={2.5}
                  tone="amber"
                  urgent={matchUrgent}
                >
                  <span
                    className={`font-mono-num text-[8px] font-bold ${
                      matchUrgent ? 'text-rose-200' : 'text-amber-200'
                    }`}
                  >
                    {Math.max(0, Math.ceil(timeLeftSec ?? 0))}
                  </span>
                </AnimatedProgressRing>
                <div className="hidden sm:block leading-tight pr-0.5">
                  <div className="text-[10px] text-slate-400">Waktu</div>
                  <div
                    className={`font-mono-num text-xs font-bold ${
                      matchUrgent ? 'text-rose-200' : 'text-amber-200'
                    }`}
                  >
                    {formatClock(timeLeftSec ?? 0)}
                  </div>
                </div>
              </div>
            )}

            {showTurnClock && (
              <div
                className={`flex items-center gap-1 sm:gap-2 rounded-xl border px-1.5 sm:px-2.5 py-0.5 sm:py-1 shadow-md bg-slate-950/80 sm:bg-slate-950/90 backdrop-blur-md ${
                  turnUrgent
                    ? 'border-rose-500/70'
                    : isMyOnlineTurn
                      ? 'border-amber-400/60'
                      : 'border-sky-500/40'
                }`}
                title="Batas Waktu Lempar Dadu"
              >
                <AnimatedProgressRing
                  progress={turnProgress}
                  size={28}
                  strokeWidth={2.5}
                  tone={isMyOnlineTurn ? 'amber' : 'sky'}
                  urgent={turnUrgent}
                >
                  <span
                    className={`font-mono-num text-[9px] font-bold ${
                      turnUrgent
                        ? 'text-rose-200'
                        : isMyOnlineTurn
                          ? 'text-amber-200'
                          : 'text-sky-200'
                    }`}
                  >
                    {turnTimeLeftSec}
                  </span>
                </AnimatedProgressRing>
                <div className="hidden sm:block leading-tight pr-0.5">
                  <div className="text-[10px] text-slate-400">
                    {isMyOnlineTurn ? 'Giliranmu' : 'Giliran Lawan'}
                  </div>
                  <div className="font-mono-num text-xs font-bold text-slate-100">
                    {turnTimeLeftSec} dtk
                  </div>
                </div>
              </div>
            )}

            {/* 1-Tap Quick Lightweight Mode Toggle (Visible on Mobile, Tablet & Desktop) */}
            {onQuickToggleLightweight && (
              <button
                type="button"
                onClick={onQuickToggleLightweight}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border backdrop-blur-md h-9 sm:min-h-[38px] px-2 sm:px-2.5 text-[11px] font-bold transition-all cursor-pointer shadow-md ${
                  isLightMode
                    ? 'border-emerald-400/65 bg-emerald-500/20 text-emerald-200 hover:border-emerald-300'
                    : 'border-slate-700/80 bg-slate-950/90 text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
                }`}
                title={
                  isLightMode
                    ? 'Mode Super Ringan Aktif (Klik untuk ganti mode grafis)'
                    : 'Aktifkan Mode Super Ringan 60 FPS'
                }
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${isLightMode ? 'text-emerald-300' : 'text-amber-300'}`} />
                <span className="hidden md:inline">
                  {isLightMode ? 'Mode Ringan ON' : 'Mode Ringan'}
                </span>
              </button>
            )}

            {/* Voice Chat Status Indicator, Animated Volume Bars & Mute/Unmute (Strictly active online room only) */}
            {showVoiceControls && (
              <div className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md p-1 shadow-md">
                <div
                  className="hidden lg:flex items-center gap-1.5 px-2 text-[11px] font-semibold whitespace-nowrap"
                  title={
                    voiceState?.errorMessage ||
                    `Status Obrolan Suara: ${voiceStatusMeta.label}${voiceState?.spatialEnabled ? ' · Audio Spasial 3D Aktif' : ''}`
                  }
                >
                  {voiceState?.joined && (
                    <VoiceActivityBars
                      level={voiceState.localLevel}
                      active={voiceState.localSpeaking}
                      muted={voiceState.isMuted}
                      size="xs"
                      tone="emerald"
                    />
                  )}
                  <span className={voiceStatusMeta.statusColor}>{voiceStatusMeta.label}</span>
                  {voiceState?.joined && voicePeerCount > 0 && (
                    <span className="font-mono-num text-[10px] text-slate-400">
                      · {voicePeerCount}
                    </span>
                  )}
                </div>
                {activeVoiceMeters.length > 0 && (
                  <div className="hidden xl:flex items-center gap-1 pl-1 pr-1.5 border-l border-slate-800/90">
                    {activeVoiceMeters.slice(0, 4).map((vp) => (
                      <div
                        key={vp.id}
                        title={`${vp.name}${vp.isMutedPeer ? ' (Dibisukan)' : vp.speaking ? ' (Berbicara)' : ' (Aktif)'}`}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold max-w-[92px] transition-colors ${
                          vp.speaking && !vp.isMutedPeer
                            ? 'border-emerald-400/55 bg-emerald-500/15 text-emerald-100'
                            : 'border-slate-800 bg-slate-900/75 text-slate-300'
                        }`}
                      >
                        <VoiceActivityBars
                          level={vp.level}
                          active={vp.speaking}
                          muted={vp.isMutedPeer}
                          size="xs"
                          tone={vp.isSelf ? 'amber' : 'emerald'}
                        />
                        <span className="truncate">{vp.isSelf ? 'Anda' : vp.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={onToggleVoiceMute}
                  disabled={voiceState?.status === 'connecting'}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg border min-h-[30px] px-2.5 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 ${voiceStatusMeta.tone}`}
                  title={
                    voiceState?.joined
                      ? voiceState.isMuted
                        ? 'Aktifkan mikrofon (Unmute)'
                        : 'Bisukan mikrofon (Mute)'
                      : 'Gabung ke obrolan suara ruangan'
                  }
                  aria-label={
                    voiceState?.joined
                      ? voiceState.isMuted
                        ? 'Aktifkan mikrofon'
                        : 'Bisukan mikrofon'
                      : 'Gabung obrolan suara'
                  }
                >
                  {voiceStatusMeta.isActiveMic ? (
                    <Mic className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="hidden md:inline">{voiceStatusMeta.actionLabel}</span>
                </button>
                {voiceState?.joined && onLeaveVoice && (
                  <button
                    type="button"
                    onClick={onLeaveVoice}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900/90 w-[30px] h-[30px] text-slate-400 hover:border-rose-400/50 hover:text-rose-300 transition-colors cursor-pointer shrink-0"
                    title="Putuskan obrolan suara"
                    aria-label="Putuskan obrolan suara"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Tablet & Desktop Action Buttons */}
            {onOpenChat && (
              <button
                type="button"
                {...chatLongPress.bind}
                onClick={() => {
                  if (chatLongPress.consumeLongPressClick()) return;
                  onOpenChat();
                }}
                className={`hidden sm:inline-flex relative items-center justify-center gap-1.5 rounded-xl border backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-bold shadow-lg transition-all cursor-pointer select-none ${
                  chatLongPress.isHolding
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100 scale-95 ring-2 ring-amber-400/50'
                    : 'border-sky-400/45 bg-sky-500/15 text-sky-200 hover:border-sky-300 hover:text-sky-100'
                }`}
                title="Obrolan Pemain (Tahan untuk Emote Wheel)"
                aria-label="Buka Obrolan Pemain atau tahan untuk Emote Wheel"
              >
                <MessageSquare className="w-4 h-4 text-sky-300 shrink-0" />
                <span className="hidden md:inline">Chat</span>
                {unreadChatCount > 0 && (
                  <span className="font-mono-num inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md bg-amber-400 text-[10px] font-extrabold text-slate-950">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            )}

            {onOpenEmoteWheel && (
              <button
                type="button"
                onClick={handleOpenEmoteFromButton}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/45 bg-amber-500/12 backdrop-blur-md min-h-[38px] px-2.5 text-xs font-bold text-amber-200 hover:border-amber-300 hover:bg-amber-500/20 shadow-lg transition-all cursor-pointer"
                title="Buka Emote Wheel"
                aria-label="Buka Emote Wheel"
              >
                <Smile className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="hidden lg:inline">Emote</span>
              </button>
            )}

            {onOpenOracleAI && (
              <button
                type="button"
                onClick={onOpenOracleAI}
                className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500/15 backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-bold text-amber-200 hover:border-amber-300 hover:text-amber-100 shadow-lg transition-all cursor-pointer"
                title="Oracle Aether AI — Penasihat Strategi"
              >
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="hidden md:inline">Oracle AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md w-[38px] h-[38px] text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
              title={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
              aria-label={muted ? 'Nyalakan Suara' : 'Matikan Suara'}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onOpenTutorial}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md w-[38px] h-[38px] text-slate-200 hover:border-amber-400/50 hover:text-amber-200 transition-colors cursor-pointer"
              title="Panduan Bermain"
              aria-label="Panduan Bermain"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onReturnToMenu}
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/90 backdrop-blur-md min-h-[38px] px-2.5 md:px-3 text-xs font-semibold text-slate-200 hover:border-rose-400/50 hover:text-rose-200 transition-colors cursor-pointer whitespace-nowrap"
              title={isSpectator ? 'Keluar dari Mode Penonton' : 'Kembali ke Menu Utama'}
            >
              <Home className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{isSpectator ? 'Keluar' : 'Menu'}</span>
            </button>

            {/* Mobile Quick Voice Mute/Unmute Button with live activity indicator (Strictly active online room only) */}
            {showVoiceControls && (
              <button
                type="button"
                onClick={onToggleVoiceMute}
                disabled={voiceState?.status === 'connecting'}
                aria-label={
                  voiceState?.joined
                    ? voiceState.isMuted
                      ? 'Aktifkan mikrofon'
                      : 'Bisukan mikrofon'
                    : 'Gabung obrolan suara'
                }
                title={`Voice Chat: ${voiceStatusMeta.label}`}
                className={`sm:hidden inline-flex items-center justify-center gap-1 rounded-xl border backdrop-blur-md h-9 px-2 shadow-md transition-colors cursor-pointer shrink-0 ${voiceStatusMeta.tone}`}
              >
                {voiceStatusMeta.isActiveMic ? (
                  <Mic className="w-4 h-4 shrink-0" />
                ) : (
                  <MicOff className="w-4 h-4 shrink-0" />
                )}
                {voiceState?.joined && !voiceState.isMuted && (
                  <VoiceActivityBars
                    level={voiceState.localLevel}
                    active={voiceState.localSpeaking}
                    muted={voiceState.isMuted}
                    size="xs"
                    tone="emerald"
                  />
                )}
              </button>
            )}

            {/* Mobile Quick Chat Button (Tap: Chat, Long-Press: Emote Wheel) */}
            {onOpenChat && (
              <button
                type="button"
                {...chatLongPress.bind}
                onClick={() => {
                  if (chatLongPress.consumeLongPressClick()) return;
                  onOpenChat();
                }}
                aria-label="Buka Obrolan atau tahan untuk Emote Wheel"
                title="Ketuk: Obrolan · Tahan: Emote Wheel"
                className={`sm:hidden relative inline-flex items-center justify-center rounded-xl border backdrop-blur-md w-9 h-9 shadow-md transition-all cursor-pointer select-none ${
                  chatLongPress.isHolding
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100 scale-95 ring-2 ring-amber-400/50'
                    : 'border-sky-400/45 bg-slate-950/85 text-sky-200'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-sky-300" />
                {unreadChatCount > 0 && (
                  <span className="font-mono-num absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-md bg-amber-400 text-[9px] font-extrabold text-slate-950">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Single Menu Sidebar Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Menu Arena"
              className="sm:hidden inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-slate-950/80 backdrop-blur-md w-9 h-9 text-xs font-bold text-amber-200 shadow-md cursor-pointer"
            >
              <Menu className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile In-Game Sidebar Drawer */}
      {mobileDrawerOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs sm:hidden">
          <aside className="flex h-full w-72 max-w-[85vw] flex-col border-l border-slate-800 bg-slate-950/98 safe-drawer-inset space-y-4 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SerpentCrestEmblem className="w-5 h-5" />
                <span className="font-display text-sm font-bold text-amber-200">
                  Menu Arena
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Tutup Menu"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              {showVoiceControls && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-200">
                      <span>Obrolan Suara</span>
                      {voiceState?.joined && (
                        <VoiceActivityBars
                          level={voiceState.localLevel}
                          active={voiceState.localSpeaking}
                          muted={voiceState.isMuted}
                          size="xs"
                          tone="emerald"
                        />
                      )}
                    </span>
                    <span className={`text-[11px] font-semibold ${voiceStatusMeta.statusColor}`}>
                      {voiceStatusMeta.label}
                      {voiceState?.joined && voicePeerCount > 0 ? ` · ${voicePeerCount}` : ''}
                    </span>
                  </div>
                  {activeVoiceMeters.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                      {activeVoiceMeters.map((vp) => (
                        <div
                          key={vp.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/65 px-2.5 py-1.5 text-[11px]"
                        >
                          <span className="font-semibold text-slate-200 truncate">
                            {vp.isSelf ? `${vp.name} (Anda)` : vp.name}
                          </span>
                          <span className="inline-flex items-center gap-1.5 shrink-0">
                            <VoiceActivityBars
                              level={vp.level}
                              active={vp.speaking}
                              muted={vp.isMutedPeer}
                              size="sm"
                              tone={vp.isSelf ? 'amber' : 'emerald'}
                            />
                            <span
                              className={`text-[10px] font-semibold ${
                                vp.isMutedPeer
                                  ? 'text-rose-300'
                                  : vp.speaking
                                    ? 'text-emerald-300'
                                    : 'text-slate-400'
                              }`}
                            >
                              {vp.isMutedPeer ? 'Mati' : vp.speaking ? 'Aktif' : 'Siap'}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onToggleVoiceMute}
                      disabled={voiceState?.status === 'connecting'}
                      className={`flex-1 inline-flex items-center justify-center gap-2 min-h-[40px] px-3 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${voiceStatusMeta.tone}`}
                    >
                      {voiceStatusMeta.isActiveMic ? (
                        <Mic className="w-4 h-4 shrink-0" />
                      ) : (
                        <MicOff className="w-4 h-4 shrink-0" />
                      )}
                      <span>{voiceStatusMeta.actionLabel}</span>
                    </button>
                    {voiceState?.joined && onLeaveVoice && (
                      <button
                        type="button"
                        onClick={onLeaveVoice}
                        aria-label="Putuskan Obrolan Suara"
                        className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl border border-rose-500/40 bg-rose-950/40 text-rose-300 cursor-pointer shrink-0"
                      >
                        <PhoneOff className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {onQuickToggleLightweight && (
                <button
                  type="button"
                  onClick={() => {
                    onQuickToggleLightweight();
                  }}
                  className={`w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border text-xs font-bold ${
                    isLightMode
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>Mode Ringan (60 FPS)</span>
                  </span>
                  <span className="font-mono-num text-[11px]">
                    {isLightMode ? 'AKTIF' : 'MATI'}
                  </span>
                </button>
              )}

              {onResetOverview && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onResetOverview();
                  }}
                  className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs font-bold text-emerald-200"
                >
                  <Compass className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Reset Pandangan Papan Penuh</span>
                </button>
              )}

              {onOpenCameraSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenCameraSettings();
                  }}
                  className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
                >
                  <Camera className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Kamera, Suara & Grafis</span>
                </button>
              )}

              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenChat();
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-sky-400/45 bg-sky-500/15 text-xs font-bold text-sky-200"
                >
                  <span className="inline-flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>Obrolan Sesama Pemain</span>
                  </span>
                  {unreadChatCount > 0 && (
                    <span className="font-mono-num px-1.5 py-0.5 rounded bg-amber-400 text-[10px] font-extrabold text-slate-950">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {onOpenOracleAI && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenOracleAI();
                  }}
                  className="w-full flex items-center gap-3 min-h-[44px] px-3.5 rounded-xl border border-amber-400/50 bg-amber-500/15 text-xs font-bold text-amber-200"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Oracle Aether AI (Strategi)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onToggleMute();
                }}
                className="w-full flex items-center justify-between min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
              >
                <span className="inline-flex items-center gap-2.5">
                  {muted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  Suara Permainan
                </span>
                <span className={muted ? 'text-rose-300' : 'text-emerald-300'}>
                  {muted ? 'Mati' : 'Aktif'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenTutorial();
                }}
                className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200"
              >
                <BookOpen className="w-4 h-4 text-amber-300" />
                <span>Panduan Bermain</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onReturnToMenu();
                }}
                className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-xl border border-rose-500/35 bg-rose-950/25 text-xs font-semibold text-rose-200"
              >
                <Home className="w-4 h-4 text-rose-400" />
                <span>{isSpectator ? 'Keluar Mode Menonton' : 'Kembali ke Menu Utama'}</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

