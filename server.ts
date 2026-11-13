import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  applyTurnEffectsToPlayers,
  pickTimeAttackWinner,
  resolveTurnMove,
  type BoardGameMode,
  type DifficultyMode,
  type PlayerState,
  type TeamId,
  type TurnResolution,
} from './shared/gameConfig.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Persistent JSON Store (Leaderboard & Cloud Sync Profiles)
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  turns: number;
  mode: string;
  difficulty: DifficultyMode;
  createdAt: string;
}

interface CloudProfileRecord {
  syncCode: string;
  pinHash: string;
  profile: Record<string, unknown>;
  updatedAt: string;
}

interface StoreData {
  leaderboard: LeaderboardEntry[];
  cloudProfiles: Record<string, CloudProfileRecord>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      return {
        leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
        cloudProfiles: parsed.cloudProfiles && typeof parsed.cloudProfiles === 'object' ? parsed.cloudProfiles : {},
      };
    }
  } catch (err) {
    console.error('Failed to read store.json:', err);
  }
  return { leaderboard: [], cloudProfiles: {} };
}

function saveStore(data: StoreData): void {
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

const store = loadStore();

function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part = '';
  for (let i = 0; i < 4; i++) {
    part += chars[crypto.randomInt(0, chars.length)];
  }
  const num = crypto.randomInt(1000, 9999);
  return `AETH-${part}${num}`;
}

// ---------------------------------------------------------------------------
// Authoritative Online Multiplayer Rooms (WebSocket)
// ---------------------------------------------------------------------------

interface MultiplayerRoom {
  code: string;
  name: string;
  isPublic: boolean;
  boardMode: BoardGameMode;
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
  clients: Map<string, WebSocket>;
  createdAt: number;
}

