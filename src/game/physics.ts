import * as THREE from 'three';
import { createGustavKart, type GustavKartRig } from './gustavKartModel';
import { soundEngine } from './soundEngine';
import { queryClosestTrack, type TrackData } from './tracks';
import {
  GUSTAV_LIVERIES,
  KART_VARIANTS,
  type EngineCC,
  type ItemType,
  type KartVariant,
  type RacerHUDState,
} from './types';
import type { ItemBoxVisual } from './worldBuilder';

export interface KartInput {
  throttle: number; // -1 to 1
  steer: number; // -1 (right) to +1 (left)
  drift: boolean;
  useItem: boolean;
}

export interface KartEntity {
  id: string;
  name: string;
  isHuman: boolean;
  isRemote: boolean;
  playerIndex: number; // 0 = P1, 1 = P2, -1 = AI/Remote
  variant: KartVariant;
  liveryId: string;
  liveryColor: string;
  rig: GustavKartRig;

  // Physics
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  heading: number;
  speed: number;
  steerAngle: number;
  grounded: boolean;
  airborneTime: number;
  trickDone: boolean;
  trickSpinAngle: number;

  // Drift & Mini-Turbo
  drifting: boolean;
  driftDir: number; // -1 right, +1 left, 0 none
  driftTimer: number;
  driftTier: 0 | 1 | 2 | 3;
  boostTimer: number;
  hyperTimer: number;
  spinTimer: number;
  offRoad: boolean;

  // Item System
  item: ItemType;
  itemCharges: number;
  rouletteTimer: number;
  pendingItem: ItemType;
  prevUseItem: boolean;
  prevDrift: boolean;

  // Race Progress
  sampleHint: number;
  trackProgress: number; // 0-1
  maxCheckpointT: number;
  lap: number; // 1-indexed
  totalProgress: number;
  finished: boolean;
  finishTimeMs: number;
  lapStartMs: number;
  bestLapMs: number;
  bannerText: string;
  bannerTimer: number;

  // AI parameters
  aiTargetLat: number;
  aiSkill: number;
  aiItemCooldown: number;
}

export interface ProjectileEntity {
  id: string;
  ownerId: string;
  type: 'floorball_puck' | 'mud_trap';
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  ttl: number;
  sampleHint: number;
}

