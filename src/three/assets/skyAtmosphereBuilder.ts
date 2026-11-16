import * as THREE from 'three';
import type { BoardConfig, BoardThemeId, SkyPresetStyle } from '../../../shared/boardThemes';
import type { QualityConfig } from '../perf/qualityPresets';

export type SkyTimeOfDay = 'day' | 'sunset' | 'night';

export interface SkyThemeSpec {
  mode: SkyTimeOfDay;
  label: string;
  topColor: number;
  midColor: number;
  horizonColor: number;
  auroraTint: number;
  auroraStrength: number;
  milkyWayStrength: number;
  sunColor: number;
  sunCoronaColor: number;
  sunElevation: number;
  sunAzimuth: number;
  moonColor: number;
  moonGlowColor: number;
  moonElevation: number;
  moonAzimuth: number;
  cloudColor: number;
  cloudOpacity: number;
  birdColor: number;
  shootingStarColor: number;
  rainbowEnabled: boolean;
  fogColor: number;
  bgColor: number;
  hemiSky: number;
  hemiGround: number;
  keyColor: number;
  rimColor: number;
  keyIntensity: number;
  hemiIntensity: number;
}

export interface SkyAtmosphereHandle {
  group: THREE.Group;
  update: (elapsed: number, reducedEffects: boolean) => void;
  updateSkyConfig: (boardConfig?: BoardConfig) => void;
  dispose: () => void;
}

// Pre-allocated scratch objects (zero GC inside animation loop)
const _vec3 = new THREE.Vector3();
const _vec3Next = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _wingQuat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _color = new THREE.Color();