const rooms = new Map<string, MultiplayerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(0, chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function serializeRoom(room: MultiplayerRoom) {
  return {
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    boardMode: room.boardMode,
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
  };
}

function getPublicRoomSummaries() {
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

function broadcastRoom(room: MultiplayerRoom, payload: Record<string, unknown>) {
  const msg = JSON.stringify(payload);
  for (const ws of room.clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

function assignBalancedTeam(players: PlayerState[]): TeamId {
  const countA = players.filter((p) => p.team === 'A').length;
  const countB = players.filter((p) => p.team === 'B').length;
  return countA <= countB ? 'A' : 'B';
}

function executeRoomTurnRoll(room: MultiplayerRoom, activePlayer: PlayerState, autoRolled: boolean) {
  const roll = crypto.randomInt(1, 7);
  const resolution: TurnResolution = resolveTurnMove(
    activePlayer.tile,
    roll,
    activePlayer.shields,
    {
      boardMode: room.boardMode,
      actorId: activePlayer.id,
      actorTeam: activePlayer.team,
      otherPlayers: room.players,
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

  broadcastRoom(room, {
    type: 'game:turn_event',
    eventId: room.lastEventId,
    actorId: activePlayer.id,
    autoRolled,
    resolution,
    room: serializeRoom(room),
  });
}

// Check Time Attack expirations, turn timeouts & clean up stale rooms
setInterval(() => {
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

    const anyOpen = Array.from(room.clients.values()).some((c) => c.readyState === WebSocket.OPEN);
    if (!anyOpen && room.createdAt < cutoff) {
      rooms.delete(code);
    }
  }
}, 1000);

// ---------------------------------------------------------------------------
// Express App + HTTP + WebSocket Bootstrap
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, roomsActive: rooms.size, leaderboardCount: store.leaderboard.length });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getPublicRoomSummaries() });
  });

  // Global Leaderboard
  app.get('/api/leaderboard', (req, res) => {
    const modeFilter = String(req.query.mode || 'all');
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

    let items = [...store.leaderboard];
    if (modeFilter !== 'all') {
      items = items.filter((item) => item.mode === modeFilter);
    }
    items.sort((a, b) => b.score - a.score || a.turns - b.turns);
    res.json({ entries: items.slice(0, limit), total: items.length });
  });

  app.post('/api/leaderboard', (req, res) => {
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
  app.post('/api/cloud-sync/create', (req, res) => {
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

  app.post('/api/cloud-sync/save', (req, res) => {
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

  app.post('/api/cloud-sync/load', (req, res) => {
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

  const server = http.createServer(app);

  // Vite Dev Middleware or Production Static Files
  if (!IS_PROD) {
    app.use('/models', express.static(path.join(process.cwd(), 'public', 'models')));
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url || '/').split('?')[0];
    if (urlPath === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws) => {
    let attachedRoomCode: string | null = null;
    let attachedPlayerId: string | null = null;

    const detachFromCurrentRoom = () => {
      if (!attachedRoomCode || !attachedPlayerId) return;
      const room = rooms.get(attachedRoomCode);
      if (!room) {
        attachedRoomCode = null;
        attachedPlayerId = null;
        return;
      }
      room.clients.delete(attachedPlayerId);
      if (room.status === 'lobby') {
        room.players = room.players.filter((p) => p.id !== attachedPlayerId);
        if (room.hostId === attachedPlayerId && room.players.length > 0) {
          room.hostId = room.players[0].id;
          room.players[0].ready = true;
        }
        if (room.players.length === 0) {
          rooms.delete(room.code);
        } else {
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
      } else {
        const p = room.players.find((pl) => pl.id === attachedPlayerId);
        if (p) p.connected = false;
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
      }
      attachedRoomCode = null;
      attachedPlayerId = null;
    };

    ws.on('message', (rawData) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(rawData.toString()) as Record<string, unknown>;
      } catch {
        sendError(ws, 'Format pesan WebSocket tidak valid.');
        return;
      }

      const type = String(msg.type || '');

      if (type === 'room:ping') {
        const ts = Number(msg.ts || Date.now());
        if (attachedRoomCode && attachedPlayerId && Number.isFinite(Number(msg.lastRtt))) {
          const room = rooms.get(attachedRoomCode);
          const p = room?.players.find((pl) => pl.id === attachedPlayerId);
          if (p) {
            p.pingMs = Math.max(1, Math.min(999, Math.round(Number(msg.lastRtt))));
          }
        }
        ws.send(JSON.stringify({ type: 'room:pong', ts }));
        return;
      }

      if (type === 'room:create') {
        detachFromCurrentRoom();
        const playerName = String(msg.playerName || 'Pemain 1').trim().slice(0, 24) || 'Pemain 1';
        const playerId = String(msg.playerId || crypto.randomUUID());
        const archetypeIndex = Math.max(0, Math.min(3, Number(msg.archetypeIndex) || 0));
        const arch = PLAYER_ARCHETYPES[archetypeIndex];
        const code = generateRoomCode();
        const isPublic = msg.isPublic !== false;
        const boardMode = (['classic', 'battle', 'team', 'time_attack'].includes(String(msg.boardMode))
          ? msg.boardMode
          : 'classic') as BoardGameMode;
        const roomName =
          String(msg.roomName || `Arena ${playerName}`).trim().slice(0, 32) || `Arena ${playerName}`;
        const timeLimitSec = Math.max(60, Math.min(600, Number(msg.timeLimitSec) || TIME_ATTACK_DEFAULT_SEC));

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

        const room: MultiplayerRoom = {
          code,
          name: roomName,
          isPublic,
          boardMode,
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
          clients: new Map([[playerId, ws]]),
          createdAt: Date.now(),
        };

        rooms.set(code, room);
        attachedRoomCode = code;
        attachedPlayerId = playerId;

        ws.send(JSON.stringify({ type: 'room:joined', playerId, room: serializeRoom(room) }));
        return;
      }

      if (type === 'room:join') {
        const code = String(msg.code || '').trim().toUpperCase();
        const playerName = String(msg.playerName || 'Penjelajah').trim().slice(0, 24) || 'Penjelajah';
        const playerId = String(msg.playerId || crypto.randomUUID());
        const room = rooms.get(code);

        if (!room) {
          sendError(ws, `Ruangan "${code}" tidak ditemukan.`);
          return;
        }

        const existingPlayer = room.players.find((p) => p.id === playerId);
        if (existingPlayer) {
          existingPlayer.connected = true;
          room.clients.set(playerId, ws);
          attachedRoomCode = code;
          attachedPlayerId = playerId;
          ws.send(JSON.stringify({ type: 'room:joined', playerId, room: serializeRoom(room) }));
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
          return;
        }

        if (room.status !== 'lobby') {
          sendError(ws, 'Pertandingan sudah dimulai di ruangan ini.');
          return;
        }
        if (room.players.length >= 4) {
          sendError(ws, 'Ruangan sudah penuh (maksimal 4 pemain).');
          return;
        }

        detachFromCurrentRoom();
        const usedIndices = new Set(room.players.map((p) => p.archetypeIndex));
        let archetypeIndex = Number(msg.archetypeIndex);
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
          pingMs: 22,
        };

        room.players.push(newPlayer);
        room.clients.set(playerId, ws);
        attachedRoomCode = code;
        attachedPlayerId = playerId;

        ws.send(JSON.stringify({ type: 'room:joined', playerId, room: serializeRoom(room) }));
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (!attachedRoomCode || !attachedPlayerId) {
        sendError(ws, 'Anda belum terhubung ke ruangan.');
        return;
      }

      const room = rooms.get(attachedRoomCode);
      if (!room) {
        sendError(ws, 'Ruangan sudah berakhir.');
        return;
      }

      if (type === 'room:ready') {
        const player = room.players.find((p) => p.id === attachedPlayerId);
        if (player && room.status === 'lobby') {
          player.ready = Boolean(msg.ready);
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
        return;
      }

      if (type === 'room:set_team') {
        if (room.status !== 'lobby') return;
        const targetId = String(msg.targetId || attachedPlayerId);
        if (targetId !== attachedPlayerId && room.hostId !== attachedPlayerId) return;
        const player = room.players.find((p) => p.id === targetId);
        if (player) {
          player.team = msg.team === 'B' ? 'B' : 'A';
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
        return;
      }

      if (type === 'room:update_settings') {
        if (room.hostId !== attachedPlayerId || room.status !== 'lobby') return;
        if (typeof msg.isPublic === 'boolean') {
          room.isPublic = msg.isPublic;
        }
        if (['classic', 'battle', 'team', 'time_attack'].includes(String(msg.boardMode))) {
          room.boardMode = msg.boardMode as BoardGameMode;
        }
        if (msg.roomName) {
          room.name = String(msg.roomName).trim().slice(0, 32) || room.name;
        }
        if (Number.isFinite(Number(msg.timeLimitSec))) {
          room.timeLimitSec = Math.max(60, Math.min(600, Number(msg.timeLimitSec)));
        }
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:kick') {
        if (room.hostId !== attachedPlayerId || room.status !== 'lobby') return;
        const targetId = String(msg.targetId || '');
        if (!targetId || targetId === room.hostId) return;
        const kickedWs = room.clients.get(targetId);
        if (kickedWs && kickedWs.readyState === WebSocket.OPEN) {
          kickedWs.send(JSON.stringify({ type: 'room:kicked', message: 'Anda dikeluarkan oleh tuan rumah.' }));
        }
        room.clients.delete(targetId);
        room.players = room.players.filter((p) => p.id !== targetId);
        broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        return;
      }

      if (type === 'room:transfer_host') {
        if (room.hostId !== attachedPlayerId) return;
        const targetId = String(msg.targetId || '');
        const target = room.players.find((p) => p.id === targetId);
        if (target) {
          room.hostId = target.id;
          target.ready = true;
          broadcastRoom(room, { type: 'room:state', room: serializeRoom(room) });
        }
        return;
      }

      if (type === 'room:start') {
        if (room.hostId !== attachedPlayerId) {
          sendError(ws, 'Hanya tuan rumah yang dapat memulai pertandingan.');
          return;
        }
        if (room.players.length < 2) {
          sendError(ws, 'Minimal 2 pemain diperlukan untuk mode daring.');
          return;
        }
        room.status = 'playing';
        room.currentTurnIndex = 0;
        room.winnerId = null;
        room.winningTeam = null;
        room.turnCount = 0;
        room.endsAt = room.boardMode === 'time_attack' ? Date.now() + room.timeLimitSec * 1000 : null;
        room.turnDeadlineAt = Date.now() + ONLINE_TURN_TIMEOUT_SEC * 1000 + 4000;
        room.players.forEach((p, idx) => {
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
        return;
      }

      if (type === 'game:roll') {
        if (room.status !== 'playing') return;
        const activePlayer = room.players[room.currentTurnIndex];
        if (!activePlayer || activePlayer.id !== attachedPlayerId) {
          sendError(ws, 'Bukan giliran Anda.');
          return;
        }

        executeRoomTurnRoll(room, activePlayer, false);
        return;
      }

      if (type === 'room:rematch') {
        if (room.hostId !== attachedPlayerId) return;
        room.status = 'playing';
        room.currentTurnIndex = 0;
        room.winnerId = null;
        room.winningTeam = null;
        room.turnCount = 0;
        room.endsAt = room.boardMode === 'time_attack' ? Date.now() + room.timeLimitSec * 1000 : null;
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
        return;
      }

      if (type === 'room:chat') {
        const text = String(msg.text || '').trim().slice(0, 80);
        const player = room.players.find((p) => p.id === attachedPlayerId);
        if (text && player) {
          broadcastRoom(room, {
            type: 'room:chat_msg',
            senderId: player.id,
            senderName: player.name,
            text,
            timestamp: Date.now(),
          });
        }
        return;
      }

      if (type === 'room:leave') {
        detachFromCurrentRoom();
      }
    });

    ws.on('close', () => {
      detachFromCurrentRoom();
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether Serpent 3D server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
