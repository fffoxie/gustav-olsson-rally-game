import Peer, { type DataConnection } from 'peerjs';
import type { EngineCC, KartVariant, OnlinePlayerInfo, OnlineRoomState, TrackId } from './types';

export type TransportKind = 'websocket' | 'p2p';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export type MessageListener = (msg: Record<string, unknown>) => void;

export interface OnlineTransport {
  readonly kind: TransportKind;
  connect: () => void;
  send: (payload: Record<string, unknown>) => void;
  subscribe: (listener: MessageListener) => () => void;
  close: () => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return 'g_' + Math.random().toString(36).slice(2, 10);
}

const PEER_PREFIX = 'gustav-rally-51-';

/**
 * WebRTC Peer-to-Peer room transport for static hosting (GitHub Pages).
 * The room creator runs an in-browser host node via PeerJS DataChannels,
 * using the exact same JSON protocol as server.ts.
 */
class PeerP2PTransport implements OnlineTransport {
  public readonly kind: TransportKind = 'p2p';
  private listeners = new Set<MessageListener>();
  private statusCb: (s: ConnectionStatus) => void;

  private peer: Peer | null = null;
  private hostRoom: OnlineRoomState | null = null;
  private hostConnections = new Map<string, DataConnection>();
  private clientConn: DataConnection | null = null;
  private localPlayerId: string | null = null;

  constructor(statusCb: (s: ConnectionStatus) => void) {
    this.statusCb = statusCb;
  }

