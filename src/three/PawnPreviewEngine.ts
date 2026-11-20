import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLAYER_ARCHETYPES } from '../../shared/gameConfig';
import { createHeroPawn } from './models';
import type { PawnClipName, PawnModelHandle } from './assets/heroPawnBuilder';
import { QUALITY_PRESETS, type QualityConfig } from './perf/qualityPresets';

export interface PawnPreviewOptions {
  initialArchetypeIndex?: number;
  initialUnlocked?: boolean;
  onWebGLContextLost?: (lost: boolean) => void;
}

const DEFAULT_CAM_POS = new THREE.Vector3(0, 1.45, 3.05);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.74, 0);

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function disposeObjectSubtree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        m.dispose();
      });
    } else if (mat) {
      const spriteMat = mat as THREE.SpriteMaterial;
      spriteMat.map?.dispose();
      mat.dispose();
    }
  });
}

export class PawnPreviewEngine {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private envRT: THREE.WebGLRenderTarget;
  private clock = new THREE.Clock();

  private qualityConfig: QualityConfig;
  private pedestalGroup: THREE.Group;
  private pedestalRingMat: THREE.MeshStandardMaterial;
  private rimLight: THREE.DirectionalLight;
  private pawnHandle: PawnModelHandle | null = null;
  private currentArchetypeIndex = -1;
  private currentClip: PawnClipName = 'idle';
  private autoRotateEnabled = true;

  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private resetTransitionActive = false;

  private onContextLostHandler: (e: Event) => void;
  private onContextRestoredHandler: () => void;

  constructor(container: HTMLElement, options: PawnPreviewOptions = {}) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.qualityConfig = this.isSoftwareGl ? QUALITY_PRESETS.low : QUALITY_PRESETS.high;

