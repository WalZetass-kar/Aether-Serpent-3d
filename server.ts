import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import {
  ONLINE_TURN_TIMEOUT_SEC,
  PLAYER_ARCHETYPES,
  TIME_ATTACK_DEFAULT_SEC,
  disambiguatePlayerName,
  type BoardGameMode,
  type PlayerState,
} from './shared/gameConfig.ts';
import {
  cloneBoardConfig,
  type BoardConfig,
} from './shared/boardThemes.ts';
import {
  assignBalancedTeam,
  broadcastRoom,
  createRoomInstance,
  detachPlayerFromRoom,
  executeRoomTurnRoll,
  registerApiRoutes,
  rooms,
  serializeRoom,
  tickRoomsMaintenance,
  type RoomChatLog,
} from './shared/mpServerCore.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

function sendError(ws: WebSocket, message: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message }));
  }
}

// Check Time Attack expirations, turn timeouts & clean up stale rooms
setInterval(() => {
  tickRoomsMaintenance();
}, 1000);

// ---------------------------------------------------------------------------
// Express App + HTTP + WebSocket Bootstrap
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  registerApiRoutes(app);

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
      detachPlayerFromRoom(attachedRoomCode, attachedPlayerId);
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
        const playerId = String(msg.playerId || crypto.randomUUID());
        const room = createRoomInstance({
          playerId,
          playerName: String(msg.playerName || 'Tuan Rumah'),
          archetypeIndex: Number(msg.archetypeIndex) || 0,
          roomName: String(msg.roomName || ''),
          isPublic: msg.isPublic !== false,
          boardMode: String(msg.boardMode || 'classic'),
          timeLimitSec: Number(msg.timeLimitSec) || TIME_ATTACK_DEFAULT_SEC,
          boardConfig:
            msg.boardConfig && typeof msg.boardConfig === 'object'
              ? (msg.boardConfig as BoardConfig)
              : undefined,
          wsClient: ws,
        });

        attachedRoomCode = room.code;
        attachedPlayerId = playerId;

        ws.send(JSON.stringify({ type: 'room:joined', playerId, room: serializeRoom(room) }));
        return;
      }

      if (type === 'room:join') {
        const code = String(msg.code || '').trim().toUpperCase();
        const playerId = String(msg.playerId || crypto.randomUUID());
        const room = rooms.get(code);

        if (!room) {
          sendError(ws, `Ruangan "${code}" tidak ditemukan.`);
          return;
        }

        room.kickedPlayerIds = room.kickedPlayerIds.filter((id) => id !== playerId);
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
        const playerName = disambiguatePlayerName(
          String(msg.playerName || ''),
          room.players.map((p) => p.name),
          playerId,
        );
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
        if (!room.kickedPlayerIds.includes(targetId)) {
          room.kickedPlayerIds.push(targetId);
        }
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
        if (msg.boardConfig && typeof msg.boardConfig === 'object') {
          room.boardConfig = cloneBoardConfig(msg.boardConfig as BoardConfig);
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
        if (msg.boardConfig && typeof msg.boardConfig === 'object') {
          room.boardConfig = cloneBoardConfig(msg.boardConfig as BoardConfig);
        }
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