  public connect(): void {
    // PeerJS connects per room create/join; immediately ready for lobby UI
    this.statusCb('connected');
    this.emit({ type: 'rooms_list', rooms: [] });
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(msg: Record<string, unknown>): void {
    for (const fn of this.listeners) {
      fn(msg);
    }
  }

  private broadcastToClients(payload: Record<string, unknown>, excludeId?: string): void {
    const json = JSON.stringify(payload);
    for (const [pid, conn] of this.hostConnections.entries()) {
      if (excludeId && pid === excludeId) continue;
      if (conn.open) {
        conn.send(json);
      }
    }
  }

  private tearDownPeer(): void {
    try {
      this.clientConn?.close();
    } catch {
      // ignore
    }
    for (const conn of this.hostConnections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.hostConnections.clear();
    this.clientConn = null;
    this.hostRoom = null;
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.peer = null;
  }

  public send(payload: Record<string, unknown>): void {
    const type = String(payload.type || '');

    if (type === 'list_rooms') {
      this.emit({ type: 'rooms_list', rooms: [] });
      return;
    }

    if (type === 'create_room') {
      this.tearDownPeer();
      const code = generateRoomCode();
      const hostId = generatePlayerId();
      this.localPlayerId = hostId;

      const room: OnlineRoomState = {
        code,
        hostId,
        trackId: (payload.trackId as TrackId) || 'nordic_gravel',
        cc: (payload.cc as EngineCC) || '100cc',
        status: 'lobby',
        players: [
          {
            id: hostId,
            name: String(payload.name || 'Gustav Olsson').slice(0, 20),
            kartVariant: (payload.kartVariant as KartVariant) || 'goalie_buggy',
            liveryId: String(payload.liveryId || 'gavle_51'),
            ready: true,
            isHost: true,
          },
        ],
      };
      this.hostRoom = room;

      const peer = new Peer(`${PEER_PREFIX}${code}`);
      this.peer = peer;

      peer.on('open', () => {
        this.emit({
          type: 'joined_room',
          playerId: hostId,
          room: structuredClone(room),
        });
      });

      peer.on('connection', (conn) => {
        let joinedId: string | null = null;

        conn.on('data', (raw) => {
          let msg: Record<string, unknown>;
          try {
            msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
          } catch {
            return;
          }
          const mType = String(msg.type || '');

          if (mType === 'join_room' && this.hostRoom) {
            if (this.hostRoom.players.length >= 6) {
              conn.send(JSON.stringify({ type: 'room_error', message: 'Room is full (max 6 Gustavs).' }));
              return;
            }
            if (this.hostRoom.status === 'racing') {
              conn.send(JSON.stringify({ type: 'room_error', message: 'Race already in progress.' }));
              return;
            }

            joinedId = generatePlayerId();
            const newPlayer: OnlinePlayerInfo = {
              id: joinedId,
              name: String(msg.name || 'Gustav Racer').slice(0, 20),
              kartVariant: (msg.kartVariant as KartVariant) || 'goalie_buggy',
              liveryId: String(msg.liveryId || 'nordic_cobalt'),
              ready: false,
              isHost: false,
            };
            this.hostRoom.players.push(newPlayer);
            this.hostConnections.set(joinedId, conn);

            conn.send(
              JSON.stringify({
                type: 'joined_room',
                playerId: joinedId,
                room: structuredClone(this.hostRoom),
              }),
            );
            this.emit({ type: 'room_state', room: structuredClone(this.hostRoom) });
            this.broadcastToClients(
              { type: 'room_state', room: structuredClone(this.hostRoom) },
              joinedId,
            );
            return;
          }

          if (!joinedId || !this.hostRoom) return;

          if (mType === 'player_update') {
            const target = this.hostRoom.players.find((p) => p.id === joinedId);
            if (target) {
              if (typeof msg.name === 'string') target.name = msg.name.slice(0, 20) || target.name;
              if (typeof msg.kartVariant === 'string') target.kartVariant = msg.kartVariant as KartVariant;
              if (typeof msg.liveryId === 'string') target.liveryId = msg.liveryId;
              if (typeof msg.ready === 'boolean') target.ready = msg.ready;
              const update = { type: 'room_state', room: structuredClone(this.hostRoom) };
              this.emit(update);
              this.broadcastToClients(update);
            }
            return;
          }

          if (mType === 'kart_state') {
            const relayed = {
              type: 'kart_state',
              packet: {
                ...(msg.packet as Record<string, unknown>),
                playerId: joinedId,
              },
            };
            this.emit(relayed);
            this.broadcastToClients(relayed, joinedId);
            return;
          }

          if (mType === 'item_event') {
            const relayed = {
              type: 'item_event',
              event: {
                ...(msg.event as Record<string, unknown>),
                senderId: joinedId,
              },
            };
            this.emit(relayed);
            this.broadcastToClients(relayed, joinedId);
            return;
          }

          if (mType === 'puck_hit') {
            const relayed = {
              type: 'puck_hit',
              targetId: msg.targetId,
              senderId: joinedId,
            };
            this.emit(relayed);
            this.broadcastToClients(relayed, joinedId);
          }
        });

        conn.on('close', () => {
          if (joinedId && this.hostRoom) {
            this.hostConnections.delete(joinedId);
            this.hostRoom.players = this.hostRoom.players.filter((p) => p.id !== joinedId);
            const update = { type: 'room_state', room: structuredClone(this.hostRoom) };
            this.emit(update);
            this.broadcastToClients(update);
          }
        });
      });

      peer.on('error', (err) => {
        this.emit({
          type: 'room_error',
          message: `P2P host error (${err.type || 'network'}). Try creating a new room.`,
        });
      });
      return;
    }

    if (type === 'join_room') {
      const code = String(payload.code || '').trim().toUpperCase();
      if (code.length < 4) {
        this.emit({ type: 'room_error', message: 'Enter a valid 4-character room code.' });
        return;
      }

      this.tearDownPeer();
      const peer = new Peer();
      this.peer = peer;

      peer.on('open', () => {
        const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
        this.clientConn = conn;

        const timeout = window.setTimeout(() => {
          if (!conn.open) {
            this.emit({
              type: 'room_error',
              message: `Could not reach P2P room "${code}". Make sure the host has the lobby open.`,
            });
          }
        }, 7000);

        conn.on('open', () => {
          window.clearTimeout(timeout);
          conn.send(
            JSON.stringify({
              type: 'join_room',
              name: payload.name,
              kartVariant: payload.kartVariant,
              liveryId: payload.liveryId,
            }),
          );
        });

        conn.on('data', (raw) => {
          try {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, unknown>);
            if (msg.type === 'joined_room') {
              this.localPlayerId = String(msg.playerId);
            }
            this.emit(msg);
          } catch {
            // ignore
          }
        });

        conn.on('close', () => {
          this.emit({ type: 'room_error', message: 'Host disconnected from the room.' });
          this.emit({ type: 'left_room' });
        });
      });

      peer.on('error', () => {
        this.emit({
          type: 'room_error',
          message: `Could not join P2P room "${code}". Check the code and try again.`,
        });
      });
      return;
    }

    if (type === 'leave_room') {
      this.tearDownPeer();
      this.emit({ type: 'left_room' });
      return;
    }

    // If Host is initiating local actions:
    if (this.hostRoom) {
      if (type === 'player_update') {
        const host = this.hostRoom.players.find((p) => p.id === this.localPlayerId);
        if (host) {
          if (typeof payload.name === 'string') host.name = payload.name.slice(0, 20) || host.name;
          if (typeof payload.kartVariant === 'string') host.kartVariant = payload.kartVariant as KartVariant;
          if (typeof payload.liveryId === 'string') host.liveryId = payload.liveryId;
          if (typeof payload.ready === 'boolean') host.ready = payload.ready;
          const update = { type: 'room_state', room: structuredClone(this.hostRoom) };
          this.emit(update);
          this.broadcastToClients(update);
        }
        return;
      }

      if (type === 'room_settings') {
        if (typeof payload.trackId === 'string') this.hostRoom.trackId = payload.trackId as TrackId;
        if (typeof payload.cc === 'string') this.hostRoom.cc = payload.cc as EngineCC;
        const update = { type: 'room_state', room: structuredClone(this.hostRoom) };
        this.emit(update);
        this.broadcastToClients(update);
        return;
      }

      if (type === 'start_race') {
        this.hostRoom.status = 'racing';
        const msg = {
          type: 'race_started',
          room: structuredClone(this.hostRoom),
          startAt: Date.now() + 300,
        };
        this.emit(msg);
        this.broadcastToClients(msg);
        return;
      }

      if (type === 'return_lobby') {
        this.hostRoom.status = 'lobby';
        for (const p of this.hostRoom.players) {
          p.ready = p.isHost;
        }
        const msg = { type: 'returned_lobby', room: structuredClone(this.hostRoom) };
        this.emit(msg);
        this.broadcastToClients(msg);
        return;
      }

      if (type === 'kart_state') {
        this.broadcastToClients({
          type: 'kart_state',
          packet: {
            ...(payload.packet as Record<string, unknown>),
            playerId: this.localPlayerId,
          },
        });
        return;
      }

      if (type === 'item_event') {
        this.broadcastToClients({
          type: 'item_event',
          event: {
            ...(payload.event as Record<string, unknown>),
            senderId: this.localPlayerId,
          },
        });
        return;
      }

      if (type === 'puck_hit') {
        this.broadcastToClients({
          type: 'puck_hit',
          targetId: payload.targetId,
          senderId: this.localPlayerId,
        });
        return;
      }
    }

    // Client sending to Host
    if (this.clientConn && this.clientConn.open) {
      this.clientConn.send(JSON.stringify(payload));
    }
  }

  public close(): void {
    this.tearDownPeer();
    this.statusCb('disconnected');
  }
}

/**
 * WebSocket transport for local / Node server.ts hosting,
 * with automatic fallback callback if WS server is unavailable (e.g. static preview / GitHub Pages).
 */
class WebSocketTransport implements OnlineTransport {
  public readonly kind: TransportKind = 'websocket';
  private socket: WebSocket | null = null;
  private listeners = new Set<MessageListener>();
  private statusCb: (s: ConnectionStatus) => void;
  private onUnavailable: () => void;
  private url: string;
  private openedOnce = false;
  private closedManually = false;