    const width = Math.max(container.clientWidth || 360, 180);
    const height = Math.max(container.clientHeight || 320, 180);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.onContextLostHandler = (e: Event) => {
      e.preventDefault();
      options.onWebGLContextLost?.(true);
    };
    this.onContextRestoredHandler = () => {
      options.onWebGLContextLost?.(false);
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostHandler);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredHandler);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070c18);
    this.scene.fog = new THREE.FogExp2(0x070c18, 0.065);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    this.camera.position.copy(DEFAULT_CAM_POS);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(DEFAULT_TARGET);
    this.controls.enablePan = false;
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 0.9;
    this.controls.minDistance = 1.85;
    this.controls.maxDistance = 4.9;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.autoRotate = !this.isSoftwareGl && this.autoRotateEnabled;
    this.controls.autoRotateSpeed = 1.6;
    this.controls.addEventListener('start', () => {
      this.resetTransitionActive = false;
    });
    this.controls.update();

    // Three-point studio lighting rig
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.15);
    keyLight.position.set(2.8, 4.6, 3.4);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 14;
      keyLight.shadow.camera.left = -2.2;
      keyLight.shadow.camera.right = 2.2;
      keyLight.shadow.camera.top = 2.4;
      keyLight.shadow.camera.bottom = -1.2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.72);
    fillLight.position.set(-3.4, 2.2, 1.8);
    this.scene.add(fillLight);

    this.rimLight = new THREE.DirectionalLight(0xfbbf24, 1.35);
    this.rimLight.position.set(0.2, 2.8, -3.6);
    this.scene.add(this.rimLight);

    // Carved Slate & Brushed Gold Turntable Plinth
    this.pedestalGroup = new THREE.Group();
    const slateMat = new THREE.MeshStandardMaterial({
      color: 0x131c2e,
      roughness: 0.52,
      metalness: 0.25,
    });
    const darkMarbleMat = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      roughness: 0.34,
      metalness: 0.18,
    });
    this.pedestalRingMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.38,
      roughness: 0.22,
      metalness: 0.92,
    });

    const floorDisk = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.0, 0.08, 48), darkMarbleMat);
    floorDisk.position.y = -0.22;
    floorDisk.receiveShadow = true;
    this.pedestalGroup.add(floorDisk);

    const plinthBase = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.18, 0.16, 8), slateMat);
    plinthBase.position.y = -0.1;
    plinthBase.receiveShadow = true;
    this.pedestalGroup.add(plinthBase);

    const plinthTop = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.0, 0.06, 32), darkMarbleMat);
    plinthTop.position.y = -0.01;
    plinthTop.receiveShadow = true;
    this.pedestalGroup.add(plinthTop);

    const goldCollar = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.024, 12, 48), this.pedestalRingMat);
    goldCollar.rotation.x = Math.PI / 2;
    goldCollar.position.y = 0.012;
    this.pedestalGroup.add(goldCollar);

    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.73, 40),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.022;
    this.pedestalGroup.add(runeRing);

    this.scene.add(this.pedestalGroup);

    this.setPawn(options.initialArchetypeIndex ?? 0, options.initialUnlocked ?? true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.tick();
  }

  public setPawn(archetypeIndex: number, unlocked: boolean) {
    const safeIdx =
      ((Math.floor(archetypeIndex) % PLAYER_ARCHETYPES.length) + PLAYER_ARCHETYPES.length) %
      PLAYER_ARCHETYPES.length;
    const arch = PLAYER_ARCHETYPES[safeIdx];

    if (this.currentArchetypeIndex !== safeIdx) {
      if (this.pawnHandle) {
        this.scene.remove(this.pawnHandle.group);
        disposeObjectSubtree(this.pawnHandle.group);
        this.pawnHandle = null;
      }

      const handle = createHeroPawn(arch.color, arch.accentColor, safeIdx, this.qualityConfig);
      handle.nameSprite.visible = false;
      handle.group.position.set(0, 0.02, 0);
      handle.group.scale.setScalar(1.06);
      handle.playClip(this.currentClip, 0.08);
      this.scene.add(handle.group);
      this.pawnHandle = handle;
      this.currentArchetypeIndex = safeIdx;
    }

    this.rimLight.color.setHex(arch.accentHexNum);
    this.pedestalRingMat.color.setHex(unlocked ? 0xfbbf24 : arch.hexNum);
    this.pedestalRingMat.emissive.setHex(unlocked ? 0xd97706 : arch.hexNum);
    this.pedestalRingMat.emissiveIntensity = unlocked ? 0.48 : 0.28;
    if (this.pawnHandle) {
      this.pawnHandle.activeHalo.visible = unlocked;
    }
  }

  public setClip(clip: PawnClipName) {
    this.currentClip = clip;
    this.pawnHandle?.playClip(clip, 0.22);
  }

  public setAutoRotate(enabled: boolean) {
    this.autoRotateEnabled = enabled;
    this.controls.autoRotate = !this.isSoftwareGl && enabled;
  }

  public resetCamera() {
    this.resetTransitionActive = true;
  }

  private handleResize() {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth || 360, 180);
    const height = Math.max(this.container.clientHeight || 320, 180);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;

    const dt = Math.min(this.clock.getDelta(), 0.08);
    const elapsed = this.clock.elapsedTime;

    if (this.resetTransitionActive) {
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, DEFAULT_CAM_POS.x, 7, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, DEFAULT_CAM_POS.y, 7, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, DEFAULT_CAM_POS.z, 7, dt);
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, DEFAULT_TARGET.x, 7, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, DEFAULT_TARGET.y, 7, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, DEFAULT_TARGET.z, 7, dt);
      if (this.camera.position.distanceTo(DEFAULT_CAM_POS) < 0.025) {
        this.camera.position.copy(DEFAULT_CAM_POS);
        this.controls.target.copy(DEFAULT_TARGET);
        this.resetTransitionActive = false;
      }
    }

    if (this.pawnHandle) {
      this.pawnHandle.mixer.update(dt);
      const baseCrestY = (this.pawnHandle.crestMesh.userData.baseY as number | undefined) ?? 1.44;
      this.pawnHandle.crestMesh.position.y = baseCrestY + Math.sin(elapsed * 2.8) * 0.032;
      this.pawnHandle.crestMesh.rotation.y = elapsed * 1.15;
      if (this.pawnHandle.activeHalo.visible) {
        this.pawnHandle.activeHalo.rotation.z = elapsed * 0.7;
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostHandler);
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.onContextRestoredHandler,
    );

    if (this.pawnHandle) {
      this.scene.remove(this.pawnHandle.group);
      disposeObjectSubtree(this.pawnHandle.group);
      this.pawnHandle = null;
    }
    this.scene.remove(this.pedestalGroup);
    disposeObjectSubtree(this.pedestalGroup);

    this.envRT.dispose();
    this.scene.environment = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
