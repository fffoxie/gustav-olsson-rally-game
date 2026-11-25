import { Disc3, Globe, Music, Play, Trophy, Users, Volume2, VolumeX, X } from 'lucide-react';
import { useState } from 'react';
import { GUSTAV_IMAGE_URL } from '../game/gustavKartModel';
import { soundEngine, type OstTrack } from '../game/soundEngine';
import {
  GUSTAV_LIVERIES,
  KART_VARIANTS,
  TRACK_LIST,
  type EngineCC,
  type GameMode,
  type PlayerSetup,
  type TrackId,
} from '../game/types';
import { GustavShowroomCanvas } from './GustavShowroomCanvas';
import { formatRaceTime } from './RaceHUD';

interface MainMenuProps {
  p1: PlayerSetup;
  p2: PlayerSetup;
  trackId: TrackId;
  cc: EngineCC;
  mode: GameMode;
  bestTimes: Record<string, number>;
  onChangeP1: (setup: PlayerSetup) => void;
  onChangeP2: (setup: PlayerSetup) => void;
  onChangeTrack: (id: TrackId) => void;
  onChangeCc: (cc: EngineCC) => void;
  onChangeMode: (mode: GameMode) => void;
  onStartRace: () => void;
  onOpenOnline: () => void;
}

const OST_LIST: Array<{ id: OstTrack; title: string; style: string; bpm: number }> = [
  { id: 'menu', title: 'Gustav Title Groove', style: 'MKW Brass & Slap Bass', bpm: 134 },
  { id: 'nordic_gravel', title: 'Nordic Dirt Funk', style: 'Sunny Rally Lead & Cowbell', bpm: 146 },
  { id: 'sunset_touge', title: 'Midnight Hairpin Eurobeat', style: 'High-BPM Synth Rock', bpm: 158 },
  { id: 'arctic_bowl', title: 'Arctic #51 Final Cup', style: 'Hyper Drum & Bass Overdrive', bpm: 168 },
];

