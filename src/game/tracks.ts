import * as THREE from 'three';
import type { TrackId } from './types';

export interface TrackSample {
  t: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

export interface BoostPadDef {
  t: number;
  lateralOffset: number; // -1 to 1 fraction of half-width
  width: number;
  length: number;
}

export interface RampDef {
  t: number;
  width: number;
  length: number;
  height: number;
}

export interface ItemRowDef {
  t: number;
  count: number;
}

export interface TrackData {
  id: TrackId;
  curve: THREE.CatmullRomCurve3;
  roadHalfWidth: number;
  shoulderWidth: number;
  totalLength: number;
  samples: TrackSample[];
  boostPads: BoostPadDef[];
  ramps: RampDef[];
  itemRows: ItemRowDef[];
  minimapPoints: Array<{ x: number; z: number }>;
}

const SAMPLE_COUNT = 640;

function buildTrackSamples(curve: THREE.CatmullRomCurve3): {
  samples: TrackSample[];
  minimapPoints: Array<{ x: number; z: number }>;
} {
  const samples: TrackSample[] = [];
  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = i / SAMPLE_COUNT;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    samples.push({ t, point, tangent, right });
  }

  // Normalize minimap points to 0..100 SVG box
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < SAMPLE_COUNT; i += 8) {
    const p = samples[i].point;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const pad = 10;
  const scale = (100 - pad * 2) / span;
  const offsetX = (100 - (maxX - minX) * scale) * 0.5;
  const offsetZ = (100 - (maxZ - minZ) * scale) * 0.5;

  const minimapPoints: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 8) {
    const p = samples[i].point;
    minimapPoints.push({
      x: (p.x - minX) * scale + offsetX,
      z: (p.z - minZ) * scale + offsetZ,
    });
  }

  return { samples, minimapPoints };
}

const trackCache = new Map<TrackId, TrackData>();

export function getTrackData(id: TrackId): TrackData {
  const existing = trackCache.get(id);
  if (existing) return existing;

  let waypoints: THREE.Vector3[];
  let roadHalfWidth = 13.5;
  let boostPads: BoostPadDef[];
  let ramps: RampDef[];
  let itemRows: ItemRowDef[];

  if (id === 'nordic_gravel') {
    // Classic sweeping rally oval with technical chicane & forest crest
    waypoints = [
      new THREE.Vector3(0, 0, 90),
      new THREE.Vector3(0, 0, 10),
      new THREE.Vector3(24, 3.5, -75),
      new THREE.Vector3(105, 6.0, -120),
      new THREE.Vector3(185, 2.5, -70),
      new THREE.Vector3(175, 0.5, 18),
      new THREE.Vector3(118, 4.0, 48),
      new THREE.Vector3(135, 2.0, 128),
      new THREE.Vector3(82, 0.5, 175),
      new THREE.Vector3(8, 0, 155),
    ];
    roadHalfWidth = 14;
    boostPads = [
      { t: 0.14, lateralOffset: -0.35, width: 4.5, length: 9 },
      { t: 0.42, lateralOffset: 0.3, width: 4.5, length: 9 },
      { t: 0.67, lateralOffset: 0.0, width: 5.2, length: 10 },
      { t: 0.89, lateralOffset: -0.25, width: 4.5, length: 9 },
    ];
    ramps = [
      { t: 0.28, width: 12, length: 14, height: 2.3 },
      { t: 0.77, width: 12, length: 14, height: 2.0 },
    ];
    itemRows = [
      { t: 0.09, count: 5 },
      { t: 0.36, count: 5 },
      { t: 0.62, count: 5 },
      { t: 0.84, count: 5 },
    ];
  } else if (id === 'sunset_touge') {
    // High-speed mountain switchbacks & hairpin canyon
    waypoints = [
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(0, 1.5, 5),
      new THREE.Vector3(-42, 6.5, -85),
      new THREE.Vector3(35, 10.5, -155),
      new THREE.Vector3(145, 9.0, -145),
      new THREE.Vector3(205, 4.5, -60),
      new THREE.Vector3(128, 3.0, -10),
      new THREE.Vector3(182, 5.0, 68),
      new THREE.Vector3(130, 2.5, 155),
      new THREE.Vector3(38, 0.5, 170),
    ];
    roadHalfWidth = 13.0;
    boostPads = [
      { t: 0.11, lateralOffset: 0.25, width: 4.5, length: 9 },
      { t: 0.33, lateralOffset: -0.3, width: 4.5, length: 9 },
      { t: 0.54, lateralOffset: 0.0, width: 5.0, length: 10 },
      { t: 0.74, lateralOffset: 0.35, width: 4.5, length: 9 },
      { t: 0.93, lateralOffset: -0.2, width: 5.0, length: 9 },
    ];
    ramps = [
      { t: 0.22, width: 11, length: 14, height: 2.5 },
      { t: 0.65, width: 11, length: 14, height: 2.2 },
    ];
    itemRows = [
      { t: 0.08, count: 5 },
      { t: 0.31, count: 5 },
      { t: 0.58, count: 5 },
      { t: 0.82, count: 5 },
    ];
  } else {
    // Arctic #51 Ice Bowl: Wide sweeping drift figure-8-inspired circuit with twin jump crests
    waypoints = [
      new THREE.Vector3(0, 0, 95),
      new THREE.Vector3(0, 0, -5),
      new THREE.Vector3(55, 4.0, -95),
      new THREE.Vector3(155, 7.0, -110),
      new THREE.Vector3(220, 3.5, -25),
      new THREE.Vector3(185, 1.0, 65),
      new THREE.Vector3(98, 5.5, 45),
      new THREE.Vector3(75, 2.5, 138),
      new THREE.Vector3(15, 0.5, 175),
    ];
    roadHalfWidth = 15.0;
    boostPads = [
      { t: 0.15, lateralOffset: -0.4, width: 4.8, length: 10 },
      { t: 0.15, lateralOffset: 0.4, width: 4.8, length: 10 },
      { t: 0.47, lateralOffset: 0.0, width: 5.5, length: 11 },
      { t: 0.72, lateralOffset: -0.3, width: 4.8, length: 10 },
      { t: 0.91, lateralOffset: 0.25, width: 5.0, length: 10 },
    ];
    ramps = [
      { t: 0.31, width: 14, length: 15, height: 2.6 },
      { t: 0.81, width: 14, length: 15, height: 2.4 },
    ];
    itemRows = [
      { t: 0.1, count: 5 },
      { t: 0.38, count: 5 },
      { t: 0.63, count: 5 },
      { t: 0.86, count: 5 },
    ];
  }

  const curve = new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.45);
  const { samples, minimapPoints } = buildTrackSamples(curve);
  const totalLength = curve.getLength();

  const data: TrackData = {
    id,
    curve,
    roadHalfWidth,
    shoulderWidth: 4.5,
    totalLength,
    samples,
    boostPads,
    ramps,
    itemRows,
    minimapPoints,
  };

  trackCache.set(id, data);
  return data;
}

