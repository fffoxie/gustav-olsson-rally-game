import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { OnlineTransport } from './onlineTransport';
import {
  checkItemBoxCollisions,
  computeAiInput,
  createKartEntity,
  getCCMultiplier,
  resolveKartCollisions,
  stepKartPhysics,
  syncKartRigVisuals,
  toHUDState,
  type KartEntity,
  type KartInput,
  type ParticleBurst,
  type ProjectileEntity,
} from './physics';
import { soundEngine } from './soundEngine';
import { getTrackData, queryClosestTrack } from './tracks';
import {
  GUSTAV_LIVERIES,
  TRACK_LIST,
  type ItemType,
  type KartVariant,
  type RaceConfig,
  type RaceResultsEntry,
  type RacerHUDState,
  type RemoteItemEvent,
  type RemoteKartPacket,
} from './types';
import { buildRaceWorld } from './worldBuilder';

interface RaceCanvasProps {
  config: RaceConfig;
  transport: OnlineTransport | null;
  paused: boolean;
  onCountdownChange: (val: number | 'GO' | null) => void;
  onHudUpdate: (racers: RacerHUDState[], elapsedMs: number) => void;
  onRaceFinished: (results: RaceResultsEntry[]) => void;
  onTogglePause: () => void;
}

const _desiredCamPos = new THREE.Vector3();
const _desiredLookAt = new THREE.Vector3();

const AI_NAMES = [
  'Gustav #51 Turbo',
  'Goalie Gustav',
  'Gävle Gustav',
  'Captain Olsson',
  'Drift Gustav',
];

const VARIANTS: KartVariant[] = ['goalie_buggy', 'turbo_coupe', 'drift_mach'];

