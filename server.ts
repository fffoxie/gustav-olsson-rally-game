import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TrackId = 'nordic_gravel' | 'sunset_touge' | 'arctic_bowl';
type EngineCC = '50cc' | '100cc' | '150cc';
type KartVariant = 'goalie_buggy' | 'turbo_coupe' | 'drift_mach';

interface RoomPlayer {
  id: string;
  name: string;
  kartVariant: KartVariant;
  liveryId: string;
  ready: boolean;
  isHost: boolean;
  ws: WebSocket;
}

interface Room {
  code: string;
  hostId: string;
  trackId: TrackId;
  cc: EngineCC;
  status: 'lobby' | 'racing';
  players: Map<string, RoomPlayer>;
  createdAt: number;
}

const rooms = new Map<string, Room>();
const clientRoomMap = new Map<WebSocket, { roomCode: string; playerId: string }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function generatePlayerId(): string {
  return 'g_' + Math.random().toString(36).slice(2, 10);
}

function serializeRoom(room: Room) {
  return {
    code: room.code,
    hostId: room.hostId,
    trackId: room.trackId,
    cc: room.cc,
    status: room.status,
    players: Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      kartVariant: p.kartVariant,
      liveryId: p.liveryId,
      ready: p.ready,
      isHost: p.isHost,
    })),
  };
}

function broadcastRoom(room: Room, payload: unknown, excludePlayerId?: string) {
  const data = JSON.stringify(payload);
  for (const player of room.players.values()) {
    if (excludePlayerId && player.id === excludePlayerId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(data);
    }
  }
}

function getRoomList() {
  const list: Array<{
    code: string;
    hostName: string;
    trackId: TrackId;
    cc: EngineCC;
    playerCount: number;
    maxPlayers: number;
    status: 'lobby' | 'racing';
  }> = [];
  for (const room of rooms.values()) {
    const host = room.players.get(room.hostId);
    list.push({
      code: room.code,
      hostName: host?.name ?? 'Gustav Host',
      trackId: room.trackId,
      cc: room.cc,
      playerCount: room.players.size,
      maxPlayers: 6,
      status: room.status,
    });
  }
  return list;
}

