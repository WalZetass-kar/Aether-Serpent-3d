import * as THREE from 'three';
import {
  QUALITY_PRESETS,
  TIER_ORDER,
  type QualityConfig,
  type QualityPresetId,
  type ResolvedQualityTier,
} from './qualityPresets';

export interface DeviceCapabilitiesReport {
  isSoftwareGl: boolean;
  gpuRenderer: string;
  maxTextureSize: number;
  maxAnisotropy: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  deviceMemoryGb: number | null;
  compressedFormats: string[];
  benchmarkScoreMs: number;
  recommendedTier: ResolvedQualityTier;
}

export interface LivePerfTelemetry {
  fps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  activeObjects: number;
  estimatedTextureMb: number;
  jsHeapUsedMb: number | null;
  presetSelected: QualityPresetId;
  resolvedTier: ResolvedQualityTier;
  resScale: number;
  renderWidth: number;
  renderHeight: number;
  autoAdjustedStep: number;
  gpuSummary: string;
  isSoftwareGl: boolean;
}

export interface BenchmarkSummary {
  tier: ResolvedQualityTier;
  durationMs: number;
  frames: number;
  avgFps: number;
  avgFrameMs: number;
  p95FrameMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  resScale: number;
}

const FRAME_WINDOW = 60;
let cachedProbe: DeviceCapabilitiesReport | null = null;

/**
 * Evaluates WebGL2 hardware limits, GPU renderer string safely, compressed texture extensions,
 * RAM/cores, and runs an actual short GPU + CPU micro-benchmark probe (never relying solely on UA).
 */