export function RaceCanvas({
  config,
  transport,
  paused,
  onCountdownChange,
  onHudUpdate,
  onRaceFinished,
  onTogglePause,
}: RaceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const callbacksRef = useRef({
    onCountdownChange,
    onHudUpdate,
    onRaceFinished,
    onTogglePause,
  });
  callbacksRef.current = {
    onCountdownChange,
    onHudUpdate,
    onRaceFinished,
    onTogglePause,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const trackMeta = TRACK_LIST.find((t) => t.id === config.trackId) || TRACK_LIST[0];
    const track = getTrackData(config.trackId);
    const totalLaps = trackMeta.laps;
    const ccMult = getCCMultiplier(config.cc);

    // Start insane OST for this track & engine loop
    soundEngine.setFinalLap(false);
    soundEngine.setHyperStar(false);
    soundEngine.playOst(config.trackId);
    soundEngine.startEngineLoop();

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const world = buildRaceWorld(track, renderer, isSoftwareGl);
    const { scene, itemBoxes } = world;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const isSplitScreen = config.mode === 'split_screen';
    const cam1 = new THREE.PerspectiveCamera(
      72,
      isSplitScreen ? width / 2 / height : width / height,
      0.2,
      900,
    );
    const cam2 = new THREE.PerspectiveCamera(72, width / 2 / height, 0.2, 900);
    const cam1Look = new THREE.Vector3();
    const cam2Look = new THREE.Vector3();

    // Spawn Karts
    const karts: KartEntity[] = [];

    if (config.mode === 'online' && config.onlinePlayers && config.onlinePlayers.length > 0) {
      config.onlinePlayers.forEach((p, idx) => {
        const isLocal = p.id === config.localPlayerId;
        const kart = createKartEntity({
          id: p.id,
          name: p.name,
          isHuman: isLocal,
          isRemote: !isLocal,
          playerIndex: isLocal ? 0 : -1,
          variant: p.kartVariant,
          liveryId: p.liveryId,
          gridIndex: idx,
          track,
          scene,
          maxAniso,
        });
        karts.push(kart);
      });
    } else if (config.mode === 'time_trial') {
      const p1 = createKartEntity({
        id: 'p1',
        name: config.p1.name || 'Gustav Olsson',
        isHuman: true,
        isRemote: false,
        playerIndex: 0,
        variant: config.p1.kartVariant,
        liveryId: config.p1.liveryId,
        gridIndex: 0,
        track,
        scene,
        maxAniso,
      });
      p1.item = 'triple_boost';
      p1.itemCharges = 3;
      karts.push(p1);
    } else {
      // Grand Prix or 2P Split-Screen
      const p1 = createKartEntity({
        id: 'p1',
        name: config.p1.name || 'Gustav P1',
        isHuman: true,
        isRemote: false,
        playerIndex: 0,
        variant: config.p1.kartVariant,
        liveryId: config.p1.liveryId,
        gridIndex: 0,
        track,
        scene,
        maxAniso,
      });
      karts.push(p1);

      let startAiIdx = 1;
      if (isSplitScreen && config.p2) {
        const p2 = createKartEntity({
          id: 'p2',
          name: config.p2.name || 'Gustav P2',
          isHuman: true,
          isRemote: false,
          playerIndex: 1,
          variant: config.p2.kartVariant,
          liveryId: config.p2.liveryId,
          gridIndex: 1,
          track,
          scene,
          maxAniso,
        });
        karts.push(p2);
        startAiIdx = 2;
      }

      const usedLiveries = new Set([config.p1.liveryId, config.p2?.liveryId]);
      const availLiveries = GUSTAV_LIVERIES.filter((l) => !usedLiveries.has(l.id));
      for (let i = startAiIdx; i < 6; i++) {
        const livery =
          availLiveries[(i - startAiIdx) % availLiveries.length] ||
          GUSTAV_LIVERIES[i % GUSTAV_LIVERIES.length];
        const ai = createKartEntity({
          id: `ai_${i}`,
          name: AI_NAMES[(i - 1) % AI_NAMES.length],
          isHuman: false,
          isRemote: false,
          playerIndex: -1,
          variant: VARIANTS[i % VARIANTS.length],
          liveryId: livery.id,
          gridIndex: i,
          track,
          scene,
          maxAniso,
        });
        karts.push(ai);
      }
    }

    // Initialize camera positions cleanly behind player karts
    const p1Kart = karts.find((k) => k.playerIndex === 0) || karts[0];
    const p2Kart = karts.find((k) => k.playerIndex === 1) || null;

    if (p1Kart) {
      cam1.position.set(
        p1Kart.x + Math.sin(p1Kart.heading) * 7.2,
        p1Kart.y + 3.4,
        p1Kart.z + Math.cos(p1Kart.heading) * 7.2,
      );
      cam1Look.set(p1Kart.x, p1Kart.y + 1.1, p1Kart.z);
      cam1.lookAt(cam1Look);
    }
    if (p2Kart) {
      cam2.position.set(
        p2Kart.x + Math.sin(p2Kart.heading) * 7.2,
        p2Kart.y + 3.4,
        p2Kart.z + Math.cos(p2Kart.heading) * 7.2,
      );
      cam2Look.set(p2Kart.x, p2Kart.y + 1.1, p2Kart.z);
      cam2.lookAt(cam2Look);
    }

    // Shared Projectile & Particle geometries
    const puckGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.28, 16);
    const puckMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });
    const mudGeo = new THREE.CylinderGeometry(1.4, 1.65, 0.22, 16);
    const mudMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
    });
    const particleGeo = new THREE.SphereGeometry(0.35, 6, 6);

    const projectiles: ProjectileEntity[] = [];
    const particles: ParticleBurst[] = [];

    const spawnParticle = (x: number, y: number, z: number, colorHex: number, size = 0.25) => {
      if (particles.length > 90) return;
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const mesh = new THREE.Mesh(particleGeo, mat);
      mesh.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      mesh.scale.setScalar(size);
      scene.add(mesh);
      particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 4,
        vy: 1.5 + Math.random() * 2.5,
        vz: (Math.random() - 0.5) * 4,
        life: 0.42,
        maxLife: 0.42,
      });
    };

    const spawnItemEntity = (
      ownerId: string,
      type: 'floorball_puck' | 'mud_trap',
      x: number,
      y: number,
      z: number,
      heading: number,
      sampleHint: number,
    ) => {
      const fx = -Math.sin(heading);
      const fz = -Math.cos(heading);
      if (type === 'floorball_puck') {
        const mesh = new THREE.Mesh(puckGeo, puckMat);
        mesh.position.set(x + fx * 2.4, y + 0.45, z + fz * 2.4);
        scene.add(mesh);
        projectiles.push({
          id: Math.random().toString(36).slice(2),
          ownerId,
          type,
          mesh,
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
          vx: fx * 72,
          vz: fz * 72,
          ttl: 6.0,
          sampleHint,
        });
      } else {
        const mesh = new THREE.Mesh(mudGeo, mudMat);
        mesh.position.set(x - fx * 2.5, y + 0.12, z - fz * 2.5);
        scene.add(mesh);
        projectiles.push({
          id: Math.random().toString(36).slice(2),
          ownerId,
          type,
          mesh,
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
          vx: 0,
          vz: 0,
          ttl: 18.0,
          sampleHint,
        });
      }
    };

    const handleUseItem = (kart: KartEntity, item: ItemType) => {
      if (item === 'turbo_coffee' || item === 'triple_boost') {
        kart.boostTimer = Math.max(kart.boostTimer, 1.55);
        if (kart.isHuman) {
          soundEngine.playBoost();
          kart.bannerText = 'TURBO BOOST!';
          kart.bannerTimer = 1.0;
        }
      } else if (item === 'hyper_gustav') {
        kart.hyperTimer = 6.5;
        if (kart.isHuman) {
          soundEngine.playBoost();
          soundEngine.setHyperStar(true);
          kart.bannerText = 'HYPER GUSTAV #51!';
          kart.bannerTimer = 2.0;
        }
      } else if (item === 'floorball_puck' || item === 'mud_trap') {
        spawnItemEntity(kart.id, item, kart.x, kart.y, kart.z, kart.heading, kart.sampleHint);
        if (kart.isHuman) soundEngine.playPuckLaunch();
        if (config.mode === 'online' && transport) {
          const ev: RemoteItemEvent = {
            senderId: kart.id,
            itemType: item,
            x: kart.x,
            y: kart.y,
            z: kart.z,
            heading: kart.heading,
          };
          transport.send({ type: 'item_event', event: ev as unknown as Record<string, unknown> });
        }
      }
    };

    // Remote state interpolation targets for Online mode
    const remoteTargets = new Map<string, RemoteKartPacket>();

    const unsubscribeTransport = transport?.subscribe((msg) => {
      if (msg.type === 'kart_state') {
        const pkt = msg.packet as RemoteKartPacket;
        remoteTargets.set(pkt.playerId, pkt);
      } else if (msg.type === 'item_event') {
        const itemEv = msg.event as RemoteItemEvent;
        if (itemEv.itemType === 'floorball_puck' || itemEv.itemType === 'mud_trap') {
          spawnItemEntity(
            itemEv.senderId,
            itemEv.itemType,
            itemEv.x,
            itemEv.y,
            itemEv.z,
            itemEv.heading,
            0,
          );
        }
      } else if (msg.type === 'puck_hit') {
        if (p1Kart && msg.targetId === p1Kart.id && p1Kart.hyperTimer <= 0) {
          p1Kart.spinTimer = 1.35;
          p1Kart.bannerText = 'PUCK HIT!';
          p1Kart.bannerTimer = 1.4;
          soundEngine.playSpinout();
        }
      }
    });

    // Keyboard Input State
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        callbacksRef.current.onTogglePause();
        return;
      }
      keys.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      if (isSplitScreen) {
        cam1.aspect = w / 2 / h;
        cam2.aspect = w / 2 / h;
        cam2.updateProjectionMatrix();
      } else {
        cam1.aspect = w / h;
      }
      cam1.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    if (!isSoftwareGl) {
      renderer.compile(scene, cam1);
    }

    // Race Timing & Countdown State
    let countdownTimer = 3.2;
    let lastCountdownInt = 4;
    let raceActive = false;
    let elapsedRaceMs = 0;
    let hudEmitTimer = 0;
    let netEmitTimer = 0;
    let resultsEmitted = false;
    const positionsById = new Map<string, number>();

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function getHumanInput(playerIdx: number): KartInput {
      if (isSplitScreen) {
        if (playerIdx === 0) {
          const throttle = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
          const steer = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
          const drift = keys.has('Space') || keys.has('ShiftLeft');
          const useItem = keys.has('KeyE') || keys.has('KeyF');
          return { throttle, steer, drift, useItem };
        }
        const throttle = (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
        const steer = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
        const drift = keys.has('Enter') || keys.has('Slash') || keys.has('ShiftRight');
        const useItem = keys.has('Period') || keys.has('ControlRight') || keys.has('Backslash');
        return { throttle, steer, drift, useItem };
      }

      // Single player accepts both WASD and Arrow keys
      const throttle =
        (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
        (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const steer =
        (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) -
        (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
      const drift = keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight');
      const useItem = keys.has('KeyE') || keys.has('KeyF') || keys.has('Enter');
      return { throttle, steer, drift, useItem };
    }

    function updateChaseCamera(cam: THREE.PerspectiveCamera, lookVec: THREE.Vector3, kart: KartEntity, dt: number) {
      const fx = -Math.sin(kart.heading);
      const fz = -Math.cos(kart.heading);
      const isBoosting = kart.boostTimer > 0 || kart.hyperTimer > 0;
      const dist = isBoosting ? 8.3 : 7.1;
      const heightOff = isBoosting ? 3.1 : 3.35;

      _desiredCamPos.set(kart.x - fx * dist, kart.y + heightOff, kart.z - fz * dist);
      _desiredLookAt.set(kart.x + fx * 6.5, kart.y + 1.25, kart.z + fz * 6.5);

      cam.position.x = THREE.MathUtils.damp(cam.position.x, _desiredCamPos.x, 9, dt);
      cam.position.y = THREE.MathUtils.damp(cam.position.y, _desiredCamPos.y, 7, dt);
      cam.position.z = THREE.MathUtils.damp(cam.position.z, _desiredCamPos.z, 9, dt);

      lookVec.x = THREE.MathUtils.damp(lookVec.x, _desiredLookAt.x, 12, dt);
      lookVec.y = THREE.MathUtils.damp(lookVec.y, _desiredLookAt.y, 10, dt);
      lookVec.z = THREE.MathUtils.damp(lookVec.z, _desiredLookAt.z, 12, dt);

      cam.lookAt(lookVec);

      const targetFov = isBoosting ? 84 : 72 + Math.min(7, Math.abs(kart.speed) * 0.12);
      if (Math.abs(cam.fov - targetFov) > 0.1) {
        cam.fov = THREE.MathUtils.damp(cam.fov, targetFov, 7, dt);
        cam.updateProjectionMatrix();
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);

      if (!pausedRef.current) {
        // Countdown Sequence
        if (!raceActive) {
          countdownTimer -= dt;
          const ceilVal = Math.ceil(countdownTimer);
          if (ceilVal < lastCountdownInt && ceilVal >= 1 && ceilVal <= 3) {
            lastCountdownInt = ceilVal;
            callbacksRef.current.onCountdownChange(ceilVal);
            soundEngine.playCountdownBeep(false);
          }
          if (countdownTimer <= 0) {
            raceActive = true;
            callbacksRef.current.onCountdownChange('GO');
            soundEngine.playCountdownBeep(true);
            window.setTimeout(() => {
              if (!disposed) callbacksRef.current.onCountdownChange(null);
            }, 900);
          }
        } else {
          elapsedRaceMs += dt * 1000;
        }

        // Animate Item Boxes & Respawn
        for (let i = 0; i < itemBoxes.length; i++) {
          const b = itemBoxes[i];
          if (b.active) {
            b.mesh.rotation.y += dt * 2.1;
            b.mesh.rotation.x += dt * 1.1;
            b.innerCore.rotation.y -= dt * 3.4;
          } else {
            b.respawnTimer -= dt;
            if (b.respawnTimer <= 0) {
              b.active = true;
              b.mesh.visible = true;
            }
          }
        }

        // Step Kart Physics
        for (let i = 0; i < karts.length; i++) {
          const k = karts[i];
          if (k.isRemote) {
            const pkt = remoteTargets.get(k.id);
            if (pkt) {
              k.x = THREE.MathUtils.damp(k.x, pkt.x, 14, dt);
              k.y = THREE.MathUtils.damp(k.y, pkt.y, 14, dt);
              k.z = THREE.MathUtils.damp(k.z, pkt.z, 14, dt);
              k.heading = pkt.heading;
              k.speed = pkt.speed;
              k.steerAngle = pkt.steerAngle;
              k.drifting = pkt.driftDir !== 0;
              k.driftDir = pkt.driftDir;
              k.driftTier = pkt.driftTier as 0 | 1 | 2 | 3;
              k.hyperTimer = pkt.hyperTimer;
              k.spinTimer = pkt.spinTimer;
              k.boostTimer = pkt.boostTimer;
              k.lap = pkt.lap;
              k.trackProgress = pkt.trackProgress;
              k.totalProgress = pkt.totalProgress;
              k.finished = pkt.finished;
              k.finishTimeMs = pkt.finishTimeMs;
            }
            syncKartRigVisuals(k, dt, elapsedRaceMs);
          } else {
            const input = k.isHuman ? getHumanInput(k.playerIndex) : computeAiInput(k, track);
            stepKartPhysics(
              k,
              input,
              track,
              ccMult,
              dt,
              elapsedRaceMs,
              totalLaps,
              raceActive,
              handleUseItem,
              spawnParticle,
            );
          }
        }

        // Hyper-star music state check for human karts
        const anyHyper = karts.some((k) => k.isHuman && k.hyperTimer > 0);
        soundEngine.setHyperStar(anyHyper);

        // Update Engine Audio for P1
        if (p1Kart) {
          soundEngine.updateEngine(
            Math.min(1.2, Math.abs(p1Kart.speed) / 45),
            p1Kart.drifting,
            p1Kart.boostTimer > 0 || p1Kart.hyperTimer > 0,
          );
        }

        // Sort Standings
        const sorted = [...karts].sort((a, b) => {
          if (a.finished && b.finished) return a.finishTimeMs - b.finishTimeMs;
          if (a.finished) return -1;
          if (b.finished) return 1;
          return b.totalProgress - a.totalProgress;
        });
        sorted.forEach((k, idx) => positionsById.set(k.id, idx + 1));

        // Collisions & Item Boxes
        if (raceActive) {
          checkItemBoxCollisions(karts, itemBoxes, positionsById);
          resolveKartCollisions(karts);
        }

        // Projectiles Update
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.ttl -= dt;
          if (p.type === 'floorball_puck') {
            // Home toward nearest kart ahead or steer along track tangent
            let targetKart: KartEntity | null = null;
            let bestDist = 42 * 42;
            for (let k = 0; k < karts.length; k++) {
              const cand = karts[k];
              if (cand.id === p.ownerId) continue;
              const dx = cand.x - p.x;
              const dz = cand.z - p.z;
              const d2 = dx * dx + dz * dz;
              if (d2 < bestDist) {
                bestDist = d2;
                targetKart = cand;
              }
            }

            if (targetKart) {
              const dx = targetKart.x - p.x;
              const dz = targetKart.z - p.z;
              const len = Math.hypot(dx, dz) || 1;
              p.vx = THREE.MathUtils.damp(p.vx, (dx / len) * 74, 8, dt);
              p.vz = THREE.MathUtils.damp(p.vz, (dz / len) * 74, 8, dt);
            } else {
              const info = queryClosestTrack(track, p.x, p.z, p.sampleHint);
              p.sampleHint = info.sampleIndex;
              p.vx = THREE.MathUtils.damp(p.vx, info.tangent.x * 74, 5, dt);
              p.vz = THREE.MathUtils.damp(p.vz, info.tangent.z * 74, 5, dt);
            }

            p.x += p.vx * dt;
            p.z += p.vz * dt;
            const ground = queryClosestTrack(track, p.x, p.z, p.sampleHint);
            p.sampleHint = ground.sampleIndex;
            p.y = ground.roadY + 0.48;
            p.mesh.position.set(p.x, p.y, p.z);
            p.mesh.rotation.y += dt * 15;
          }

          // Check hit on karts
          let hit = false;
          for (let k = 0; k < karts.length; k++) {
            const victim = karts[k];
            if (p.type === 'floorball_puck' && victim.id === p.ownerId && p.ttl > 5.5) continue;
            if (p.type === 'mud_trap' && victim.id === p.ownerId && p.ttl > 17.2) continue;

            const dx = victim.x - p.x;
            const dz = victim.z - p.z;
            if (dx * dx + dz * dz < 3.4 && Math.abs(victim.y - p.y) < 2.2) {
              if (!victim.isRemote && victim.hyperTimer <= 0) {
                victim.spinTimer = 1.35;
                victim.bannerText = p.type === 'floorball_puck' ? 'PUCK HIT!' : 'SLIPPED!';
                victim.bannerTimer = 1.3;
                if (victim.isHuman) soundEngine.playSpinout();
              } else if (victim.isRemote && config.mode === 'online' && transport) {
                transport.send({ type: 'puck_hit', targetId: victim.id });
              }
              hit = true;
              break;
            }
          }

          if (hit || p.ttl <= 0) {
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
          }
        }

        // Particles Update
        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          pt.life -= dt;
          if (pt.life <= 0) {
            scene.remove(pt.mesh);
            (pt.mesh.material as THREE.Material).dispose();
            particles.splice(i, 1);
          } else {
            pt.mesh.position.x += pt.vx * dt;
            pt.mesh.position.y += pt.vy * dt;
            pt.mesh.position.z += pt.vz * dt;
            (pt.mesh.material as THREE.MeshBasicMaterial).opacity = pt.life / pt.maxLife;
          }
        }

        // Update Chase Cameras
        if (p1Kart) updateChaseCamera(cam1, cam1Look, p1Kart, dt);
        if (isSplitScreen && p2Kart) updateChaseCamera(cam2, cam2Look, p2Kart, dt);

        // Network Sync at ~25Hz for Online Mode
        if (config.mode === 'online' && transport && p1Kart) {
          netEmitTimer += dt;
          if (netEmitTimer >= 0.04) {
            netEmitTimer = 0;
            const pkt: RemoteKartPacket = {
              playerId: p1Kart.id,
              x: p1Kart.x,
              y: p1Kart.y,
              z: p1Kart.z,
              heading: p1Kart.heading,
              speed: p1Kart.speed,
              steerAngle: p1Kart.steerAngle,
              driftDir: p1Kart.drifting ? p1Kart.driftDir : 0,
              driftTier: p1Kart.driftTier,
              hyperTimer: p1Kart.hyperTimer,
              spinTimer: p1Kart.spinTimer,
              boostTimer: p1Kart.boostTimer,
              lap: p1Kart.lap,
              trackProgress: p1Kart.trackProgress,
              totalProgress: p1Kart.totalProgress,
              finished: p1Kart.finished,
              finishTimeMs: p1Kart.finishTimeMs,
            };
            transport.send({ type: 'kart_state', packet: pkt as unknown as Record<string, unknown> });
          }
        }

        // HUD Emit at ~15Hz
        hudEmitTimer += dt;
        if (hudEmitTimer >= 0.065) {
          hudEmitTimer = 0;
          const hudList = sorted.map((k, idx) => toHUDState(k, idx + 1, sorted.length, totalLaps));
          callbacksRef.current.onHudUpdate(hudList, elapsedRaceMs);
        }

        // Check Race Finish (all human karts finished)
        const allHumansFinished = karts.filter((k) => k.isHuman).every((k) => k.finished);
        if (allHumansFinished && !resultsEmitted) {
          resultsEmitted = true;
          const ptsTable = [15, 12, 10, 8, 6, 4];
          const results: RaceResultsEntry[] = sorted.map((k, idx) => ({
            id: k.id,
            name: k.name,
            isHuman: k.isHuman,
            position: idx + 1,
            finishTimeMs: k.finished
              ? k.finishTimeMs
              : Math.round(elapsedRaceMs + (totalLaps - k.totalProgress) * 18000),
            bestLapMs: k.bestLapMs,
            kartVariant: k.variant,
            liveryId: k.liveryId,
            points: ptsTable[idx] ?? 2,
          }));
          soundEngine.setHyperStar(false);
          soundEngine.playFinishFanfare((positionsById.get(p1Kart?.id || '') || 99) === 1);
          window.setTimeout(() => {
            if (!disposed) callbacksRef.current.onRaceFinished(results);
          }, 1200);
        }
      }

      // Render Viewport(s)
      const w = container?.clientWidth || window.innerWidth;
      const h = container?.clientHeight || window.innerHeight;
      if (isSplitScreen && p2Kart) {
        const halfW = Math.floor(w / 2);
        renderer.setScissorTest(true);

        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(scene, cam1);

        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.render(scene, cam2);

        renderer.setScissorTest(false);
      } else {
        renderer.setViewport(0, 0, w, h);
        renderer.render(scene, cam1);
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundEngine.stopEngineLoop();
      soundEngine.setFinalLap(false);
      soundEngine.setHyperStar(false);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      unsubscribeTransport?.();

      karts.forEach((k) => k.rig.dispose());
      particles.forEach((pt) => (pt.mesh.material as THREE.Material).dispose());
      puckGeo.dispose();
      puckMat.dispose();
      mudGeo.dispose();
      mudMat.dispose();
      particleGeo.dispose();
      world.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [config, transport]);

  return <div ref={containerRef} className="w-full h-full" />;
}
