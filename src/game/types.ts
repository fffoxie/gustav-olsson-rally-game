export type KartVariant = 'goalie_buggy' | 'turbo_coupe' | 'drift_mach';

export type TrackId = 'nordic_gravel' | 'sunset_touge' | 'arctic_bowl';

export type EngineCC = '50cc' | '100cc' | '150cc';

export type GameMode = 'grand_prix' | 'time_trial' | 'split_screen' | 'online';

export type ItemType =
  | 'none'
  | 'turbo_coffee'
  | 'triple_boost'
  | 'floorball_puck'
  | 'mud_trap'
  | 'hyper_gustav';

export interface KartLivery {
  id: string;
  name: string;
  primaryHex: string;
  accentHex: string;
  rimHex: string;
}

export const GUSTAV_LIVERIES: KartLivery[] = [
  {
    id: 'gavle_51',
    name: 'Gustav #51 Original',
    primaryHex: '#18181b',
    accentHex: '#f59e0b',
    rimHex: '#fbbf24',
  },
  {
    id: 'crimson_rally',
    name: 'Crimson Gustav',
    primaryHex: '#7f1d1d',
    accentHex: '#ef4444',
    rimHex: '#fca5a5',
  },
  {
    id: 'nordic_cobalt',
    name: 'Cobalt Gustav',
    primaryHex: '#0f172a',
    accentHex: '#06b6d4',
    rimHex: '#67e8f9',
  },
  {
    id: 'emerald_forest',
    name: 'Emerald Gustav',
    primaryHex: '#064e3b',
    accentHex: '#10b981',
    rimHex: '#6ee7b7',
  },
  {
    id: 'royal_violet',
    name: 'Hyper Gustav',
    primaryHex: '#3b0764',
    accentHex: '#a855f7',
    rimHex: '#d8b4fe',
  },
  {
    id: 'arctic_platinum',
    name: 'Platinum Gustav',
    primaryHex: '#1e293b',
    accentHex: '#e2e8f0',
    rimHex: '#f8fafc',
  },
];

export interface KartStats {
  id: KartVariant;
  name: string;
  subtitle: string;
  topSpeed: number; // 1-10
  acceleration: number; // 1-10
  driftHandling: number; // 1-10
  miniTurbo: number; // 1-10
}

export const KART_VARIANTS: KartStats[] = [
  {
    id: 'goalie_buggy',
    name: '#51 Goalie Buggy',
    subtitle: 'Balanced rally chassis with goalie-cage spoiler & wide Gustav face hood',
    topSpeed: 8,
    acceleration: 8,
    driftHandling: 8,
    miniTurbo: 8,
  },
  {
    id: 'turbo_coupe',
    name: 'Gustav Turbo Coupe',
    subtitle: 'High-speed tarmac & gravel wedge with twin boost exhausts',
    topSpeed: 10,
    acceleration: 6,
    driftHandling: 7,
    miniTurbo: 7,
  },
  {
    id: 'drift_mach',
    name: 'Gävle Drift Mach',
    subtitle: 'Sharp inward-drifting kart built for rapid Purple Ultra Mini-Turbos',
    topSpeed: 7,
    acceleration: 9,
    driftHandling: 10,
    miniTurbo: 10,
  },
];

export interface TrackMetadata {
  id: TrackId;
  name: string;
  location: string;
  surface: string;
  laps: number;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  accentColor: string;
  ostName: string;
  bpm: number;
}

export const TRACK_LIST: TrackMetadata[] = [
  {
    id: 'nordic_gravel',
    name: 'Nordic Dirt Rally',
    location: 'Gävle Pine Forest',
    surface: 'Loose Gravel & Timber',
    laps: 3,
    skyTop: '#1d4ed8',
    skyHorizon: '#bae6fd',
    fogColor: '#bae6fd',
    accentColor: '#f59e0b',
    ostName: 'Gustav Groove (MKW Meadow Funk)',
    bpm: 146,
  },
  {
    id: 'sunset_touge',
    name: 'Gävle Sunset Touge',
    location: 'Saffron Ridge Switchbacks',
    surface: 'Scorched Asphalt & Dust',
    laps: 3,
    skyTop: '#311042',
    skyHorizon: '#fb923c',
    fogColor: '#fdba74',
    accentColor: '#ef4444',
    ostName: 'Midnight Hairpin Eurobeat',
    bpm: 158,
  },
  {
    id: 'arctic_bowl',
    name: 'Arctic #51 Ice Bowl',
    location: 'Frozen Fjord Stadium',
    surface: 'Packed Snow & Glacier Ice',
    laps: 3,
    skyTop: '#082f49',
    skyHorizon: '#38bdf8',
    fogColor: '#7dd3fc',
    accentColor: '#06b6d4',
    ostName: 'Final Cup Overdrive (D&B)',
    bpm: 168,
  },
];

export interface PlayerSetup {
  name: string;
  kartVariant: KartVariant;
  liveryId: string;
}

export interface RaceConfig {
  mode: GameMode;
  trackId: TrackId;
  cc: EngineCC;
  p1: PlayerSetup;
  p2?: PlayerSetup;
  onlineRoomCode?: string;
  localPlayerId?: string;
  onlinePlayers?: OnlinePlayerInfo[];
}

export interface RacerHUDState {
  id: string;
  name: string;
  isHuman: boolean;
  playerIndex: number; // 0 = P1, 1 = P2, -1 = AI/Remote
  position: number;
  totalRacers: number;
  lap: number;
  totalLaps: number;
  speedKmh: number;
  driftTier: 0 | 1 | 2 | 3; // 0=none, 1=blue, 2=orange, 3=purple
  driftCharge: number; // 0-1
  item: ItemType;
  itemCharges: number;
  itemRouletteActive: boolean;
  boostTimer: number;
  hyperTimer: number;
  spinTimer: number;
  finished: boolean;
  finishTimeMs: number;
  bestLapMs: number;
  trackProgress: number; // 0-1 normalized spline t
  worldX: number;
  worldZ: number;
  liveryColor: string;
  bannerText: string;
}

export interface RaceResultsEntry {
  id: string;
  name: string;
  isHuman: boolean;
  position: number;
  finishTimeMs: number;
  bestLapMs: number;
  kartVariant: KartVariant;
  liveryId: string;
  points: number;
}

export interface OnlinePlayerInfo {
  id: string;
  name: string;
  kartVariant: KartVariant;
  liveryId: string;
  ready: boolean;
  isHost: boolean;
}

export interface OnlineRoomSummary {
  code: string;
  hostName: string;
  trackId: TrackId;
  cc: EngineCC;
  playerCount: number;
  maxPlayers: number;
  status: 'lobby' | 'racing';
}

export interface OnlineRoomState {
  code: string;
  hostId: string;
  trackId: TrackId;
  cc: EngineCC;
  status: 'lobby' | 'racing';
  players: OnlinePlayerInfo[];
}

export interface RemoteKartPacket {
  playerId: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steerAngle: number;
  driftDir: number;
  driftTier: number;
  hyperTimer: number;
  spinTimer: number;
  boostTimer: number;
  lap: number;
  trackProgress: number;
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number;
}

export interface RemoteItemEvent {
  senderId: string;
  itemType: ItemType;
  x: number;
  y: number;
  z: number;
  heading: number;
  targetId?: string;
}