export interface ParticleBurst {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

const ITEM_POOL: ItemType[] = [
  'turbo_coffee',
  'triple_boost',
  'floorball_puck',
  'mud_trap',
  'hyper_gustav',
];

export function getCCMultiplier(cc: EngineCC): number {
  if (cc === '50cc') return 0.84;
  if (cc === '150cc') return 1.18;
  return 1.0;
}

export function createKartEntity(params: {
  id: string;
  name: string;
  isHuman: boolean;
  isRemote: boolean;
  playerIndex: number;
  variant: KartVariant;
  liveryId: string;
  gridIndex: number;
  track: TrackData;
  scene: THREE.Scene;
  maxAniso: number;
}): KartEntity {
  const rig = createGustavKart(params.variant, params.liveryId, params.maxAniso);
  const livery = GUSTAV_LIVERIES.find((l) => l.id === params.liveryId) || GUSTAV_LIVERIES[0];

  // Staggered Mario Kart Wii starting grid behind start line
  const row = Math.floor(params.gridIndex / 2);
  const col = params.gridIndex % 2 === 0 ? -1 : 1;
  const backSamples = 6 + row * 7;
  const n = params.track.samples.length;
  const startIdx = (n - backSamples) % n;
  const s = params.track.samples[startIdx];

  const lat = col * 3.8;
  const x = s.point.x + s.right.x * lat;
  const z = s.point.z + s.right.z * lat;
  const y = s.point.y;
  const heading = Math.atan2(-s.tangent.x, -s.tangent.z);

  rig.root.position.set(x, y, z);
  rig.root.rotation.y = heading;
  params.scene.add(rig.root);

  return {
    id: params.id,
    name: params.name,
    isHuman: params.isHuman,
    isRemote: params.isRemote,
    playerIndex: params.playerIndex,
    variant: params.variant,
    liveryId: params.liveryId,
    liveryColor: livery.accentHex,
    rig,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    heading,
    speed: 0,
    steerAngle: 0,
    grounded: true,
    airborneTime: 0,
    trickDone: false,
    trickSpinAngle: 0,
    drifting: false,
    driftDir: 0,
    driftTimer: 0,
    driftTier: 0,
    boostTimer: 0,
    hyperTimer: 0,
    spinTimer: 0,
    offRoad: false,
    item: 'none',
    itemCharges: 0,
    rouletteTimer: 0,
    pendingItem: 'none',
    prevUseItem: false,
    prevDrift: false,
    sampleHint: startIdx,
    trackProgress: s.t,
    maxCheckpointT: 0,
    lap: 1,
    totalProgress: s.t - 1.0, // behind start line initially
    finished: false,
    finishTimeMs: 0,
    lapStartMs: 0,
    bestLapMs: 0,
    bannerText: '',
    bannerTimer: 0,
    aiTargetLat: (Math.random() - 0.5) * 9.0,
    aiSkill: 0.89 + (params.gridIndex % 4) * 0.04,
    aiItemCooldown: 2 + Math.random() * 3,
  };
}

export function stepKartPhysics(
  kart: KartEntity,
  input: KartInput,
  track: TrackData,
  ccMult: number,
  dt: number,
  elapsedRaceMs: number,
  totalLaps: number,
  canMove: boolean,
  onUseItem: (kart: KartEntity, item: ItemType) => void,
  onSpawnParticle: (x: number, y: number, z: number, colorHex: number, size?: number) => void,
): void {
  const stats = KART_VARIANTS.find((v) => v.id === kart.variant) || KART_VARIANTS[0];
  const baseTopSpeed = (34 + stats.topSpeed * 1.45) * ccMult;
  const accelRate = (26 + stats.acceleration * 2.2) * ccMult;
  const turnRate = 1.65 + stats.driftHandling * 0.12;
  const mtMult = 0.85 + stats.miniTurbo * 0.05;

  if (kart.bannerTimer > 0) {
    kart.bannerTimer = Math.max(0, kart.bannerTimer - dt);
    if (kart.bannerTimer <= 0) kart.bannerText = '';
  }

  // Roulette animation countdown
  if (kart.rouletteTimer > 0) {
    kart.rouletteTimer -= dt;
    if (kart.rouletteTimer <= 0) {
      kart.item = kart.pendingItem;
      kart.itemCharges = kart.pendingItem === 'triple_boost' ? 3 : 1;
      kart.pendingItem = 'none';
      if (kart.isHuman) {
        soundEngine.playItemTick(true);
      }
    }
  }

  // Timers
  if (kart.boostTimer > 0) kart.boostTimer = Math.max(0, kart.boostTimer - dt);
  if (kart.hyperTimer > 0) kart.hyperTimer = Math.max(0, kart.hyperTimer - dt);
  if (kart.spinTimer > 0) kart.spinTimer = Math.max(0, kart.spinTimer - dt);

  const trackInfo = queryClosestTrack(track, kart.x, kart.z, kart.sampleHint);
  kart.sampleHint = trackInfo.sampleIndex;
  kart.offRoad = !trackInfo.onRoad && kart.grounded;

  // Lap & Checkpoint tracking
  if (canMove && !kart.finished) {
    const prevT = kart.trackProgress;
    const newT = trackInfo.t;
    kart.trackProgress = newT;

    // Advance checkpoint gate as kart progresses cleanly around track
    if (newT > 0.25 && newT < 0.75 && newT > kart.maxCheckpointT) {
      kart.maxCheckpointT = newT;
    }

    // Crossing finish line forward (from >0.82 to <0.18) after passing mid-track
    if (prevT > 0.82 && newT < 0.18 && kart.maxCheckpointT >= 0.48) {
      const lapTime = elapsedRaceMs - kart.lapStartMs;
      if (kart.lapStartMs > 0 && (kart.bestLapMs === 0 || lapTime < kart.bestLapMs)) {
        kart.bestLapMs = lapTime;
      }
      kart.lapStartMs = elapsedRaceMs;
      kart.maxCheckpointT = 0;

      if (kart.lap >= totalLaps) {
        kart.finished = true;
        kart.finishTimeMs = elapsedRaceMs;
        kart.bannerText = 'FINISH!';
        kart.bannerTimer = 4.0;
      } else {
        kart.lap += 1;
        if (kart.isHuman) {
          if (kart.lap === totalLaps) {
            soundEngine.setFinalLap(true);
            kart.bannerText = 'FINAL LAP!';
            kart.bannerTimer = 2.6;
          } else {
            soundEngine.playLapComplete();
            kart.bannerText = `LAP ${kart.lap}/${totalLaps}`;
            kart.bannerTimer = 2.0;
          }
        }
      }
    }

    kart.totalProgress = kart.lap - 1 + newT;
  }

  // If spun out or waiting on countdown
  if (!canMove) {
    kart.speed = 0;
    kart.rig.root.position.set(kart.x, kart.y, kart.z);
    kart.rig.root.rotation.y = kart.heading;
    return;
  }

  const effectiveInput: KartInput = kart.finished
    ? computeAiInput(kart, track)
    : input;

  const isSpinning = kart.spinTimer > 0;
  const throttle = isSpinning ? 0 : effectiveInput.throttle;
  const steer = isSpinning ? 0 : effectiveInput.steer;

  // Use Item edge trigger
  if (!isSpinning && effectiveInput.useItem && !kart.prevUseItem && kart.item !== 'none' && kart.rouletteTimer <= 0) {
    const used = kart.item;
    kart.itemCharges -= 1;
    if (kart.itemCharges <= 0) {
      kart.item = 'none';
      kart.itemCharges = 0;
    }
    onUseItem(kart, used);
  }
  kart.prevUseItem = effectiveInput.useItem;

  // Hop & Drift initiation
  const driftJustPressed = effectiveInput.drift && !kart.prevDrift;
  kart.prevDrift = effectiveInput.drift;

  if (!isSpinning && driftJustPressed) {
    if (kart.grounded) {
      kart.vy = 5.8;
      kart.grounded = false;
      if (Math.abs(steer) > 0.15 && kart.speed > 12) {
        kart.drifting = true;
        kart.driftDir = steer > 0 ? 1 : -1;
        kart.driftTimer = 0;
        kart.driftTier = 0;
      }
    } else if (kart.airborneTime > 0.12 && !kart.trickDone) {
      // Mid-air Ramp Trick!
      kart.trickDone = true;
      kart.trickSpinAngle = 0.01;
      kart.bannerText = 'TRICK BOOST!';
      kart.bannerTimer = 1.1;
      if (kart.isHuman) soundEngine.playItemTick(true);
    }
  }

  // Maintain or release drift
  if (kart.drifting) {
    if (!effectiveInput.drift || kart.speed < 9 || isSpinning) {
      // Release mini-turbo!
      if (kart.driftTier > 0) {
        const boostDurs = [0, 0.75, 1.4, 2.15];
        kart.boostTimer = Math.max(kart.boostTimer, boostDurs[kart.driftTier]);
        if (kart.isHuman) {
          soundEngine.playBoost();
          kart.bannerText =
            kart.driftTier === 3
              ? 'ULTRA MINI-TURBO!'
              : kart.driftTier === 2
              ? 'SUPER MINI-TURBO!'
              : 'MINI-TURBO!';
          kart.bannerTimer = 1.2;
        }
      }
      kart.drifting = false;
      kart.driftDir = 0;
      kart.driftTimer = 0;
      kart.driftTier = 0;
    } else if (kart.grounded) {
      // Charge drift sparks faster when steering into the drift
      const intoTurnBonus = steer * kart.driftDir > 0 ? 1.45 : 0.85;
      kart.driftTimer += dt * intoTurnBonus * mtMult;
      const prevTier = kart.driftTier;
      if (kart.driftTimer >= 2.3) kart.driftTier = 3;
      else if (kart.driftTimer >= 1.4) kart.driftTier = 2;
      else if (kart.driftTimer >= 0.65) kart.driftTier = 1;

      if (kart.driftTier > prevTier && kart.isHuman) {
        soundEngine.playMiniTurboTier(kart.driftTier as 1 | 2 | 3);
      }

      // Emit drift sparks
      if (Math.random() < 0.55) {
        const sparkCol =
          kart.driftTier === 3
            ? 0xc084fc
            : kart.driftTier === 2
            ? 0xf97316
            : kart.driftTier === 1
            ? 0x38bdf8
            : 0xfef08a;
        onSpawnParticle(kart.x, kart.y + 0.3, kart.z, sparkCol, 0.25);
      }
    }
  }

  // Speed & Acceleration
  const isBoosting = kart.boostTimer > 0 || kart.hyperTimer > 0;
  let maxSpd = baseTopSpeed;
  if (kart.hyperTimer > 0) maxSpd *= 1.38;
  else if (kart.boostTimer > 0) maxSpd *= 1.3;
  else if (kart.offRoad) maxSpd *= 0.62;

  if (isSpinning) {
    kart.speed = THREE.MathUtils.damp(kart.speed, 0, 5.5, dt);
  } else if (throttle > 0) {
    const accel = isBoosting ? accelRate * 2.2 : accelRate;
    kart.speed = Math.min(maxSpd, kart.speed + accel * throttle * dt);
    if (kart.speed > maxSpd) {
      kart.speed = THREE.MathUtils.damp(kart.speed, maxSpd, 4.0, dt);
    }
  } else if (throttle < 0) {
    kart.speed = Math.max(-baseTopSpeed * 0.4, kart.speed + accelRate * 1.4 * throttle * dt);
  } else {
    kart.speed = THREE.MathUtils.damp(kart.speed, 0, 2.2, dt);
  }

  // Steering & Drift Angular Velocity
  const speedSteerFactor = THREE.MathUtils.clamp(Math.abs(kart.speed) / 14, 0.25, 1.0);
  const reverseSign = kart.speed < -0.5 ? -1 : 1;

  if (kart.drifting) {
    // Mario Kart Wii drift arc: locked direction + counter-steer adjustment
    const driftAngular = kart.driftDir * (1.28 + steer * kart.driftDir * 0.72) * turnRate * 0.68;
    kart.heading += driftAngular * dt;
  } else {
    kart.heading += steer * turnRate * speedSteerFactor * reverseSign * dt;
  }

  kart.steerAngle = THREE.MathUtils.damp(kart.steerAngle, steer * 0.42, 12, dt);

  // Move along heading (with slight lateral drift slide!)
  const fx = -Math.sin(kart.heading);
  const fz = -Math.cos(kart.heading);
  const rx = Math.cos(kart.heading);
  const rz = -Math.sin(kart.heading);

  const slideAmount = kart.drifting ? -kart.driftDir * 0.18 : 0;
  kart.vx = (fx + rx * slideAmount) * kart.speed;
  kart.vz = (fz + rz * slideAmount) * kart.speed;

  kart.x += kart.vx * dt;
  kart.z += kart.vz * dt;

  // Soft outer track guardrail boundary so karts never get lost off-map
  const afterTrack = queryClosestTrack(track, kart.x, kart.z, kart.sampleHint);
  const maxAllowedLat = track.roadHalfWidth + track.shoulderWidth + 3.5;
  if (Math.abs(afterTrack.lateralDist) > maxAllowedLat) {
    const sign = Math.sign(afterTrack.lateralDist);
    const excess = Math.abs(afterTrack.lateralDist) - maxAllowedLat;
    kart.x -= afterTrack.right.x * sign * excess;
    kart.z -= afterTrack.right.z * sign * excess;
    kart.speed *= 0.85;
  }

  // Boost pad detection
  for (let i = 0; i < track.boostPads.length; i++) {
    const pad = track.boostPads[i];
    let dtPad = afterTrack.t - pad.t;
    if (dtPad > 0.5) dtPad -= 1;
    if (dtPad < -0.5) dtPad += 1;
    const arcDist = Math.abs(dtPad * track.totalLength);
    const padCenterLat = pad.lateralOffset * track.roadHalfWidth;
    if (arcDist < pad.length * 0.6 && Math.abs(afterTrack.lateralDist - padCenterLat) < pad.width * 0.7) {
      if (kart.boostTimer < 0.85) {
        kart.boostTimer = 1.25;
        if (kart.isHuman) soundEngine.playBoost();
      }
    }
  }

  // Check if launching off end of ramp
  for (let i = 0; i < track.ramps.length; i++) {
    const r = track.ramps[i];
    let dtRamp = afterTrack.t - r.t;
    if (dtRamp > 0.5) dtRamp -= 1;
    if (dtRamp < -0.5) dtRamp += 1;
    const arcDist = dtRamp * track.totalLength;
    if (
      arcDist > r.length * 0.35 &&
      arcDist < r.length * 0.65 &&
      Math.abs(afterTrack.lateralDist) <= r.width * 0.55 &&
      kart.grounded &&
      kart.speed > 18
    ) {
      kart.vy = 11.5;
      kart.grounded = false;
      kart.trickDone = false;
      kart.airborneTime = 0;
    }
  }

  // Vertical gravity & landing
  const groundY = afterTrack.roadY;
  if (!kart.grounded) {
    kart.vy -= 28 * dt;
    kart.y += kart.vy * dt;
    kart.airborneTime += dt;

    if (kart.trickSpinAngle > 0 && kart.trickSpinAngle < Math.PI * 2) {
      kart.trickSpinAngle = Math.min(Math.PI * 2, kart.trickSpinAngle + dt * 13);
    }

    if (kart.y <= groundY) {
      kart.y = groundY;
      kart.vy = 0;
      kart.grounded = true;
      kart.airborneTime = 0;
      if (kart.trickDone) {
        kart.boostTimer = Math.max(kart.boostTimer, 1.35);
        kart.trickDone = false;
        kart.trickSpinAngle = 0;
        if (kart.isHuman) soundEngine.playBoost();
      }
    }
  } else {
    kart.y = THREE.MathUtils.damp(kart.y, groundY, 18, dt);
    if (kart.y > groundY + 0.6) {
      kart.grounded = false;
    }
  }

  // Kick up rally gravel/snow dust when driving fast or off-road
  if (kart.grounded && Math.abs(kart.speed) > 16 && Math.random() < (kart.offRoad ? 0.65 : 0.25)) {
    const dustColor =
      track.id === 'arctic_bowl' ? 0xe0f2fe : track.id === 'sunset_touge' ? 0xfdba74 : 0xa16207;
    onSpawnParticle(kart.x, kart.y + 0.18, kart.z, dustColor, kart.offRoad ? 0.34 : 0.2);
  }

  // Sync Three.js Rig Transforms
  syncKartRigVisuals(kart, dt, elapsedRaceMs);
}

export function syncKartRigVisuals(kart: KartEntity, dt: number, elapsedMs: number): void {
  const { rig } = kart;
  rig.root.position.set(kart.x, kart.y, kart.z);

  const spinOffset = kart.spinTimer > 0 ? kart.spinTimer * 14.0 : 0;
  const driftVisualYaw = kart.drifting ? kart.driftDir * 0.26 : 0;
  rig.root.rotation.y = kart.heading + driftVisualYaw + spinOffset;

  // Body roll & pitch + midair trick flip
  const targetRoll = -kart.steerAngle * 0.22 + (kart.drifting ? -kart.driftDir * 0.14 : 0);
  rig.bodyGroup.rotation.z = THREE.MathUtils.damp(rig.bodyGroup.rotation.z, targetRoll, 10, dt);
  rig.bodyGroup.rotation.x = kart.trickSpinAngle > 0 ? -kart.trickSpinAngle : 0;

  // Front wheel steering & wheel spin
  rig.frontLeftSteer.rotation.y = kart.steerAngle;
  rig.frontRightSteer.rotation.y = kart.steerAngle;
  const spinDelta = -kart.speed * dt * 1.9;
  for (let i = 0; i < rig.wheels.length; i++) {
    rig.wheels[i].rotation.x += spinDelta;
  }

  // Exhaust flames
  const isBoosting = kart.boostTimer > 0 || kart.hyperTimer > 0;
  for (let i = 0; i < rig.boostFlames.length; i++) {
    const flame = rig.boostFlames[i];
    if (isBoosting) {
      flame.visible = true;
      const flicker = 0.85 + Math.sin(elapsedMs * 0.045 + i) * 0.3;
      flame.scale.set(1.0, 1.0, flicker * 1.45);
      (flame.material as THREE.MeshBasicMaterial).color.setHex(
        kart.hyperTimer > 0 ? 0xfacc15 : 0x38bdf8,
      );
    } else {
      flame.visible = false;
    }
  }

  // Drift Spark visual nodes
  if (kart.drifting && kart.driftTier > 0) {
    const col =
      kart.driftTier === 3 ? 0xc084fc : kart.driftTier === 2 ? 0xf97316 : 0x38bdf8;
    rig.driftSparkL.visible = true;
    rig.driftSparkR.visible = true;
    (rig.driftSparkL.material as THREE.MeshBasicMaterial).color.setHex(col);
    (rig.driftSparkR.material as THREE.MeshBasicMaterial).color.setHex(col);
    const s = 0.7 + kart.driftTier * 0.35 + Math.sin(elapsedMs * 0.04) * 0.2;
    rig.driftSparkL.scale.setScalar(s);
    rig.driftSparkR.scale.setScalar(s);
    rig.driftSparkL.rotation.y += dt * 12;
    rig.driftSparkR.rotation.y -= dt * 12;
  } else {
    rig.driftSparkL.visible = false;
    rig.driftSparkR.visible = false;
  }

  // Hyper Gustav rainbow aura
  if (kart.hyperTimer > 0) {
    rig.hyperAura.visible = true;
    rig.hyperAura.rotation.y += dt * 5;
    rig.hyperAura.rotation.x += dt * 3;
    const hue = (elapsedMs * 0.002) % 1;
    (rig.hyperAura.material as THREE.MeshBasicMaterial).color.setHSL(hue, 1, 0.6);
  } else {
    rig.hyperAura.visible = false;
  }
}

export function computeAiInput(kart: KartEntity, track: TrackData): KartInput {
  const n = track.samples.length;
  const lookAheadIdx = (kart.sampleHint + 16) % n;
  const targetSample = track.samples[lookAheadIdx];

  const tx = targetSample.point.x + targetSample.right.x * kart.aiTargetLat;
  const tz = targetSample.point.z + targetSample.right.z * kart.aiTargetLat;

  const dx = tx - kart.x;
  const dz = tz - kart.z;
  const desiredHeading = Math.atan2(-dx, -dz);

  let angleDiff = desiredHeading - kart.heading;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const steer = THREE.MathUtils.clamp(angleDiff * 1.9, -1, 1);
  const shouldDrift = Math.abs(angleDiff) > 0.35 && kart.speed > 20;

  let useItem = false;
  if (kart.item !== 'none' && kart.rouletteTimer <= 0) {
    kart.aiItemCooldown -= 0.016;
    if (kart.aiItemCooldown <= 0) {
      useItem = true;
      kart.aiItemCooldown = 2.5 + Math.random() * 3.5;
    }
  }

  return {
    throttle: kart.aiSkill,
    steer,
    drift: shouldDrift,
    useItem,
  };
}

export function rollRandomItem(position: number, totalRacers: number): ItemType {
  // Mario Kart Wii rubber-band item probability!
  const rankRatio = totalRacers > 1 ? (position - 1) / (totalRacers - 1) : 0;
  const r = Math.random();
  if (rankRatio > 0.6) {
    if (r < 0.32) return 'hyper_gustav';
    if (r < 0.65) return 'triple_boost';
    if (r < 0.9) return 'floorball_puck';
    return 'turbo_coffee';
  }
  if (rankRatio > 0.25) {
    if (r < 0.28) return 'floorball_puck';
    if (r < 0.56) return 'triple_boost';
    if (r < 0.8) return 'turbo_coffee';
    if (r < 0.92) return 'mud_trap';
    return 'hyper_gustav';
  }
  // 1st / 2nd place gets defensive traps, single boosts, or pucks
  if (r < 0.42) return 'mud_trap';
  if (r < 0.78) return 'turbo_coffee';
  return 'floorball_puck';
}

export function checkItemBoxCollisions(
  karts: KartEntity[],
  itemBoxes: ItemBoxVisual[],
  positionsById: Map<string, number>,
): void {
  for (let b = 0; b < itemBoxes.length; b++) {
    const box = itemBoxes[b];
    if (!box.active) continue;

    for (let k = 0; k < karts.length; k++) {
      const kart = karts[k];
      if (kart.isRemote) continue;
      const dx = kart.x - box.position.x;
      const dz = kart.z - box.position.z;
      if (dx * dx + dz * dz < 4.8 && Math.abs(kart.y - box.position.y) < 3.2) {
        box.active = false;
        box.respawnTimer = 4.5;
        box.mesh.visible = false;

        if (kart.item === 'none' && kart.rouletteTimer <= 0) {
          const pos = positionsById.get(kart.id) || 1;
          kart.pendingItem = rollRandomItem(pos, karts.length);
          kart.rouletteTimer = 1.25;
          if (kart.isHuman) {
            soundEngine.playItemTick(false);
          }
        }
        break;
      }
    }
  }
}

export function resolveKartCollisions(karts: KartEntity[]): void {
  const minDist = 2.25;
  const minDistSq = minDist * minDist;

  for (let i = 0; i < karts.length; i++) {
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i];
      const b = karts[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dSq = dx * dx + dz * dz;
      if (dSq > 0.0001 && dSq < minDistSq && Math.abs(a.y - b.y) < 2.2) {
        const d = Math.sqrt(dSq);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = (minDist - d) * 0.5;

        if (!a.isRemote) {
          a.x -= nx * overlap;
          a.z -= nz * overlap;
        }
        if (!b.isRemote) {
          b.x += nx * overlap;
          b.z += nz * overlap;
        }

        // Hyper Gustav rams opponents into spinouts!
        if (a.hyperTimer > 0 && b.hyperTimer <= 0 && b.spinTimer <= 0 && !b.isRemote) {
          b.spinTimer = 1.3;
          if (b.isHuman || a.isHuman) soundEngine.playSpinout();
        } else if (b.hyperTimer > 0 && a.hyperTimer <= 0 && a.spinTimer <= 0 && !a.isRemote) {
          a.spinTimer = 1.3;
          if (a.isHuman || b.isHuman) soundEngine.playSpinout();
        }
      }
    }
  }
}

export function toHUDState(
  kart: KartEntity,
  position: number,
  totalRacers: number,
  totalLaps: number,
): RacerHUDState {
  return {
    id: kart.id,
    name: kart.name,
    isHuman: kart.isHuman,
    playerIndex: kart.playerIndex,
    position,
    totalRacers,
    lap: kart.lap,
    totalLaps,
    speedKmh: Math.round(Math.abs(kart.speed) * 3.2),
    driftTier: kart.driftTier,
    driftCharge: THREE.MathUtils.clamp(kart.driftTimer / 2.3, 0, 1),
    item: kart.item,
    itemCharges: kart.itemCharges,
    itemRouletteActive: kart.rouletteTimer > 0,
    boostTimer: kart.boostTimer,
    hyperTimer: kart.hyperTimer,
    spinTimer: kart.spinTimer,
    finished: kart.finished,
    finishTimeMs: kart.finishTimeMs,
    bestLapMs: kart.bestLapMs,
    trackProgress: kart.trackProgress,
    worldX: kart.x,
    worldZ: kart.z,
    liveryColor: kart.liveryColor,
    bannerText: kart.bannerText,
  };
}

export function createDummyItemPlaceholder(): ItemType {
  return ITEM_POOL[0];
}