export interface ClosestTrackInfo {
  sampleIndex: number;
  t: number;
  lateralDist: number; // signed distance along sample.right
  distSq: number;
  roadY: number;
  onRoad: boolean;
  onShoulder: boolean;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  point: THREE.Vector3;
}

export function queryClosestTrack(
  track: TrackData,
  x: number,
  z: number,
  hintIndex?: number,
): ClosestTrackInfo {
  const samples = track.samples;
  const n = samples.length;
  let bestIdx = 0;
  let bestDistSq = Infinity;

  if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n) {
    // Search +/- 35 samples around hint first for speed
    const window = 35;
    for (let offset = -window; offset <= window; offset++) {
      const idx = (hintIndex + offset + n) % n;
      const p = samples[idx].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = idx;
      }
    }
    // Fallback full scan if kart jumped far
    if (bestDistSq > 1600) {
      for (let i = 0; i < n; i++) {
        const p = samples[i].point;
        const dx = x - p.x;
        const dz = z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      const p = samples[i].point;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
  }

  const s = samples[bestIdx];
  const dx = x - s.point.x;
  const dz = z - s.point.z;
  const lateralDist = dx * s.right.x + dz * s.right.z;
  const absLat = Math.abs(lateralDist);

  // Check if kart is on a jump ramp
  let rampLift = 0;
  for (let i = 0; i < track.ramps.length; i++) {
    const r = track.ramps[i];
    let dt = s.t - r.t;
    if (dt > 0.5) dt -= 1;
    if (dt < -0.5) dt += 1;
    const arcDist = dt * track.totalLength;
    if (arcDist >= -r.length * 0.5 && arcDist <= r.length * 0.5 && absLat <= r.width * 0.5) {
      const prog = (arcDist + r.length * 0.5) / r.length;
      rampLift = Math.max(rampLift, prog * r.height);
    }
  }

  return {
    sampleIndex: bestIdx,
    t: s.t,
    lateralDist,
    distSq: bestDistSq,
    roadY: s.point.y + rampLift,
    onRoad: absLat <= track.roadHalfWidth,
    onShoulder: absLat <= track.roadHalfWidth + track.shoulderWidth,
    tangent: s.tangent,
    right: s.right,
    point: s.point,
  };
}

export function worldToMinimap(
  track: TrackData,
  x: number,
  z: number,
): { mx: number; mz: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i < track.samples.length; i += 8) {
    const p = track.samples[i].point;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  const span = Math.max(maxX - minX, maxZ - minZ) || 1;
  const pad = 10;
  const scale = (100 - pad * 2) / span;
  const offsetX = (100 - (maxX - minX) * scale) * 0.5;
  const offsetZ = (100 - (maxZ - minZ) * scale) * 0.5;

  return {
    mx: (x - minX) * scale + offsetX,
    mz: (z - minZ) * scale + offsetZ,
  };
}
