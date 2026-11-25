import * as THREE from 'three';
import { GUSTAV_LIVERIES, type KartLivery, type KartVariant } from './types';

export const GUSTAV_IMAGE_URL =
  '/assets/aistudio/57ce4433-a288-457f-a407-edb0da9dc7ea_profile__1__e795e439.jpg';

interface GustavTexturePack {
  faceTexture: THREE.CanvasTexture;
  hoodFaceTexture: THREE.CanvasTexture;
  jerseyTexture: THREE.CanvasTexture;
  tireTexture: THREE.CanvasTexture;
  shadowTexture: THREE.CanvasTexture;
}

const textureCache = new Map<string, GustavTexturePack>();
let sourceImage: HTMLImageElement | null = null;
let imageLoadPromise: Promise<HTMLImageElement | null> | null = null;

function loadGustavImage(): Promise<HTMLImageElement | null> {
  if (sourceImage) return Promise.resolve(sourceImage);
  if (imageLoadPromise) return imageLoadPromise;

  imageLoadPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceImage = img;
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = GUSTAV_IMAGE_URL;
  });

  return imageLoadPromise;
}

function drawFaceCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  livery: KartLivery,
  isHoodWrap: boolean,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = livery.primaryHex;
  ctx.fillRect(0, 0, w, h);

  if (img && img.naturalWidth > 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Portrait crop focused tightly on Gustav Olsson's face & bangs
    const sx = iw * 0.34;
    const sy = ih * 0.11;
    const sw = iw * 0.34;
    const sh = ih * 0.25;

    if (isHoodWrap) {
      // Top-down hood mapping so his face stares forward down the road & looks awesome on the nose
      ctx.save();
      ctx.drawImage(img, sx, sy, sw, sh, w * 0.06, h * 0.06, w * 0.88, h * 0.88);
      ctx.restore();
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }
  } else {
    // Fallback graphic before image decode completes
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(1, '#fde68a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GUSTAV #51', w / 2, h / 2 + 18);
  }

  // Subtle rally accent border & racing number watermark on corners
  ctx.strokeStyle = livery.accentHex;
  ctx.lineWidth = isHoodWrap ? 14 : 10;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  if (isHoodWrap) {
    ctx.fillStyle = livery.accentHex;
    ctx.fillRect(w * 0.08, h * 0.03, w * 0.22, 12);
    ctx.fillRect(w * 0.7, h * 0.03, w * 0.22, 12);
  }
}

function drawJerseyCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement | null,
  livery: KartLivery,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = livery.primaryHex;
  ctx.fillRect(0, 0, w, h);

  if (img && img.naturalWidth > 0) {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    // Crop the #51 UNIHOC & Gävle crest chest section of his jersey
    const sx = iw * 0.28;
    const sy = ih * 0.38;
    const sw = iw * 0.44;
    const sh = ih * 0.24;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(img, sx, sy, sw, sh, w * 0.08, h * 0.14, w * 0.84, h * 0.62);
    ctx.globalAlpha = 1;
  }

  // Racing livery stripes
  ctx.fillStyle = livery.accentHex;
  ctx.fillRect(0, 0, w, 24);
  ctx.fillRect(0, h - 24, w, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('#51', w - 26, h - 42);
}

function createTireCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#18181b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#27272a';
  for (let x = 0; x < 256; x += 24) {
    ctx.fillRect(x, 6, 14, 50);
    ctx.fillRect((x + 12) % 256, 72, 14, 50);
  }
  return canvas;
}

function createContactShadowCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 14, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.34)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return canvas;
}

function getOrCreateTextures(livery: KartLivery, maxAniso: number): GustavTexturePack {
  const cached = textureCache.get(livery.id);
  if (cached) return cached;

  const faceCanvas = document.createElement('canvas');
  faceCanvas.width = 512;
  faceCanvas.height = 512;
  drawFaceCanvas(faceCanvas, sourceImage, livery, false);

  const hoodCanvas = document.createElement('canvas');
  hoodCanvas.width = 512;
  hoodCanvas.height = 512;
  drawFaceCanvas(hoodCanvas, sourceImage, livery, true);

  const jerseyCanvas = document.createElement('canvas');
  jerseyCanvas.width = 512;
  jerseyCanvas.height = 256;
  drawJerseyCanvas(jerseyCanvas, sourceImage, livery);

  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = maxAniso;

  const hoodFaceTexture = new THREE.CanvasTexture(hoodCanvas);
  hoodFaceTexture.colorSpace = THREE.SRGBColorSpace;
  hoodFaceTexture.anisotropy = maxAniso;

  const jerseyTexture = new THREE.CanvasTexture(jerseyCanvas);
  jerseyTexture.colorSpace = THREE.SRGBColorSpace;
  jerseyTexture.anisotropy = maxAniso;

  const tireTexture = new THREE.CanvasTexture(createTireCanvas());
  tireTexture.colorSpace = THREE.SRGBColorSpace;
  tireTexture.wrapS = THREE.RepeatWrapping;
  tireTexture.wrapT = THREE.RepeatWrapping;

  const shadowTexture = new THREE.CanvasTexture(createContactShadowCanvas());

  const pack: GustavTexturePack = {
    faceTexture,
    hoodFaceTexture,
    jerseyTexture,
    tireTexture,
    shadowTexture,
  };

  textureCache.set(livery.id, pack);

  // Redraw asynchronously as soon as Gustav's photo finishes decoding
  if (!sourceImage) {
    loadGustavImage().then((img) => {
      if (!img) return;
      drawFaceCanvas(faceCanvas, img, livery, false);
      drawFaceCanvas(hoodCanvas, img, livery, true);
      drawJerseyCanvas(jerseyCanvas, img, livery);
      faceTexture.needsUpdate = true;
      hoodFaceTexture.needsUpdate = true;
      jerseyTexture.needsUpdate = true;
    });
  }

  return pack;
}