export function probeDeviceCapabilities(): DeviceCapabilitiesReport {
  if (cachedProbe) return cachedProbe;

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const devMem =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) || null
      : null;

  let isSoftwareGl = false;
  let gpuRenderer = 'WebGL2 Hardware';
  let maxTextureSize = 4096;
  let maxAnisotropy = 4;
  const compressedFormats: string[] = [];
  let benchMs = 4.0;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      isSoftwareGl = true;
      gpuRenderer = 'No WebGL2 Fallback';
      maxTextureSize = 2048;
      maxAnisotropy = 1;
      benchMs = 42;
    } else {
      const extDbg = gl.getExtension('WEBGL_debug_renderer_info');
      const param = extDbg ? extDbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      gpuRenderer = String(gl.getParameter(param) || 'WebGL2 Device');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render|WARP/i.test(gpuRenderer);

      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 4096;
      const extAniso = gl.getExtension('EXT_texture_filter_anisotropic');
      if (extAniso) {
        maxAnisotropy = Number(gl.getParameter(extAniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) || 4;
      }

      if (gl.getExtension('WEBGL_compressed_texture_s3tc')) compressedFormats.push('DXT/S3TC');
      if (gl.getExtension('WEBGL_compressed_texture_etc')) compressedFormats.push('ETC2');
      if (gl.getExtension('WEBGL_compressed_texture_astc')) compressedFormats.push('ASTC');
      if (gl.getExtension('EXT_texture_compression_bptc')) compressedFormats.push('BPTC');

      // Micro-benchmark: measure WebGL shader + clear/draw/finish + 2D procedural texture ops
      const vsSrc = `#version 300 es
        in vec2 p;
        void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
      const fsSrc = `#version 300 es
        precision mediump float;
        out vec4 o;
        void main(){
          vec2 c = gl_FragCoord.xy * 0.02;
          float v = sin(c.x * 3.1) * cos(c.y * 2.7) + sin(length(c) * 4.0);
          o = vec4(v * 0.5 + 0.5, 0.4, 0.7, 1.0);
        }`;
      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, vsSrc);
      gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fsSrc);
      gl.compileShader(fs);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      // Warm up 1 pass then time 8 fillrate passes + CPU noise workload
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.finish();

      const t0 = performance.now();
      for (let k = 0; k < 8; k++) {
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      // Small CPU procedural FBM stress mimicking texture bake cost
      let acc = 0;
      for (let i = 0; i < 6000; i++) {
        acc += Math.sin(i * 0.13) * Math.cos(i * 0.07);
      }
      if (acc === 999999) benchMs += 0.001;
      gl.finish();
      benchMs = Math.max(0.2, performance.now() - t0);

      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    isSoftwareGl = true;
    gpuRenderer = 'Restricted WebGL2';
    benchMs = 35;
  }

  let recommendedTier: ResolvedQualityTier = 'medium';
  if (isSoftwareGl || maxTextureSize <= 2048 || benchMs > 28) {
    recommendedTier = 'potato';
  } else if (benchMs > 12 || (devMem !== null && devMem <= 2) || cores <= 2) {
    recommendedTier = 'low';
  } else if (
    benchMs < 3.2 &&
    maxTextureSize >= 8192 &&
    cores >= 6 &&
    (devMem === null || devMem >= 8) &&
    !/Intel.*UHD|Mali-G5|Adreno\s*5|Apple\s*A1[0-2]/i.test(gpuRenderer)
  ) {
    recommendedTier = benchMs < 1.6 && maxAnisotropy >= 8 ? 'ultra' : 'high';
  } else if (benchMs < 6.0 && maxTextureSize >= 4096) {
    recommendedTier = 'medium';
  } else {
    recommendedTier = 'low';
  }

  cachedProbe = {
    isSoftwareGl,
    gpuRenderer,
    maxTextureSize,
    maxAnisotropy,
    devicePixelRatio: dpr,
    hardwareConcurrency: cores,
    deviceMemoryGb: devMem,
    compressedFormats,
    benchmarkScoreMs: Number(benchMs.toFixed(2)),
    recommendedTier,
  };
  return cachedProbe;
}

export function resolvePresetTier(
  preset: QualityPresetId,
  caps: DeviceCapabilitiesReport,
): ResolvedQualityTier {
  if (preset === 'auto') return caps.recommendedTier;
  return preset;
}

export class AdaptivePerformanceManager {
  public readonly capabilities: DeviceCapabilitiesReport;
  private presetSelected: QualityPresetId;
  private baseTier: ResolvedQualityTier;
  private effectiveTier: ResolvedQualityTier;
  private autoAdjust: boolean;

  private resScale: number;
  private autoStep = 0; // 0 = baseline; negative = downgraded steps
  private frameTimes = new Float32Array(FRAME_WINDOW);
  private sortedScratch = new Float32Array(FRAME_WINDOW);
  private frameCount = 0;
  private frameIndex = 0;

  private lowFpsAccumSec = 0;
  private highHeadroomAccumSec = 0;
  private cooldownSec = 0;

  private benchActive = false;
  private benchStartMs = 0;
  private benchDurationMs = 3000;
  private benchFrames = 0;
  private benchTimes: number[] = [];
  private benchResolve: ((summary: BenchmarkSummary) => void) | null = null;

  constructor(preset: QualityPresetId = 'auto', autoAdjust = true) {
    this.capabilities = probeDeviceCapabilities();
    this.presetSelected = preset;
    this.autoAdjust = autoAdjust;
    this.baseTier = resolvePresetTier(preset, this.capabilities);
    this.effectiveTier = this.baseTier;
    this.resScale = QUALITY_PRESETS[this.effectiveTier].defaultResScale;
  }

  public getQualityConfig(): QualityConfig {
    return QUALITY_PRESETS[this.effectiveTier];
  }

  public getResolutionScale(): number {
    return this.resScale;
  }

  public getEffectivePixelRatio(): number {
    if (this.capabilities.isSoftwareGl) return 1;
    const baseDpr = Math.min(this.capabilities.devicePixelRatio || 1, 2);
    return THREE.MathUtils.clamp(baseDpr * this.resScale, 0.9, 2.0);
  }

  public setPreset(preset: QualityPresetId, autoAdjust: boolean): { changed: boolean } {
    const prevTier = this.effectiveTier;
    const prevRes = this.resScale;
    this.presetSelected = preset;
    this.autoAdjust = autoAdjust;
    this.baseTier = resolvePresetTier(preset, this.capabilities);
    this.effectiveTier = this.baseTier;
    this.autoStep = 0;
    this.resScale = QUALITY_PRESETS[this.effectiveTier].defaultResScale;
    this.lowFpsAccumSec = 0;
    this.highHeadroomAccumSec = 0;
    this.cooldownSec = 2.0;

    return {
      changed: prevTier !== this.effectiveTier || Math.abs(prevRes - this.resScale) > 0.01,
    };
  }

  /**
   * Feeds actual frame time (in seconds) every rendered frame with zero heap allocations.
   * Returns `{ qualityChanged, resChanged }` when hysteresis triggers a smooth adjustment.
   */
  public recordFrame(
    dtSec: number,
    renderer?: THREE.WebGLRenderer,
  ): { qualityChanged: boolean; resChanged: boolean } {
    if (dtSec <= 0.0001) {
      return { qualityChanged: false, resChanged: false };
    }
    const frameMs = THREE.MathUtils.clamp(dtSec * 1000, 1, 250);
    this.frameTimes[this.frameIndex] = frameMs;
    this.frameIndex = (this.frameIndex + 1) % FRAME_WINDOW;
    if (this.frameCount < FRAME_WINDOW) this.frameCount++;

    if (this.benchActive) {
      this.benchFrames++;
      this.benchTimes.push(frameMs);
      const elapsed = performance.now() - this.benchStartMs;
      if (elapsed >= this.benchDurationMs && this.benchResolve) {
        const sorted = [...this.benchTimes].sort((a, b) => a - b);
        const avgMs = sorted.reduce((s, v) => s + v, 0) / Math.max(1, sorted.length);
        const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || avgMs;
        const summary: BenchmarkSummary = {
          tier: this.effectiveTier,
          durationMs: Math.round(elapsed),
          frames: this.benchFrames,
          avgFps: Number((1000 / Math.max(1, avgMs)).toFixed(1)),
          avgFrameMs: Number(avgMs.toFixed(2)),
          p95FrameMs: Number(p95.toFixed(2)),
          drawCalls: renderer?.info.render.calls ?? 0,
          triangles: renderer?.info.render.triangles ?? 0,
          textures: renderer?.info.memory.textures ?? 0,
          resScale: Number(this.resScale.toFixed(2)),
        };
        const res = this.benchResolve;
        this.benchActive = false;
        this.benchResolve = null;
        this.benchTimes = [];
        res(summary);
      }
    }

    if (!this.autoAdjust || this.capabilities.isSoftwareGl || this.frameCount < 24) {
      return { qualityChanged: false, resChanged: false };
    }

    if (this.cooldownSec > 0) {
      this.cooldownSec -= dtSec;
      return { qualityChanged: false, resChanged: false };
    }

    const avgMs = this.computeAvgFrameMs();
    const cfg = QUALITY_PRESETS[this.effectiveTier];
    const targetMs = 1000 / cfg.targetFps;

    // Consistent FPS drop: frame time > 1.32x target budget for >= 2.2s
    if (avgMs > targetMs * 1.32) {
      this.highHeadroomAccumSec = 0;
      this.lowFpsAccumSec += dtSec;
      if (this.lowFpsAccumSec >= 2.2) {
        this.lowFpsAccumSec = 0;
        this.cooldownSec = 4.5;
        return this.stepDown();
      }
    } else if (avgMs < targetMs * 0.68 && (this.autoStep < 0 || this.resScale < cfg.defaultResScale)) {
      // Hysteresis: sustained headroom for >= 8.0s before stepping back up
      this.lowFpsAccumSec = 0;
      this.highHeadroomAccumSec += dtSec;
      if (this.highHeadroomAccumSec >= 8.0) {
        this.highHeadroomAccumSec = 0;
        this.cooldownSec = 6.0;
        return this.stepUp();
      }
    } else {
      this.lowFpsAccumSec = Math.max(0, this.lowFpsAccumSec - dtSec * 0.5);
      this.highHeadroomAccumSec = Math.max(0, this.highHeadroomAccumSec - dtSec * 0.5);
    }

    return { qualityChanged: false, resChanged: false };
  }

  private stepDown(): { qualityChanged: boolean; resChanged: boolean } {
    const cfg = QUALITY_PRESETS[this.effectiveTier];
    // 1. Reduce dynamic render resolution first
    if (this.resScale - 0.08 >= cfg.minResScale) {
      this.resScale = Number(Math.max(cfg.minResScale, this.resScale - 0.08).toFixed(2));
      this.autoStep--;
      return { qualityChanged: false, resChanged: true };
    }

    // 2. Drop to lower tier (disables shadows/post/particles/LOD progressively)
    const idx = TIER_ORDER.indexOf(this.effectiveTier);
    if (idx > 0) {
      this.effectiveTier = TIER_ORDER[idx - 1];
      this.resScale = QUALITY_PRESETS[this.effectiveTier].defaultResScale;
      this.autoStep--;
      return { qualityChanged: true, resChanged: true };
    }

    return { qualityChanged: false, resChanged: false };
  }

  private stepUp(): { qualityChanged: boolean; resChanged: boolean } {
    const baseIdx = TIER_ORDER.indexOf(this.baseTier);
    const curIdx = TIER_ORDER.indexOf(this.effectiveTier);
    const cfg = QUALITY_PRESETS[this.effectiveTier];

    if (this.resScale + 0.06 <= cfg.defaultResScale) {
      this.resScale = Number(Math.min(cfg.defaultResScale, this.resScale + 0.06).toFixed(2));
      this.autoStep = Math.min(0, this.autoStep + 1);
      return { qualityChanged: false, resChanged: true };
    }

    if (curIdx < baseIdx) {
      this.effectiveTier = TIER_ORDER[curIdx + 1];
      this.resScale = QUALITY_PRESETS[this.effectiveTier].minResScale;
      this.autoStep = Math.min(0, this.autoStep + 1);
      return { qualityChanged: true, resChanged: true };
    }

    return { qualityChanged: false, resChanged: false };
  }

  public startBenchmark(durationMs = 3000): Promise<BenchmarkSummary> {
    this.benchActive = true;
    this.benchStartMs = performance.now();
    this.benchDurationMs = durationMs;
    this.benchFrames = 0;
    this.benchTimes = [];
    return new Promise((resolve) => {
      this.benchResolve = resolve;
    });
  }

  private computeAvgFrameMs(): number {
    if (this.frameCount === 0) return 16.67;
    let sum = 0;
    for (let i = 0; i < this.frameCount; i++) {
      sum += this.frameTimes[i];
    }
    return sum / this.frameCount;
  }

  public getTelemetry(
    renderer: THREE.WebGLRenderer,
    activeObjects: number,
  ): LivePerfTelemetry {
    const count = this.frameCount;
    const avgMs = this.computeAvgFrameMs();
    let p95 = avgMs;
    if (count > 0) {
      for (let i = 0; i < count; i++) this.sortedScratch[i] = this.frameTimes[i];
      const view = this.sortedScratch.subarray(0, count);
      view.sort();
      p95 = view[Math.min(count - 1, Math.floor(count * 0.95))];
    }

    const perfMem =
      typeof performance !== 'undefined' &&
      'memory' in performance &&
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ? Math.round(
            ((performance as Performance & { memory: { usedJSHeapSize: number } }).memory
              .usedJSHeapSize /
              (1024 * 1024)) *
              10,
          ) / 10
        : null;

    const texCount = renderer.info.memory.textures;
    const cfg = QUALITY_PRESETS[this.effectiveTier];
    // Rough VRAM estimation per mipmapped RGBA texture set based on current tier resolution
    const avgTexDim = cfg.pbrTexSize;
    const estTexMb = Number(
      ((texCount * avgTexDim * avgTexDim * 4 * 1.33) / (1024 * 1024)).toFixed(1),
    );

    const canvas = renderer.domElement;
    return {
      fps: Math.round(1000 / Math.max(1, avgMs)),
      avgFrameMs: Number(avgMs.toFixed(1)),
      p95FrameMs: Number(p95.toFixed(1)),
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: texCount,
      programs: renderer.info.programs?.length ?? 0,
      activeObjects,
      estimatedTextureMb: estTexMb,
      jsHeapUsedMb: perfMem,
      presetSelected: this.presetSelected,
      resolvedTier: this.effectiveTier,
      resScale: Number(this.resScale.toFixed(2)),
      renderWidth: canvas.width,
      renderHeight: canvas.height,
      autoAdjustedStep: this.autoStep,
      gpuSummary: this.capabilities.gpuRenderer,
      isSoftwareGl: this.capabilities.isSoftwareGl,
    };
  }
}