function removeClientFromRoom(ws: WebSocket) {
  const meta = clientRoomMap.get(ws);
  if (!meta) return;
  clientRoomMap.delete(ws);

  const room = rooms.get(meta.roomCode);
  if (!room) return;

  room.players.delete(meta.playerId);
  if (room.players.size === 0) {
    rooms.delete(meta.roomCode);
    return;
  }

  if (room.hostId === meta.playerId) {
    const nextHost = room.players.values().next().value;
    if (nextHost) {
      room.hostId = nextHost.id;
      nextHost.isHost = true;
    }
  }

  broadcastRoom(room, {
    type: 'room_state',
    room: serializeRoom(room),
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomList() });
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'list_rooms') {
        ws.send(JSON.stringify({ type: 'rooms_list', rooms: getRoomList() }));
        return;
      }

      if (type === 'create_room') {
        removeClientFromRoom(ws);
        const playerId = generatePlayerId();
        const code = generateRoomCode();
        const name = String(msg.name || 'Gustav Olsson').slice(0, 20);
        const kartVariant = (msg.kartVariant as KartVariant) || 'goalie_buggy';
        const liveryId = String(msg.liveryId || 'gavle_51');
        const trackId = (msg.trackId as TrackId) || 'nordic_gravel';
        const cc = (msg.cc as EngineCC) || '100cc';

        const room: Room = {
          code,
          hostId: playerId,
          trackId,
          cc,
          status: 'lobby',
          players: new Map(),
          createdAt: Date.now(),
        };

        room.players.set(playerId, {
          id: playerId,
          name,
          kartVariant,
          liveryId,
          ready: true,
          isHost: true,
          ws,
        });

        rooms.set(code, room);
        clientRoomMap.set(ws, { roomCode: code, playerId });

        ws.send(
          JSON.stringify({
            type: 'joined_room',
            playerId,
            room: serializeRoom(room),
          }),
        );
        return;
      }

      if (type === 'join_room') {
        const code = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room_error', message: `Room "${code}" not found.` }));
          return;
        }
        if (room.players.size >= 6) {
          ws.send(JSON.stringify({ type: 'room_error', message: 'Room is full (max 6 Gustavs).' }));
          return;
        }
        if (room.status === 'racing') {
          ws.send(JSON.stringify({ type: 'room_error', message: 'Race already in progress.' }));
          return;
        }

        removeClientFromRoom(ws);
        const playerId = generatePlayerId();
        const name = String(msg.name || 'Gustav Racer').slice(0, 20);
        const kartVariant = (msg.kartVariant as KartVariant) || 'goalie_buggy';
        const liveryId = String(msg.liveryId || 'nordic_cobalt');

        room.players.set(playerId, {
          id: playerId,
          name,
          kartVariant,
          liveryId,
          ready: false,
          isHost: false,
          ws,
        });

        clientRoomMap.set(ws, { roomCode: code, playerId });

        ws.send(
          JSON.stringify({
            type: 'joined_room',
            playerId,
            room: serializeRoom(room),
          }),
        );

        broadcastRoom(
          room,
          {
            type: 'room_state',
            room: serializeRoom(room),
          },
          playerId,
        );
        return;
      }

      const meta = clientRoomMap.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room) return;
      const player = room.players.get(meta.playerId);
      if (!player) return;

      if (type === 'leave_room') {
        removeClientFromRoom(ws);
        ws.send(JSON.stringify({ type: 'left_room' }));
        return;
      }

      if (type === 'player_update') {
        if (typeof msg.name === 'string') player.name = msg.name.slice(0, 20) || player.name;
        if (typeof msg.kartVariant === 'string') player.kartVariant = msg.kartVariant as KartVariant;
        if (typeof msg.liveryId === 'string') player.liveryId = msg.liveryId;
        if (typeof msg.ready === 'boolean') player.ready = msg.ready;

        broadcastRoom(room, {
          type: 'room_state',
          room: serializeRoom(room),
        });
        return;
      }

      if (type === 'room_settings' && room.hostId === player.id) {
        if (typeof msg.trackId === 'string') room.trackId = msg.trackId as TrackId;
        if (typeof msg.cc === 'string') room.cc = msg.cc as EngineCC;

        broadcastRoom(room, {
          type: 'room_state',
          room: serializeRoom(room),
        });
        return;
      }

      if (type === 'start_race' && room.hostId === player.id) {
        room.status = 'racing';
        broadcastRoom(room, {
          type: 'race_started',
          room: serializeRoom(room),
          startAt: Date.now() + 300,
        });
        return;
      }

      if (type === 'return_lobby' && room.hostId === player.id) {
        room.status = 'lobby';
        for (const p of room.players.values()) {
          p.ready = p.isHost;
        }
        broadcastRoom(room, {
          type: 'returned_lobby',
          room: serializeRoom(room),
        });
        return;
      }

      if (type === 'kart_state') {
        broadcastRoom(
          room,
          {
            type: 'kart_state',
            packet: {
              ...(msg.packet as Record<string, unknown>),
              playerId: player.id,
            },
          },
          player.id,
        );
        return;
      }

      if (type === 'item_event') {
        broadcastRoom(
          room,
          {
            type: 'item_event',
            event: {
              ...(msg.event as Record<string, unknown>),
              senderId: player.id,
            },
          },
          player.id,
        );
        return;
      }

      if (type === 'puck_hit') {
        broadcastRoom(
          room,
          {
            type: 'puck_hit',
            targetId: msg.targetId,
            senderId: player.id,
          },
          player.id,
        );
      }
    });

    ws.on('close', () => {
      removeClientFromRoom(ws);
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Gustav Olsson Rally Kart Wii server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