export interface GustavKartRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  frontLeftSteer: THREE.Group;
  frontRightSteer: THREE.Group;
  wheels: THREE.Mesh[];
  boostFlames: THREE.Mesh[];
  hyperAura: THREE.Mesh;
  driftSparkL: THREE.Mesh;
  driftSparkR: THREE.Mesh;
  dispose: () => void;
}

export function preloadGustavPortrait(): Promise<HTMLImageElement | null> {
  return loadGustavImage();
}

export function createGustavKart(
  variant: KartVariant,
  liveryId: string,
  maxAnisotropy = 4,
): GustavKartRig {
  const livery = GUSTAV_LIVERIES.find((l) => l.id === liveryId) || GUSTAV_LIVERIES[0];
  const tex = getOrCreateTextures(livery, maxAnisotropy);

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materialsToDispose.push(m);
    return m;
  };

  // Materials with distinct PBR roughness/metalness contrast
  const chassisMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(livery.primaryHex),
      map: tex.jerseyTexture,
      roughness: 0.36,
      metalness: 0.25,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    }),
  );

  const faceCarMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: tex.faceTexture,
      roughness: 0.26,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
    }),
  );

  const hoodFaceMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: tex.hoodFaceTexture,
      roughness: 0.24,
      metalness: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    }),
  );

  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(livery.accentHex),
      roughness: 0.22,
      metalness: 0.72,
    }),
  );

  const chromeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.15,
      metalness: 0.94,
    }),
  );

  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.tireTexture,
      roughness: 0.85,
      metalness: 0.06,
    }),
  );

  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(livery.rimHex),
      roughness: 0.2,
      metalness: 0.88,
    }),
  );

  const headlightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    }),
  );

  // 1. Contact Shadow Plane (seated flush on ground y = 0.02)
  const shadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(2.9, 3.8)),
    trackMat(
      new THREE.MeshBasicMaterial({
        map: tex.shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      }),
    ),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  // Variant geometry ratios
  const isCoupe = variant === 'turbo_coupe';
  const isMach = variant === 'drift_mach';
  const bodyWidth = isMach ? 1.32 : isCoupe ? 1.54 : 1.48;
  const bodyLength = isCoupe ? 3.05 : isMach ? 2.65 : 2.8;

  // 2. Sculpted Lower Rally Chassis (Beveled ExtrudeGeometry)
  const hullShape = new THREE.Shape();
  const hw = bodyWidth * 0.5;
  const hl = bodyLength * 0.5;
  hullShape.moveTo(-hw * 0.72, -hl);
  hullShape.lineTo(hw * 0.72, -hl);
  hullShape.lineTo(hw, -hl * 0.35);
  hullShape.lineTo(hw, hl * 0.7);
  hullShape.lineTo(hw * 0.82, hl);
  hullShape.lineTo(-hw * 0.82, hl);
  hullShape.lineTo(-hw, hl * 0.7);
  hullShape.lineTo(-hw, -hl * 0.35);
  hullShape.closePath();

  const hullGeo = trackGeo(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelThickness: 0.09,
      bevelSize: 0.08,
      bevelSegments: 3,
    }),
  );
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.center();
  const hullMesh = new THREE.Mesh(hullGeo, chassisMat);
  hullMesh.position.set(0, 0.52, 0);
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyGroup.add(hullMesh);

  // 3. Gustav Olsson Face-Mapped Front Hood & Nosecone (Car IS Gustav's Face!)
  // Note: Local -Z is forward in our kart coordinate system!
  const hoodGeo = trackGeo(new THREE.BoxGeometry(bodyWidth * 0.88, 0.42, bodyLength * 0.46));
  const hoodMaterials = [
    chassisMat, // +X
    chassisMat, // -X
    hoodFaceMat, // +Y (top hood is Gustav's giant face!)
    chassisMat, // -Y
    chassisMat, // +Z
    faceCarMat, // -Z (front grille is Gustav's face staring straight ahead!)
  ];
  const hoodMesh = new THREE.Mesh(hoodGeo, hoodMaterials);
  hoodMesh.position.set(0, 0.72, -bodyLength * 0.24);
  hoodMesh.rotation.x = 0.14; // Sloped aggressive rally hood
  hoodMesh.castShadow = true;
  bodyGroup.add(hoodMesh);

  // 4. Giant Sculpted Gustav Face-Cab Core (Rounded Head-Car Cab in the middle!)
  // All 4 main vertical faces + top crown showcase Gustav's face so from 3rd-person chase cam,
  // front cam, and side angles you literally see Gustav Olsson as the car!
  const cabWidth = isMach ? 0.96 : 1.12;
  const cabHeight = isCoupe ? 0.68 : 0.82;
  const cabDepth = isCoupe ? 1.05 : 1.02;
  const cabGeo = trackGeo(new THREE.BoxGeometry(cabWidth, cabHeight, cabDepth));
  const cabMaterials = [
    faceCarMat, // right side
    faceCarMat, // left side
    hoodFaceMat, // roof top
    chassisMat, // bottom
    faceCarMat, // rear (+Z facing player chase cam!)
    faceCarMat, // front (-Z facing oncoming rivals!)
  ];
  const cabMesh = new THREE.Mesh(cabGeo, cabMaterials);
  cabMesh.position.set(0, 1.08, 0.18);
  cabMesh.castShadow = true;
  bodyGroup.add(cabMesh);

  // Hair / Roof Aero Scoop on top of Gustav's head-cab
  const scoopGeo = trackGeo(new THREE.BoxGeometry(cabWidth * 0.62, 0.14, 0.56));
  const scoopMesh = new THREE.Mesh(scoopGeo, accentMat);
  scoopMesh.position.set(0, 1.08 + cabHeight * 0.5 + 0.06, 0.22);
  scoopMesh.castShadow = true;
  bodyGroup.add(scoopMesh);

  // 5. Front Bumper & Headlight Rally Pod
  const bumperGeo = trackGeo(new THREE.BoxGeometry(bodyWidth * 0.94, 0.2, 0.24));
  const bumperMesh = new THREE.Mesh(bumperGeo, accentMat);
  bumperMesh.position.set(0, 0.34, -bodyLength * 0.51);
  bumperMesh.castShadow = true;
  bodyGroup.add(bumperMesh);

  const lightGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14));
  lightGeo.rotateX(Math.PI / 2);
  const hlLeft = new THREE.Mesh(lightGeo, headlightMat);
  hlLeft.position.set(-bodyWidth * 0.34, 0.56, -bodyLength * 0.49);
  const hlRight = new THREE.Mesh(lightGeo, headlightMat);
  hlRight.position.set(bodyWidth * 0.34, 0.56, -bodyLength * 0.49);
  bodyGroup.add(hlLeft, hlRight);

  // 6. Variant-Specific Rear Wing / Goalie Cage Spoiler
  if (variant === 'goalie_buggy') {
    // Chrome Goalie-Mask Cage Rollbar + Rally Wing
    const barGeo = trackGeo(new THREE.TorusGeometry(0.62, 0.045, 8, 20, Math.PI));
    const cageMesh = new THREE.Mesh(barGeo, chromeMat);
    cageMesh.position.set(0, 1.05, 0.72);
    cageMesh.castShadow = true;
    bodyGroup.add(cageMesh);

    const wingGeo = trackGeo(new THREE.BoxGeometry(bodyWidth * 1.04, 0.09, 0.34));
    const wingMesh = new THREE.Mesh(wingGeo, accentMat);
    wingMesh.position.set(0, 1.24, bodyLength * 0.43);
    wingMesh.rotation.x = -0.18;
    wingMesh.castShadow = true;
    bodyGroup.add(wingMesh);
  } else if (variant === 'turbo_coupe') {
    const pylonGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.46, 0.24));
    const pL = new THREE.Mesh(pylonGeo, chromeMat);
    pL.position.set(-0.48, 1.04, bodyLength * 0.42);
    const pR = new THREE.Mesh(pylonGeo, chromeMat);
    pR.position.set(0.48, 1.04, bodyLength * 0.42);
    const wingGeo = trackGeo(new THREE.BoxGeometry(bodyWidth * 1.15, 0.08, 0.42));
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, 1.28, bodyLength * 0.44);
    wing.rotation.x = -0.22;
    wing.castShadow = true;
    bodyGroup.add(pL, pR, wing);
  } else {
    // Gävle Drift Mach: Twin swept turbo fins
    const finGeo = trackGeo(new THREE.BoxGeometry(0.1, 0.56, 0.65));
    const fL = new THREE.Mesh(finGeo, accentMat);
    fL.position.set(-0.56, 1.08, bodyLength * 0.32);
    fL.rotation.z = 0.28;
    const fR = new THREE.Mesh(finGeo, accentMat);
    fR.position.set(0.56, 1.08, bodyLength * 0.32);
    fR.rotation.z = -0.28;
    bodyGroup.add(fL, fR);
  }

  // 7. Twin Chrome Exhaust Pipes + Boost Flame Cones
  const pipeGeo = trackGeo(new THREE.CylinderGeometry(0.095, 0.11, 0.46, 14));
  pipeGeo.rotateX(Math.PI / 2);
  const flameGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.72, 12));
  flameGeo.rotateX(Math.PI / 2);
  flameGeo.translate(0, 0, 0.36);

  const flameMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
    }),
  );

  const boostFlames: THREE.Mesh[] = [];
  [-0.32, 0.32].forEach((xOff) => {
    const pipe = new THREE.Mesh(pipeGeo, chromeMat);
    pipe.position.set(xOff, 0.48, bodyLength * 0.49);
    pipe.rotation.x = 0.15;
    bodyGroup.add(pipe);

    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(xOff, 0.48, bodyLength * 0.52);
    flame.scale.set(0.01, 0.01, 0.01);
    flame.visible = false;
    bodyGroup.add(flame);
    boostFlames.push(flame);
  });

  // 8. Four Rally Wheels (Front wheels steer inside Pivot Groups!)
  const wheelRadius = isMach ? 0.38 : 0.42;
  const wheelWidth = isMach ? 0.3 : 0.36;
  const tireGeo = trackGeo(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20));
  tireGeo.rotateZ(Math.PI / 2);

  const rimGeo = trackGeo(new THREE.CylinderGeometry(wheelRadius * 0.58, wheelRadius * 0.58, wheelWidth + 0.02, 14));
  rimGeo.rotateZ(Math.PI / 2);

  const hubGeo = trackGeo(new THREE.CylinderGeometry(0.09, 0.09, wheelWidth + 0.05, 8));
  hubGeo.rotateZ(Math.PI / 2);

  const wheels: THREE.Mesh[] = [];
  const frontLeftSteer = new THREE.Group();
  const frontRightSteer = new THREE.Group();

  const wheelTrackX = bodyWidth * 0.58;
  const frontZ = -bodyLength * 0.34;
  const rearZ = bodyLength * 0.34;

  const makeWheelMesh = () => {
    const w = new THREE.Mesh(tireGeo, tireMat);
    w.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    w.add(rim, hub);
    wheels.push(w);
    return w;
  };

  frontLeftSteer.position.set(-wheelTrackX, wheelRadius, frontZ);
  frontLeftSteer.add(makeWheelMesh());
  root.add(frontLeftSteer);

  frontRightSteer.position.set(wheelTrackX, wheelRadius, frontZ);
  frontRightSteer.add(makeWheelMesh());
  root.add(frontRightSteer);

  const rlWheel = makeWheelMesh();
  rlWheel.position.set(-wheelTrackX, wheelRadius, rearZ);
  root.add(rlWheel);

  const rrWheel = makeWheelMesh();
  rrWheel.position.set(wheelTrackX, wheelRadius, rearZ);
  root.add(rrWheel);

  // 9. Drift Spark Glow Spheres behind rear wheels
  const sparkGeo = trackGeo(new THREE.OctahedronGeometry(0.24, 0));
  const sparkMatL = trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  const sparkMatR = trackMat(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  const driftSparkL = new THREE.Mesh(sparkGeo, sparkMatL);
  const driftSparkR = new THREE.Mesh(sparkGeo, sparkMatR);
  driftSparkL.position.set(-wheelTrackX * 0.95, 0.25, rearZ + 0.38);
  driftSparkR.position.set(wheelTrackX * 0.95, 0.25, rearZ + 0.38);
  driftSparkL.visible = false;
  driftSparkR.visible = false;
  root.add(driftSparkL, driftSparkR);

  // 10. Hyper-Gustav Invincibility Rainbow Shell
  const auraGeo = trackGeo(new THREE.SphereGeometry(1.85, 18, 14));
  const auraMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    }),
  );
  const hyperAura = new THREE.Mesh(auraGeo, auraMat);
  hyperAura.position.y = 0.85;
  hyperAura.visible = false;
  root.add(hyperAura);

  return {
    root,
    bodyGroup,
    frontLeftSteer,
    frontRightSteer,
    wheels,
    boostFlames,
    hyperAura,
    driftSparkL,
    driftSparkR,
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    },
  };
}