export function getSkyThemeSpec(
  skyPreset: SkyPresetStyle = 'twilight_forest',
  themeId: BoardThemeId = 'enchanted_forest',
): SkyThemeSpec {
  switch (skyPreset) {
    case 'volcanic_ash':
      return {
        mode: 'night',
        label: 'Malam Vulkanik Kaldera',
        topColor: 0x070205,
        midColor: 0x24090c,
        horizonColor: 0x6e1f10,
        auroraTint: 0xf97316,
        auroraStrength: 0.14,
        milkyWayStrength: 0.35,
        sunColor: 0xfb923c,
        sunCoronaColor: 0xea580c,
        sunElevation: 0.25,
        sunAzimuth: -0.6,
        moonColor: 0xfca5a5,
        moonGlowColor: 0xef4444,
        moonElevation: 0.56,
        moonAzimuth: -0.52,
        cloudColor: 0x3b1b19,
        cloudOpacity: 0.72,
        birdColor: 0x1c1917,
        shootingStarColor: 0xfdba74,
        rainbowEnabled: false,
        fogColor: 0x2d0f0c,
        bgColor: 0x120506,
        hemiSky: 0xfb923c,
        hemiGround: 0x2e0b0a,
        keyColor: 0xffedd5,
        rimColor: 0xef4444,
        keyIntensity: 2.1,
        hemiIntensity: 0.9,
      };
    case 'aurora_frost':
      return {
        mode: 'day',
        label: 'Siang Kutub Kristal',
        topColor: 0x1e66cc,
        midColor: 0x69bbf5,
        horizonColor: 0xdaf2ff,
        auroraTint: 0x38bdf8,
        auroraStrength: 0.0,
        milkyWayStrength: 0.0,
        sunColor: 0xfffbeb,
        sunCoronaColor: 0xbae6fd,
        sunElevation: 0.54,
        sunAzimuth: 0.42,
        moonColor: 0xe0f2fe,
        moonGlowColor: 0x38bdf8,
        moonElevation: 0.55,
        moonAzimuth: -0.4,
        cloudColor: 0xf8fcff,
        cloudOpacity: 0.88,
        birdColor: 0xe2e8f0,
        shootingStarColor: 0x7dd3fc,
        rainbowEnabled: false,
        fogColor: 0x9bd3f2,
        bgColor: 0x5caae3,
        hemiSky: 0xe0f2fe,
        hemiGround: 0x3b5c7d,
        keyColor: 0xffffff,
        rimColor: 0x7dd3fc,
        keyIntensity: 2.6,
        hemiIntensity: 1.12,
      };
    case 'golden_mirage':
      return {
        mode: 'day',
        label: 'Siang Terik Gurun Emas',
        topColor: 0x1d6ec9,
        midColor: 0x67b3e6,
        horizonColor: 0xf9e2b4,
        auroraTint: 0xfbbf24,
        auroraStrength: 0.0,
        milkyWayStrength: 0.0,
        sunColor: 0xfff3c4,
        sunCoronaColor: 0xfbbf24,
        sunElevation: 0.62,
        sunAzimuth: -0.35,
        moonColor: 0xfef08a,
        moonGlowColor: 0xf59e0b,
        moonElevation: 0.52,
        moonAzimuth: 0.4,
        cloudColor: 0xfff7e6,
        cloudOpacity: 0.82,
        birdColor: 0x451a03,
        shootingStarColor: 0xfef08a,
        rainbowEnabled: false,
        fogColor: 0xe3be86,
        bgColor: 0x76b8e3,
        hemiSky: 0xfef3c7,
        hemiGround: 0x784820,
        keyColor: 0xfff7db,
        rimColor: 0xf59e0b,
        keyIntensity: 2.7,
        hemiIntensity: 1.15,
      };
    case 'abyssal_sea':
      return {
        mode: 'night',
        label: 'Malam Samudra Bintang',
        topColor: 0x020a18,
        midColor: 0x062542,
        horizonColor: 0x0f5670,
        auroraTint: 0x22d3ee,
        auroraStrength: 0.28,
        milkyWayStrength: 0.45,
        sunColor: 0xfef3c7,
        sunCoronaColor: 0x38bdf8,
        sunElevation: 0.45,
        sunAzimuth: 0.35,
        moonColor: 0xdff9ff,
        moonGlowColor: 0x22d3ee,
        moonElevation: 0.54,
        moonAzimuth: 0.46,
        cloudColor: 0x1b4560,
        cloudOpacity: 0.58,
        birdColor: 0x99f6e4,
        shootingStarColor: 0x67e8f9,
        rainbowEnabled: false,
        fogColor: 0x08344a,
        bgColor: 0x031724,
        hemiSky: 0x67e8f9,
        hemiGround: 0x083344,
        keyColor: 0xe0fbff,
        rimColor: 0x06b6d4,
        keyIntensity: 2.15,
        hemiIntensity: 0.94,
      };
    case 'eclipse_void':
      return {
        mode: 'night',
        label: 'Malam Berbintang Gerhana',
        topColor: 0x040212,
        midColor: 0x150936,
        horizonColor: 0x341661,
        auroraTint: 0xa855f7,
        auroraStrength: 0.22,
        milkyWayStrength: 0.6,
        sunColor: 0xe9d5ff,
        sunCoronaColor: 0x9333ea,
        sunElevation: 0.45,
        sunAzimuth: -0.45,
        moonColor: 0xf3e8ff,
        moonGlowColor: 0xc084fc,
        moonElevation: 0.58,
        moonAzimuth: -0.48,
        cloudColor: 0x2a1b47,
        cloudOpacity: 0.56,
        birdColor: 0xd8b4fe,
        shootingStarColor: 0xe9d5ff,
        rainbowEnabled: false,
        fogColor: 0x1c0b33,
        bgColor: 0x0a0417,
        hemiSky: 0xc084fc,
        hemiGround: 0x1e1035,
        keyColor: 0xf3e8ff,
        rimColor: 0x9333ea,
        keyIntensity: 2.05,
        hemiIntensity: 0.88,
      };
    case 'astral_dawn':
      return {
        mode: 'day',
        label: 'Siang Cakrawala Surgawi',
        topColor: 0x2462d9,
        midColor: 0x70b4fa,
        horizonColor: 0xfef0cf,
        auroraTint: 0xfef08a,
        auroraStrength: 0.0,
        milkyWayStrength: 0.0,
        sunColor: 0xfff8d6,
        sunCoronaColor: 0xfde047,
        sunElevation: 0.56,
        sunAzimuth: 0.34,
        moonColor: 0xe0f2fe,
        moonGlowColor: 0x93c5fd,
        moonElevation: 0.55,
        moonAzimuth: -0.34,
        cloudColor: 0xffffff,
        cloudOpacity: 0.9,
        birdColor: 0xfef3c7,
        shootingStarColor: 0xfef08a,
        rainbowEnabled: true,
        fogColor: 0xb9d7f5,
        bgColor: 0x67aaf5,
        hemiSky: 0xfef3c7,
        hemiGround: 0x3b4d7a,
        keyColor: 0xfffbeb,
        rimColor: 0x60a5fa,
        keyIntensity: 2.65,
        hemiIntensity: 1.14,
      };
    case 'temple_sunset':
      return {
        mode: 'sunset',
        label: 'Senja Keemasan Kuil',
        topColor: 0x1d2b57,
        midColor: 0x9e4b36,
        horizonColor: 0xf59d3d,
        auroraTint: 0xf59e0b,
        auroraStrength: 0.0,
        milkyWayStrength: 0.14,
        sunColor: 0xffd27d,
        sunCoronaColor: 0xf97316,
        sunElevation: 0.23,
        sunAzimuth: -0.58,
        moonColor: 0xfef3c7,
        moonGlowColor: 0xf59e0b,
        moonElevation: 0.5,
        moonAzimuth: 0.5,
        cloudColor: 0xfdba8c,
        cloudOpacity: 0.82,
        birdColor: 0x291a12,
        shootingStarColor: 0xfde68a,
        rainbowEnabled: false,
        fogColor: 0x78432b,
        bgColor: 0x45261e,
        hemiSky: 0xfcd34d,
        hemiGround: 0x26382b,
        keyColor: 0xffe4b5,
        rimColor: 0xf59e0b,
        keyIntensity: 2.35,
        hemiIntensity: 1.0,
      };
    case 'radiant_day':
      return {
        mode: 'day',
        label: 'Siang Cerah (Matahari & Awan)',
        topColor: 0x1970db,
        midColor: 0x5ab7fa,
        horizonColor: 0xd0effc,
        auroraTint: 0xffffff,
        auroraStrength: 0.0,
        milkyWayStrength: 0.0,
        sunColor: 0xfff8d6,
        sunCoronaColor: 0xfde047,
        sunElevation: 0.58,
        sunAzimuth: 0.38,
        moonColor: 0xf1f5f9,
        moonGlowColor: 0x93c5fd,
        moonElevation: 0.55,
        moonAzimuth: -0.35,
        cloudColor: 0xffffff,
        cloudOpacity: 0.9,
        birdColor: 0x1e293b,
        shootingStarColor: 0xffffff,
        rainbowEnabled: true,
        fogColor: 0x9dd5f0,
        bgColor: 0x56ace8,
        hemiSky: 0xe0f2fe,
        hemiGround: 0x2f4d3b,
        keyColor: 0xfff7dc,
        rimColor: 0x93c5fd,
        keyIntensity: 2.65,
        hemiIntensity: 1.16,
      };
    case 'starlit_night':
      return {
        mode: 'night',
        label: 'Malam Berbintang (Bulan & Bintang Jatuh)',
        topColor: 0x020617,
        midColor: 0x0b1738,
        horizonColor: 0x1b3461,
        auroraTint: 0x38bdf8,
        auroraStrength: 0.24,
        milkyWayStrength: 0.68,
        sunColor: 0xfff7dc,
        sunCoronaColor: 0xfbbf24,
        sunElevation: 0.5,
        sunAzimuth: 0.35,
        moonColor: 0xf8fafc,
        moonGlowColor: 0x93c5fd,
        moonElevation: 0.56,
        moonAzimuth: -0.42,
        cloudColor: 0x1e293b,
        cloudOpacity: 0.54,
        birdColor: 0xcbd5e1,
        shootingStarColor: 0xfef9c3,
        rainbowEnabled: false,
        fogColor: 0x0f1f3d,
        bgColor: 0x050b1c,
        hemiSky: 0x93c5fd,
        hemiGround: 0x0f172a,
        keyColor: 0xe2e8f0,
        rimColor: 0x60a5fa,
        keyIntensity: 2.1,
        hemiIntensity: 0.9,
      };
    case 'twilight_forest':
    default: {
      // Enchanted Forest & lush themes shine in crisp sunlit sanctuary daylight
      const isWarmTheme = themeId === 'ancient_temple' || themeId === 'lost_desert';
      return {
        mode: 'day',
        label: 'Siang Cerah Lembah Zamrud',
        topColor: 0x1a6ed6,
        midColor: 0x5eb8f7,
        horizonColor: isWarmTheme ? 0xe5ebd2 : 0xc3e9fb,
        auroraTint: 0x34d399,
        auroraStrength: 0.0,
        milkyWayStrength: 0.0,
        sunColor: 0xfff6cf,
        sunCoronaColor: 0xfde047,
        sunElevation: 0.55,
        sunAzimuth: 0.42,
        moonColor: 0xf1f5f9,
        moonGlowColor: 0x93c5fd,
        moonElevation: 0.56,
        moonAzimuth: -0.4,
        cloudColor: 0xffffff,
        cloudOpacity: 0.89,
        birdColor: 0x1e293b,
        shootingStarColor: 0xfef08a,
        rainbowEnabled: true,
        fogColor: 0x96d0ea,
        bgColor: 0x58ace6,
        hemiSky: 0xdbeafe,
        hemiGround: 0x26422c,
        keyColor: 0xfff5db,
        rimColor: 0x7dd3fc,
        keyIntensity: 2.6,
        hemiIntensity: 1.15,
      };
    }
  }
}

function createProceduralMoonTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size * 0.42, size * 0.38, 10, size * 0.5, size * 0.5, size * 0.56);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#e2e8f0');
  grad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle lunar maria basins
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 16; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 16 + rand() * 34;
    const mGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
    mGrad.addColorStop(0, 'rgba(100, 116, 139, 0.32)');
    mGrad.addColorStop(1, 'rgba(100, 116, 139, 0)');
    ctx.fillStyle = mGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Lunar impact craters
  for (let i = 0; i < 48; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 3 + rand() * 11;
    ctx.fillStyle = 'rgba(71, 85, 105, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx - 1, cy - 1, r, -Math.PI * 0.8, Math.PI * 0.2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createRadialGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1.0)');
  g.addColorStop(0.24, 'rgba(255,255,255,0.68)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.20)');
  g.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function directionFromElevAzim(elevation: number, azimuth: number, radius: number, out: THREE.Vector3) {
  const cosEl = Math.cos(elevation);
  out.set(
    Math.sin(azimuth) * cosEl * radius,
    Math.sin(elevation) * radius,
    -Math.cos(azimuth) * cosEl * radius,
  );
  return out;
}

export function buildSkyAtmosphere(
  quality: QualityConfig,
  boardConfig?: BoardConfig,
): SkyAtmosphereHandle {
  const group = new THREE.Group();
  group.name = 'DynamicSkyAtmosphere';

  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];
  const disposableTexs: THREE.Texture[] = [];

  let activeSpec = getSkyThemeSpec(
    boardConfig?.environmentConfig.skyPreset ?? 'twilight_forest',
    boardConfig?.themeId ?? 'enchanted_forest',
  );
  let activeShowWaterfall = boardConfig?.environmentConfig.showWaterfall ?? true;

  const moonTex = createProceduralMoonTexture();
  const glowTex = createRadialGlowTexture();
  disposableTexs.push(moonTex, glowTex);

  // ---------------------------------------------------------------------------
  // 1. Atmospheric Sky Dome Shader (Day Scatter / Sunset Warmth / Night Milky Way + Aurora)
  // ---------------------------------------------------------------------------
  const skyGeo = new THREE.SphereGeometry(
    94,
    quality.tier === 'potato' ? 20 : 34,
    quality.tier === 'potato' ? 14 : 22,
  );
  const sunDirInitial = directionFromElevAzim(activeSpec.sunElevation, activeSpec.sunAzimuth, 1, new THREE.Vector3());

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uTopColor: { value: new THREE.Color(activeSpec.topColor) },
      uMidColor: { value: new THREE.Color(activeSpec.midColor) },
      uHorizonColor: { value: new THREE.Color(activeSpec.horizonColor) },
      uSunColor: { value: new THREE.Color(activeSpec.sunCoronaColor) },
      uSunDir: { value: sunDirInitial.clone() },
      uDayFactor: { value: activeSpec.mode === 'night' ? 0 : 1 },
      uNightFactor: { value: activeSpec.mode === 'night' ? 1 : activeSpec.mode === 'sunset' ? 0.25 : 0 },
      uMilkyWay: { value: activeSpec.milkyWayStrength },
      uAuroraTint: { value: new THREE.Color(activeSpec.auroraTint) },
      uAuroraStrength: { value: activeSpec.auroraStrength },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform float uDayFactor;
      uniform float uNightFactor;
      uniform float uMilkyWay;
      uniform vec3 uAuroraTint;
      uniform float uAuroraStrength;
      varying vec3 vDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float valueNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = clamp(dir.y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.26, h));
        col = mix(col, uTopColor, smoothstep(0.24, 0.86, h));

        // Daytime & Sunset atmospheric sun scatter
        if (uDayFactor > 0.01) {
          float sunAlign = max(0.0, dot(dir, normalize(uSunDir)));
          float halo = pow(sunAlign, 8.0) * 0.34 + pow(sunAlign, 44.0) * 0.45;
          col += uSunColor * halo * uDayFactor;
        }

        // Nighttime Milky Way ribbon & subtle aurora waves
        if (uNightFactor > 0.01) {
          float bandCoord = dir.x * 0.62 - dir.y * 0.55 + dir.z * 0.35;
          float band = exp(-bandCoord * bandCoord * 14.0) * smoothstep(0.06, 0.42, h);
          vec2 nUv = vec2(atan(dir.z, dir.x) * 3.0, dir.y * 6.0);
          float dust = valueNoise(nUv * 2.2) * 0.6 + valueNoise(nUv * 5.0) * 0.4;
          col += mix(uMidColor, vec3(0.55, 0.68, 0.96), 0.5) * band * dust * uMilkyWay * uNightFactor;

          if (uAuroraStrength > 0.01) {
            float wave = sin(dir.x * 5.5 + uTime * 0.22 + sin(dir.z * 4.0) * 1.4);
            float ribbon = smoothstep(0.14, 0.48, h) * smoothstep(0.82, 0.38, h);
            float shimmer = (0.55 + 0.45 * wave) * valueNoise(vec2(dir.x * 3.8 + uTime * 0.08, dir.y * 4.0));
            col += uAuroraTint * ribbon * shimmer * uAuroraStrength * uNightFactor;
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  disposableGeos.push(skyGeo);
  disposableMats.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.renderOrder = -10;
  group.add(skyDome);

  // ---------------------------------------------------------------------------
  // 2. Daytime / Sunset 3D Sun + Corona Halo
  // ---------------------------------------------------------------------------
  const sunGroup = new THREE.Group();
  sunGroup.name = 'SkySunGroup';

  const sunDiscGeo = new THREE.SphereGeometry(3.4, 24, 18);
  const sunDiscMat = new THREE.MeshBasicMaterial({
    color: activeSpec.sunColor,
    fog: false,
  });
  disposableGeos.push(sunDiscGeo);
  disposableMats.push(sunDiscMat);
  const sunDiscMesh = new THREE.Mesh(sunDiscGeo, sunDiscMat);
  sunGroup.add(sunDiscMesh);

  const sunHaloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: activeSpec.sunCoronaColor,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposableMats.push(sunHaloMat);
  const sunHaloSprite = new THREE.Sprite(sunHaloMat);
  sunHaloSprite.scale.set(22, 22, 1);
  sunGroup.add(sunHaloSprite);

  const sunOuterMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: activeSpec.sunColor,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposableMats.push(sunOuterMat);
  const sunOuterSprite = new THREE.Sprite(sunOuterMat);
  sunOuterSprite.scale.set(38, 38, 1);
  sunGroup.add(sunOuterSprite);

  group.add(sunGroup);

  // ---------------------------------------------------------------------------
  // 3. Nighttime 3D Cratered Moon + Halo
  // ---------------------------------------------------------------------------
  const moonGroup = new THREE.Group();
  moonGroup.name = 'SkyMoonGroup';

  const moonGeo = new THREE.SphereGeometry(2.9, 24, 18);
  const moonMat = new THREE.MeshBasicMaterial({
    map: moonTex,
    color: activeSpec.moonColor,
    fog: false,
  });
  disposableGeos.push(moonGeo);
  disposableMats.push(moonMat);
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonGroup.add(moonMesh);

  const moonHaloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: activeSpec.moonGlowColor,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  disposableMats.push(moonHaloMat);
  const moonHaloSprite = new THREE.Sprite(moonHaloMat);
  moonHaloSprite.scale.set(18, 18, 1);
  moonGroup.add(moonHaloSprite);

  group.add(moonGroup);

  // ---------------------------------------------------------------------------
  // 4. Drifting 3D Fluffy Clouds (InstancedMesh -> 1 draw call)
  // ---------------------------------------------------------------------------
  interface CloudCluster {
    angle: number;
    radius: number;
    y: number;
    speed: number;
    puffs: Array<{ ox: number; oy: number; oz: number; sx: number; sy: number; sz: number }>;
  }

  const cloudClusters: CloudCluster[] = [];
  const clusterCount = quality.tier === 'potato' ? 7 : 12;
  let totalPuffs = 0;
  for (let c = 0; c < clusterCount; c++) {
    const puffs: CloudCluster['puffs'] = [];
    const puffCount = quality.tier === 'potato' ? 4 : 5 + (c % 2);
    for (let p = 0; p < puffCount; p++) {
      const span = p - (puffCount - 1) * 0.5;
      puffs.push({
        ox: span * 2.1 + Math.sin(c * 3.1 + p) * 0.45,
        oy: (p === Math.floor(puffCount / 2) ? 0.85 : 0.15) + Math.cos(c + p * 2.0) * 0.25,
        oz: Math.sin(p * 2.4 + c) * 0.85,
        sx: (p === Math.floor(puffCount / 2) ? 3.2 : 2.25) + ((c + p) % 3) * 0.35,
        sy: (p === Math.floor(puffCount / 2) ? 1.55 : 1.08) + ((c + p) % 2) * 0.2,
        sz: 1.9 + ((c * 2 + p) % 3) * 0.28,
      });
      totalPuffs++;
    }
    cloudClusters.push({
      angle: (c / clusterCount) * Math.PI * 2,
      radius: 56 + (c % 3) * 8,
      y: 23 + (c % 4) * 4.5,
      speed: 0.012 + (c % 4) * 0.003,
      puffs,
    });
  }

  const puffGeo = new THREE.SphereGeometry(1, 10, 8);
  const cloudMat = new THREE.MeshBasicMaterial({
    color: activeSpec.cloudColor,
    transparent: true,
    opacity: activeSpec.cloudOpacity,
    depthWrite: false,
    fog: false,
  });
  disposableGeos.push(puffGeo);
  disposableMats.push(cloudMat);
  const cloudInst = new THREE.InstancedMesh(puffGeo, cloudMat, totalPuffs);
  cloudInst.frustumCulled = false;
  cloudInst.renderOrder = -4;
  group.add(cloudInst);

  // ---------------------------------------------------------------------------
  // 5. Soaring Sky Birds (Daytime & Sunset — Instanced V-Wings in 2 draw calls)
  // ---------------------------------------------------------------------------
  const birdCount = quality.tier === 'potato' ? 5 : 9;
  const wingGeo = new THREE.PlaneGeometry(0.95, 0.36);
  // Shift wing pivot so X=0 is shoulder joint
  wingGeo.translate(0.47, 0, 0);
  wingGeo.rotateX(-Math.PI / 2);
  const birdMat = new THREE.MeshBasicMaterial({
    color: activeSpec.birdColor,
    side: THREE.DoubleSide,
    fog: false,
  });
  disposableGeos.push(wingGeo);
  disposableMats.push(birdMat);

  const leftWingInst = new THREE.InstancedMesh(wingGeo, birdMat, birdCount);
  const rightWingInst = new THREE.InstancedMesh(wingGeo, birdMat, birdCount);
  leftWingInst.frustumCulled = false;
  rightWingInst.frustumCulled = false;
  group.add(leftWingInst, rightWingInst);

  // ---------------------------------------------------------------------------
  // 6. Daytime Waterfall Rainbow Arc
  // ---------------------------------------------------------------------------
  const rainbowGeo = new THREE.TorusGeometry(6.8, 0.68, 8, 36, Math.PI);
  const rainbowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    uniforms: {
      uOpacity: { value: 0.24 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float t = vUv.y;
        vec3 red = vec3(0.98, 0.36, 0.36);
        vec3 yellow = vec3(0.99, 0.85, 0.32);
        vec3 green = vec3(0.32, 0.88, 0.56);
        vec3 blue = vec3(0.35, 0.65, 0.98);
        vec3 violet = vec3(0.68, 0.42, 0.96);

        vec3 col = mix(violet, blue, smoothstep(0.0, 0.25, t));
        col = mix(col, green, smoothstep(0.25, 0.5, t));
        col = mix(col, yellow, smoothstep(0.5, 0.75, t));
        col = mix(col, red, smoothstep(0.75, 1.0, t));

        float bandFade = sin(t * 3.14159);
        float endFade = sin(vUv.x * 3.14159);
        gl_FragColor = vec4(col, bandFade * endFade * uOpacity);
      }
    `,
  });
  disposableGeos.push(rainbowGeo);
  disposableMats.push(rainbowMat);
  const rainbowMesh = new THREE.Mesh(rainbowGeo, rainbowMat);
  rainbowMesh.position.set(0, 0.4, -18.2);
  rainbowMesh.rotation.y = 0.08;
  group.add(rainbowMesh);

  // ---------------------------------------------------------------------------
  // 7. Twinkling Night Starfield (Custom Shader Points, fog: false)
  // ---------------------------------------------------------------------------
  const starCount = quality.tier === 'potato' ? 140 : quality.tier === 'low' ? 240 : 380;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const phi = ((i * 137.508) % 360) * (Math.PI / 180);
    const sinEl = 0.08 + ((i * 29) % 100) / 108;
    const cosEl = Math.sqrt(Math.max(0.01, 1 - sinEl * sinEl));
    const r = 84;
    starPositions[i * 3] = Math.cos(phi) * cosEl * r;
    starPositions[i * 3 + 1] = sinEl * r;
    starPositions[i * 3 + 2] = Math.sin(phi) * cosEl * r;

    // Slight warm/cool stellar tint diversity
    const tintPick = i % 5;
    if (tintPick === 0) _color.setHex(0xbae6fd);
    else if (tintPick === 1) _color.setHex(0xfef3c7);
    else if (tintPick === 2) _color.setHex(0xe0e7ff);
    else _color.setHex(0xffffff);
    starColors[i * 3] = _color.r;
    starColors[i * 3 + 1] = _color.g;
    starColors[i * 3 + 2] = _color.b;

    starSizes[i] = 1.6 + (i % 4) * 0.9;
    starPhases[i] = i * 0.73;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));

  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uGlobalAlpha: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        vTwinkle = 0.55 + 0.45 * sin(uTime * 2.4 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (220.0 / max(20.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uGlobalAlpha;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vColor, core * core * vTwinkle * uGlobalAlpha);
      }
    `,
  });
  disposableGeos.push(starGeo);
  disposableMats.push(starMat);
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.renderOrder = -6;
  group.add(starPoints);

  // ---------------------------------------------------------------------------
  // 8. Nighttime Animated Shooting Stars ("Bintang Jatuh")
  // ---------------------------------------------------------------------------
  interface ShootingStarActor {
    root: THREE.Group;
    headMat: THREE.MeshBasicMaterial;
    tailMat: THREE.MeshBasicMaterial;
    period: number;
    phaseOffset: number;
    streakDuration: number;
    startElev: number;
    startAzim: number;
    dElev: number;
    dAzim: number;
  }

  const shootingStarGroup = new THREE.Group();
  shootingStarGroup.name = 'ShootingStars';
  const meteorHeadGeo = new THREE.SphereGeometry(0.28, 8, 8);
  const meteorTailGeo = new THREE.ConeGeometry(0.22, 6.8, 8, 1, true);
  // Cone points +Y; rotate so apex is at tail rear and base meets head at origin
  meteorTailGeo.translate(0, -3.4, 0);
  disposableGeos.push(meteorHeadGeo, meteorTailGeo);

  const shootingStars: ShootingStarActor[] = [];
  const meteorSeeds = [
    { period: 6.2, offset: 0.8, startEl: 0.68, startAz: -1.15, dEl: -0.34, dAz: 0.92 },
    { period: 8.4, offset: 3.5, startEl: 0.74, startAz: 0.95, dEl: -0.38, dAz: -0.88 },
    { period: 9.8, offset: 6.1, startEl: 0.58, startAz: -0.32, dEl: -0.28, dAz: 1.05 },
    { period: 11.6, offset: 1.9, startEl: 0.64, startAz: 0.42, dEl: -0.36, dAz: -0.95 },
  ];

  for (let i = 0; i < meteorSeeds.length; i++) {
    const seed = meteorSeeds[i];
    const root = new THREE.Group();
    const headMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const tailMat = new THREE.MeshBasicMaterial({
      color: activeSpec.shootingStarColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    disposableMats.push(headMat, tailMat);

    const headMesh = new THREE.Mesh(meteorHeadGeo, headMat);
    const tailMesh = new THREE.Mesh(meteorTailGeo, tailMat);
    root.add(headMesh, tailMesh);
    root.visible = false;
    shootingStarGroup.add(root);

    shootingStars.push({
      root,
      headMat,
      tailMat,
      period: seed.period,
      phaseOffset: seed.offset,
      streakDuration: 1.15,
      startElev: seed.startEl,
      startAzim: seed.startAz,
      dElev: seed.dEl,
      dAzim: seed.dAz,
    });
  }
  group.add(shootingStarGroup);

  // ---------------------------------------------------------------------------
  // Apply Theme / Sky Preset Live
  // ---------------------------------------------------------------------------
  const applySpec = (cfg?: BoardConfig) => {
    activeSpec = getSkyThemeSpec(
      cfg?.environmentConfig.skyPreset ?? 'twilight_forest',
      cfg?.themeId ?? 'enchanted_forest',
    );
    activeShowWaterfall = cfg?.environmentConfig.showWaterfall ?? true;

    const isDay = activeSpec.mode === 'day';
    const isSunset = activeSpec.mode === 'sunset';
    const isNight = activeSpec.mode === 'night';

    skyMat.uniforms.uTopColor.value.setHex(activeSpec.topColor);
    skyMat.uniforms.uMidColor.value.setHex(activeSpec.midColor);
    skyMat.uniforms.uHorizonColor.value.setHex(activeSpec.horizonColor);
    skyMat.uniforms.uSunColor.value.setHex(activeSpec.sunCoronaColor);
    directionFromElevAzim(activeSpec.sunElevation, activeSpec.sunAzimuth, 1, skyMat.uniforms.uSunDir.value);
    skyMat.uniforms.uDayFactor.value = isNight ? 0.0 : isSunset ? 0.92 : 1.0;
    skyMat.uniforms.uNightFactor.value = isNight ? 1.0 : isSunset ? 0.25 : 0.0;
    skyMat.uniforms.uMilkyWay.value = activeSpec.milkyWayStrength;
    skyMat.uniforms.uAuroraTint.value.setHex(activeSpec.auroraTint);
    skyMat.uniforms.uAuroraStrength.value = activeSpec.auroraStrength;

    // Sun placement & visibility
    sunGroup.visible = isDay || isSunset;
    directionFromElevAzim(activeSpec.sunElevation, activeSpec.sunAzimuth, 78, sunGroup.position);
    sunDiscMat.color.setHex(activeSpec.sunColor);
    sunHaloMat.color.setHex(activeSpec.sunCoronaColor);
    sunOuterMat.color.setHex(activeSpec.sunColor);

    // Moon placement & visibility
    moonGroup.visible = isNight;
    directionFromElevAzim(activeSpec.moonElevation, activeSpec.moonAzimuth, 78, moonGroup.position);
    moonMat.color.setHex(activeSpec.moonColor);
    moonHaloMat.color.setHex(activeSpec.moonGlowColor);

    // Clouds color & opacity
    cloudMat.color.setHex(activeSpec.cloudColor);
    cloudMat.opacity = activeSpec.cloudOpacity;

    // Soaring sky birds in daytime & sunset
    const showBirds = isDay || isSunset;
    leftWingInst.visible = showBirds;
    rightWingInst.visible = showBirds;
    birdMat.color.setHex(activeSpec.birdColor);

    // Rainbow arc above waterfall in bright daytime themes
    rainbowMesh.visible = activeSpec.rainbowEnabled && activeShowWaterfall;

    // Stars & Shooting stars in night (faint stars in sunset zenith)
    starPoints.visible = isNight || isSunset;
    starMat.uniforms.uGlobalAlpha.value = isNight ? 0.96 : 0.28;
    shootingStarGroup.visible = isNight;
    for (let i = 0; i < shootingStars.length; i++) {
      shootingStars[i].tailMat.color.setHex(activeSpec.shootingStarColor);
    }
  };

  applySpec(boardConfig);

  // ---------------------------------------------------------------------------
  // Zero-GC Per-Frame Update
  // ---------------------------------------------------------------------------
  const update = (elapsed: number, reducedEffects: boolean) => {
    skyMat.uniforms.uTime.value = elapsed;
    starMat.uniforms.uTime.value = elapsed;

    // Subtle sun corona pulse
    if (sunGroup.visible) {
      const sunPulse = 1 + Math.sin(elapsed * 1.4) * 0.04;
      sunHaloSprite.scale.set(22 * sunPulse, 22 * sunPulse, 1);
    }

    // Drift 3D fluffy clouds around the sky
    let puffIdx = 0;
    for (let c = 0; c < cloudClusters.length; c++) {
      const cl = cloudClusters[c];
      const baseAngle = cl.angle + elapsed * cl.speed;
      const cx = Math.cos(baseAngle) * cl.radius;
      const cz = Math.sin(baseAngle) * cl.radius;

      for (let p = 0; p < cl.puffs.length; p++) {
        const pf = cl.puffs[p];
        _vec3.set(cx + pf.ox, cl.y + pf.oy, cz + pf.oz);
        _euler.set(0, -baseAngle, 0);
        _quat.setFromEuler(_euler);
        _scaleVec.set(pf.sx, pf.sy, pf.sz);
        _mat4.compose(_vec3, _quat, _scaleVec);
        cloudInst.setMatrixAt(puffIdx++, _mat4);
      }
    }
    cloudInst.instanceMatrix.needsUpdate = true;

    // Soaring sky birds (Day / Sunset)
    if (leftWingInst.visible) {
      for (let b = 0; b < birdCount; b++) {
        const orbitAngle = elapsed * (0.14 + (b % 3) * 0.025) + b * 0.72;
        const r = 24 + (b % 4) * 4.5;
        const bx = Math.cos(orbitAngle) * r;
        const bz = Math.sin(orbitAngle) * r;
        const by = 14.5 + (b % 3) * 2.4 + Math.sin(elapsed * 0.9 + b * 1.3) * 0.9;
        const yaw = -orbitAngle;
        const flap = Math.sin(elapsed * 6.8 + b * 1.7) * 0.48;

        // Right wing (+X)
        _vec3.set(bx, by, bz);
        _euler.set(0, yaw, flap, 'YXZ');
        _wingQuat.setFromEuler(_euler);
        _scaleVec.set(1, 1, 1);
        _mat4.compose(_vec3, _wingQuat, _scaleVec);
        rightWingInst.setMatrixAt(b, _mat4);

        // Left wing (-X mirrored)
        _euler.set(0, yaw + Math.PI, flap, 'YXZ');
        _wingQuat.setFromEuler(_euler);
        _mat4.compose(_vec3, _wingQuat, _scaleVec);
        leftWingInst.setMatrixAt(b, _mat4);
      }
      leftWingInst.instanceMatrix.needsUpdate = true;
      rightWingInst.instanceMatrix.needsUpdate = true;
    }

    // Animated Shooting Stars ("Bintang Jatuh") at night
    if (shootingStarGroup.visible && !reducedEffects) {
      for (let i = 0; i < shootingStars.length; i++) {
        const m = shootingStars[i];
        const cyclePos = (elapsed + m.phaseOffset) % m.period;
        if (cyclePos <= m.streakDuration) {
          const t = cyclePos / m.streakDuration;
          const elev = m.startElev + m.dElev * t;
          const azim = m.startAzim + m.dAzim * t;
          directionFromElevAzim(elev, azim, 76, _vec3);

          const tNext = Math.min(1, t + 0.04);
          directionFromElevAzim(
            m.startElev + m.dElev * tNext,
            m.startAzim + m.dAzim * tNext,
            76,
            _vec3Next,
          );
          _dirVec.subVectors(_vec3Next, _vec3).normalize();

          m.root.visible = true;
          m.root.position.copy(_vec3);
          m.root.quaternion.setFromUnitVectors(_upVec, _dirVec);

          const fade = Math.sin(t * Math.PI);
          m.headMat.opacity = fade * 0.95;
          m.tailMat.opacity = fade * 0.78;
          const tailLenScale = 0.65 + fade * 0.75;
          m.root.scale.set(1, tailLenScale, 1);
        } else {
          m.root.visible = false;
        }
      }
    } else if (shootingStarGroup.visible) {
      for (let i = 0; i < shootingStars.length; i++) {
        shootingStars[i].root.visible = false;
      }
    }
  };

  const dispose = () => {
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
    disposableTexs.forEach((t) => t.dispose());
  };

  return {
    group,
    update,
    updateSkyConfig: applySpec,
    dispose,
  };
}