  constructor(
    url: string,
    statusCb: (s: ConnectionStatus) => void,
    onUnavailable: () => void,
  ) {
    this.url = url;
    this.statusCb = statusCb;
    this.onUnavailable = onUnavailable;
  }

  public connect(): void {
    this.statusCb('connecting');
    const socket = new WebSocket(this.url);
    this.socket = socket;

    const connectTimer = window.setTimeout(() => {
      if (!this.openedOnce && !this.closedManually) {
        this.closedManually = true;
        socket.close();
        this.onUnavailable();
      }
    }, 2200);

    socket.onopen = () => {
      this.openedOnce = true;
      window.clearTimeout(connectTimer);
      this.statusCb('connected');
      this.send({ type: 'list_rooms' });
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        for (const fn of this.listeners) {
          fn(msg);
        }
      } catch {
        // ignore
      }
    };

    socket.onclose = () => {
      window.clearTimeout(connectTimer);
      if (!this.openedOnce && !this.closedManually) {
        this.onUnavailable();
      } else if (!this.closedManually) {
        this.statusCb('disconnected');
      }
    };

    socket.onerror = () => {
      if (!this.openedOnce && !this.closedManually) {
        this.closedManually = true;
        window.clearTimeout(connectTimer);
        socket.close();
        this.onUnavailable();
      }
    };
  }

  public send(payload: Record<string, unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public close(): void {
    this.closedManually = true;
    this.socket?.close();
    this.socket = null;
    this.statusCb('disconnected');
  }
}

export function createAdaptiveOnlineTransport(
  onStatusChange: (s: ConnectionStatus) => void,
  onTransportReady: (transport: OnlineTransport) => void,
): OnlineTransport {
  const isStaticPages =
    typeof window !== 'undefined' &&
    (window.location.hostname.endsWith('github.io') ||
      import.meta.env.VITE_STATIC_PAGES === 'true');

  if (isStaticPages) {
    const p2p = new PeerP2PTransport(onStatusChange);
    p2p.connect();
    return p2p;
  }

  const customWs = import.meta.env.VITE_WS_URL as string | undefined;
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsUrl = customWs || `${proto}://${window.location.host}/ws`;

  const wsTransport = new WebSocketTransport(wsUrl, onStatusChange, () => {
    // Fallback cleanly to PeerJS WebRTC P2P when hosted on any static host without server.ts
    const p2p = new PeerP2PTransport(onStatusChange);
    onTransportReady(p2p);
    p2p.connect();
  });
  wsTransport.connect();
  return wsTransport;
}
