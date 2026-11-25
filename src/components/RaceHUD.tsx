import { Disc, Flame, Pause, Play, RotateCcw, Shield, Trophy, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { getTrackData, worldToMinimap } from '../game/tracks';
import {
  GUSTAV_LIVERIES,
  KART_VARIANTS,
  TRACK_LIST,
  type ItemType,
  type RaceConfig,
  type RaceResultsEntry,
  type RacerHUDState,
} from '../game/types';

interface RaceHUDProps {
  config: RaceConfig;
  racers: RacerHUDState[];
  elapsedMs: number;
  countdown: number | 'GO' | null;
  paused: boolean;
  results: RaceResultsEntry[] | null;
  onTogglePause: () => void;
  onRestart: () => void;
  onExitMenu: () => void;
  onReturnOnlineLobby?: () => void;
}

export function formatRaceTime(ms: number): string {
  if (!ms || ms <= 0) return '00:00.00';
  const totalSec = ms / 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  const hundredths = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

function getOrdinalSuffix(pos: number): string {
  if (pos === 1) return 'ST';
  if (pos === 2) return 'ND';
  if (pos === 3) return 'RD';
  return 'TH';
}

function ItemDisplay({
  item,
  charges,
  rouletteActive,
}: {
  item: ItemType;
  charges: number;
  rouletteActive: boolean;
}) {
  if (rouletteActive) {
    return (
      <div className="flex flex-col items-center justify-center animate-roulette text-amber-300">
        <Zap className="w-7 h-7" />
        <span className="text-[11px] font-bold tracking-wide mt-0.5">ROLLING</span>
      </div>
    );
  }

  switch (item) {
    case 'turbo_coffee':
      return (
        <div className="flex flex-col items-center text-amber-400">
          <Flame className="w-7 h-7" />
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">TURBO</span>
        </div>
      );
    case 'triple_boost':
      return (
        <div className="flex flex-col items-center text-orange-400">
          <Flame className="w-7 h-7" />
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">BOOST x{charges}</span>
        </div>
      );
    case 'floorball_puck':
      return (
        <div className="flex flex-col items-center text-red-400">
          <Disc className="w-7 h-7" />
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">#51 PUCK</span>
        </div>
      );
    case 'mud_trap':
      return (
        <div className="flex flex-col items-center text-amber-600">
          <Shield className="w-7 h-7" />
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">MUD TRAP</span>
        </div>
      );
    case 'hyper_gustav':
      return (
        <div className="flex flex-col items-center text-yellow-300">
          <Trophy className="w-7 h-7" />
          <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">HYPER #51</span>
        </div>
      );
    default:
      return (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          EMPTY
        </span>
      );
  }
}

function PlayerPaneHUD({
  racer,
  elapsedMs,
  isSplit,
  label,
}: {
  racer: RacerHUDState;
  elapsedMs: number;
  isSplit: boolean;
  label: string;
}) {
  const posColor =
    racer.position === 1
      ? 'text-amber-400'
      : racer.position === 2
      ? 'text-slate-200'
      : racer.position === 3
      ? 'text-orange-400'
      : 'text-sky-400';

  const driftColor =
    racer.driftTier === 3
      ? 'bg-purple-400'
      : racer.driftTier === 2
      ? 'bg-orange-400'
      : racer.driftTier === 1
      ? 'bg-sky-400'
      : 'bg-amber-200';

  return (
    <div className="relative w-full h-full pointer-events-none">
      {/* Top-Left Item Slot + Lap/Timer */}
      <div className="absolute top-4 left-4 flex items-start gap-3">
        <div className="w-20 h-20 rounded-xl bg-slate-950/90 border-2 border-slate-700 flex items-center justify-center shadow-lg">
          <ItemDisplay
            item={racer.item}
            charges={racer.itemCharges}
            rouletteActive={racer.itemRouletteActive}
          />
        </div>

        <div className="bg-slate-950/88 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col gap-0.5">
          {isSplit && (
            <span className="text-[11px] font-bold text-amber-400 tracking-wider">{label}</span>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-slate-400">LAP</span>
            <span className="font-display text-2xl font-bold italic text-white">
              {racer.lap}/{racer.totalLaps}
            </span>
          </div>
          <div className="font-mono-tabular text-sm font-bold text-slate-200">
            {formatRaceTime(elapsedMs)}
          </div>
        </div>
      </div>

      {/* Center Action Banner (Final Lap, Mini-Turbo, Trick Boost) */}
      {racer.bannerText && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-mkw-pop">
          <div className="px-6 py-2 rounded-xl bg-slate-950/92 border-2 border-amber-400 shadow-2xl">
            <span className="font-display italic text-2xl md:text-3xl font-bold text-amber-300 tracking-wide whitespace-nowrap">
              {racer.bannerText}
            </span>
          </div>
        </div>
      )}

      {/* Bottom-Left Position + Speedometer */}
      <div className="absolute bottom-5 left-5 flex items-end gap-4">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2 flex items-baseline">
          <span className={`font-display italic font-bold text-5xl leading-none ${posColor}`}>
            {racer.position}
          </span>
          <span className={`font-display italic font-bold text-xl ml-0.5 ${posColor}`}>
            {getOrdinalSuffix(racer.position)}
          </span>
          <span className="text-xs font-semibold text-slate-400 ml-2">/ {racer.totalRacers}</span>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-4 py-2.5 min-w-[132px]">
          <div className="flex items-baseline justify-between">
            <span className="font-mono-tabular text-2xl font-bold text-white">
              {racer.speedKmh}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 ml-1">KM/H</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-75 ${driftColor}`}
              style={{ width: `${Math.round(racer.driftCharge * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function RaceHUD({
  config,
  racers,
  elapsedMs,
  countdown,
  paused,
  results,
  onTogglePause,
  onRestart,
  onExitMenu,
  onReturnOnlineLobby,
}: RaceHUDProps) {
  const isSplit = config.mode === 'split_screen';
  const track = useMemo(() => getTrackData(config.trackId), [config.trackId]);
  const trackMeta = TRACK_LIST.find((t) => t.id === config.trackId) || TRACK_LIST[0];

  const p1 = racers.find((r) => r.playerIndex === 0) || racers[0];
  const p2 = isSplit ? racers.find((r) => r.playerIndex === 1) : undefined;

  const minimapPath = useMemo(() => {
    const pts = track.minimapPoints;
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.z.toFixed(1)}`).join(' ') + ' Z';
  }, [track]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {/* Top-Right Pause & Controls Hint */}
      <div className="absolute top-4 right-4 flex items-center gap-3 pointer-events-auto z-30">
        <div className="hidden md:flex items-center gap-3 bg-slate-950/88 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300">
          {isSplit ? (
            <>
              <span>P1: WASD + Space + E</span>
              <span className="text-slate-600">·</span>
              <span>P2: Arrows + Enter + .</span>
            </>
          ) : (
            <>
              <span>Drive: WASD / Arrows</span>
              <span className="text-slate-600">·</span>
              <span>Drift/Trick: Space</span>
              <span className="text-slate-600">·</span>
              <span>Item: E</span>
            </>
          )}
        </div>

        <button
          onClick={onTogglePause}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-sm font-semibold text-white transition-colors cursor-pointer"
        >
          <Pause className="w-4 h-4" />
          <span>Pause</span>
        </button>
      </div>

      {/* Player HUD Panes */}
      {isSplit && p1 && p2 ? (
        <div className="w-full h-full grid grid-cols-2">
          <div className="relative border-r-2 border-slate-900">
            <PlayerPaneHUD racer={p1} elapsedMs={elapsedMs} isSplit label="PLAYER 1" />
          </div>
          <div className="relative">
            <PlayerPaneHUD racer={p2} elapsedMs={elapsedMs} isSplit label="PLAYER 2" />
          </div>
        </div>
      ) : (
        p1 && <PlayerPaneHUD racer={p1} elapsedMs={elapsedMs} isSplit={false} label="P1" />
      )}

      {/* Live Track Minimap (Bottom Right) */}
      <div className="absolute bottom-5 right-5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 w-36 h-36">
        <div className="text-[10px] font-semibold text-slate-400 truncate mb-1">
          {trackMeta.name}
        </div>
        <svg viewBox="0 0 100 100" className="w-full h-24 overflow-visible">
          <path
            d={minimapPath}
            fill="none"
            stroke="#334155"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d={minimapPath}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {racers.map((r) => {
            const { mx, mz } = worldToMinimap(track, r.worldX, r.worldZ);
            return (
              <circle
                key={r.id}
                cx={mx}
                cy={mz}
                r={r.isHuman ? 4.8 : 3.2}
                fill={r.isHuman ? '#facc15' : r.liveryColor}
                stroke="#090d16"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div key={String(countdown)} className="animate-mkw-pop">
            <span
              className={`font-display italic font-bold tracking-tight drop-shadow-[0_8px_24px_rgba(0,0,0,0.9)] ${
                countdown === 'GO'
                  ? 'text-7xl md:text-9xl text-amber-400'
                  : 'text-8xl md:text-9xl text-white'
              }`}
            >
              {countdown === 'GO' ? 'GO!' : countdown}
            </span>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {paused && !results && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center pointer-events-auto z-40">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h2 className="font-display italic text-3xl font-bold text-white mb-2">Race Paused</h2>
            <p className="text-sm text-slate-400 mb-6">
              {trackMeta.name} · {config.cc.toUpperCase()}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onTogglePause}
                className="w-full py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Resume Race
              </button>
              {config.mode !== 'online' && (
                <button
                  onClick={onRestart}
                  className="w-full py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Race
                </button>
              )}
              <button
                onClick={onExitMenu}
                className="w-full py-3 px-5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer"
              >
                Exit to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Race Podium Results */}
      {results && (
        <div className="absolute inset-0 bg-slate-950/88 flex items-center justify-center p-4 pointer-events-auto z-40">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-7 w-full max-w-2xl shadow-2xl animate-mkw-pop">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Official Rally Standings
                </p>
                <h2 className="font-display italic text-3xl font-bold text-white">
                  {trackMeta.name} Results
                </h2>
              </div>
              <Trophy className="w-9 h-9 text-amber-400" />
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 mb-6">
              {results.map((entry) => {
                const livery =
                  GUSTAV_LIVERIES.find((l) => l.id === entry.liveryId) || GUSTAV_LIVERIES[0];
                const variant =
                  KART_VARIANTS.find((v) => v.id === entry.kartVariant) || KART_VARIANTS[0];
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-3 ${
                      entry.isHuman ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`font-display italic font-bold text-2xl w-8 ${
                          entry.position === 1 ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {entry.position}
                      </span>
                      <span
                        className="w-3 h-7 rounded-sm shrink-0"
                        style={{ backgroundColor: livery.accentHex }}
                      />
                      <div>
                        <div className="font-bold text-sm text-white">
                          {entry.name} {entry.isHuman ? '(You)' : ''}
                        </div>
                        <div className="text-xs text-slate-400">{variant.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-mono-tabular text-sm font-bold text-white">
                          {formatRaceTime(entry.finishTimeMs)}
                        </div>
                        {entry.bestLapMs > 0 && (
                          <div className="font-mono-tabular text-[11px] text-slate-400">
                            Best Lap {formatRaceTime(entry.bestLapMs)}
                          </div>
                        )}
                      </div>
                      <div className="font-display font-bold text-base text-amber-400 w-12 text-right">
                        +{entry.points} pt
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onExitMenu}
                className="py-2.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
              >
                Main Menu
              </button>
              {config.mode === 'online' && onReturnOnlineLobby ? (
                <button
                  onClick={onReturnOnlineLobby}
                  className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Back to Online Lobby
                </button>
              ) : (
                <button
                  onClick={onRestart}
                  className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
                >
                  Race Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
