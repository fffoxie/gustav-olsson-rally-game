import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GUSTAV_IMAGE_URL } from './gustavKartModel';
import type { TrackData } from './tracks';
import { TRACK_LIST, type TrackId } from './types';

export interface ItemBoxVisual {
  mesh: THREE.Mesh;
  innerCore: THREE.Mesh;
  position: THREE.Vector3;
  active: boolean;
  respawnTimer: number;
}

export interface BuiltWorld {
  scene: THREE.Scene;
  itemBoxes: ItemBoxVisual[];
  boostMeshes: THREE.Mesh[];
  dispose: () => void;
}

function createRoadTexture(trackId: TrackId, maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  if (trackId === 'nordic_gravel') {
    ctx.fillStyle = '#78553a';
    ctx.fillRect(0, 0, 512, 512);
    // Gravel grain
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.random() > 0.5 ? 'rgba(255,235,205,0.12)' : 'rgba(30,20,10,0.18)';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 3, 3);
    }
    // Tire ruts
    ctx.fillStyle = 'rgba(42, 26, 15, 0.35)';
    ctx.fillRect(110, 0, 68, 512);
    ctx.fillRect(334, 0, 68, 512);
  } else if (trackId === 'sunset_touge') {
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.16)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    // Center dashed yellow line
    ctx.fillStyle = '#f59e0b';
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(250, y + 8, 12, 36);
    }
  } else {
    // Arctic snow & packed ice
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(56,189,248,0.14)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
    }
    // Ice racing tracks
    ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
    ctx.fillRect(105, 0, 75, 512);
    ctx.fillRect(332, 0, 75, 512);
  }

  // Red & white rally curbs along both edges
  const curbW = 28;
  for (let y = 0; y < 512; y += 64) {
    ctx.fillStyle = (y / 64) % 2 === 0 ? '#ef4444' : '#f8fafc';
    ctx.fillRect(0, y, curbW, 64);
    ctx.fillRect(512 - curbW, y, curbW, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

function createCheckeredTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const sq = 16;
  for (let y = 0; y < 64; y += sq) {
    for (let x = 0; x < 256; x += sq) {
      ctx.fillStyle = ((x / sq + y / sq) % 2 === 0) ? '#ffffff' : '#0f172a';
      ctx.fillRect(x, y, sq, sq);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createBoostChevronTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 256, 256);

  const colors = ['#06b6d4', '#facc15', '#ef4444', '#22d3ee'];
  for (let i = 0; i < 4; i++) {
    const y = i * 64 + 12;
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.moveTo(24, y + 42);
    ctx.lineTo(128, y);
    ctx.lineTo(232, y + 42);
    ctx.lineTo(200, y + 54);
    ctx.lineTo(128, y + 22);
    ctx.lineTo(56, y + 54);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

function createGroundTexture(trackId: TrackId): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle =
    trackId === 'nordic_gravel'
      ? '#2d5a27'
      : trackId === 'sunset_touge'
      ? '#7c3f23'
      : '#dbeafe';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle =
      trackId === 'arctic_bowl'
        ? Math.random() > 0.5
          ? 'rgba(255,255,255,0.2)'
          : 'rgba(147,197,253,0.18)'
        : Math.random() > 0.5
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.1)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  return tex;
}

function createSkyDome(topHex: string, horizonHex: string): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.55, horizonHex);
  grad.addColorStop(1, horizonHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.SphereGeometry(720, 24, 16);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  return new THREE.Mesh(geo, mat);
}

export function buildRaceWorld(
  track: TrackData,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
): BuiltWorld {
  const meta = TRACK_LIST.find((t) => t.id === track.id) || TRACK_LIST[0];
  const scene = new THREE.Scene();

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  const regGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };
  const regMat = <T extends THREE.Material>(m: T): T => {
    mats.push(m);
    return m;
  };
  const regTex = <T extends THREE.Texture>(t: T): T => {
    texs.push(t);
    return t;
  };

  // Studio environment reflections for metallic rims & clearcoat Gustav faces
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // Atmosphere & Fog matched to horizon
  scene.background = new THREE.Color(meta.fogColor);
  scene.fog = new THREE.FogExp2(meta.fogColor, 0.0022);

  const skyDome = createSkyDome(meta.skyTop, meta.skyHorizon);
  skyDome.position.set(95, 0, 20);
  regGeo(skyDome.geometry);
  regMat(skyDome.material as THREE.Material);
  scene.add(skyDome);

  // Balanced 3-point outdoor lighting rig
  const hemi = new THREE.HemisphereLight(meta.skyHorizon, '#1e293b', 0.85);
  scene.add(hemi);

  const sunColor = track.id === 'sunset_touge' ? 0xffedd5 : 0xfffbeb;
  const sun = new THREE.DirectionalLight(sunColor, 1.8);
  sun.position.set(140, 180, 90);
  if (!isSoftwareGl) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -220;
    sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220;
    sun.shadow.camera.bottom = -220;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 480;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
  rimLight.position.set(-120, 60, -140);
  scene.add(rimLight);

  // 1. Deformed Continuous Terrain Plane (extends far beyond track to fog horizon)
  const terrainSize = 960;
  const segs = 110;
  const terrainGeo = regGeo(new THREE.PlaneGeometry(terrainSize, terrainSize, segs, segs));
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i) + 95;
    const vz = posAttr.getZ(i) + 20;
    posAttr.setX(i, vx);
    posAttr.setZ(i, vz);

    // Find nearest track sample to depress terrain slightly under track and roll hills outside
    let bestDistSq = Infinity;
    let nearestY = 0;
    for (let s = 0; s < track.samples.length; s += 4) {
      const sp = track.samples[s].point;
      const dx = vx - sp.x;
      const dz = vz - sp.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        nearestY = sp.y;
      }
    }
    const dist = Math.sqrt(bestDistSq);
    const hillWave =
      Math.sin(vx * 0.025) * Math.cos(vz * 0.025) * 6.5 +
      Math.sin(vx * 0.06 + vz * 0.04) * 2.2;
    const blend = THREE.MathUtils.smoothstep(dist, track.roadHalfWidth + 4, track.roadHalfWidth + 38);
    const y = THREE.MathUtils.lerp(nearestY - 0.35, Math.max(-1.5, nearestY * 0.4 + hillWave + 1.5), blend);
    posAttr.setY(i, y);
  }
  terrainGeo.computeVertexNormals();

  const groundTex = regTex(createGroundTexture(track.id));
  const terrainMat = regMat(
    new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: 0.94,
      metalness: 0.02,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);

  // 2. Sculpted Closed-Loop Rally Road Ribbon
  const n = track.samples.length;
  const positions = new Float32Array((n + 1) * 2 * 3);
  const uvs = new Float32Array((n + 1) * 2 * 2);
  const indices: number[] = [];

  const roadTex = regTex(createRoadTexture(track.id, maxAniso));
  const uvRepeatLen = track.totalLength / 18;

  for (let i = 0; i <= n; i++) {
    const sample = track.samples[i % n];
    const leftPt = sample.point.clone().addScaledVector(sample.right, -track.roadHalfWidth);
    const rightPt = sample.point.clone().addScaledVector(sample.right, track.roadHalfWidth);

    const vIdx = i * 2;
    positions[vIdx * 3] = leftPt.x;
    positions[vIdx * 3 + 1] = leftPt.y + 0.03;
    positions[vIdx * 3 + 2] = leftPt.z;

    positions[(vIdx + 1) * 3] = rightPt.x;
    positions[(vIdx + 1) * 3 + 1] = rightPt.y + 0.03;
    positions[(vIdx + 1) * 3 + 2] = rightPt.z;

    const vCoord = (i / n) * uvRepeatLen;
    uvs[vIdx * 2] = 0;
    uvs[vIdx * 2 + 1] = vCoord;
    uvs[(vIdx + 1) * 2] = 1;
    uvs[(vIdx + 1) * 2 + 1] = vCoord;

    if (i < n) {
      const a = vIdx;
      const b = vIdx + 1;
      const c = vIdx + 2;
      const d = vIdx + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const roadGeo = regGeo(new THREE.BufferGeometry());
  roadGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  roadGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  roadGeo.setIndex(indices);
  roadGeo.computeVertexNormals();

  const roadMat = regMat(
    new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: track.id === 'arctic_bowl' ? 0.32 : 0.78,
      metalness: track.id === 'arctic_bowl' ? 0.12 : 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // 3. Checkered Start/Finish Line + Gustav #51 Gantry Arch
  const startSample = track.samples[0];
  const checkTex = regTex(createCheckeredTexture(maxAniso));
  const checkPlane = new THREE.Mesh(
    regGeo(new THREE.PlaneGeometry(track.roadHalfWidth * 2, 4.2)),
    regMat(
      new THREE.MeshStandardMaterial({
        map: checkTex,
        roughness: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    ),
  );
  checkPlane.position.copy(startSample.point).add(new THREE.Vector3(0, 0.06, 0));
  const startAngle = Math.atan2(startSample.tangent.x, startSample.tangent.z);
  checkPlane.rotation.set(-Math.PI / 2, 0, startAngle);
  checkPlane.receiveShadow = true;
  scene.add(checkPlane);

  // Start Gantry with Gustav Banner
  const gantryGroup = new THREE.Group();
  gantryGroup.position.copy(startSample.point);
  gantryGroup.rotation.y = startAngle;

  const pillarMat = regMat(new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.65, roughness: 0.3 }));
  const bannerAccentMat = regMat(new THREE.MeshStandardMaterial({ color: new THREE.Color(meta.accentColor), roughness: 0.3 }));
  const pillarGeo = regGeo(new THREE.BoxGeometry(1.1, 10.5, 1.1));
  const pLeft = new THREE.Mesh(pillarGeo, pillarMat);
  pLeft.position.set(-track.roadHalfWidth - 1.2, 5.25, 0);
  pLeft.castShadow = true;
  const pRight = new THREE.Mesh(pillarGeo, pillarMat);
  pRight.position.set(track.roadHalfWidth + 1.2, 5.25, 0);
  pRight.castShadow = true;

  // Create gantry banner texture with Gustav portrait & #51 RALLY
  const bannerCanvas = document.createElement('canvas');
  bannerCanvas.width = 1024;
  bannerCanvas.height = 192;
  const bCtx = bannerCanvas.getContext('2d')!;
  bCtx.fillStyle = '#090d16';
  bCtx.fillRect(0, 0, 1024, 192);
  bCtx.fillStyle = meta.accentColor;
  bCtx.fillRect(0, 0, 1024, 18);
  bCtx.fillRect(0, 174, 1024, 18);
  bCtx.fillStyle = '#ffffff';
  bCtx.font = 'italic bold 72px sans-serif';
  bCtx.textAlign = 'center';
  bCtx.fillText('GUSTAV OLSSON #51 RALLY', 512, 118);

  const bannerTex = regTex(new THREE.CanvasTexture(bannerCanvas));
  bannerTex.colorSpace = THREE.SRGBColorSpace;
  const gustavImg = new Image();
  gustavImg.onload = () => {
    bCtx.drawImage(gustavImg, gustavImg.width * 0.33, gustavImg.height * 0.1, gustavImg.width * 0.34, gustavImg.height * 0.28, 28, 24, 144, 144);
    bCtx.drawImage(gustavImg, gustavImg.width * 0.33, gustavImg.height * 0.1, gustavImg.width * 0.34, gustavImg.height * 0.28, 852, 24, 144, 144);
    bannerTex.needsUpdate = true;
  };
  gustavImg.src = GUSTAV_IMAGE_URL;

  const bannerMat = regMat(new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.35 }));
  const bannerGeo = regGeo(new THREE.BoxGeometry(track.roadHalfWidth * 2 + 3.4, 3.0, 0.9));
  const bannerMesh = new THREE.Mesh(bannerGeo, [bannerAccentMat, bannerAccentMat, bannerAccentMat, bannerAccentMat, bannerMat, bannerMat]);
  bannerMesh.position.set(0, 9.6, 0);
  bannerMesh.castShadow = true;
  gantryGroup.add(pLeft, pRight, bannerMesh);
  scene.add(gantryGroup);

  // 4. Boost Pads
  const boostTex = regTex(createBoostChevronTexture(maxAniso));
  const boostMat = regMat(
    new THREE.MeshStandardMaterial({
      map: boostTex,
      emissive: 0x06b6d4,
      emissiveMap: boostTex,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );

  const boostMeshes: THREE.Mesh[] = [];
  for (const pad of track.boostPads) {
    const idx = Math.floor(pad.t * n) % n;
    const s = track.samples[idx];
    const mesh = new THREE.Mesh(regGeo(new THREE.PlaneGeometry(pad.width, pad.length)), boostMat);
    const pos = s.point.clone().addScaledVector(s.right, pad.lateralOffset * track.roadHalfWidth);
    pos.y += 0.08;
    mesh.position.copy(pos);
    const ang = Math.atan2(s.tangent.x, s.tangent.z);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = ang;
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);
    boostMeshes.push(mesh);
  }

  // 5. Jump Ramps
  const rampMat = regMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(meta.accentColor),
      roughness: 0.4,
      metalness: 0.25,
    }),
  );
  for (const ramp of track.ramps) {
    const idx = Math.floor(ramp.t * n) % n;
    const s = track.samples[idx];
    const shape = new THREE.Shape();
    shape.moveTo(-ramp.length * 0.5, 0);
    shape.lineTo(ramp.length * 0.5, 0);
    shape.lineTo(ramp.length * 0.5, ramp.height);
    shape.closePath();

    const rGeo = regGeo(
      new THREE.ExtrudeGeometry(shape, {
        depth: ramp.width,
        bevelEnabled: false,
      }),
    );
    rGeo.translate(0, 0, -ramp.width * 0.5);
    rGeo.rotateY(Math.PI / 2);

    const rMesh = new THREE.Mesh(rGeo, rampMat);
    rMesh.position.copy(s.point);
    const ang = Math.atan2(s.tangent.x, s.tangent.z);
    rMesh.rotation.y = ang + Math.PI;
    rMesh.castShadow = true;
    rMesh.receiveShadow = true;
    scene.add(rMesh);
  }

  // 6. Spinning Mario Kart Wii Item Boxes
  const boxOuterGeo = regGeo(new THREE.BoxGeometry(1.65, 1.65, 1.65));
  const boxInnerGeo = regGeo(new THREE.OctahedronGeometry(0.75, 0));
  const boxOuterMat = regMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.72,
      roughness: 0.12,
      metalness: 0.2,
    }),
  );
  const boxInnerMat = regMat(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    }),
  );

  const itemBoxes: ItemBoxVisual[] = [];
  for (const row of track.itemRows) {
    const idx = Math.floor(row.t * n) % n;
    const s = track.samples[idx];
    for (let c = 0; c < row.count; c++) {
      const frac = row.count === 1 ? 0 : (c / (row.count - 1)) * 2 - 1;
      const lat = frac * (track.roadHalfWidth * 0.72);
      const pos = s.point.clone().addScaledVector(s.right, lat);
      pos.y += 1.4;

      const mesh = new THREE.Mesh(boxOuterGeo, boxOuterMat);
      mesh.position.copy(pos);
      const innerCore = new THREE.Mesh(boxInnerGeo, boxInnerMat);
      mesh.add(innerCore);
      scene.add(mesh);

      itemBoxes.push({
        mesh,
        innerCore,
        position: pos,
        active: true,
        respawnTimer: 0,
      });
    }
  }

  // 7. Instanced Roadside Pine Trees & Boulders (Natural Outdoor Perimeter)
  const treeCount = 260;
  const trunkGeo = regGeo(new THREE.CylinderGeometry(0.45, 0.75, 4.0, 7));
  trunkGeo.translate(0, 2.0, 0);
  const trunkMat = regMat(new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.92 }));

  const foliageGeo = regGeo(new THREE.ConeGeometry(3.1, 8.5, 8));
  foliageGeo.translate(0, 6.8, 0);
  const foliageColor = track.id === 'arctic_bowl' ? 0xdbeafe : track.id === 'sunset_touge' ? 0x365314 : 0x166534;
  const foliageMat = regMat(new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.85 }));

  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, treeCount);
  foliageInst.castShadow = !isSoftwareGl;

  const dummy = new THREE.Object3D();
  const colorTmp = new THREE.Color();
  let placedTrees = 0;
  let attempts = 0;

  while (placedTrees < treeCount && attempts < 2200) {
    attempts++;
    const angle = Math.random() * Math.PI * 2;
    const rad = 35 + Math.random() * 240;
    const tx = 95 + Math.cos(angle) * rad;
    const tz = 20 + Math.sin(angle) * rad;

    let minDistSq = Infinity;
    let nearY = 0;
    for (let s = 0; s < n; s += 6) {
      const sp = track.samples[s].point;
      const dx = tx - sp.x;
      const dz = tz - sp.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        nearY = sp.y;
      }
    }
    const dist = Math.sqrt(minDistSq);
    if (dist < track.roadHalfWidth + 8.5) continue;

    const hillWave =
      Math.sin(tx * 0.025) * Math.cos(tz * 0.025) * 6.5 +
      Math.sin(tx * 0.06 + tz * 0.04) * 2.2;
    const blend = THREE.MathUtils.smoothstep(dist, track.roadHalfWidth + 4, track.roadHalfWidth + 38);
    const groundY = THREE.MathUtils.lerp(nearY - 0.35, Math.max(-1.5, nearY * 0.4 + hillWave + 1.5), blend);

    const scale = 0.85 + Math.random() * 0.55;
    dummy.position.set(tx, groundY - 0.2, tz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    trunkInst.setMatrixAt(placedTrees, dummy.matrix);
    foliageInst.setMatrixAt(placedTrees, dummy.matrix);

    const tint = 0.85 + Math.random() * 0.3;
    colorTmp.setHex(foliageColor).multiplyScalar(tint);
    foliageInst.setColorAt(placedTrees, colorTmp);

    placedTrees++;
  }
  trunkInst.count = placedTrees;
  foliageInst.count = placedTrees;
  trunkInst.instanceMatrix.needsUpdate = true;
  foliageInst.instanceMatrix.needsUpdate = true;
  if (foliageInst.instanceColor) foliageInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  foliageInst.computeBoundingSphere();
  scene.add(trunkInst, foliageInst);

  // Roadside Rally Marker Posts along outer curves
  const postCount = 80;
  const postGeo = regGeo(new THREE.BoxGeometry(0.45, 1.5, 0.45));
  postGeo.translate(0, 0.75, 0);
  const postMat = regMat(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.45 }));
  const postInst = new THREE.InstancedMesh(postGeo, postMat, postCount);

  for (let i = 0; i < postCount; i++) {
    const idx = Math.floor((i / postCount) * n) % n;
    const s = track.samples[idx];
    const side = i % 2 === 0 ? 1 : -1;
    const pt = s.point.clone().addScaledVector(s.right, side * (track.roadHalfWidth + 1.2));
    dummy.position.copy(pt);
    dummy.rotation.set(0, Math.atan2(s.tangent.x, s.tangent.z), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    postInst.setMatrixAt(i, dummy.matrix);
  }
  postInst.instanceMatrix.needsUpdate = true;
  postInst.computeBoundingSphere();
  scene.add(postInst);

  return {
    scene,
    itemBoxes,
    boostMeshes,
    dispose: () => {
      envRT.dispose();
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
