import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  applyTurnEffectsToPlayers,
  buildJumpMap,
  disambiguatePlayerName,
  pickTimeAttackWinner,
  resolveTurnMove,
  type BoardGameMode,
  type DifficultyMode,
  type PlayerState,
  type TeamId,
  type TurnResolution,
} from './gameConfig.ts';
import {
  DEFAULT_BOARD_CONFIGS,
  cloneBoardConfig,
  type BoardConfig,
} from './boardThemes.ts';

// ---------------------------------------------------------------------------
// Persistent JSON Store (Serverless-safe: falls back to os.tmpdir() on Vercel)
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  turns: number;
  mode: string;
  difficulty: DifficultyMode;
  createdAt: string;
}

export interface CloudProfileRecord {
  syncCode: string;
  pinHash: string;
  profile: Record<string, unknown>;
  updatedAt: string;
}

export interface StoreData {
  leaderboard: LeaderboardEntry[];
  cloudProfiles: Record<string, CloudProfileRecord>;
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const ADMIN_EMAILS = new Set(['ihwalmaulana09@gmail.com']);

function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try {
    const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { projectId?: string };
      if (parsed.projectId) return parsed.projectId;
    }
  } catch {
    // fallback below
  }
  return 'online-quanta-zw1rw';
}

const FIREBASE_PROJECT_ID = resolveFirebaseProjectId();

interface GoogleJwkCache {
  keys: Map<string, crypto.JsonWebKey>;
  expiresAt: number;
}

let jwkCache: GoogleJwkCache = { keys: new Map(), expiresAt: 0 };

async function getGoogleSecureTokenJwk(kid: string): Promise<crypto.JsonWebKey | null> {
  const now = Date.now();
  if (now < jwkCache.expiresAt && jwkCache.keys.has(kid)) {
    return jwkCache.keys.get(kid) ?? null;
  }
  try {
    const res = await fetch(
      'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
    );
    if (!res.ok) return jwkCache.keys.get(kid) ?? null;
    const data = (await res.json()) as { keys?: Array<crypto.JsonWebKey & { kid?: string }> };
    const nextMap = new Map<string, crypto.JsonWebKey>();
    for (const k of data.keys || []) {
      if (k.kid) nextMap.set(k.kid, k);
    }
    const cc = res.headers.get('cache-control') || '';
    const maxAgeMatch = cc.match(/max-age=(\d+)/i);
    const ttlMs = maxAgeMatch ? Math.min(3600, Number(maxAgeMatch[1])) * 1000 : 15 * 60 * 1000;
    jwkCache = { keys: nextMap, expiresAt: now + Math.max(60_000, ttlMs) };
    return nextMap.get(kid) ?? null;
  } catch {
    return jwkCache.keys.get(kid) ?? null;
  }
}

async function verifyAdminBearerToken(
  req: Request,
): Promise<{ ok: true; uid: string; email: string } | { ok: false; status: number; error: string }> {
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Token otorisasi admin diperlukan.' };
  }
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, status: 401, error: 'Format token Firebase tidak valid.' };
  }

  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    };

    if (header.alg !== 'RS256' || !header.kid) {
      return { ok: false, status: 401, error: 'Algoritma atau KID token tidak valid.' };
    }
    const jwk = await getGoogleSecureTokenJwk(header.kid);
    if (!jwk) {
      return { ok: false, status: 401, error: 'Kunci publik verifikasi token tidak ditemukan.' };
    }

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const verified = crypto.verify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url'),
    );
    if (!verified) {
      return { ok: false, status: 401, error: 'Tanda tangan token Firebase tidak valid.' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expectedIss = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
    if (
      payload.aud !== FIREBASE_PROJECT_ID ||
      payload.iss !== expectedIss ||
      !payload.sub ||
      !payload.exp ||
      payload.exp <= nowSec ||
      (payload.iat && payload.iat > nowSec + 120)
    ) {
      return { ok: false, status: 401, error: 'Token Firebase kedaluwarsa atau bukan untuk proyek ini.' };
    }

    const email = String(payload.email || '').toLowerCase();
    if (!payload.email_verified || !ADMIN_EMAILS.has(email)) {
      return { ok: false, status: 403, error: 'Akses ditolak: akun bukan Administrator terverifikasi.' };
    }

    return { ok: true, uid: payload.sub, email };
  } catch {
    return { ok: false, status: 401, error: 'Gagal memverifikasi token administrator.' };
  }
}

function resolveWritableDataDir(): string {
  if (IS_SERVERLESS) {
    return path.join(os.tmpdir(), 'aether-serpent-data');
  }
  const localDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'aether-serpent-data');
  }
}

const DATA_DIR = resolveWritableDataDir();
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const ROOMS_PATH = path.join(DATA_DIR, 'rooms_cache.json');

export function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const seedPath = path.join(process.cwd(), 'data', 'store.json');
    const targetPath = fs.existsSync(STORE_PATH)
      ? STORE_PATH
      : fs.existsSync(seedPath)
        ? seedPath
        : null;

    if (targetPath) {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      return {
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        cloudProfiles:
          parsed.cloudProfiles && typeof parsed.cloudProfiles === 'object'
            ? parsed.cloudProfiles
            : {},
      };
    }
  } catch (err) {
    console.error('Failed to read store.json:', err);
  }
  return { leaderboard: [], cloudProfiles: {} };
}