export function MainMenu({
  p1,
  p2,
  trackId,
  cc,
  mode,
  bestTimes,
  onChangeP1,
  onChangeP2,
  onChangeTrack,
  onChangeCc,
  onChangeMode,
  onStartRace,
  onOpenOnline,
}: MainMenuProps) {
  const [showJukebox, setShowJukebox] = useState(false);
  const [muted, setMuted] = useState(soundEngine.getMuted());
  const [musicVol, setMusicVol] = useState(soundEngine.getMusicVolume());
  const [sfxVol, setSfxVol] = useState(soundEngine.getSfxVolume());
  const [activeOst, setActiveOst] = useState<OstTrack>(soundEngine.getCurrentTrack());
  const [finalLapPreview, setFinalLapPreview] = useState(false);

  const selectedKart = KART_VARIANTS.find((v) => v.id === p1.kartVariant) || KART_VARIANTS[0];
  const selectedTrack = TRACK_LIST.find((t) => t.id === trackId) || TRACK_LIST[0];

  const handleFirstInteraction = () => {
    soundEngine.unlockAndStartMenu();
  };

  const toggleMute = () => {
    soundEngine.unlockAndStartMenu();
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const selectMode = (m: GameMode) => {
    handleFirstInteraction();
    soundEngine.playUiClick();
    if (m === 'online') {
      onOpenOnline();
    } else {
      onChangeMode(m);
    }
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950"
      onPointerDown={handleFirstInteraction}
    >
      {/* Full-Bleed Live 3D Gustav Olsson Showroom */}
      <div className="absolute inset-0">
        <GustavShowroomCanvas variant={p1.kartVariant} liveryId={p1.liveryId} />
      </div>

      {/* Subtle Left Contrast Scrim so typography stays razor sharp without blocking the 3D kart */}
      <div className="absolute inset-y-0 left-0 w-full md:w-[620px] bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent pointer-events-none" />

      {/* Top Bar Contract: 3 Clean Zones */}
      <header className="relative z-20 flex items-center justify-between gap-8 px-6 py-4 border-b border-white/10 bg-slate-950/80">
        <span className="font-display italic text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0">
          Gustav Olsson Rally Kart Wii
        </span>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300">
          <button
            onClick={() => selectMode('grand_prix')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              mode === 'grand_prix' ? 'text-amber-400 underline underline-offset-8' : 'hover:text-white'
            }`}
          >
            Grand Prix
          </button>
          <button
            onClick={() => selectMode('time_trial')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              mode === 'time_trial' ? 'text-amber-400 underline underline-offset-8' : 'hover:text-white'
            }`}
          >
            Time Trial
          </button>
          <button
            onClick={() => selectMode('split_screen')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              mode === 'split_screen' ? 'text-amber-400 underline underline-offset-8' : 'hover:text-white'
            }`}
          >
            Split-Screen
          </button>
          <button
            onClick={() => selectMode('online')}
            className="whitespace-nowrap shrink-0 text-cyan-300 hover:text-cyan-200 transition-colors cursor-pointer"
          >
            Online
          </button>
          <button
            onClick={() => {
              handleFirstInteraction();
              soundEngine.playUiClick();
              setShowJukebox(true);
            }}
            className="whitespace-nowrap shrink-0 hover:text-white transition-colors cursor-pointer"
          >
            OST Jukebox
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              handleFirstInteraction();
              soundEngine.playUiClick();
              onStartRace();
            }}
            className="px-5 py-2 text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Race</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout: Left Config Panel + Right Open 3D Showroom */}
      <main className="relative z-10 h-[calc(100vh-65px)] flex flex-col md:flex-row justify-between p-6 gap-6 overflow-y-auto md:overflow-hidden">
        {/* Left Control Column */}
        <div className="w-full md:w-[500px] flex flex-col gap-4 md:overflow-y-auto pr-1">
          {/* Hero Header with Gustav Portrait Badge */}
          <div className="flex items-center gap-4">
            <img
              src={GUSTAV_IMAGE_URL}
              alt="Gustav Olsson #51"
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover object-top border-2 border-amber-400 shrink-0"
            />
            <div>
              <h1 className="font-display italic text-3xl font-bold text-white leading-tight text-balance">
                Every Car Is Gustav Olsson
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                #51 Face-Mapped Rally Chassis · Drifting Mini-Turbos · Procedural OST
              </p>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'grand_prix', label: 'Grand Prix', icon: Trophy },
                { id: 'time_trial', label: 'Time Trial', icon: Disc3 },
                { id: 'split_screen', label: '2P Split', icon: Users },
                { id: 'online', label: 'Online', icon: Globe },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectMode(item.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Kart & Livery Customizer */}
          <section className="bg-slate-900/92 border border-slate-800 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-200 uppercase tracking-wider">
                1. Gustav Chassis & Livery
              </h2>
              <input
                type="text"
                maxLength={18}
                value={p1.name}
                onChange={(e) => onChangeP1({ ...p1, name: e.target.value })}
                placeholder="Driver Name"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white w-36 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {KART_VARIANTS.map((v) => {
                const active = p1.kartVariant === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      handleFirstInteraction();
                      soundEngine.playUiClick();
                      onChangeP1({ ...p1, kartVariant: v.id });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-800 border-amber-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-display font-bold text-xs leading-snug">{v.name}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      SPD {v.topSpeed} · DRF {v.driftHandling}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Stat Bars */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: 'Speed', val: selectedKart.topSpeed },
                { label: 'Accel', val: selectedKart.acceleration },
                { label: 'Drift', val: selectedKart.driftHandling },
                { label: 'Turbo', val: selectedKart.miniTurbo },
              ].map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>{s.label}</span>
                    <span className="font-mono-tabular text-slate-200">{s.val}</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 transition-all duration-150"
                      style={{ width: `${s.val * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Livery Swatches */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-slate-400">Jersey Trim</span>
              <div className="flex items-center gap-2">
                {GUSTAV_LIVERIES.map((liv) => {
                  const active = p1.liveryId === liv.id;
                  return (
                    <button
                      key={liv.id}
                      onClick={() => {
                        handleFirstInteraction();
                        soundEngine.playUiClick();
                        onChangeP1({ ...p1, liveryId: liv.id });
                      }}
                      title={liv.name}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform cursor-pointer ${
                        active ? 'border-white scale-110' : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: liv.accentHex }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Player 2 Quick Setup when in Split-Screen */}
            {mode === 'split_screen' && (
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-cyan-400 whitespace-nowrap">
                  Player 2 Chassis
                </span>
                <select
                  value={p2.kartVariant}
                  onChange={(e) =>
                    onChangeP2({ ...p2, kartVariant: e.target.value as PlayerSetup['kartVariant'] })
                  }
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1"
                >
                  {KART_VARIANTS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  {GUSTAV_LIVERIES.slice(0, 4).map((liv) => (
                    <button
                      key={liv.id}
                      onClick={() => onChangeP2({ ...p2, liveryId: liv.id })}
                      className={`w-5 h-5 rounded border cursor-pointer ${
                        p2.liveryId === liv.id ? 'border-white' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: liv.accentHex }}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Track & Engine CC Selector */}
          <section className="bg-slate-900/92 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-slate-200 uppercase tracking-wider">
                2. Rally Circuit & Speed Class
              </h2>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {(['50cc', '100cc', '150cc'] as EngineCC[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      handleFirstInteraction();
                      soundEngine.playUiClick();
                      onChangeCc(c);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                      cc === c ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {TRACK_LIST.map((t) => {
                const active = trackId === t.id;
                const record = bestTimes[t.id];
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      handleFirstInteraction();
                      soundEngine.playUiClick();
                      onChangeTrack(t.id);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-800 border-amber-400'
                        : 'bg-slate-950/70 border-slate-800 hover:bg-slate-800/70'
                    }`}
                  >
                    <div>
                      <div className="font-display font-bold text-sm text-white">{t.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {t.location} · {t.surface} · {t.bpm} BPM OST
                      </div>
                    </div>
                    <div className="text-right">
                      {record ? (
                        <div className="font-mono-tabular text-xs font-bold text-emerald-400">
                          Best {formatRaceTime(record)}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">3 Laps</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Primary Launch Button */}
          <button
            onClick={() => {
              handleFirstInteraction();
              soundEngine.playUiClick();
              onStartRace();
            }}
            className="w-full py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display italic font-bold text-xl tracking-wide flex items-center justify-center gap-2.5 shadow-lg transition-colors cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {mode === 'split_screen'
                ? 'Launch 2P Split-Screen'
                : mode === 'time_trial'
                ? 'Start Time Trial'
                : 'Start Grand Prix'}
            </span>
          </button>
        </div>

        {/* Bottom-Right Showroom Info Strip (Unobstructed 3D Center) */}
        <div className="hidden md:flex flex-col justify-end items-end pointer-events-none">
          <div className="bg-slate-950/88 border border-slate-800 rounded-2xl px-5 py-3.5 max-w-sm pointer-events-auto">
            <div className="flex items-center justify-between gap-4 mb-1">
              <span className="font-display italic font-bold text-lg text-white">
                {selectedKart.name}
              </span>
              <button
                onClick={() => {
                  handleFirstInteraction();
                  setShowJukebox(true);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5" />
                <span>OST Player</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">{selectedKart.subtitle}</p>
            <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>{selectedTrack.ostName}</span>
              <span className="font-mono-tabular text-slate-200">{selectedTrack.bpm} BPM</span>
            </div>
          </div>
        </div>
      </main>

      {/* Insane OST Jukebox Modal */}
      {showJukebox && (
        <div className="fixed inset-0 z-50 bg-slate-950/82 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
              <div className="flex items-center gap-2.5">
                <Music className="w-5 h-5 text-amber-400" />
                <h2 className="font-display italic text-xl font-bold text-white">
                  Gustav Rally OST Jukebox
                </h2>
              </div>
              <button
                onClick={() => setShowJukebox(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {OST_LIST.map((track) => {
                const isCurrent = activeOst === track.id;
                return (
                  <button
                    key={track.id}
                    onClick={() => {
                      soundEngine.ensureContext();
                      soundEngine.playOst(track.id);
                      setActiveOst(track.id);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{track.title}</div>
                      <div className="text-xs text-slate-400">{track.style}</div>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-amber-400">
                      {track.bpm} BPM
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Final Lap Speed-Up (+18% Tempo & +2 Key)
                </span>
                <button
                  onClick={() => {
                    const next = !finalLapPreview;
                    setFinalLapPreview(next);
                    soundEngine.setFinalLap(next);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    finalLapPreview ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {finalLapPreview ? 'Final Lap ON' : 'Normal Speed'}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>OST Music Volume</span>
                  <span className="font-mono-tabular">{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMusicVol(v);
                    soundEngine.setMusicVolume(v);
                  }}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Engine & SFX Volume</span>
                  <span className="font-mono-tabular">{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sfxVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSfxVol(v);
                    soundEngine.setSfxVolume(v);
                  }}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
