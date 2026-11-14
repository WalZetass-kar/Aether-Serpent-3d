import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import {
  BOARD_SIZE,
  LADDERS,
  SNAKES,
  SPECIAL_TILES,
  SPECIAL_TILE_MAP,
  TILE_SPACING,
  buildJumpMap,
  tileToWorld,
  type DiceSkinId,
  type PlayerState,
  type TurnResolution,
} from '../../shared/gameConfig';
import {
  DEFAULT_BOARD_CONFIGS,
  cloneBoardConfig,
  type BoardConfig,
} from '../../shared/boardThemes';
import {
  buildBeveledStoneBoard,
  clearSharedArenaCaches,
  createEnchantedLadder,
  createFantasyDice,
  createFantasySnake,
  createHeroPawn,
  createSanctuaryEnvironment,
  createSpecialShrineProp,
  type LadderBuildResult,
  type PawnModelHandle,
  type SerpentBuildResult,
} from './models';
import type { ArenaEnvironmentHandle } from './assets/arenaEnvironmentBuilder';
import { disposePbrTextureSet, type PbrTextureSet } from './assets/pbrTextures';
import { applyLodBiasToGroup } from './assets/foliageBuilder';
import { probeKtx2Capabilities } from './assets/assetPipeline';
import {
  AdaptivePerformanceManager,
  type BenchmarkSummary,
  type LivePerfTelemetry,
} from './perf/PerformanceManager';
import {
  DEFAULT_GRAPHICS_PREFS,
  type GraphicsPreferences,
  type QualityConfig,
} from './perf/qualityPresets';

import {
  DEFAULT_CAMERA_SETTINGS,
  DynamicCameraController,
  type CameraDofTarget,
  type CameraMode,
  type CameraSettings,
} from './DynamicCameraController';
import { VfxPool } from './cinematics/VfxPool';
import {
  AnimationSequenceController,
  type TurnAnimationCallbacks,
} from './cinematics/AnimationSequenceController';
import type { CinematicEvent, CinematicSkillType } from './cinematics/types';

export type { CameraMode, CameraSettings, CinematicEvent, CinematicSkillType };
export { DEFAULT_CAMERA_SETTINGS };

export interface TileInspectInfo {
  tile: number;
  title: string;
  description: string;
  kind: 'normal' | 'ladder' | 'snake' | 'special' | 'start' | 'finish';
}

export interface EngineCallbacks {
  onDiceClicked?: () => void;
  onTileInspected?: (info: TileInspectInfo | null) => void;
  onWebGLContextLost?: (lost: boolean) => void;
}

export interface ArenaEngineOptions {
  graphicsPrefs?: GraphicsPreferences;
  diceSkinId?: DiceSkinId;
  boardConfig?: BoardConfig;
  onBuildProgress?: (progress: number, stage: string) => void;
  onBuildReady?: () => void;
}

// Pre-allocated scratch helpers (zero GC in render loop)
const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _swayQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _color = new THREE.Color();
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _frustum = new THREE.Frustum();
const _projMatrix = new THREE.Matrix4();
const _sphereScratch = new THREE.Sphere(new THREE.Vector3(), 1.6);

interface ParticleState {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

const SNAKE_PALETTES = [
  { primary: '#059669', stripe: '#a7f3d0', belly: '#d1fae5', horn: 0xfbbf24 },
  { primary: '#334155', stripe: '#94a3b8', belly: '#cbd5e1', horn: 0xf43f5e },
  { primary: '#b91c1c', stripe: '#fdba74', belly: '#fed7aa', horn: 0xfde047 },
  { primary: '#4c1d95', stripe: '#c4b5fd', belly: '#ede9fe', horn: 0x38bdf8 },
  { primary: '#047857', stripe: '#fde047', belly: '#fef9c3', horn: 0xf59e0b },
  { primary: '#6d28d9', stripe: '#f0abfc', belly: '#fae8ff', horn: 0xfbbf24 },
  { primary: '#be123c', stripe: '#fda4af', belly: '#ffe4e6', horn: 0xfde68a },
];

const PARTICLE_COUNT = 128;

export class FantasyBoardEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private options: ArenaEngineOptions;
  private perf: AdaptivePerformanceManager;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();

  private frameId = 0;
  private frameCounter = 0;
  private disposed = false;
  private paused = false;
  private ready = false;

  private envMap: THREE.Texture | null = null;
  private hemiLight!: THREE.HemisphereLight;
  private keyLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private boardConfig: BoardConfig;
  private boardGroup: THREE.Group | null = null;
  private diceSkinId: DiceSkinId;
  private diceGroup: THREE.Group | null = null;
  private diceBasePos = new THREE.Vector3(0, 0.9, 10.75);
  private diceCollider: THREE.Mesh | null = null;
  private boardCollider: THREE.Mesh | null = null;
  private tileHighlightMesh: THREE.Mesh | null = null;
  private arenaEnv: ArenaEnvironmentHandle | null = null;
  private shrineGroup: THREE.Group | null = null;

  private snakesById = new Map<string, SerpentBuildResult>();
  private laddersById = new Map<string, LadderBuildResult>();
  private shrineCrystals: THREE.Object3D[] = [];
  private starField: THREE.Points | null = null;

  private pawns: Map<string, PawnModelHandle> = new Map();
  private pawnArchetypes: Map<string, number> = new Map();
  private pawnTargets: Map<string, THREE.Vector3> = new Map();
  private activeTurnPlayerId: string | null = null;
  private pendingPlayers: { players: PlayerState[]; activePlayerId: string | null } | null = null;
  private pendingHighlightTile: number | null = null;
  private cameraController: DynamicCameraController;
  private vfxPool: VfxPool;
  private sequenceController: AnimationSequenceController | null = null;

