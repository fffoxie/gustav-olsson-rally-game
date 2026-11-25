import { useCallback, useEffect, useRef, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { OnlineLobby } from './components/OnlineLobby';
import { RaceHUD } from './components/RaceHUD';
import { RaceCanvas } from './game/RaceCanvas';
import { soundEngine } from './game/soundEngine';
import type {
  EngineCC,
  GameMode,
  OnlineRoomState,
  PlayerSetup,
  RaceConfig,
  RaceResultsEntry,
  RacerHUDState,
  TrackId,
} from './game/types';

const BEST_TIMES_KEY = 'gustav_rally_best_times_v1';

function loadBestTimes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'racing'>('menu');
  const [raceRunId, setRaceRunId] = useState(0);

  const [p1, setP1] = useState<PlayerSetup>({
    name: 'Gustav Olsson',
    kartVariant: 'goalie_buggy',
    liveryId: 'gavle_51',
  });
  const [p2, setP2] = useState<PlayerSetup>({
    name: 'Gustav P2',
    kartVariant: 'drift_mach',
    liveryId: 'nordic_cobalt',
  });

  const [trackId, setTrackId] = useState<TrackId>('nordic_gravel');
  const [cc, setCc] = useState<EngineCC>('100cc');
  const [mode, setMode] = useState<GameMode>('grand_prix');
  const [bestTimes, setBestTimes] = useState<Record<string, number>>(() => loadBestTimes());

  // Active Race State
  const [activeConfig, setActiveConfig] = useState<RaceConfig | null>(null);
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null);
  const [racersHud, setRacersHud] = useState<RacerHUDState[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<RaceResultsEntry[] | null>(null);

  // Online WebSocket State
  const [showOnlineModal, setShowOnlineModal] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [roomState, setRoomState] = useState<OnlineRoomState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const p1Ref = useRef(p1);
  p1Ref.current = p1;
  const localPlayerIdRef = useRef<string | null>(null);
  localPlayerIdRef.current = localPlayerId;

  const ensureWebSocket = useCallback(() => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    setWsStatus('connecting');
    setOnlineError(null);

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${proto}://${window.location.host}/ws`);

    socket.onopen = () => {
      setWsStatus('connected');
      socket.send(JSON.stringify({ type: 'list_rooms' }));
    };

    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        if (msg.type === 'joined_room') {
          const pid = String(msg.playerId);
          localPlayerIdRef.current = pid;
          setLocalPlayerId(pid);
          setRoomState(msg.room as OnlineRoomState);
          setOnlineError(null);
        } else if (msg.type === 'room_state') {
          setRoomState(msg.room as OnlineRoomState);
        } else if (msg.type === 'room_error') {
          setOnlineError(String(msg.message || 'Multiplayer error'));
        } else if (msg.type === 'left_room') {
          localPlayerIdRef.current = null;
          setRoomState(null);
          setLocalPlayerId(null);
        } else if (msg.type === 'race_started') {
          const room = msg.room as OnlineRoomState;
          setRoomState(room);
          setShowOnlineModal(false);
          setCountdown(null);
          setPaused(false);
          setResults(null);
          setElapsedMs(0);
          setRacersHud([]);
          setActiveConfig({
            mode: 'online',
            trackId: room.trackId,
            cc: room.cc,
            p1: p1Ref.current,
            onlineRoomCode: room.code,
            localPlayerId: localPlayerIdRef.current || undefined,
            onlinePlayers: room.players,
          });
          setRaceRunId((n) => n + 1);
          setScreen('racing');
        } else if (msg.type === 'returned_lobby') {
          const room = msg.room as OnlineRoomState;
          setRoomState(room);
          setScreen('menu');
          setShowOnlineModal(true);
          soundEngine.playOst('menu');
        }
      } catch {
        // ignore
      }
    };

    socket.onclose = () => {
      setWsStatus('disconnected');
      setWs(null);
    };

    socket.onerror = () => {
      setOnlineError('Connection lost to multiplayer server.');
    };

    setWs(socket);
  }, [ws]);

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  const startLocalRace = useCallback(() => {
    setCountdown(null);
    setPaused(false);
    setResults(null);
    setElapsedMs(0);
    setRacersHud([]);
    setActiveConfig({
      mode: mode === 'online' ? 'grand_prix' : mode,
      trackId,
      cc,
      p1,
      p2: mode === 'split_screen' ? p2 : undefined,
    });
    setRaceRunId((n) => n + 1);
    setScreen('racing');
  }, [mode, trackId, cc, p1, p2]);

  const handleRestartRace = useCallback(() => {
    setCountdown(null);
    setPaused(false);
    setResults(null);
    setElapsedMs(0);
    setRacersHud([]);
    setRaceRunId((n) => n + 1);
  }, []);

  const handleExitMenu = useCallback(() => {
    if (activeConfig?.mode === 'online' && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave_room' }));
    }
    setScreen('menu');
    setPaused(false);
    setResults(null);
    setCountdown(null);
    soundEngine.setFinalLap(false);
    soundEngine.setHyperStar(false);
    soundEngine.playOst('menu');
  }, [activeConfig, ws]);

  const handleRaceFinished = useCallback(
    (raceResults: RaceResultsEntry[]) => {
      setResults(raceResults);
      const human = raceResults.find((r) => r.isHuman);
      if (human && activeConfig) {
        const key = activeConfig.trackId;
        setBestTimes((prev) => {
          const currentBest = prev[key];
          if (!currentBest || human.finishTimeMs < currentBest) {
            const next = { ...prev, [key]: human.finishTimeMs };
            try {
              localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(next));
            } catch {
              // ignore storage quota
            }
            return next;
          }
          return prev;
        });
      }
    },
    [activeConfig],
  );

  // Online Lobby Handlers
  const handleOpenOnline = () => {
    setShowOnlineModal(true);
    ensureWebSocket();
  };

  const handleCreateRoom = (tId: TrackId, roomCc: EngineCC) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: 'create_room',
        name: p1.name || 'Gustav Olsson',
        kartVariant: p1.kartVariant,
        liveryId: p1.liveryId,
        trackId: tId,
        cc: roomCc,
      }),
    );
  };

  const handleJoinRoom = (code: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: 'join_room',
        code,
        name: p1.name || 'Gustav Racer',
        kartVariant: p1.kartVariant,
        liveryId: p1.liveryId,
      }),
    );
  };

  const handleLeaveRoom = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'leave_room' }));
    }
    setRoomState(null);
    setLocalPlayerId(null);
  };

  const handleToggleReady = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !roomState || !localPlayerId) return;
    const me = roomState.players.find((p) => p.id === localPlayerId);
    ws.send(
      JSON.stringify({
        type: 'player_update',
        ready: !me?.ready,
        kartVariant: p1.kartVariant,
        liveryId: p1.liveryId,
        name: p1.name,
      }),
    );
  };

  const handleUpdateRoomSettings = (tId: TrackId, roomCc: EngineCC) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'room_settings', trackId: tId, cc: roomCc }));
  };

  const handleStartOnlineRace = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'start_race' }));
  };

  const handleReturnOnlineLobby = () => {
    if (ws && ws.readyState === WebSocket.OPEN && roomState?.hostId === localPlayerId) {
      ws.send(JSON.stringify({ type: 'return_lobby' }));
    } else {
      setScreen('menu');
      setShowOnlineModal(true);
      soundEngine.playOst('menu');
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      {screen === 'menu' ? (
        <>
          <MainMenu
            p1={p1}
            p2={p2}
            trackId={trackId}
            cc={cc}
            mode={mode}
            bestTimes={bestTimes}
            onChangeP1={setP1}
            onChangeP2={setP2}
            onChangeTrack={setTrackId}
            onChangeCc={setCc}
            onChangeMode={setMode}
            onStartRace={startLocalRace}
            onOpenOnline={handleOpenOnline}
          />

          {showOnlineModal && (
            <OnlineLobby
              playerSetup={p1}
              ws={ws}
              roomState={roomState}
              localPlayerId={localPlayerId}
              connectionStatus={wsStatus}
              errorMsg={onlineError}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onLeaveRoom={handleLeaveRoom}
              onToggleReady={handleToggleReady}
              onUpdateRoomSettings={handleUpdateRoomSettings}
              onStartOnlineRace={handleStartOnlineRace}
              onClose={() => setShowOnlineModal(false)}
            />
          )}
        </>
      ) : (
        activeConfig && (
          <div className="relative w-screen h-screen overflow-hidden">
            <RaceCanvas
              key={raceRunId}
              config={activeConfig}
              ws={ws}
              paused={paused}
              onCountdownChange={setCountdown}
              onHudUpdate={(list, ms) => {
                setRacersHud(list);
                setElapsedMs(ms);
              }}
              onRaceFinished={handleRaceFinished}
              onTogglePause={() => setPaused((p) => !p)}
            />

            <RaceHUD
              config={activeConfig}
              racers={racersHud}
              elapsedMs={elapsedMs}
              countdown={countdown}
              paused={paused}
              results={results}
              onTogglePause={() => setPaused((p) => !p)}
              onRestart={handleRestartRace}
              onExitMenu={handleExitMenu}
              onReturnOnlineLobby={
                activeConfig.mode === 'online' ? handleReturnOnlineLobby : undefined
              }
            />
          </div>
        )
      )}
    </div>
  );
}
