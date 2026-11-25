import { Check, Copy, Globe, Play, RefreshCw, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { soundEngine } from '../game/soundEngine';
import {
  GUSTAV_LIVERIES,
  KART_VARIANTS,
  TRACK_LIST,
  type EngineCC,
  type OnlineRoomState,
  type OnlineRoomSummary,
  type PlayerSetup,
  type TrackId,
} from '../game/types';

interface OnlineLobbyProps {
  playerSetup: PlayerSetup;
  ws: WebSocket | null;
  roomState: OnlineRoomState | null;
  localPlayerId: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  errorMsg: string | null;
  onCreateRoom: (trackId: TrackId, cc: EngineCC) => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onUpdateRoomSettings: (trackId: TrackId, cc: EngineCC) => void;
  onStartOnlineRace: () => void;
  onClose: () => void;
}

export function OnlineLobby({
  playerSetup,
  ws,
  roomState,
  localPlayerId,
  connectionStatus,
  errorMsg,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onUpdateRoomSettings,
  onStartOnlineRace,
  onClose,
}: OnlineLobbyProps) {
  const [joinCode, setJoinCode] = useState('');
  const [rooms, setRooms] = useState<OnlineRoomSummary[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('nordic_gravel');
  const [selectedCc, setSelectedCc] = useState<EngineCC>('100cc');
  const [copied, setCopied] = useState(false);

  const refreshRooms = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
  };

  useEffect(() => {
    if (!ws) return;
    const handler = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        if (msg.type === 'rooms_list') {
          setRooms((msg.rooms as OnlineRoomSummary[]) || []);
        }
      } catch {
        // ignore
      }
    };
    ws.addEventListener('message', handler);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'list_rooms' }));
    }
    return () => ws.removeEventListener('message', handler);
  }, [ws, connectionStatus]);

  const isHost = roomState?.hostId === localPlayerId;
  const localPlayer = roomState?.players.find((p) => p.id === localPlayerId);

  const handleCopyCode = () => {
    if (!roomState) return;
    navigator.clipboard?.writeText(roomState.code).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-cyan-400" />
            <div>
              <h2 className="font-display italic text-2xl font-bold text-white">
                Online Gustav Lobby
              </h2>
              <p className="text-xs text-slate-400">
                Real-time WebSocket multiplayer · Up to 6 Gustav Olsson karts
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close online lobby"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-950/80 border border-red-700 text-sm text-red-200">
            {errorMsg}
          </div>
        )}

        {connectionStatus !== 'connected' ? (
          <div className="py-12 text-center text-slate-300">
            <p className="text-base font-semibold">Connecting to multiplayer server...</p>
            <p className="text-xs text-slate-400 mt-1">Establishing live WebSocket channel</p>
          </div>
        ) : !roomState ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Room */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white mb-1">Host New Race</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Racing as <span className="text-amber-400 font-semibold">{playerSetup.name}</span>
                </p>

                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Initial Track
                </label>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value as TrackId)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-3"
                >
                  {TRACK_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Engine Class
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['50cc', '100cc', '150cc'] as EngineCC[]).map((cc) => (
                    <button
                      key={cc}
                      onClick={() => setSelectedCc(cc)}
                      className={`py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        selectedCc === cc
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {cc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  onCreateRoom(selectedTrack, selectedCc);
                }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
              >
                Create Room
              </button>
            </div>

            {/* Join Room + Open Rooms */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white mb-1">Join Room Code</h3>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABCD"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono-tabular uppercase text-white tracking-widest focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    onClick={() => {
                      soundEngine.playUiClick();
                      if (joinCode.trim().length >= 4) onJoinRoom(joinCode.trim());
                    }}
                    className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[160px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">Open Rooms</span>
                  <button
                    onClick={refreshRooms}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>

                {rooms.length === 0 ? (
                  <div className="flex-1 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500 p-4 text-center">
                    No active rooms yet. Create one and share the 4-letter code!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {rooms.map((r) => {
                      const t = TRACK_LIST.find((tr) => tr.id === r.trackId);
                      return (
                        <div
                          key={r.code}
                          className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span className="font-mono-tabular text-amber-400">{r.code}</span>
                              <span className="text-slate-500">·</span>
                              <span>{r.hostName}</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {t?.name} · {r.cc.toUpperCase()} · {r.playerCount}/{r.maxPlayers} Gustavs
                            </div>
                          </div>
                          <button
                            disabled={r.status === 'racing' || r.playerCount >= r.maxPlayers}
                            onClick={() => onJoinRoom(r.code)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                          >
                            {r.status === 'racing' ? 'Racing' : 'Join'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Inside Active Room */
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">ROOM CODE</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-3xl font-bold text-amber-400 tracking-widest">
                      {roomState.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      title="Copy room code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  disabled={!isHost}
                  value={roomState.trackId}
                  onChange={(e) => onUpdateRoomSettings(e.target.value as TrackId, roomState.cc)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-70"
                >
                  {TRACK_LIST.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>

                <select
                  disabled={!isHost}
                  value={roomState.cc}
                  onChange={(e) => onUpdateRoomSettings(roomState.trackId, e.target.value as EngineCC)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-70"
                >
                  <option value="50cc">50cc</option>
                  <option value="100cc">100cc</option>
                  <option value="150cc">150cc</option>
                </select>
              </div>
            </div>

            {/* Connected Gustav Players */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Connected Gustav Racers ({roomState.players.length}/6)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {roomState.players.map((p) => {
                  const liv = GUSTAV_LIVERIES.find((l) => l.id === p.liveryId) || GUSTAV_LIVERIES[0];
                  const variant = KART_VARIANTS.find((v) => v.id === p.kartVariant) || KART_VARIANTS[0];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-8 rounded-sm shrink-0"
                          style={{ backgroundColor: liv.accentHex }}
                        />
                        <div>
                          <div className="text-sm font-bold text-white">
                            {p.name} {p.id === localPlayerId ? '(You)' : ''}
                          </div>
                          <div className="text-xs text-slate-400">
                            {variant.name} {p.isHost ? '· Host' : ''}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          p.ready ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {p.ready ? 'Ready' : 'Waiting'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onLeaveRoom}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
              >
                Leave Room
              </button>

              <div className="flex items-center gap-3">
                {!isHost && (
                  <button
                    onClick={onToggleReady}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-colors ${
                      localPlayer?.ready
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    {localPlayer?.ready ? 'Ready!' : 'Mark Ready'}
                  </button>
                )}

                {isHost && (
                  <button
                    onClick={onStartOnlineRace}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    Start Race
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
