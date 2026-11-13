import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import {
  createBarkPbrMaps,
  createCastleSlateRoofPbrMaps,
  createCastleStonePbrMaps,
  createRockPbrMaps,
  createTerrainPbrMaps,
  createTimberPbrMaps,
  disposePbrTextureSet,
  type PbrTextureSet,
} from './assets/pbrTextures';
import {
  buildShoreBouldersAndPebbles,
  createSculptedTerrain,
  groundHeightAt,
} from './assets/rockTerrainBuilder';
import { createOrientalDragon, type DragonHandle } from './assets/dragonBuilder';
import {
  applyLodBiasToGroup,
  buildForestVegetation,
  type VegetationHandle,
} from './assets/foliageBuilder';
import {
  buildWaterAndEnvironment,
  type WaterEnvHandle,
} from './assets/waterEnvironmentBuilder';
import { MenuAssetPipeline, probeKtx2Capabilities } from './assets/assetPipeline';
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

const CinematicVignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uDarkness: { value: 0.34 },
    uWarmth: { value: 0.04 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uWarmth;
    varying vec2 vUv;
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec2 centered = vUv - vec2(0.5);
      float dist = length(centered);
      float vig = smoothstep(0.32, 0.92, dist);
      vec3 col = tex.rgb * (1.0 - vig * uDarkness);
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col += vec3(uWarmth, uWarmth * 0.65, -uWarmth * 0.4) * smoothstep(0.45, 0.95, luma);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), tex.a);
    }
  `,
};

export class MainMenuEngine {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private perf: AdaptivePerformanceManager;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight!: THREE.DirectionalLight;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private paused = false;

  // Post-Processing Pipeline (preset-adaptive, GPU only)
  private composer: EffectComposer | null = null;
  private bokehPass: BokehPass | null = null;
  private vignettePass: ShaderPass | null = null;
  private fxaaPass: FXAAPass | null = null;

  // Modular Realistic Subsystems
  private dragon!: DragonHandle;
  private vegetation!: VegetationHandle;
  private waterEnv!: WaterEnvHandle;
  private assetPipeline: MenuAssetPipeline;
  private pbrSets: PbrTextureSet[] = [];
  private envMap: THREE.Texture;

  private pointerNorm = { x: 0, y: 0 };
  private baseCamPos = new THREE.Vector3(0.55, 4.15, 13.7);
  private baseLookAt = new THREE.Vector3(-0.35, 2.75, -1.6);

  constructor(
    container: HTMLElement,
    initialPrefs: GraphicsPreferences = DEFAULT_GRAPHICS_PREFS,
  ) {
    this.container = container;
    this.perf = new AdaptivePerformanceManager(initialPrefs.preset, initialPrefs.autoAdjust);
    this.isSoftwareGl = this.perf.capabilities.isSoftwareGl;
    const cfg = this.perf.getQualityConfig();

    this.renderer = new THREE.WebGLRenderer({
      antialias: cfg.antialias && !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
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
    container.appendChild(this.renderer.domElement);

    probeKtx2Capabilities(this.renderer);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060d1b);
    this.scene.fog = new THREE.FogExp2(0x071324, 0.022);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.72;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.25, 130);
    this.updateCameraFraming(width, height);

    const maxAniso = Math.min(
      cfg.anisotropyCap,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const texSize = cfg.pbrTexSize;

    // Generate Resolution-Tiered Procedural PBR Texture Sets
    const terrainPbr = createTerrainPbrMaps(maxAniso, texSize);
    const rockPbr = createRockPbrMaps(maxAniso, 2, texSize);
    const barkPbr = createBarkPbrMaps(maxAniso, texSize);
    const stonePbr = createCastleStonePbrMaps(maxAniso, texSize);
    const slatePbr = createCastleSlateRoofPbrMaps(maxAniso, Math.min(512, texSize) as 256 | 512);
    const timberPbr = createTimberPbrMaps(maxAniso, Math.min(512, texSize) as 256 | 512);
    this.pbrSets.push(terrainPbr, rockPbr, barkPbr, stonePbr, slatePbr, timberPbr);

    this.setupLighting(cfg);

    // Terrain, Rocks, Forest Vegetation, Water, and Rigged Hero Dragon
    const terrain = createSculptedTerrain(terrainPbr);
    terrain.receiveShadow = cfg.shadowsEnabled && !this.isSoftwareGl;
    this.scene.add(terrain);

    const shoreRocks = buildShoreBouldersAndPebbles(rockPbr);
    this.scene.add(shoreRocks);

    this.vegetation = buildForestVegetation(maxAniso, barkPbr, {
      texSize,
      envDensity: cfg.envDensity,
      lodBias: cfg.lodBias,
      shadowsEnabled: cfg.shadowsEnabled && !this.isSoftwareGl,
    });
    this.scene.add(this.vegetation.group);

    this.waterEnv = buildWaterAndEnvironment(maxAniso);
    this.scene.add(this.waterEnv.group);

    this.dragon = createOrientalDragon(maxAniso);
    this.scene.add(this.dragon.root);

    // Load Baked Binary .GLB Structures (or lightweight procedural vista on Potato)
    this.assetPipeline = new MenuAssetPipeline();
    void this.mountGlbStructures(
      { rockPbr, stonePbr, slatePbr, timberPbr },
      cfg,
    );

    this.syncPostProcessingPipeline(cfg, width, height);
    if (!this.isSoftwareGl && cfg.tier !== 'potato') {
      this.renderer.compile(this.scene, this.camera);
    }

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: true });
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.startLoop();
  }

  private async mountGlbStructures(
    bank: {
      rockPbr: PbrTextureSet;
      stonePbr: PbrTextureSet;
      slatePbr: PbrTextureSet;
      timberPbr: PbrTextureSet;
    },
    cfg: QualityConfig,
  ) {
    const { castle, cliffs, pedestal } = await this.assetPipeline.loadSanctuaryStructures(bank, {
      loadVistaGlbs: cfg.loadVistaGlbs,
      shadowsEnabled: cfg.shadowsEnabled && !this.isSoftwareGl,
    });
    if (this.disposed) return;

    const pedY = groundHeightAt(-4.35, 2.2) - 0.14;
    pedestal.position.set(-4.35, pedY, 2.2);
    this.scene.add(pedestal);
    this.dragon.root.position.set(-4.35, pedY + 0.08, 2.2);

    this.scene.add(cliffs);

    const castleY = groundHeightAt(7.8, -11.5) - 0.45;
    castle.position.set(7.8, castleY, -11.5);
    castle.rotation.y = -0.34;
    this.scene.add(castle);
  }

  private updateCameraFraming(width: number, height: number) {
    const aspect = width / Math.max(1, height);
    if (aspect < 0.95) {
      this.baseCamPos.set(-1.1, 4.65, 16.5);
      this.baseLookAt.set(-1.6, 2.85, -1.8);
    } else {
      this.baseCamPos.set(0.55, 4.15, 13.7);
      this.baseLookAt.set(-0.35, 2.75, -1.6);
    }
    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.baseLookAt);
  }

  private setupLighting(cfg: QualityConfig) {
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x0b2218, 0.88);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xffe7ba, 2.35);
    this.keyLight.position.set(-9, 19, 13);
    this.keyLight.castShadow = cfg.shadowsEnabled && !this.isSoftwareGl;
    const smSize = Math.max(512, cfg.shadowMapSize || 512);
    this.keyLight.shadow.mapSize.set(smSize, smSize);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 52;
    const d = 19;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.00045;
    this.keyLight.shadow.normalBias = 0.022;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(14, 12, -14);
    this.scene.add(rimLight);

    const dragonGlow = new THREE.PointLight(0xf59e0b, 3.8, 11, 1.7);
    dragonGlow.position.set(-3.8, 2.9, 3.6);
    this.scene.add(dragonGlow);

    const castleBeacon = new THREE.PointLight(0xfbbf24, 5.2, 16, 1.6);
    castleBeacon.position.set(7.4, 7.6, -9.8);
    this.scene.add(castleBeacon);
  }

  private syncPostProcessingPipeline(cfg: QualityConfig, width: number, height: number) {
    const shouldCompose = !this.isSoftwareGl && cfg.postMode !== 'none';
    if (!shouldCompose) {
      if (this.composer) {
        this.composer.dispose();
        this.composer = null;
        this.bokehPass = null;
        this.vignettePass = null;
        this.fxaaPass = null;
      }
      return;
    }

    if (!this.composer) {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus: 11.4,
        aperture: 0.00014,
        maxblur: 0.0042,
      });
      this.vignettePass = new ShaderPass(CinematicVignetteShader);
      const outputPass = new OutputPass();
      this.fxaaPass = new FXAAPass();

      this.composer.addPass(renderPass);
      this.composer.addPass(this.bokehPass);
      this.composer.addPass(this.vignettePass);
      this.composer.addPass(outputPass);
      this.composer.addPass(this.fxaaPass);
    }

    if (this.bokehPass) {
      this.bokehPass.enabled = cfg.postMode !== 'fxaa';
    }
    this.composer.setPixelRatio(this.perf.getEffectivePixelRatio());
    this.composer.setSize(width, height);
    if (this.fxaaPass) {
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / Math.max(1, width * pr),
        1 / Math.max(1, height * pr),
      );
    }
  }

  private applyActiveQuality() {
    if (this.disposed) return;
    const cfg = this.perf.getQualityConfig();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer.setPixelRatio(this.perf.getEffectivePixelRatio());
    this.renderer.setSize(width, height);

    const shadows = cfg.shadowsEnabled && !this.isSoftwareGl;
    this.renderer.shadowMap.enabled = shadows;
    this.keyLight.castShadow = shadows;
    if (shadows && cfg.shadowMapSize > 0) {
      if (this.keyLight.shadow.mapSize.width !== cfg.shadowMapSize) {
        this.keyLight.shadow.mapSize.set(cfg.shadowMapSize, cfg.shadowMapSize);
        if (this.keyLight.shadow.map) {
          this.keyLight.shadow.map.dispose();
          this.keyLight.shadow.map = null;
        }
      }
    }

    this.vegetation.applyQualityOptions({
      envDensity: cfg.envDensity,
      lodBias: cfg.lodBias,
      shadowsEnabled: shadows,
    });
    applyLodBiasToGroup(this.scene, cfg.lodBias);
    this.syncPostProcessingPipeline(cfg, width, height);
  }

  public setGraphicsPreferences(prefs: GraphicsPreferences) {
    const { changed } = this.perf.setPreset(prefs.preset, prefs.autoAdjust);
    if (changed) {
      this.applyActiveQuality();
    }
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

  private handleVisibilityChange = () => {
    this.paused = document.hidden;
    if (!this.paused) {
      this.clock.getDelta();
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    this.pointerNorm.x = (e.clientX / w - 0.5) * 2;
    this.pointerNorm.y = (e.clientY / h - 0.5) * 2;
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.perf.getEffectivePixelRatio());
    this.renderer.setSize(width, height);
    this.updateCameraFraming(width, height);

    if (this.composer) {
      this.composer.setPixelRatio(this.perf.getEffectivePixelRatio());
      this.composer.setSize(width, height);
    }
    if (this.fxaaPass) {
      const pr = this.renderer.getPixelRatio();
      this.fxaaPass.material.uniforms['resolution'].value.set(
        1 / Math.max(1, width * pr),
        1 / Math.max(1, height * pr),
      );
    }
  };

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
        this.composer.render();
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
    this.dragon.update(elapsed, dt);
    this.vegetation.updateWind(elapsed);
    this.waterEnv.update(elapsed);

    const targetCamX = this.baseCamPos.x + this.pointerNorm.x * 0.62;
    const targetCamY = this.baseCamPos.y - this.pointerNorm.y * 0.34;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 3.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 3.5, dt);
    this.camera.lookAt(this.baseLookAt);

    if (this.bokehPass && this.bokehPass.enabled) {
      const uniforms = this.bokehPass.uniforms as Record<string, { value: number }>;
      if (uniforms.focus) {
        uniforms.focus.value = this.camera.position.distanceTo(this.dragon.headFocusTarget);
      }
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointermove', this.handlePointerMove);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.assetPipeline.dispose();
    this.dragon.dispose();
    this.vegetation.dispose();
    this.waterEnv.dispose();
    this.pbrSets.forEach(disposePbrTextureSet);
    this.envMap.dispose();
    this.composer?.dispose();

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
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