  // Depth-of-Field, Bloom, SSAO & Anti-Aliased Post-Processing Pipeline
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private bokehPass: BokehPass | null = null;
  private outputPass: OutputPass | null = null;
  private fxaaPass: FXAAPass | null = null;
  private currentPostMode: QualityConfig['postMode'] | null = null;

  private dofTarget: CameraDofTarget = { active: false, focus: 10.5, aperture: 0, maxblur: 0 };
  private dofCurrentFocus = 10.5;
  private dofCurrentAperture = 0;
  private dofCurrentMaxBlur = 0;

  private particleMesh: THREE.InstancedMesh | null = null;
  private particles: ParticleState[] = [];

  private pointerDownPos = { x: 0, y: 0 };

  constructor(
    container: HTMLElement,
    callbacks: EngineCallbacks = {},
    options: ArenaEngineOptions = {},
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.options = options;
    this.diceSkinId = options.diceSkinId ?? 'royal_obsidian';
    this.boardConfig = cloneBoardConfig(options.boardConfig ?? DEFAULT_BOARD_CONFIGS[0]);

    const prefs = options.graphicsPrefs ?? DEFAULT_GRAPHICS_PREFS;
    this.perf = new AdaptivePerformanceManager(prefs.preset, prefs.autoAdjust);
    this.isSoftwareGl = this.perf.capabilities.isSoftwareGl;
    const cfg = this.perf.getQualityConfig();

    this.renderer = new THREE.WebGLRenderer({
      antialias: cfg.antialias && !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    this.renderer.setPixelRatio(this.perf.getEffectivePixelRatio());
    this.renderer.shadowMap.enabled = cfg.shadowsEnabled && !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = true;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    probeKtx2Capabilities(this.renderer);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b1224);
    this.scene.fog = new THREE.FogExp2(0x112b3c, 0.0048);

    this.camera = new THREE.PerspectiveCamera(44, width / height, 0.2, 160);
    this.camera.position.set(0, 18.5, 20.5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 1.0);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 38;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.enablePan = true;

    this.cameraController = new DynamicCameraController(this.camera, this.controls);
    this.vfxPool = new VfxPool(this.scene);

    void this.buildArenaAsync();
  }

  public isReady(): boolean {
    return this.ready && !this.disposed;
  }

  private yieldFrame(): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const timer = window.setTimeout(done, 48);
      requestAnimationFrame(() => {
        window.clearTimeout(timer);
        done();
      });
    });
  }

  private async buildArenaAsync() {
    await this.yieldFrame();
    if (this.disposed) return;

    const cfg = this.perf.getQualityConfig();
    const maxAniso = Math.min(
      cfg.anisotropyCap,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    // Stage 1 (18%): Lighting & IBL
    this.options.onBuildProgress?.(0.18, 'Menyiapkan pencahayaan & atmosfer WebGL2...');
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = cfg.tier === 'potato' ? 0.82 : 0.96;
    pmremGenerator.dispose();

    this.setupLighting(cfg);
    await this.yieldFrame();
    if (this.disposed) return;

    // Stage 2 (35%): Sanctuary Terrain, Water, Waterfall & Forest Foliage
    this.options.onBuildProgress?.(0.35, `Membangun lanskap ${this.boardConfig.name}...`);
    this.arenaEnv = createSanctuaryEnvironment(
      this.scene,
      maxAniso,
      this.isSoftwareGl,
      cfg,
      this.boardConfig,
    );
    await this.yieldFrame();
    if (this.disposed) return;

    // Stage 3 (58%): Beveled Stone Board, Ladders & Spline Snakes
    this.options.onBuildProgress?.(0.58, 'Mengukir papan batu runik & ular spline...');
    const { boardGroup, boardCollider, tileHighlight } = buildBeveledStoneBoard(
      maxAniso,
      cfg,
      this.boardConfig,
    );
    this.boardGroup = boardGroup;
    this.scene.add(boardGroup);
    this.boardCollider = boardCollider;
    this.tileHighlightMesh = tileHighlight;
    if (this.pendingHighlightTile !== null) {
      this.highlightTile(this.pendingHighlightTile);
      this.pendingHighlightTile = null;
    }

    this.buildSnakesAndLadders(maxAniso, cfg);
    await this.yieldFrame();
    if (this.disposed) return;

    // Stage 4 (78%): Special Shrines, Starfield, Dice Dais, VFX & Hero Pawns
    this.options.onBuildProgress?.(0.78, 'Memasang kuil rune, dadu & pion pahlawan...');
    this.buildSpecialShrines(cfg);
    this.buildStarfield(cfg);
    this.buildDiceDais(cfg);

    this.diceGroup = createFantasyDice(maxAniso, this.diceSkinId);
    this.diceGroup.position.copy(this.diceBasePos);
    this.scene.add(this.diceGroup);

    this.diceCollider = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 2.1, 2.1),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.diceCollider.position.copy(this.diceBasePos);
    this.diceCollider.visible = false;
    this.diceCollider.layers.set(1);
    this.scene.add(this.diceCollider);
    this.cameraController.setCinematicState('OVERVIEW', { diceObject: this.diceGroup });

    this.sequenceController = new AnimationSequenceController({
      isDisposed: () => this.disposed,
      pawns: this.pawns,
      pawnArchetypes: this.pawnArchetypes,
      pawnTargets: this.pawnTargets,
      snakesById: this.snakesById,
      laddersById: this.laddersById,
      diceGroup: this.diceGroup,
      diceBasePos: this.diceBasePos,
      cameraController: this.cameraController,
      vfxPool: this.vfxPool,
      spawnParticleBurst: (origin, colorHex, count, velocityScale) =>
        this.spawnParticleBurst(origin, colorHex, count, velocityScale),
      getReducedEffects: () =>
        this.cameraController.getSettings().reducedEffects ||
        this.perf.getQualityConfig().tier === 'potato',
    });

    this.setupParticleSystem();

    this.ready = true;
    if (this.pendingPlayers) {
      const pending = this.pendingPlayers;
      this.pendingPlayers = null;
      this.syncPlayers(pending.players, pending.activePlayerId);
    }
    await this.yieldFrame();
    if (this.disposed) return;

    // Stage 5 (92%): Shader Warmup, Adaptive Post-Processing & Warm-up Frame
    this.options.onBuildProgress?.(0.92, 'Mengompilasi shader & efek kamera...');
    await this.yieldFrame();
    if (this.disposed) return;

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    applyLodBiasToGroup(this.scene, cfg.lodBias);
    this.syncPostProcessingPipeline(cfg, width, height);
    if (!this.isSoftwareGl && cfg.tier !== 'potato') {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.cameraController.update(0.016);
    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    this.startLoop();
    this.options.onBuildProgress?.(1, 'Arena siap!');
    this.options.onBuildReady?.();
  }

  private setupParticleSystem() {
    const pGeo = new THREE.OctahedronGeometry(0.14, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_COUNT);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        size: 1,
        color: new THREE.Color(0xfbbf24),
      });
      _scaleVec.set(0, 0, 0);
      _mat4.compose(_vec3.set(0, -50, 0), _quat.identity(), _scaleVec);
      this.particleMesh.setMatrixAt(i, _mat4);
      this.particleMesh.setColorAt(i, _color.setHex(0xfbbf24));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);
  }

  private disposePostProcessing() {
    this.ssaoPass?.dispose();
    this.bloomPass?.dispose();
    this.bokehPass?.dispose();
    this.outputPass?.dispose();
    this.fxaaPass?.dispose();
    this.renderPass?.dispose();
    this.composer?.dispose();
    this.ssaoPass = null;
    this.bloomPass = null;
    this.bokehPass = null;
    this.outputPass = null;
    this.fxaaPass = null;
    this.renderPass = null;
    this.composer = null;
    this.currentPostMode = null;
  }

  private syncPostProcessingPipeline(cfg: QualityConfig, width: number, height: number) {
    const targetMode: QualityConfig['postMode'] = this.isSoftwareGl ? 'none' : cfg.postMode;

    if (targetMode === 'none') {
      if (this.composer) {
        this.disposePostProcessing();
      }
      this.currentPostMode = 'none';
      return;
    }

    if (!this.composer || this.currentPostMode !== targetMode) {
      this.disposePostProcessing();
      this.currentPostMode = targetMode;

      this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      if (targetMode === 'ultra_ssao') {
        this.ssaoPass = new SSAOPass(
          this.scene,
          this.camera,
          Math.max(1, width),
          Math.max(1, height),
        );
        this.ssaoPass.kernelRadius = 0.65;
        this.ssaoPass.minDistance = 0.002;
        this.ssaoPass.maxDistance = 0.14;
        this.composer.addPass(this.ssaoPass);
      }

      if (targetMode === 'bloom_dof_fxaa' || targetMode === 'ultra_ssao') {
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(Math.max(1, width), Math.max(1, height)),
          0.26,
          0.35,
          0.88,
        );
        this.composer.addPass(this.bloomPass);
      }

      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: 10.5,
        aperture: 0,
        maxblur: 0,
      });
      this.bokehPass.enabled = false;
      this.outputPass = new OutputPass();
      this.fxaaPass = new FXAAPass();

      this.composer.addPass(this.bokehPass);
      this.composer.addPass(this.outputPass);
      this.composer.addPass(this.fxaaPass);
    }

    const pr = this.perf.getEffectivePixelRatio();
    this.composer.setPixelRatio(pr);
    this.composer.setSize(width, height);
    if (this.fxaaPass) {
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / Math.max(1, width * pr),
        1 / Math.max(1, height * pr),
      );
    }
  }

  private getLightingPresetColors() {
    const preset = this.boardConfig.environmentConfig.lightingPreset;
    switch (preset) {
      case 'magma_glow':
        return {
          hemiSky: 0xfb923c,
          hemiGround: 0x3b0d0c,
          keyColor: 0xffedd5,
          rimColor: 0xef4444,
          fogColor: 0x2a0f0d,
          bgColor: 0x140707,
        };
      case 'arctic_noon':
        return {
          hemiSky: 0xe0f2fe,
          hemiGround: 0x1e3a5f,
          keyColor: 0xffffff,
          rimColor: 0x38bdf8,
          fogColor: 0x0f2d4a,
          bgColor: 0x07192b,
        };
      case 'desert_sun':
        return {
          hemiSky: 0xfde68a,
          hemiGround: 0x45270f,
          keyColor: 0xfffbeb,
          rimColor: 0xf59e0b,
          fogColor: 0x38220f,
          bgColor: 0x1c1008,
        };
      case 'bioluminescent':
        return {
          hemiSky: 0x67e8f9,
          hemiGround: 0x083344,
          keyColor: 0xecfeff,
          rimColor: 0x06b6d4,
          fogColor: 0x062c3d,
          bgColor: 0x031824,
        };
      case 'shadow_moon':
        return {
          hemiSky: 0xc084fc,
          hemiGround: 0x1e1035,
          keyColor: 0xf3e8ff,
          rimColor: 0x9333ea,
          fogColor: 0x1b0b2e,
          bgColor: 0x0c0417,
        };
      case 'divine_radiance':
        return {
          hemiSky: 0xfef08a,
          hemiGround: 0x1e3a8a,
          keyColor: 0xfffbeb,
          rimColor: 0x60a5fa,
          fogColor: 0x152c59,
          bgColor: 0x09152e,
        };
      case 'torchlit_sanctum':
        return {
          hemiSky: 0xfcd34d,
          hemiGround: 0x1b2e23,
          keyColor: 0xffedd5,
          rimColor: 0x10b981,
          fogColor: 0x172b22,
          bgColor: 0x0a1712,
        };
      case 'emerald_canopy':
      default:
        return {
          hemiSky: 0x93c5fd,
          hemiGround: 0x1e293b,
          keyColor: 0xfff1d6,
          rimColor: 0x6366f1,
          fogColor: 0x112b3c,
          bgColor: 0x0b1224,
        };
    }
  }

  private applyBoardAtmosphere(cfg: QualityConfig) {
    const lCols = this.getLightingPresetColors();
    const ambMult = THREE.MathUtils.clamp(
      this.boardConfig.visualEffects.ambientIntensity ?? 0.9,
      0.35,
      1.6,
    );
    const fogMult = THREE.MathUtils.clamp(
      this.boardConfig.environmentConfig.fogIntensity ?? 0.4,
      0,
      1,
    );
    const userShadows = this.boardConfig.visualEffects.shadowsEnabled ?? true;
    const shadows = cfg.shadowsEnabled && userShadows && !this.isSoftwareGl;

    this.scene.background = new THREE.Color(lCols.bgColor);
    this.scene.fog = new THREE.FogExp2(lCols.fogColor, 0.0014 + fogMult * 0.0065);

    if (this.hemiLight) {
      this.hemiLight.color.setHex(lCols.hemiSky);
      this.hemiLight.groundColor.setHex(lCols.hemiGround);
      this.hemiLight.intensity = 0.96 * ambMult;
    }
    if (this.keyLight) {
      this.keyLight.color.setHex(lCols.keyColor);
      this.keyLight.intensity = 2.25 * ambMult;
      this.keyLight.castShadow = shadows;
    }
    if (this.rimLight) {
      this.rimLight.color.setHex(lCols.rimColor);
      this.rimLight.intensity = 0.85 * ambMult;
    }
    this.renderer.shadowMap.enabled = shadows;
    if (this.bloomPass) {
      this.bloomPass.strength =
        0.14 + THREE.MathUtils.clamp(this.boardConfig.visualEffects.glowIntensity ?? 0.55, 0, 1) * 0.28;
    }
  }

  private setupLighting(cfg: QualityConfig) {
    const lCols = this.getLightingPresetColors();
    this.hemiLight = new THREE.HemisphereLight(lCols.hemiSky, lCols.hemiGround, 0.88);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(lCols.keyColor, 2.15);
    this.keyLight.position.set(14, 25, 16);
    this.keyLight.castShadow =
      cfg.shadowsEnabled && (this.boardConfig.visualEffects.shadowsEnabled ?? true) && !this.isSoftwareGl;
    const smSize = Math.max(512, cfg.shadowMapSize || 512);
    this.keyLight.shadow.mapSize.set(smSize, smSize);
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 62;
    const d = 18;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(lCols.rimColor, 0.72);
    this.rimLight.position.set(-16, 12, -16);
    this.scene.add(this.rimLight);

    this.applyBoardAtmosphere(cfg);
  }

  private buildSnakesAndLadders(maxAnisotropy: number, cfg: QualityConfig) {
    const activeLadders =
      this.boardConfig.ladders && this.boardConfig.ladders.length > 0
        ? this.boardConfig.ladders
        : LADDERS;
    const activeSnakes =
      this.boardConfig.snakes && this.boardConfig.snakes.length > 0
        ? this.boardConfig.snakes
        : SNAKES;

    for (const ladder of activeLadders) {
      if (ladder.from <= 1 || ladder.from >= 100 || ladder.to <= ladder.from || ladder.to > 100) {
        continue;
      }
      const fromPos = tileToWorld(ladder.from);
      const toPos = tileToWorld(ladder.to);
      const res = createEnchantedLadder(fromPos, toPos, maxAnisotropy, cfg, this.boardConfig);
      this.laddersById.set(ladder.id, res);
      this.scene.add(res.group);
    }

    const customSnake = this.boardConfig.snakeConfig;
    const hornHexNum = parseInt((customSnake.hornColor || '#fbbf24').replace('#', ''), 16) || 0xfbbf24;

    activeSnakes.forEach((snake, idx) => {
      if (snake.from <= 1 || snake.from >= 100 || snake.to < 1 || snake.to >= snake.from) {
        return;
      }
      const fromPos = tileToWorld(snake.from);
      const toPos = tileToWorld(snake.to);
      const basePalette = SNAKE_PALETTES[idx % SNAKE_PALETTES.length];
      // Primary hero snakes use the board/custom snake palette directly; secondary snakes harmonize with it
      const palette =
        idx % 2 === 0
          ? {
              primary: customSnake.primaryColor,
              stripe: customSnake.stripeColor,
              belly: customSnake.bellyColor,
              horn: hornHexNum,
            }
          : {
              primary: basePalette.primary,
              stripe: customSnake.stripeColor,
              belly: customSnake.bellyColor,
              horn: hornHexNum,
            };
      const res = createFantasySnake(fromPos, toPos, palette, maxAnisotropy, cfg, this.boardConfig);
      this.snakesById.set(snake.id, res);
      this.scene.add(res.group);
    });
  }

  private buildSpecialShrines(cfg: QualityConfig) {
    const group = new THREE.Group();
    group.name = 'SpecialShrines';
    for (const spec of SPECIAL_TILES) {
      const pos = tileToWorld(spec.tile);
      const shrine = createSpecialShrineProp(spec.type);
      shrine.position.set(pos.x + 0.56, 0.02, pos.z - 0.56);
      shrine.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).castShadow = cfg.shadowsEnabled && !cfg.shadowImportantOnly;
        }
      });
      group.add(shrine);
      const crystal = shrine.getObjectByName('floatingCrystal');
      if (crystal) this.shrineCrystals.push(crystal);
    }
    this.shrineGroup = group;
    this.scene.add(group);
  }

  private buildDiceDais(cfg: QualityConfig) {
    const daisGroup = new THREE.Group();
    daisGroup.position.set(this.diceBasePos.x, -0.1, this.diceBasePos.z);

    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.28,
    });
    const darkSlateMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.4,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
    });
    const arcaneMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.45,
    });

    const cast = cfg.shadowsEnabled && !this.isSoftwareGl;
    const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 2.02, 0.24, 8), plinthMat);
    baseTier.position.y = 0.12;
    baseTier.receiveShadow = cast;
    baseTier.castShadow = cast;
    daisGroup.add(baseTier);

    const topTier = new THREE.Mesh(new THREE.CylinderGeometry(1.44, 1.6, 0.18, 8), darkSlateMat);
    topTier.position.y = 0.33;
    topTier.receiveShadow = cast;
    topTier.castShadow = cast;
    daisGroup.add(topTier);

    const outerGoldRing = new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.052, 8, 24), goldMat);
    outerGoldRing.rotation.x = Math.PI / 2;
    outerGoldRing.position.y = 0.42;
    daisGroup.add(outerGoldRing);

    const innerRuneRing = new THREE.Mesh(new THREE.TorusGeometry(1.04, 0.026, 8, 24), arcaneMat);
    innerRuneRing.rotation.x = Math.PI / 2;
    innerRuneRing.position.y = 0.43;
    daisGroup.add(innerRuneRing);

    const pillarGeo = new THREE.CylinderGeometry(0.05, 0.075, 0.34, 6);
    const tipGeo = new THREE.OctahedronGeometry(0.06, 0);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(angle) * 1.62;
      const pz = Math.sin(angle) * 1.62;
      const pillar = new THREE.Mesh(pillarGeo, goldMat);
      pillar.position.set(px, 0.36, pz);
      pillar.castShadow = cast && !cfg.shadowImportantOnly;
      daisGroup.add(pillar);

      const tip = new THREE.Mesh(tipGeo, arcaneMat);
      tip.position.set(px, 0.58, pz);
      daisGroup.add(tip);
    }

    this.scene.add(daisGroup);
  }

  private buildStarfield(cfg: QualityConfig) {
    const count = cfg.tier === 'potato' ? 90 : cfg.tier === 'low' ? 160 : 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = ((i * 137.5) % 360) * (Math.PI / 180);
      const r = 34 + (i % 15) * 2.1;
      const y = 8 + ((i * 19) % 28);
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.22,
      transparent: true,
      opacity: 0.78,
    });
    this.starField = new THREE.Points(geo, mat);
    this.scene.add(this.starField);
  }

  // ---------------------------------------------------------------------------
  // Runtime Quality Adaptation, Telemetry & Benchmark API
  // ---------------------------------------------------------------------------

  private applyActiveQuality() {
    if (this.disposed || !this.ready) return;
    const cfg = this.perf.getQualityConfig();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    const pr = this.perf.getEffectivePixelRatio();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(width, height);

    const shadows = cfg.shadowsEnabled && !this.isSoftwareGl;
    this.renderer.shadowMap.enabled = shadows;
    if (this.keyLight) {
      this.keyLight.castShadow = shadows;
      if (shadows && cfg.shadowMapSize > 0 && this.keyLight.shadow.mapSize.width !== cfg.shadowMapSize) {
        this.keyLight.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
        if (this.keyLight.shadow.map) {
          this.keyLight.shadow.map.dispose();
          this.keyLight.shadow.map = null;
        }
      }
    }

    if (this.shrineGroup) {
      this.shrineGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).castShadow = shadows && !cfg.shadowImportantOnly;
        }
      });
    }

    this.arenaEnv?.applyQuality(cfg);
    applyLodBiasToGroup(this.scene, cfg.lodBias);
    this.syncPostProcessingPipeline(cfg, width, height);
  }

  public setGraphicsPreferences(prefs: GraphicsPreferences) {
    const { changed } = this.perf.setPreset(prefs.preset, prefs.autoAdjust);
    if (changed && this.ready) {
      this.applyActiveQuality();
    }
  }

  public setDiceSkin(skinId: DiceSkinId) {
    if (this.diceSkinId === skinId) return;
    this.diceSkinId = skinId;
    if (!this.ready || !this.diceGroup || this.disposed) return;

    const cfg = this.perf.getQualityConfig();
    const maxAniso = Math.min(
      cfg.anisotropyCap,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    // Dispose old child geometries/materials/textures inside diceGroup while keeping the group reference intact
    this.diceGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (std.map) std.map.dispose();
          m.dispose();
        }
      }
    });
    this.diceGroup.clear();

    const freshDice = createFantasyDice(maxAniso, skinId);
    while (freshDice.children.length > 0) {
      this.diceGroup.add(freshDice.children[0]);
    }
  }

  private disposeGroupResources(root: THREE.Object3D) {
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          const ownedPbr = m.userData?.ownedPbrSet as PbrTextureSet | undefined;
          if (ownedPbr) {
            disposePbrTextureSet(ownedPbr);
            m.userData.ownedPbrSet = undefined;
          }
          if (!m.userData?.isSharedStatic) {
            m.dispose();
          }
        }
      }
    });
  }

  /**
   * Live-updates the 3D board, tiles, snakes, ladders, environment, lighting, and VFX
   * in real time (used by Custom Board Creator & Board Preview and when switching boards).
   */
  public updateBoardConfig(nextConfig: BoardConfig) {
    this.boardConfig = cloneBoardConfig(nextConfig);
    if (!this.ready || this.disposed) return;

    const cfg = this.perf.getQualityConfig();
    const maxAniso = Math.min(
      cfg.anisotropyCap,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    // 1. Dispose & replace Board Plinth + 100 Tiles
    if (this.boardGroup) {
      this.scene.remove(this.boardGroup);
      this.disposeGroupResources(this.boardGroup);
      this.boardGroup = null;
    }
    const { boardGroup, boardCollider, tileHighlight } = buildBeveledStoneBoard(
      maxAniso,
      cfg,
      this.boardConfig,
    );
    this.boardGroup = boardGroup;
    this.boardCollider = boardCollider;
    this.tileHighlightMesh = tileHighlight;
    this.scene.add(boardGroup);

    // 2. Dispose & replace Ladders & Snakes
    this.laddersById.forEach((l) => {
      this.scene.remove(l.group);
      this.disposeGroupResources(l.group);
    });
    this.laddersById.clear();

    this.snakesById.forEach((s) => {
      this.scene.remove(s.group);
      this.disposeGroupResources(s.group);
    });
    this.snakesById.clear();

    this.buildSnakesAndLadders(maxAniso, cfg);

    // 3. Dispose & replace Sanctuary Environment
    if (this.arenaEnv) {
      this.arenaEnv.dispose();
      this.arenaEnv = null;
    }
    this.arenaEnv = createSanctuaryEnvironment(
      this.scene,
      maxAniso,
      this.isSoftwareGl,
      cfg,
      this.boardConfig,
    );

    // 4. Update Atmosphere, Fog, Shadows & Lighting
    this.applyBoardAtmosphere(cfg);
  }

  public getBoardConfig(): BoardConfig {
    return cloneBoardConfig(this.boardConfig);
  }

  public getTelemetry(): LivePerfTelemetry {
    let activeObjects = 0;
    this.scene.traverseVisible(() => {
      activeObjects++;
    });
    return this.perf.getTelemetry(this.renderer, activeObjects);
  }

  public runBenchmark(durationMs = 3000): Promise<BenchmarkSummary> {
    return this.perf.startBenchmark(durationMs);
  }

  // ---------------------------------------------------------------------------
  // Pawn Synchronization & Positioning
  // ---------------------------------------------------------------------------

  public syncPlayers(players: PlayerState[], activePlayerId: string | null) {
    if (!this.ready) {
      this.pendingPlayers = { players, activePlayerId };
      return;
    }

    const cfg = this.perf.getQualityConfig();
    this.activeTurnPlayerId = activePlayerId;
    const activeIds = new Set(players.map((p) => p.id));

    for (const [id, handle] of this.pawns.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(handle.group);
        this.pawns.delete(id);
        this.pawnArchetypes.delete(id);
        this.pawnTargets.delete(id);
      }
    }

    players.forEach((p) => {
      let handle = this.pawns.get(p.id);
      const prevArch = this.pawnArchetypes.get(p.id);
      if (handle && prevArch !== p.archetypeIndex) {
        this.scene.remove(handle.group);
        this.pawns.delete(p.id);
        handle = undefined;
      }

      if (!handle) {
        handle = createHeroPawn(p.color, p.accentColor, p.archetypeIndex, cfg);
        this.pawns.set(p.id, handle);
        this.pawnArchetypes.set(p.id, p.archetypeIndex);
        const slotPos = this.getTileSlotPosition(p.tile, p.id, players);
        handle.group.position.copy(slotPos);
        this.pawnTargets.set(p.id, slotPos.clone());
        this.scene.add(handle.group);
      }
      handle.shieldRing.visible = p.shields > 0;
    });

    this.recomputePawnSlots(players);

    const activePawn = activePlayerId ? this.pawns.get(activePlayerId) : undefined;
    this.cameraController.setActiveTurnPawn(activePawn?.group ?? null);
  }

  private getTileSlotPosition(tile: number, playerId: string, players: PlayerState[]): THREE.Vector3 {
    const world = tileToWorld(tile);
    const sameTile = players.filter((p) => p.tile === tile);
    if (sameTile.length <= 1) {
      return new THREE.Vector3(world.x, 0, world.z);
    }
    const idx = Math.max(0, sameTile.findIndex((p) => p.id === playerId));
    const offsets: Array<[number, number]> = [
      [-0.36, -0.32],
      [0.36, -0.32],
      [-0.36, 0.32],
      [0.36, 0.32],
    ];
    const [ox, oz] = offsets[idx % offsets.length];
    return new THREE.Vector3(world.x + ox, 0, world.z + oz);
  }

  private recomputePawnSlots(players: PlayerState[]) {
    for (const p of players) {
      const target = this.getTileSlotPosition(p.tile, p.id, players);
      this.pawnTargets.set(p.id, target);
    }
  }

  // ---------------------------------------------------------------------------
  // Event-Driven Cinematic Turn Animation Sequence
  // ---------------------------------------------------------------------------

  public enqueueTurnAnimation(
    playerId: string,
    resolution: TurnResolution,
    allPlayersAfter: PlayerState[],
    callbacks: TurnAnimationCallbacks,
  ): Promise<void> {
    if (!this.sequenceController) return Promise.resolve();
    return this.sequenceController.enqueue(playerId, resolution, allPlayersAfter, callbacks);
  }

  private spawnParticleBurst(
    origin: THREE.Vector3,
    colorHex: number,
    count: number,
    velocityScale = 1.0,
  ) {
    if (!this.particleMesh) return;
    const budgetScale = this.perf.getQualityConfig().particleBudget / 128;
    const scaledCount = Math.max(4, Math.round(count * budgetScale));

    let spawned = 0;
    for (let i = 0; i < PARTICLE_COUNT && spawned < scaledCount; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.pos.copy(origin);
        const angle = (spawned / scaledCount) * Math.PI * 2 + Math.random() * 0.5;
        const speed = (1.5 + Math.random() * 2.7) * velocityScale;
        p.vel.set(
          Math.cos(angle) * speed,
          (2.1 + Math.random() * 2.9) * velocityScale,
          Math.sin(angle) * speed,
        );
        p.life = 0;
        p.maxLife = 0.55 + Math.random() * 0.45;
        p.size = 0.72 + Math.random() * 0.68;
        p.color.setHex(colorHex);
        this.particleMesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Dynamic Camera Settings & Cinematic Triggers
  // ---------------------------------------------------------------------------

  public updateCameraSettings(partial: Partial<CameraSettings>) {
    this.cameraController.updateSettings(partial);
  }

  public getCameraSettings(): CameraSettings {
    return this.cameraController.getSettings();
  }

  public snapCameraOverview(kind: 'isometric' | 'topdown') {
    this.cameraController.snapToOverview(kind);
  }

  public triggerVictoryCamera(winnerId: string) {
    const winHandle = this.pawns.get(winnerId);
    if (winHandle) {
      winHandle.playClip('victory', 0.18);
      this.spawnParticleBurst(
        new THREE.Vector3(winHandle.group.position.x, 1.2, winHandle.group.position.z),
        0xfde047,
        this.cameraController.getSettings().reducedEffects ? 20 : 48,
      );
      this.cameraController.setCinematicState('VICTORY', { followObject: winHandle.group });
    }
  }

  public resetCameraPhase() {
    this.cameraController.setCinematicState('OVERVIEW');
  }

  public highlightTile(tile: number | null) {
    if (!this.tileHighlightMesh) {
      this.pendingHighlightTile = tile;
      return;
    }
    if (tile === null || tile < 1 || tile > 100) {
      this.tileHighlightMesh.visible = false;
      return;
    }
    const pos = tileToWorld(tile);
    this.tileHighlightMesh.position.set(pos.x, 0.04, pos.z);
    this.tileHighlightMesh.visible = true;
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleVisibilityChange = () => {
    this.paused = document.hidden;
    if (!this.paused) {
      this.clock.getDelta();
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
    this.callbacks.onWebGLContextLost?.(true);
  };

  private handleContextRestored = () => {
    this.callbacks.onWebGLContextLost?.(false);
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const pr = this.perf.getEffectivePixelRatio();

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(width, height);

    if (this.composer) {
      this.composer.setPixelRatio(pr);
      this.composer.setSize(width, height);
    }
    if (this.fxaaPass) {
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / Math.max(1, width * pr),
        1 / Math.max(1, height * pr),
      );
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.ready || !this.diceCollider || !this.boardCollider) return;
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 10) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.layers.set(1);
    _raycaster.setFromCamera(_pointer, this.camera);

    const diceHits = _raycaster.intersectObject(this.diceCollider, false);
    if (diceHits.length > 0) {
      this.callbacks.onDiceClicked?.();
      return;
    }

    const boardHits = _raycaster.intersectObject(this.boardCollider, false);
    if (boardHits.length > 0) {
      const pt = boardHits[0].point;
      const halfBoard = (BOARD_SIZE * TILE_SPACING) / 2;
      const col = Math.floor((pt.x + halfBoard) / TILE_SPACING);
      const rowFromTop = Math.floor((pt.z + halfBoard) / TILE_SPACING);
      const rowFromBottom = BOARD_SIZE - 1 - rowFromTop;
      if (col >= 0 && col < BOARD_SIZE && rowFromBottom >= 0 && rowFromBottom < BOARD_SIZE) {
        const rawCol = rowFromBottom % 2 === 0 ? col : BOARD_SIZE - 1 - col;
        const tile = rowFromBottom * BOARD_SIZE + rawCol + 1;
        this.highlightTile(tile);
        this.callbacks.onTileInspected?.(this.describeTile(tile));
        return;
      }
    }
    this.highlightTile(null);
    this.callbacks.onTileInspected?.(null);
  };

  private describeTile(tile: number): TileInspectInfo {
    if (tile === 1) {
      return {
        tile,
        title: 'Gerbang Awal (Petak 1)',
        description: 'Titik awal perjalanan para pahlawan menuju Puncak Aether.',
        kind: 'start',
      };
    }
    if (tile === 100) {
      return {
        tile,
        title: 'Takhta Puncak (Petak 100)',
        description: 'Capai tepat di petak 100 untuk memenangkan pertandingan!',
        kind: 'finish',
      };
    }
    const special = SPECIAL_TILE_MAP.get(tile);
    if (special) {
      return {
        tile,
        title: `${special.label} (Petak ${tile})`,
        description: special.description,
        kind: 'special',
      };
    }
    const boardJumpMap = buildJumpMap(this.boardConfig.ladders, this.boardConfig.snakes);
    const jump = boardJumpMap.get(tile);
    if (jump) {
      return {
        tile,
        title: `${jump.name} (Petak ${tile} → ${jump.to})`,
        description:
          jump.type === 'ladder'
            ? `Tangga suci yang membawamu naik cepat ke petak ${jump.to}.`
            : `Ular mistis! Tanpa Perisai Suci, kamu akan meluncur ke petak ${jump.to}.`,
        kind: jump.type,
      };
    }
    return {
      tile,
      title: `Petak Batu Runik #${tile}`,
      description: 'Petak batu berukir yang aman tanpa jebakan.',
      kind: 'normal',
    };
  }

  private startLoop() {
    const afterDraw = (cb: () => void) => {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (this.disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            this.frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            this.frameId = window.setTimeout(cb, 80);
          }
        };
        this.frameId = window.setTimeout(poll, 5);
      } else {
        this.frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (this.disposed) return;
      if (this.paused) {
        this.frameId = this.isSoftwareGl
          ? window.setTimeout(tick, 250)
          : requestAnimationFrame(tick);
        return;
      }

      const rawDt = this.clock.getDelta();
      const dt = Math.min(0.05, rawDt);
      const elapsed = this.clock.getElapsedTime();

      this.updateScene(dt, elapsed);
      if (this.composer && !this.isSoftwareGl) {
        this.composer.render(dt);
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      const { qualityChanged, resChanged } = this.perf.recordFrame(rawDt, this.renderer);
      if (qualityChanged || resChanged) {
        this.applyActiveQuality();
      }

      if (this.isSoftwareGl) {
        afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private updateScene(dt: number, elapsed: number) {
    this.frameCounter++;
    const cfg = this.perf.getQualityConfig();
    const reduced = this.cameraController.getSettings().reducedEffects || cfg.tier === 'potato';

    // Update camera & frustum matrix first for accurate distance/frustum culling
    this.cameraController.update(dt);
    this.camera.updateMatrixWorld();
    _projMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    _frustum.setFromProjectionMatrix(_projMatrix);

    // Update Arena sanctuary water, wind foliage, waterfall cascade, mist & spores
    this.arenaEnv?.update(elapsed, reduced);

    // Floating special crystals & starfield (throttled on Potato)
    const runSecondary = cfg.tier !== 'potato' || (this.frameCounter & 1) === 0;
    if (runSecondary) {
      for (let i = 0; i < this.shrineCrystals.length; i++) {
        const c = this.shrineCrystals[i];
        c.rotation.y = elapsed * 1.4 + i;
        c.position.y = 0.28 + Math.sin(elapsed * 2.2 + i) * 0.055;
      }
      if (this.starField) {
        this.starField.rotation.y = elapsed * 0.012;
      }
    }

    // Organic Serpent slithering + swallowing bulge shader + frustum/distance-culled idle animations
    let sIdx = 0;
    for (const snake of this.snakesById.values()) {
      if (snake.bodyMaterial.userData.uTime) {
        snake.bodyMaterial.userData.uTime.value = elapsed + sIdx * 1.3;
      }
      if (snake.bodyMaterial.userData.uSwallowPos) {
        snake.bodyMaterial.userData.uSwallowPos.value = snake.eatState.swallowProgress;
      }
      if (snake.bodyMaterial.userData.uSwallowAmp) {
        snake.bodyMaterial.userData.uSwallowAmp.value = snake.eatState.swallowAmp;
      }

      if (!snake.eatState.active) {
        snake.headGroup.getWorldPosition(_sphereScratch.center);
        _sphereScratch.radius = 1.6;
        const distSq = _sphereScratch.center.distanceToSquared(this.camera.position);
        if (distSq <= 784 && _frustum.intersectsSphere(_sphereScratch)) {
          const swayRoll = Math.sin(elapsed * 1.9 + sIdx) * 0.085;
          const swayYaw = Math.cos(elapsed * 1.3 + sIdx * 1.7) * 0.05;
          _euler.set(0, swayYaw, swayRoll, 'YXZ');
          _swayQuat.setFromEuler(_euler);
          snake.headGroup.quaternion.copy(snake.baseHeadQuat).multiply(_swayQuat);

          snake.jawGroup.rotation.x = 0.08 + Math.max(0, Math.sin(elapsed * 1.7 + sIdx)) * 0.14;
          const flick = Math.max(0, Math.sin(elapsed * 2.8 + sIdx * 2.1));
          snake.tongueMesh.scale.z = 0.25 + flick * 0.95;
        }
      }
      sIdx++;
    }

    // Pawn AnimationMixer, idle slot damping, & active crest spin
    const seqState = this.sequenceController?.getState() ?? 'idle';
    const allowSlotDamp = seqState === 'idle' || seqState === 'returning';
    for (const [id, handle] of this.pawns.entries()) {
      handle.mixer.update(dt);
      const target = this.pawnTargets.get(id);
      if (allowSlotDamp && target && handle.group.visible && handle.group.scale.y === 1) {
        handle.group.position.x = THREE.MathUtils.damp(handle.group.position.x, target.x, 9, dt);
        handle.group.position.z = THREE.MathUtils.damp(handle.group.position.z, target.z, 9, dt);
      }
      if (handle.shieldRing.visible) {
        handle.shieldRing.rotation.z = elapsed * 1.8;
      }
      const isActive = id === this.activeTurnPlayerId;
      handle.activeHalo.visible = isActive;
      if (isActive) {
        const haloPulse = 1 + Math.sin(elapsed * 3.5) * 0.05;
        handle.activeHalo.scale.set(haloPulse, haloPulse, 1);
        handle.activeHalo.rotation.z = elapsed * 0.9;
        handle.crestMesh.position.y = 1.14 + Math.sin(elapsed * 4.0) * 0.06;
        handle.crestMesh.rotation.y = elapsed * 1.6;
      } else {
        handle.crestMesh.position.y = THREE.MathUtils.damp(handle.crestMesh.position.y, 1.12, 8, dt);
      }
    }

    // Pooled 3D Skill VFX Update
    this.vfxPool.update(dt);

    // Pooled particles update (zero per-frame allocations)
    if (this.particleMesh) {
      let anyParticleUpdated = false;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = this.particles[i];
        if (!p.active) continue;
        anyParticleUpdated = true;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _scaleVec.set(0, 0, 0);
          _mat4.compose(_vec3.set(0, -50, 0), _quat.identity(), _scaleVec);
          this.particleMesh.setMatrixAt(i, _mat4);
        } else {
          p.vel.y -= 6.2 * dt;
          p.pos.addScaledVector(p.vel, dt);
          const remain = 1 - p.life / p.maxLife;
          const s = p.size * remain;
          _scaleVec.set(s, s, s);
          _euler.set(p.life * 4, p.life * 3, 0);
          _quat.setFromEuler(_euler);
          _mat4.compose(p.pos, _quat, _scaleVec);
          this.particleMesh.setMatrixAt(i, _mat4);
        }
      }
      if (anyParticleUpdated) {
        this.particleMesh.instanceMatrix.needsUpdate = true;
      }
    }

    this.updateDepthOfField(dt);
  }

  private updateDepthOfField(_dt: number) {
    if (!this.bokehPass) return;
    // Keep depth-of-field blur disabled so board numerals, stone relief, and 3D assets stay razor-sharp on all presets
    this.bokehPass.enabled = false;
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.sequenceController = null;
    this.arenaEnv?.dispose();
    this.vfxPool.dispose();
    this.cameraController.dispose();
    this.controls.dispose();
    this.disposePostProcessing();
    this.envMap?.dispose();

    if (this.keyLight?.shadow?.map) {
      this.keyLight.shadow.map.dispose();
      this.keyLight.shadow.map = null;
    }

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    clearSharedArenaCaches();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