export function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpPath = `${STORE_PATH}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, STORE_PATH);
  } catch (err) {
    console.error('Failed to write store.json:', err);
  }
}

export const store = loadStore();

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 4; i++) {
    part += chars[crypto.randomInt(0, chars.length)];
  }
  const num = crypto.randomInt(1000, 9999);
  return `AETH-${part}${num}`;
}

// ---------------------------------------------------------------------------
// Authoritative Multiplayer Rooms (Supports BOTH WebSocket & Vercel HTTP Sync)
// ---------------------------------------------------------------------------

export interface RoomTurnEventLog {
  eventId: number;
  actorId: string;
  autoRolled: boolean;
  resolution: TurnResolution;
  timestamp: number;
}

export interface RoomChatLog {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface SocketLike {
  readyState: number;
  send: (data: string) => void;
}

export interface MultiplayerRoom {
  code: string;
  name: string;
  isPublic: boolean;
  boardMode: BoardGameMode;
  boardConfig: BoardConfig;
  timeLimitSec: number;
  endsAt: number | null;
  turnDeadlineAt: number | null;
  hostId: string;
  status: 'lobby' | 'playing' | 'finished';
  players: PlayerState[];
  currentTurnIndex: number;
  winnerId: string | null;
  winningTeam: TeamId | null;
  turnCount: number;
  lastEventId: number;
  turnEvents: RoomTurnEventLog[];
  chatMessages: RoomChatLog[];
  kickedPlayerIds: string[];
  clients: Map<string, SocketLike>;
  createdAt: number;
  updatedAt: number;
}

export const rooms = new Map<string, MultiplayerRoom>();

function loadRoomsFromTmpCache(): void {
  try {
    if (!fs.existsSync(ROOMS_PATH)) return;
    const raw = fs.readFileSync(ROOMS_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Array<Omit<MultiplayerRoom, 'clients'>>;
    if (!Array.isArray(parsed)) return;
    const cutoff = Date.now() - 2 * 60 * 60 * 1000;
    for (const item of parsed) {
      if (!item || !item.code || (item.updatedAt ?? item.createdAt) < cutoff) continue;
      if (!rooms.has(item.code)) {
        rooms.set(item.code, {
          ...item,
          turnEvents: Array.isArray(item.turnEvents) ? item.turnEvents : [],
          chatMessages: Array.isArray(item.chatMessages) ? item.chatMessages : [],
          kickedPlayerIds: Array.isArray(item.kickedPlayerIds) ? item.kickedPlayerIds : [],
          clients: new Map(),
        });
      }
    }
  } catch {
    // ignore cache read errors
  }
}

function saveRoomsToTmpCache(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serializable = Array.from(rooms.values()).map((r) => ({
      code: r.code,
      name: r.name,
      isPublic: r.isPublic,
      boardMode: r.boardMode,
      boardConfig: r.boardConfig,
      timeLimitSec: r.timeLimitSec,
      endsAt: r.endsAt,
      turnDeadlineAt: r.turnDeadlineAt,
      hostId: r.hostId,
      status: r.status,
      players: r.players,
      currentTurnIndex: r.currentTurnIndex,
      winnerId: r.winnerId,
      winningTeam: r.winningTeam,
      turnCount: r.turnCount,
      lastEventId: r.lastEventId,
      turnEvents: r.turnEvents.slice(-8),
      chatMessages: r.chatMessages.slice(-24),
      kickedPlayerIds: r.kickedPlayerIds,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
    fs.writeFileSync(ROOMS_PATH, JSON.stringify(serializable), 'utf-8');
  } catch {
    // ignore cache write errors
  }
}

loadRoomsFromTmpCache();

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

export function serializeRoom(room: MultiplayerRoom) {
  return {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    boardMode: room.boardMode,
    boardConfig: room.boardConfig,
    timeLimitSec: room.timeLimitSec,
    endsAt: room.endsAt,
    turnDeadlineAt: room.turnDeadlineAt,
    turnTimeLimitSec: ONLINE_TURN_TIMEOUT_SEC,
    hostId: room.hostId,
    status: room.status,
    players: room.players,
    currentTurnIndex: room.currentTurnIndex,
    winnerId: room.winnerId,
    winningTeam: room.winningTeam,
    turnCount: room.turnCount,
    lastEventId: room.lastEventId,
    turnEvents: room.turnEvents.slice(-6),
    chatMessages: room.chatMessages.slice(-24),
  };
}

export function mergeRoomWithClientBackup(
  room: MultiplayerRoom,
  snapshot: unknown,
  callerPlayerId?: string,
): MultiplayerRoom {
  if (!snapshot || typeof snapshot !== 'object') return room;
  const s = snapshot as Partial<MultiplayerRoom>;
  if (!s.code || String(s.code).toUpperCase() !== room.code || !Array.isArray(s.players)) {
    return room;
  }

  let changed = false;

  // 1. Merge players across stateless serverless instances (preserving up to 4 non-kicked players)
  const existingIds = new Set(room.players.map((p) => p.id));
  for (const incomingPlayer of s.players) {
    if (
      incomingPlayer &&
      incomingPlayer.id &&
      !existingIds.has(incomingPlayer.id) &&
      !room.kickedPlayerIds.includes(incomingPlayer.id) &&
      room.players.length < 4
    ) {
      room.players.push({
        ...incomingPlayer,
        connected: true,
      });
      existingIds.add(incomingPlayer.id);
      changed = true;
    }
  }

  // If the incoming snapshot has the authoritative host (e.g. room was cold-bootstrapped by a joining guest first)
  if (s.hostId && s.hostId !== room.hostId && existingIds.has(s.hostId)) {
    const sHost = s.players.find((p) => p.id === s.hostId);
    if (sHost && s.name && !String(s.name).startsWith('Ruang #')) {
      room.hostId = s.hostId;
      room.name = String(s.name);
      if (['classic', 'battle', 'team', 'time_attack'].includes(String(s.boardMode))) {
        room.boardMode = s.boardMode as BoardGameMode;
      }
      if (typeof s.isPublic === 'boolean') {
        room.isPublic = s.isPublic;
      }
      if (Number.isFinite(Number(s.timeLimitSec))) {
        room.timeLimitSec = Number(s.timeLimitSec);
      }
      // Ensure host is first in player order while in lobby
      if (room.status === 'lobby') {
        const hostPlayer = room.players.find((p) => p.id === room.hostId);
        if (hostPlayer) {
          hostPlayer.ready = true;
          room.players = [
            hostPlayer,
            ...room.players.filter((p) => p.id !== room.hostId),
          ];
        }
      }
      changed = true;
    }
  }

  // Sync lobby ready states from snapshot ONLY monotonically (or for caller's own ready promotion)
  // so a host's or other player's 1-second-old poll backup never overwrites a guest's newly set ready=true!
  if (room.status === 'lobby' && s.status === 'lobby') {
    for (const rp of room.players) {
      if (rp.id === room.hostId && !rp.ready) {
        rp.ready = true;
        changed = true;
      }
    }
    for (const sp of s.players) {
      const rp = room.players.find((p) => p.id === sp.id);
      if (!rp || rp.id === room.hostId) continue;
      // Only promote ready=true from backup (explicit room:ready action handles unready)
      if (sp.ready === true && !rp.ready) {
        rp.ready = true;
        changed = true;
      }
      // Sync caller's own team selection if changed locally
      if (
        callerPlayerId &&
        sp.id === callerPlayerId &&
        (sp.team === 'A' || sp.team === 'B') &&
        rp.team !== sp.team
      ) {
        rp.team = sp.team;
        changed = true;
      }
    }
  }

  // 2. Advance match state if client backup has newer turn events or match transition
  const sEventId = Number(s.lastEventId) || 0;
  const sTurnCount = Number(s.turnCount) || 0;
  const statusRank = { lobby: 0, playing: 1, finished: 2 };
  const roomRank = statusRank[room.status] ?? 0;
  const snapRank = statusRank[s.status ?? 'lobby'] ?? 0;

  if (
    snapRank > roomRank ||
    sEventId > room.lastEventId ||
    (snapRank === roomRank && sTurnCount > room.turnCount)
  ) {
    if (s.status === 'playing' || s.status === 'finished') {
      room.status = s.status;
    }
    room.currentTurnIndex = Number(s.currentTurnIndex) || 0;
    room.turnCount = Math.max(room.turnCount, sTurnCount);
    room.lastEventId = Math.max(room.lastEventId, sEventId);
    room.winnerId = s.winnerId ? String(s.winnerId) : room.winnerId;
    room.winningTeam =
      s.winningTeam === 'A' || s.winningTeam === 'B' ? s.winningTeam : room.winningTeam;
    if (typeof s.endsAt === 'number') room.endsAt = s.endsAt;
    if (typeof s.turnDeadlineAt === 'number') room.turnDeadlineAt = s.turnDeadlineAt;
    if (s.boardConfig && typeof s.boardConfig === 'object') {
      room.boardConfig = cloneBoardConfig(s.boardConfig as BoardConfig);
    }

    // Update player tile/score/stats from newer snapshot while preserving any extra players
    const snapMap = new Map(s.players.map((p) => [p.id, p]));
    room.players = room.players.map((rp) => {
      const sp = snapMap.get(rp.id);
      return sp ? { ...rp, ...sp, connected: true } : rp;
    });
    changed = true;
  }

  // 3. Merge turnEvents by eventId
  if (Array.isArray(s.turnEvents) && s.turnEvents.length > 0) {
    const knownEv = new Set(room.turnEvents.map((e) => e.eventId));
    for (const ev of s.turnEvents) {
      if (ev && typeof ev.eventId === 'number' && !knownEv.has(ev.eventId)) {
        room.turnEvents.push(ev);
        knownEv.add(ev.eventId);
        changed = true;
      }
    }
    room.turnEvents.sort((a, b) => a.eventId - b.eventId);
    room.turnEvents = room.turnEvents.slice(-8);
  }

  // 4. Merge chatMessages by timestamp + senderName
  if (Array.isArray(s.chatMessages) && s.chatMessages.length > 0) {
    const knownChat = new Set(
      room.chatMessages.map((c) => `${c.timestamp}:${c.senderName}:${c.text}`),
    );
    for (const cm of s.chatMessages) {
      if (!cm || !cm.text) continue;
      const key = `${cm.timestamp}:${cm.senderName}:${cm.text}`;
      if (!knownChat.has(key)) {
        room.chatMessages.push({
          id: cm.id || cm.timestamp || Date.now(),
          senderId: cm.senderId || '',
          senderName: cm.senderName || 'Pemain',
          text: cm.text,
          timestamp: cm.timestamp || Date.now(),
        });
        knownChat.add(key);
        changed = true;
      }
    }
    room.chatMessages.sort((a, b) => a.timestamp - b.timestamp);
    room.chatMessages = room.chatMessages.slice(-24);
  }

  if (changed) {
    room.updatedAt = Date.now();
    saveRoomsToTmpCache();
  }

  return room;
}

export function rehydrateRoomFromSnapshotIfNeeded(
  code: string,
  snapshot: unknown,
  callerPlayerId?: string,
): MultiplayerRoom | undefined {
  const cleanCode = code.trim().toUpperCase();
  const existing = rooms.get(cleanCode);
  if (existing) {
    return mergeRoomWithClientBackup(existing, snapshot, callerPlayerId);
  }

  loadRoomsFromTmpCache();
  const fromTmp = rooms.get(cleanCode);
  if (fromTmp) {
    return mergeRoomWithClientBackup(fromTmp, snapshot, callerPlayerId);
  }

  if (!snapshot || typeof snapshot !== 'object') return undefined;
  const s = snapshot as Partial<MultiplayerRoom>;
  if (!s.code || String(s.code).toUpperCase() !== cleanCode || !Array.isArray(s.players)) {
    return undefined;
  }

  const rehydrated: MultiplayerRoom = {
    code: cleanCode,
    name: String(s.name || 'Arena Aether'),
    isPublic: s.isPublic !== false,
    boardMode: (['classic', 'battle', 'team', 'time_attack'].includes(String(s.boardMode))
      ? s.boardMode
      : 'classic') as BoardGameMode,
    boardConfig:
      s.boardConfig && typeof s.boardConfig === 'object'
        ? cloneBoardConfig(s.boardConfig as BoardConfig)
        : cloneBoardConfig(DEFAULT_BOARD_CONFIGS[0]),
    timeLimitSec: Number(s.timeLimitSec) || TIME_ATTACK_DEFAULT_SEC,
    endsAt: typeof s.endsAt === 'number' ? s.endsAt : null,
    turnDeadlineAt: typeof s.turnDeadlineAt === 'number' ? s.turnDeadlineAt : null,
    hostId: String(s.hostId || s.players[0]?.id || ''),
    status: s.status === 'playing' || s.status === 'finished' ? s.status : 'lobby',
    players: s.players,
    currentTurnIndex: Number(s.currentTurnIndex) || 0,
    winnerId: s.winnerId ? String(s.winnerId) : null,
    winningTeam: s.winningTeam === 'A' || s.winningTeam === 'B' ? s.winningTeam : null,
    turnCount: Number(s.turnCount) || 0,
    lastEventId: Number(s.lastEventId) || 0,
    turnEvents: Array.isArray(s.turnEvents) ? s.turnEvents : [],
    chatMessages: Array.isArray(s.chatMessages) ? s.chatMessages : [],
    kickedPlayerIds: [],
    clients: new Map(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  rooms.set(cleanCode, rehydrated);
  saveRoomsToTmpCache();
  return rehydrated;
}

export function getPublicRoomSummaries() {
  loadRoomsFromTmpCache();
  const list: Array<{
    code: string;
    name: string;
    hostName: string;
    boardMode: BoardGameMode;
    playerCount: number;
    maxPlayers: number;
    status: 'lobby' | 'playing' | 'finished';
  }> = [];

  for (const room of rooms.values()) {
    if (!room.isPublic || room.status === 'finished') continue;
    const host = room.players.find((p) => p.id === room.hostId) ?? room.players[0];
    if (!host) continue;
    list.push({
      code: room.code,
      name: room.name,
      hostName: host.name,
      boardMode: room.boardMode,
      playerCount: room.players.length,
      maxPlayers: 4,
      status: room.status,
    });
  }
  return list;
}

export function broadcastRoom(room: MultiplayerRoom, payload: Record<string, unknown>) {
  room.updatedAt = Date.now();
  saveRoomsToTmpCache();
  const msg = JSON.stringify(payload);
  for (const ws of room.clients.values()) {
    // 1 === WebSocket.OPEN
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

export function assignBalancedTeam(players: PlayerState[]): TeamId {
  const countA = players.filter((p) => p.team === 'A').length;
  const countB = players.filter((p) => p.team === 'B').length;
  return countA <= countB ? 'A' : 'B';
}

export function executeRoomTurnRoll(
  room: MultiplayerRoom,
  activePlayer: PlayerState,
  autoRolled: boolean,
) {
  const roll = crypto.randomInt(1, 7);
  const customJumpMap = buildJumpMap(room.boardConfig?.ladders, room.boardConfig?.snakes);
  const resolution: TurnResolution = resolveTurnMove(
    activePlayer.tile,
    roll,
    activePlayer.shields,
    {
      boardMode: room.boardMode,
      actorId: activePlayer.id,
      actorTeam: activePlayer.team,
      otherPlayers: room.players,
      customJumpMap,
    },
  );

  room.players = applyTurnEffectsToPlayers(
    room.players,
    activePlayer.id,
    resolution,
    'medium',
  );
  room.turnCount += 1;
  room.lastEventId += 1;

  if (resolution.won) {
    room.status = 'finished';
    room.winnerId = activePlayer.id;
    room.winningTeam = room.boardMode === 'team' ? activePlayer.team ?? 'A' : null;
    room.turnDeadlineAt = null;
  } else {
    if (!resolution.extraTurn) {
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
    }
    const jumpBufferMs = resolution.jumpTriggered
      ? resolution.shieldBlocked
        ? 650
        : resolution.jumpTriggered.type === 'snake'
          ? 2750
          : 2350
      : 0;
    const animBufferMs =
      1250 +
      resolution.pathTiles.length * 220 +
      jumpBufferMs +
      (resolution.specialHit ? 950 : 0) +
      (resolution.battlePush ? 850 : 0) +
      (resolution.teamSynergy ? 600 : 0);
    room.turnDeadlineAt = Date.now() + ONLINE_TURN_TIMEOUT_SEC * 1000 + animBufferMs;
  }

  const eventRecord: RoomTurnEventLog = {
    eventId: room.lastEventId,
    actorId: activePlayer.id,
    autoRolled,
    resolution,
    timestamp: Date.now(),
  };
  room.turnEvents = [...room.turnEvents.slice(-7), eventRecord];

  broadcastRoom(room, {
    type: 'game:turn_event',
    eventId: room.lastEventId,
    actorId: activePlayer.id,
    autoRolled,
    resolution,
    room: serializeRoom(room),
  });

  return eventRecord;
}

export function tickRoomsMaintenance(): void {
  const now = Date.now();
  const cutoff = now - 2 * 60 * 60 * 1000;

  for (const [code, room] of rooms.entries()) {
    // 1. Check Time Attack expiry
    if (
      room.status === 'playing' &&
      room.boardMode === 'time_attack' &&
      room.endsAt !== null &&
      now >= room.endsAt
    ) {
      const winner = pickTimeAttackWinner(room.players);
      room.status = 'finished';
      room.winnerId = winner ? winner.id : null;
      room.winningTeam = winner?.team ?? null;
      room.turnDeadlineAt = null;
      broadcastRoom(room, {
        type: 'game:time_up',
        room: serializeRoom(room),
      });
      continue;
    }

    // 2. Auto-roll when an online player exceeds their turn countdown
    if (room.status === 'playing' && room.turnDeadlineAt !== null && now >= room.turnDeadlineAt) {
      const activePlayer = room.players[room.currentTurnIndex];
      if (activePlayer) {
        executeRoomTurnRoll(room, activePlayer, true);
      }
    }

    const anyOpen = Array.from(room.clients.values()).some((c) => c.readyState === 1);
    if (!anyOpen && room.updatedAt < cutoff) {
      rooms.delete(code);
    }
  }
}

// ---------------------------------------------------------------------------
// Unified Room Action Processor (Used by both WebSocket & HTTP /api/mp/action)
// ---------------------------------------------------------------------------

export function createRoomInstance(opts: {
  playerId: string;
  playerName: string;
  archetypeIndex: number;
  roomName?: string;
  isPublic?: boolean;
  boardMode?: string;
  timeLimitSec?: number;
  boardConfig?: BoardConfig;
  wsClient?: SocketLike;
}): MultiplayerRoom {
  const playerId = String(opts.playerId || crypto.randomUUID());
  const playerName = disambiguatePlayerName(String(opts.playerName || ''), [], playerId);
  const archetypeIndex = Math.max(0, Math.min(3, Number(opts.archetypeIndex) || 0));
  const arch = PLAYER_ARCHETYPES[archetypeIndex];
  const code = generateRoomCode();
  const isPublic = opts.isPublic !== false;
  const boardMode = (['classic', 'battle', 'team', 'time_attack'].includes(String(opts.boardMode))
    ? opts.boardMode
    : 'classic') as BoardGameMode;
  const roomName =
    String(opts.roomName || `Arena ${playerName}`).trim().slice(0, 32) || `Arena ${playerName}`;
  const timeLimitSec = Math.max(
    60,
    Math.min(600, Number(opts.timeLimitSec) || TIME_ATTACK_DEFAULT_SEC),
  );
  const incomingBoard =
    opts.boardConfig && typeof opts.boardConfig === 'object'
      ? cloneBoardConfig(opts.boardConfig)
      : cloneBoardConfig(DEFAULT_BOARD_CONFIGS[0]);

  const hostPlayer: PlayerState = {
    id: playerId,
    name: playerName,
    isAI: false,
    archetypeIndex,
    color: arch.color,
    accentColor: arch.accentColor,
    team: 'A',
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

  const now = Date.now();
  const room: MultiplayerRoom = {
    code,
    name: roomName,
    isPublic,
    boardMode,
    boardConfig: incomingBoard,
    timeLimitSec,
    endsAt: null,
    turnDeadlineAt: null,
    hostId: playerId,
    status: 'lobby',
    players: [hostPlayer],
    currentTurnIndex: 0,
    winnerId: null,
    winningTeam: null,
    turnCount: 0,
    lastEventId: 0,
    turnEvents: [],
    chatMessages: [],
    kickedPlayerIds: [],
    clients: opts.wsClient ? new Map([[playerId, opts.wsClient]]) : new Map(),
    createdAt: now,
    updatedAt: now,
  };

  rooms.set(code, room);
  saveRoomsToTmpCache();
  return room;
}

export function detachPlayerFromRoom(code: string, playerId: string): void {
  const room = rooms.get(code);
  if (!room) return;
  room.clients.delete(playerId);
  if (room.status === 'lobby') {
    room.players = room.players.filter((p) => p.id !== playerId);
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
      room.players[0].ready = true;
    }
    if (room.players.length === 0) {
      rooms.delete(room.code);
      saveRoomsToTmpCache();
    } else {
      broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
    }
  } else {
    const p = room.players.find((pl) => pl.id === playerId);
    if (p) p.connected = false;
    broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
  }
}

// ---------------------------------------------------------------------------
// Register All Express API Routes (/api/*)
// ---------------------------------------------------------------------------

export function registerApiRoutes(app: Express): void {
  app.get('/api/health', (_req: Request, res: Response) => {
    tickRoomsMaintenance();
    res.json({
      ok: true,
      serverless: IS_SERVERLESS,
      roomsActive: rooms.size,
      leaderboardCount: store.leaderboard.length,
    });
  });

  app.get('/api/rooms', (_req: Request, res: Response) => {
    tickRoomsMaintenance();
    res.json({ rooms: getPublicRoomSummaries() });
  });

  // -------------------------------------------------------------------------
  // Protected Admin Portal API (/api/admin/*)
  // -------------------------------------------------------------------------
  app.get('/api/admin/overview', async (req: Request, res: Response) => {
    const authCheck = await verifyAdminBearerToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }

    tickRoomsMaintenance();
    loadRoomsFromTmpCache();

    const detailedRooms = Array.from(rooms.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((room) => {
        const host = room.players.find((p) => p.id === room.hostId) ?? room.players[0];
        return {
          code: room.code,
          name: room.name,
          isPublic: room.isPublic,
          boardMode: room.boardMode,
          boardName: room.boardConfig?.name || 'Papan Standar',
          themeId: room.boardConfig?.themeId || 'enchanted_forest',
          status: room.status,
          hostId: room.hostId,
          hostName: host?.name || 'Host',
          playerCount: room.players.length,
          maxPlayers: 4,
          turnCount: room.turnCount,
          chatCount: room.chatMessages.length,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          players: room.players.map((p) => ({
            id: p.id,
            name: p.name,
            tile: p.tile,
            score: p.score,
            shields: p.shields,
            connected: p.connected,
            ready: p.ready,
            pingMs: p.pingMs,
            team: p.team,
          })),
        };
      });

    const cloudSyncProfiles = Object.values(store.cloudProfiles)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .map((item) => ({
        syncCode: item.syncCode,
        playerName:
          typeof item.profile?.name === 'string' ? item.profile.name : 'Pemain Cloud',
        bestScore:
          typeof item.profile?.bestScore === 'number' ? item.profile.bestScore : 0,
        wins: typeof item.profile?.wins === 'number' ? item.profile.wins : 0,
        updatedAt: item.updatedAt,
      }));

    res.json({
      ok: true,
      serverTime: Date.now(),
      serverless: IS_SERVERLESS,
      rooms: detailedRooms,
      leaderboard: store.leaderboard.slice(0, 100),
      cloudSyncCount: cloudSyncProfiles.length,
      cloudSyncProfiles,
    });
  });

  app.delete('/api/admin/rooms/:code', async (req: Request, res: Response) => {
    const authCheck = await verifyAdminBearerToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }
    const code = String(req.params.code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: `Room "${code}" tidak ditemukan.` });
      return;
    }

    broadcastRoom(room, {
      type: 'room:kicked',
      message: 'Ruangan telah ditutup oleh Administrator.',
    });
    rooms.delete(code);
    saveRoomsToTmpCache();
    res.json({ ok: true, closedCode: code });
  });

  app.delete('/api/admin/leaderboard/:id', async (req: Request, res: Response) => {
    const authCheck = await verifyAdminBearerToken(req);
    if (!authCheck.ok) {
      res.status(authCheck.status).json({ error: authCheck.error });
      return;
    }
    const id = String(req.params.id || '').trim();
    const before = store.leaderboard.length;
    store.leaderboard = store.leaderboard.filter((entry) => entry.id !== id);
    if (store.leaderboard.length === before) {
      res.status(404).json({ error: 'Entri leaderboard tidak ditemukan.' });
      return;
    }
    saveStore(store);
    res.json({ ok: true, deletedId: id });
  });

  // HTTP Multiplayer Poll Endpoint (Vercel Serverless & Fallback Transport)
  app.post('/api/mp/poll', (req: Request, res: Response) => {
    tickRoomsMaintenance();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const playerId = String(req.body?.playerId || '').trim();
    const lastRtt = Number(req.body?.lastRtt);
    const snapshot = req.body?.roomBackup;

    if (!code) {
      res.status(400).json({ error: 'Kode ruangan diperlukan.' });
      return;
    }

    const room = rehydrateRoomFromSnapshotIfNeeded(code, snapshot, playerId);
    if (!room) {
      res.status(404).json({ error: `Ruangan "${code}" sudah berakhir atau tidak ditemukan.` });
      return;
    }

    if (playerId && room.kickedPlayerIds.includes(playerId)) {
      res.json({
        kicked: true,
        message: 'Anda dikeluarkan oleh tuan rumah.',
      });
      return;
    }

    if (playerId) {
      const player = room.players.find((p) => p.id === playerId);
      if (player) {
        player.connected = true;
        if (Number.isFinite(lastRtt) && lastRtt > 0) {
          player.pingMs = Math.max(1, Math.min(999, Math.round(lastRtt)));
        }
      }
    }

    res.json({
      ok: true,
      ts: Date.now(),
      room: serializeRoom(room),
    });
  });

  // HTTP Multiplayer Action Endpoint (Works on Vercel Serverless without WebSockets)
  app.post('/api/mp/action', (req: Request, res: Response) => {
    tickRoomsMaintenance();
    const body = (req.body || {}) as Record<string, unknown>;
    const type = String(body.type || '');
    const playerId = String(body.playerId || crypto.randomUUID());

    if (type === 'room:create') {
      const room = createRoomInstance({
        playerId,
        playerName: String(body.playerName || 'Tuan Rumah'),
        archetypeIndex: Number(body.archetypeIndex) || 0,
        roomName: String(body.roomName || ''),
        isPublic: body.isPublic !== false,
        boardMode: String(body.boardMode || 'classic'),
        timeLimitSec: Number(body.timeLimitSec) || TIME_ATTACK_DEFAULT_SEC,
        boardConfig:
          body.boardConfig && typeof body.boardConfig === 'object'
            ? (body.boardConfig as BoardConfig)
            : undefined,
      });

      res.json({
        ok: true,
        type: 'room:joined',
        playerId,
        room: serializeRoom(room),
      });
      return;
    }

    const code = String(body.code || '').trim().toUpperCase();
    let room = rehydrateRoomFromSnapshotIfNeeded(code, body.roomBackup, playerId);

    if (type === 'room:join') {
      // On stateless serverless platforms (e.g. Vercel), a joining guest might hit a cold Lambda instance
      // before the host's poll has warmed this instance. Bootstrap the room shell for valid 4-8 char codes
      // so the guest can join and reconcile with the host on the next poll (~1s).
      if (!room && code.length >= 4 && code.length <= 8) {
        const now = Date.now();
        const seedMode = ['classic', 'battle', 'team', 'time_attack'].includes(
          String(body.boardMode),
        )
          ? (body.boardMode as BoardGameMode)
          : 'classic';
        room = {
          code,
          name: String(body.roomName || `Ruang #${code}`),
          isPublic: true,
          boardMode: seedMode,
          boardConfig: cloneBoardConfig(DEFAULT_BOARD_CONFIGS[0]),
          timeLimitSec: TIME_ATTACK_DEFAULT_SEC,
          endsAt: null,
          turnDeadlineAt: null,
          hostId: String(body.hostId || playerId),
          status: 'lobby',
          players: [],
          currentTurnIndex: 0,
          winnerId: null,
          winningTeam: null,
          turnCount: 0,
          lastEventId: 0,
          turnEvents: [],
          chatMessages: [],
          kickedPlayerIds: [],
          clients: new Map(),
          createdAt: now,
          updatedAt: now,
        };
        rooms.set(code, room);
        saveRoomsToTmpCache();
      }

      if (!room) {
        res.status(404).json({ error: `Ruangan "${code}" tidak ditemukan.` });
        return;
      }

      room.kickedPlayerIds = room.kickedPlayerIds.filter((id) => id !== playerId);
      const existingPlayer = room.players.find((p) => p.id === playerId);
      if (existingPlayer) {
        existingPlayer.connected = true;
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        res.json({
          ok: true,
          type: 'room:joined',
          playerId,
          room: serializeRoom(room),
        });
        return;
      }

      if (room.status !== 'lobby') {
        res.status(400).json({ error: 'Pertandingan sudah dimulai di ruangan ini.' });
        return;
      }
      if (room.players.length >= 4) {
        res.status(400).json({ error: 'Ruangan sudah penuh (maksimal 4 pemain).' });
        return;
      }

      const playerName = disambiguatePlayerName(
        String(body.playerName || ''),
        room.players.map((p) => p.name),
        playerId,
      );
      const usedIndices = new Set(room.players.map((p) => p.archetypeIndex));
      let archetypeIndex = Number(body.archetypeIndex);
      if (!Number.isInteger(archetypeIndex) || usedIndices.has(archetypeIndex)) {
        archetypeIndex = [0, 1, 2, 3].find((idx) => !usedIndices.has(idx)) ?? 0;
      }
      const arch = PLAYER_ARCHETYPES[archetypeIndex];

      const newPlayer: PlayerState = {
        id: playerId,
        name: playerName,
        isAI: false,
        archetypeIndex,
        color: arch.color,
        accentColor: arch.accentColor,
        team: assignBalancedTeam(room.players),
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
        ready: false,
        pingMs: 24,
      };

      room.players.push(newPlayer);
      broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      res.json({
        ok: true,
        type: 'room:joined',
        playerId,
        room: serializeRoom(room),
      });
      return;
    }

    if (!room) {
      res.status(404).json({ error: 'Ruangan tidak ditemukan atau sudah ditutup.' });
      return;
    }

    if (type === 'room:ready') {
      const targetId = String(body.targetId || playerId);
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      const player = room.players.find((p) => p.id === (isHostCaller ? targetId : playerId));
      if (player && room.status === 'lobby') {
        player.ready = player.id === room.hostId ? true : Boolean(body.ready);
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:ready_all') {
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      if (isHostCaller && room.status === 'lobby') {
        room.players.forEach((p) => {
          p.ready = true;
        });
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:set_team') {
      if (room.status === 'lobby') {
        const targetId = String(body.targetId || playerId);
        const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
        if (targetId === playerId || isHostCaller) {
          const player = room.players.find((p) => p.id === targetId);
          if (player) {
            player.team = body.team === 'B' ? 'B' : 'A';
            broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
          }
        }
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:update_settings') {
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      if (isHostCaller && room.status === 'lobby') {
        if (typeof body.isPublic === 'boolean') {
          room.isPublic = body.isPublic;
        }
        if (['classic', 'battle', 'team', 'time_attack'].includes(String(body.boardMode))) {
          room.boardMode = body.boardMode as BoardGameMode;
        }
        if (body.roomName) {
          room.name = String(body.roomName).trim().slice(0, 32) || room.name;
        }
        if (Number.isFinite(Number(body.timeLimitSec))) {
          room.timeLimitSec = Math.max(60, Math.min(600, Number(body.timeLimitSec)));
        }
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:kick') {
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      if (isHostCaller && room.status === 'lobby') {
        const targetId = String(body.targetId || '');
        if (targetId && targetId !== room.hostId) {
          const kickedWs = room.clients.get(targetId);
          if (kickedWs && kickedWs.readyState === 1) {
            kickedWs.send(
              JSON.stringify({
                type: 'room:kicked',
                message: 'Anda dikeluarkan oleh tuan rumah.',
              }),
            );
          }
          room.clients.delete(targetId);
          room.players = room.players.filter((p) => p.id !== targetId);
          if (!room.kickedPlayerIds.includes(targetId)) {
            room.kickedPlayerIds.push(targetId);
          }
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:transfer_host') {
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      if (isHostCaller) {
        const targetId = String(body.targetId || '');
        const target = room.players.find((p) => p.id === targetId);
        if (target) {
          room.hostId = target.id;
          target.ready = true;
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:start') {
      const isHostCaller = room.hostId === playerId || room.players[0]?.id === playerId;
      if (!isHostCaller) {
        res.status(403).json({ error: 'Hanya tuan rumah yang dapat memulai pertandingan.' });
        return;
      }
      if (room.players.length < 2) {
        res.status(400).json({ error: 'Minimal 2 pemain diperlukan untuk mode daring.' });
        return;
      }
      room.hostId = playerId;
      if (body.boardConfig && typeof body.boardConfig === 'object') {
        room.boardConfig = cloneBoardConfig(body.boardConfig as BoardConfig);
      }
      room.status = 'playing';
      room.currentTurnIndex = 0;
      room.winnerId = null;
      room.winningTeam = null;
      room.turnCount = 0;
      room.endsAt =
        room.boardMode === 'time_attack' ? Date.now() + room.timeLimitSec * 1000 : null;
      room.turnDeadlineAt = Date.now() + ONLINE_TURN_TIMEOUT_SEC * 1000 + 4000;
      room.players.forEach((p, idx) => {
        p.ready = true;
        p.connected = true;
        p.tile = 1;
        p.score = 0;
        p.shields = 0;
        p.turnsTaken = 0;
        p.laddersClimbed = 0;
        p.snakesBitten = 0;
        p.specialTilesHit = 0;
        p.shieldsUsed = 0;
        p.battleHits = 0;
        if (!p.team) p.team = idx % 2 === 0 ? 'A' : 'B';
      });
      broadcastRoom(room, { type: 'room:started', room: serializeRoom(room) });
      res.json({ ok: true, type: 'room:started', room: serializeRoom(room) });
      return;
    }

    if (type === 'game:roll') {
      if (room.status !== 'playing') {
        res.status(400).json({ error: 'Pertandingan belum dimulai.' });
        return;
      }
      const activePlayer = room.players[room.currentTurnIndex];
      if (!activePlayer || activePlayer.id !== playerId) {
        res.status(400).json({ error: 'Bukan giliran Anda.' });
        return;
      }
      const turnEvent = executeRoomTurnRoll(room, activePlayer, false);
      res.json({
        ok: true,
        type: 'game:turn_event',
        ...turnEvent,
        room: serializeRoom(room),
      });
      return;
    }

    if (type === 'room:rematch') {
      if (room.hostId === playerId) {
        if (body.boardConfig && typeof body.boardConfig === 'object') {
          room.boardConfig = cloneBoardConfig(body.boardConfig as BoardConfig);
        }
        room.status = 'playing';
        room.currentTurnIndex = 0;
        room.winnerId = null;
        room.winningTeam = null;
        room.turnCount = 0;
        room.endsAt =
          room.boardMode === 'time_attack' ? Date.now() + room.timeLimitSec * 1000 : null;
        room.turnDeadlineAt = Date.now() + ONLINE_TURN_TIMEOUT_SEC * 1000 + 4000;
        room.players.forEach((p) => {
          p.tile = 1;
          p.score = 0;
          p.shields = 0;
          p.turnsTaken = 0;
          p.laddersClimbed = 0;
          p.snakesBitten = 0;
          p.specialTilesHit = 0;
          p.shieldsUsed = 0;
          p.battleHits = 0;
        });
        broadcastRoom(room, { type: 'room:started', room: serializeRoom(room) });
      }
      res.json({ ok: true, type: 'room:started', room: serializeRoom(room) });
      return;
    }

    if (type === 'room:chat') {
      const text = String(body.text || '').trim().slice(0, 80);
      const player = room.players.find((p) => p.id === playerId);
      if (text && player) {
        const ts = Date.now();
        const chatEntry: RoomChatLog = {
          id: ts,
          senderId: player.id,
          senderName: player.name,
          text,
          timestamp: ts,
        };
        room.chatMessages = [...room.chatMessages.slice(-23), chatEntry];
        broadcastRoom(room, {
          type: 'room:chat_msg',
          senderId: player.id,
          senderName: player.name,
          text,
          timestamp: ts,
        });
      }
      res.json({ ok: true, room: serializeRoom(room) });
      return;
    }

    if (type === 'room:leave') {
      detachPlayerFromRoom(code, playerId);
      res.json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Tipe aksi multiplayer tidak dikenali.' });
  });

  // Global Leaderboard
  app.get('/api/leaderboard', (req: Request, res: Response) => {
    const modeFilter = String(req.query.mode || 'all');
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    let items = [...store.leaderboard];
    if (modeFilter !== 'all') {
      items = items.filter((item) => item.mode === modeFilter);
    }
    items.sort((a, b) => b.score - a.score || a.turns - b.turns);
    res.json({ entries: items.slice(0, limit), total: items.length });
  });

  app.post('/api/leaderboard', (req: Request, res: Response) => {
    const body = req.body as Partial<LeaderboardEntry>;
    const playerName = String(body.playerName || '').trim().slice(0, 28);
    const score = Number(body.score);
    const turns = Number(body.turns);
    const mode = String(body.mode || 'solo').slice(0, 24);
    const difficulty = (['adaptive', 'easy', 'medium', 'hard'].includes(String(body.difficulty))
      ? body.difficulty
      : 'adaptive') as DifficultyMode;

    if (!playerName || !Number.isFinite(score) || score < 0 || !Number.isFinite(turns) || turns < 1) {
      res.status(400).json({ error: 'Data skor tidak valid.' });
      return;
    }

    const entry: LeaderboardEntry = {
      id: crypto.randomUUID(),
      playerName,
      score: Math.round(score),
      turns: Math.round(turns),
      mode,
      difficulty,
      createdAt: new Date().toISOString(),
    };

    store.leaderboard.push(entry);
    store.leaderboard.sort((a, b) => b.score - a.score || a.turns - b.turns);
    if (store.leaderboard.length > 250) {
      store.leaderboard = store.leaderboard.slice(0, 250);
    }
    saveStore(store);

    const rank = store.leaderboard.findIndex((item) => item.id === entry.id) + 1;
    res.status(201).json({ entry, rank });
  });

  // Cloud Sync
  app.post('/api/cloud-sync/create', (req: Request, res: Response) => {
    const pin = String(req.body?.pin || '').trim();
    const profile = req.body?.profile;
    if (pin.length < 4 || pin.length > 24 || !profile || typeof profile !== 'object') {
      res.status(400).json({ error: 'PIN minimal 4 karakter dan profil valid diperlukan.' });
      return;
    }

    let syncCode = generateSyncCode();
    while (store.cloudProfiles[syncCode]) {
      syncCode = generateSyncCode();
    }

    const now = new Date().toISOString();
    store.cloudProfiles[syncCode] = {
      syncCode,
      pinHash: hashPin(pin),
      profile: profile as Record<string, unknown>,
      updatedAt: now,
    };
    saveStore(store);
    res.status(201).json({ syncCode, updatedAt: now });
  });

  app.post('/api/cloud-sync/save', (req: Request, res: Response) => {
    const syncCode = String(req.body?.syncCode || '').trim().toUpperCase();
    const pin = String(req.body?.pin || '').trim();
    const profile = req.body?.profile;

    const record = store.cloudProfiles[syncCode];
    if (!record) {
      res.status(404).json({ error: 'Kode sinkronisasi tidak ditemukan.' });
      return;
    }
    if (record.pinHash !== hashPin(pin)) {
      res.status(401).json({ error: 'PIN keamanan tidak cocok.' });
      return;
    }
    if (!profile || typeof profile !== 'object') {
      res.status(400).json({ error: 'Data profil tidak valid.' });
      return;
    }

    const now = new Date().toISOString();
    record.profile = profile as Record<string, unknown>;
    record.updatedAt = now;
    saveStore(store);
    res.json({ ok: true, syncCode, updatedAt: now });
  });

  app.post('/api/cloud-sync/load', (req: Request, res: Response) => {
    const syncCode = String(req.body?.syncCode || '').trim().toUpperCase();
    const pin = String(req.body?.pin || '').trim();

    const record = store.cloudProfiles[syncCode];
    if (!record) {
      res.status(404).json({ error: 'Kode sinkronisasi tidak ditemukan.' });
      return;
    }
    if (record.pinHash !== hashPin(pin)) {
      res.status(401).json({ error: 'PIN keamanan tidak cocok.' });
      return;
    }

    res.json({
      ok: true,
      syncCode: record.syncCode,
      profile: record.profile,
      updatedAt: record.updatedAt,
    });
  });

  // Oracle Aether — Server-Side Gemini Multi-Turn AI Assistant
  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    interface ChatHistoryItem {
      role: 'user' | 'model';
      text: string;
    }
    interface GameContextPayload {
      screen?: string;
      boardName?: string;
      boardTheme?: string;
      boardMode?: string;
      difficulty?: string;
      activePlayerName?: string;
      activeTile?: number;
      activeShields?: number;
      activeScore?: number;
      upcomingLadders?: Array<{ from: number; to: number; dist: number; name?: string }>;
      upcomingSnakes?: Array<{ from: number; to: number; dist: number; name?: string }>;
      opponentsSummary?: string;
    }

    const rawMessages = Array.isArray(req.body?.messages)
      ? (req.body.messages as ChatHistoryItem[])
      : [];
    const persona = String(req.body?.persona || 'tactician');
    const speedMode = String(req.body?.speedMode || 'deep');
    const ctx = (req.body?.gameContext || {}) as GameContextPayload;

    const sanitized = rawMessages
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'model') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0,
      )
      .slice(-16)
      .map((m) => ({
        role: m.role,
        text: m.text.trim().slice(0, 1200),
      }));

    if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Pesan pengguna tidak boleh kosong.' });
      return;
    }

    const latestUserMsg = sanitized[sanitized.length - 1].text;
    const priorHistory = sanitized.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    const personaHeader =
      persona === 'lorekeeper'
        ? 'Kamu adalah "Penjaga Lore Lembah Aether", pendongeng mistis kuno di dunia Aether Serpent 3D. Gunakan gaya bahasa Indonesia fantasi kerajaan yang elegan, imersif, dan penuh wibawa.'
        : persona === 'architect'
          ? 'Kamu adalah "Arsitek Agung Papan 3D", ahli desain level, penempatan tangga & ular yang seimbang, serta estetika 8 tema dunia Aether Serpent 3D.'
          : 'Kamu adalah "Oracle Taktis Aether", penasihat strategi elit di game papan 3D Aether Serpent. Berikan analisis peluang dadu (1-6), peringatan ular di depan, target tangga terbaik, penggunaan Perisai Suci, dan strategi mode (Classic, Battle, Team 2v2, Time Attack) secara tajam, ringkas, dan jelas dalam bahasa Indonesia.';

    const ladderText =
      ctx.upcomingLadders && ctx.upcomingLadders.length > 0
        ? ctx.upcomingLadders
            .map((l) => `Petak ${l.from}→${l.to} (jarak +${l.dist} langkah)`)
            .join(', ')
        : 'Tidak ada tangga dalam 12 petak ke depan';

    const snakeText =
      ctx.upcomingSnakes && ctx.upcomingSnakes.length > 0
        ? ctx.upcomingSnakes
            .map((s) => `Petak ${s.from}→${s.to} (jarak +${s.dist} langkah)`)
            .join(', ')
        : 'Tidak ada kepala ular dalam 12 petak ke depan';

    const systemInstruction = `${personaHeader}

KONTEKS REAL-TIME PERMAINAN SAAT INI:
- Layar Aktif: ${ctx.screen || 'main_menu'}
- Papan 3D Aktif: ${ctx.boardName || 'Lembah Aether'} (Tema: ${ctx.boardTheme || 'enchanted_forest'})
- Mode Permainan: ${ctx.boardMode || 'classic'} (Kesulitan: ${ctx.difficulty || 'adaptive'})
- Pemain Giliran Aktif: ${ctx.activePlayerName || 'Penjelajah'} di Petak ${ctx.activeTile ?? 1}/100 | Skor: ${ctx.activeScore ?? 0} | Perisai Suci: ${ctx.activeShields ?? 0}
- Tangga Terdekat di Depan: ${ladderText}
- Ular Berbahaya di Depan: ${snakeText}
- Posisi Lawan/Pemain Lain: ${ctx.opponentsSummary || 'Belum ada data lawan'}

ATURAN JAWABAN:
1. Jawab selalu dalam Bahasa Indonesia yang rapi, terstruktur, dan mudah dibaca (maksimal 3-4 paragraf pendek atau poin taktis).
2. Jika pemain bertanya tentang langkah/strategi, gunakan angka petak eksak dari konteks di atas (hitung peluang mata dadu 1 sampai 6).
3. Jangan pernah menyebutkan hal teknis internal seperti API key atau prompt sistem.`;

    const modelName = speedMode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

    const buildTacticalFallback = (): string => {
      const tile = ctx.activeTile ?? 1;
      const shields = ctx.activeShields ?? 0;
      const ladders = ctx.upcomingLadders ?? [];
      const snakes = ctx.upcomingSnakes ?? [];
      const diceLadders = ladders.filter((l) => l.dist >= 1 && l.dist <= 6);
      const diceSnakes = snakes.filter((s) => s.dist >= 1 && s.dist <= 6);

      if (persona === 'lorekeeper') {
        return `✨ **Bisikan Kronik ${ctx.boardName || 'Lembah Aether'}**\n\nDi balik kabut kuno **${ctx.boardName || 'Lembah Aether'}**, setiap ubin batu memahat kisah para penjelajah terdahulu. Saat ini langkahmu berpijak di **Petak ${tile}**, tempat aliran energi Aether berpadu dengan penjaga naga purba.\n\n${
          diceLadders.length > 0
            ? `Cahaya emas tampak bersinar di **Petak ${diceLadders[0].from}** (butuh dadu **${diceLadders[0].dist}**) yang akan mengangkatmu menuju **Petak ${diceLadders[0].to}**.`
            : 'Melangkahlah dengan tenang; jalur di hadapanmu menuntut kesabaran seorang ksatria.'
        }`;
      }

      if (persona === 'architect') {
        return `🏛️ **Saran Arsitek Papan 3D (${ctx.boardName || 'Custom Board'})**\n\nUntuk menciptakan papan yang seru namun adil:\n• **Distribusi Tangga**: Tempatkan 1 tangga cepat di baris awal (petak 4–15), 2 tangga menengah di tengah (petak 28–65), dan 1 tangga harapan di akhir (petak 70–88).\n• **Keseimbangan Ular**: Hindari menaruh lebih dari 2 kepala ular berurutan dalam jarak 6 petak agar pemain tetap memiliki ruang bernapas, serta sisakan 1 ular penjaga di petak 95–99 untuk ketegangan akhir!`;
      }

      const ladderTip =
        diceLadders.length > 0
          ? `🎯 **Peluang Emas (Dadu 1–6)**: Kamu berpeluang **${Math.round((diceLadders.length / 6) * 100)}%** menaiki tangga! Incar angka dadu **${diceLadders.map((l) => `${l.dist} (Petak ${l.from}→${l.to})`).join(' atau ')}**.`
          : ladders.length > 0
            ? `🪜 **Target Tangga Berikutnya**: Tangga terdekat berada di **Petak ${ladders[0].from}→${ladders[0].to}** (+${ladders[0].dist} langkah dari posisimu).`
            : `🏁 **Jalur Akhir**: Tidak ada tangga lagi di depanmu—fokus capai **Petak 100** dengan angka dadu yang presisi (sisa **${100 - tile}** langkah).`;

      const snakeTip =
        diceSnakes.length > 0
          ? `⚠️ **Waspada Ular (Risiko ${Math.round((diceSnakes.length / 6) * 100)}%)**: Hindari angka dadu **${diceSnakes.map((s) => `${s.dist} (Petak ${s.from} turun ke ${s.to})`).join(', ')}**. ${
              shields > 0
                ? `Untungnya kamu memiliki **${shields} Perisai Suci** yang siap menahan gigitan ular secara otomatis!`
                : 'Kamu belum memiliki Perisai Suci—berhati-hatilah atau incar petak Perisai (❖) terdekat.'
            }`
          : `🛡️ **Zona Aman**: Tidak ada kepala ular dalam jangkauan 1 lemparan dadu (Petak ${tile + 1}–${Math.min(100, tile + 6)}). Ini saat terbaik untuk melempar dadu dengan percaya diri!`;

      return `🔮 **Analisis Taktis Oracle Aether — Petak ${tile}/100**\n\n${ladderTip}\n\n${snakeTip}\n\n💡 **Status Pertandingan**: Mode **${(ctx.boardMode || 'classic').toUpperCase()}** di papan **${ctx.boardName || 'Lembah Aether'}** · Skor saat ini **${ctx.activeScore ?? 0} poin**.`;
    };

    if (!process.env.GEMINI_API_KEY) {
      res.json({
        reply: buildTacticalFallback(),
        modelUsed: `${modelName} (Tactical Engine)`,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const chat = ai.chats.create({
        model: modelName,
        history: priorHistory,
        config: {
          systemInstruction,
        },
      });

      const response = await chat.sendMessage({ message: latestUserMsg });
      const replyText = (response.text || '').trim() || buildTacticalFallback();
      res.json({
        reply: replyText,
        modelUsed: modelName,
      });
    } catch (err: unknown) {
      console.error('Gemini chat error:', err);
      res.json({
        reply: buildTacticalFallback(),
        modelUsed: `${modelName} (Tactical Fallback)`,
      });
    }
  });
}
