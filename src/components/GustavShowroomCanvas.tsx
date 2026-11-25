import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createGustavKart, preloadGustavPortrait, type GustavKartRig } from '../game/gustavKartModel';
import type { KartVariant } from '../game/types';

interface GustavShowroomCanvasProps {
  variant: KartVariant;
  liveryId: string;
}

export function GustavShowroomCanvas({ variant, liveryId }: GustavShowroomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ variant, liveryId });
  stateRef.current = { variant, liveryId };

  const rebuildKartRef = useRef<((v: KartVariant, l: string) => void) | null>(null);

  useEffect(() => {
    rebuildKartRef.current?.(variant, liveryId);
  }, [variant, liveryId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    preloadGustavPortrait();

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
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    scene.fog = new THREE.FogExp2('#090d16', 0.022);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(3.4, 2.35, -4.3);
    camera.lookAt(0, 0.85, 0);

    // 3-Point Studio Lighting Rig
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(5, 8, -4);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.left = -5;
      keyLight.shadow.camera.right = 5;
      keyLight.shadow.camera.top = 5;
      keyLight.shadow.camera.bottom = -5;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.35);
    rimLight.position.set(-5, 4, 5);
    scene.add(rimLight);

    // Turntable showroom floor
    const floorGeo = new THREE.CircleGeometry(18, 48);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    scene.add(floor);

    // Racing podium disc
    const discGeo = new THREE.CylinderGeometry(2.6, 2.85, 0.16, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.25,
      metalness: 0.75,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 0.08;
    disc.receiveShadow = true;
    scene.add(disc);

    const ringGeo = new THREE.RingGeometry(2.58, 2.7, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.17;
    scene.add(ring);

    const turntableGroup = new THREE.Group();
    turntableGroup.position.y = 0.16;
    scene.add(turntableGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    let currentRig: GustavKartRig | null = null;

    const mountKart = (v: KartVariant, l: string) => {
      if (currentRig) {
        turntableGroup.remove(currentRig.root);
        currentRig.dispose();
      }
      currentRig = createGustavKart(v, l, maxAniso);
      turntableGroup.add(currentRig.root);
    };

    mountKart(stateRef.current.variant, stateRef.current.liveryId);
    rebuildKartRef.current = mountKart;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

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
      const dt = Math.min(clock.getDelta(), 0.1);
      turntableGroup.rotation.y += dt * 0.45;
      if (currentRig) {
        for (let i = 0; i < currentRig.wheels.length; i++) {
          currentRig.wheels[i].rotation.x -= dt * 2.1;
        }
      }
      renderer.render(scene, camera);
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
      window.removeEventListener('resize', handleResize);
      currentRig?.dispose();
      envRT.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      discGeo.dispose();
      discMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
