import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createBarkPbrMaps,
  createCastleStonePbrMaps,
  createCastleSlateRoofPbrMaps,
  createFoliageAtlasTextures,
  createMistSpriteTexture,
  createRockPbrMaps,
  createTerrainPbrMaps,
  createTimberPbrMaps,
  disposePbrTextureSet,
} from './pbrTextures';
import { applyCastlePbrMaterials, buildFantasyCastleGeometryGroup } from './castleBuilder';
import {
  buildCliffFormationsGeometryGroup,
  createFracturedRockGeometry,
  createWorldMossRockMaterial,
  ensureUv2,
} from './rockTerrainBuilder';
import {
  applyLodBiasToGroup,
  applyWindShader,
  createAncientOakTree,
  createArchedFoliageCard,
  createHighlandPineTree,
} from './foliageBuilder';
import { createRunicMoatTexture } from '../textures';
import { QUALITY_PRESETS, type QualityConfig } from '../perf/qualityPresets';

export interface ArenaEnvironmentHandle {
  group: THREE.Group;
  update: (elapsed: number, reducedEffects: boolean) => void;
  applyQuality: (cfg: QualityConfig) => void;
  dispose: () => void;
}

const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

/**
 * Superelliptical distance around the flat sanctuary plateau so the stone game board,
 * dice dais (z = 10.75), and 4 corner obelisks (±11.1, ±11.1) sit solidly on level ground.
 */
function sanctuarySuperDist(x: number, z: number): number {
  const nx = Math.abs(x) / 13.0;
  const nz = Math.abs(z) / 13.6;
  return Math.pow(Math.pow(nx, 4) + Math.pow(nz, 4), 0.25);
}

/**
 * Continuous heightfield for the Arena Sanctuary Island, Sacred Moat Channel,
 * Mossy Forest Banks, and Northern Waterfall Gorge.
 */
export function arenaGroundHeightAt(x: number, z: number): number {
  const s = sanctuarySuperDist(x, z);

  // 1. Central board bastion plateau (flat y = -0.25 cleanly beneath board plinth)
  if (s <= 0.98) {
    return -0.25;
  }

  // 2. Smooth step-down bank into sacred moat channel (0.98..1.38)
  if (s < 1.38) {
    const u = (s - 0.98) / 0.4;
    const dip = Math.sin(u * Math.PI);
    return -0.25 - dip * 1.05;
  }

  // 3. Outer mossy woodland banks & undulating valley ridges (s >= 1.38)
  const bankT = Math.min(1, (s - 1.38) / 0.35);
  const bankRise = -0.25 + bankT * (0.35 + (s - 1.38) * 1.35);
  const undulation =
    0.42 * Math.sin(x * 0.19 + 0.6) * Math.cos(z * 0.17 - 0.3) +
    0.18 * Math.sin(x * 0.52 - z * 0.44);

  // Northern waterfall gorge ridge rising behind the board (z < -20)
  const northGorge =
    z < -20.5
      ? Math.min(5.2, (-20.5 - z) * 0.55) * (0.68 + 0.32 * Math.cos(x * 0.18))
      : 0;
  // Carve central waterfall spillway chute around x = 0
  const chuteCarve = z < -18 ? Math.exp(-Math.pow(x / 2.8, 2)) * 1.9 : 0;

  return Math.max(-0.32, bankRise + undulation * bankT + Math.max(0, northGorge - chuteCarve));
}

import type { BoardConfig } from '../../../shared/boardThemes';

function getSkyPalette(skyPreset: BoardConfig['environmentConfig']['skyPreset']): {
  top: number;
  mid: number;
  horizon: number;
} {
  switch (skyPreset) {
    case 'volcanic_ash':
      return { top: 0x0b0507, mid: 0x260c0e, horizon: 0x6b1d0f };
    case 'aurora_frost':
      return { top: 0x030c1c, mid: 0x0b2a4a, horizon: 0x1e607a };
    case 'golden_mirage':
      return { top: 0x170f08, mid: 0x45260d, horizon: 0x8a4b14 };
    case 'abyssal_sea':
      return { top: 0x020f1a, mid: 0x05283d, horizon: 0x0d5c75 };
    case 'eclipse_void':
      return { top: 0x05020d, mid: 0x180930, horizon: 0x3b1363 };
    case 'astral_dawn':
      return { top: 0x071329, mid: 0x153563, horizon: 0x386796 };
    case 'temple_sunset':
      return { top: 0x091713, mid: 0x1b3b2d, horizon: 0x4d411c };
    case 'twilight_forest':
    default:
      return { top: 0x050a18, mid: 0x101c34, horizon: 0x163d4f };
  }
}

function getBiomePalette(themeId: BoardConfig['themeId']): {
  courtyard: number;
  riverbed: number;
  primaryGround: number;
  secondaryGround: number;
  cliff: number;
  moatDeep: [number, number, number];
  moatShallow: [number, number, number];
  moatFoam: [number, number, number];
  moatBaseHex: number;
} {
  switch (themeId) {
    case 'dragon_volcano':
      return {
        courtyard: 0x291817,
        riverbed: 0x451209,
        primaryGround: 0x1f1414,
        secondaryGround: 0x381c19,
        cliff: 0x272022,
        moatDeep: [0.48, 0.06, 0.01],
        moatShallow: [0.95, 0.34, 0.04],
        moatFoam: [1.0, 0.82, 0.25],
        moatBaseHex: 0xc2410c,
      };
    case 'frozen_kingdom':
      return {
        courtyard: 0x334e68,
        riverbed: 0x102a43,
        primaryGround: 0x829ab1,
        secondaryGround: 0xd9e2ec,
        cliff: 0x486581,
        moatDeep: [0.06, 0.24, 0.42],
        moatShallow: [0.22, 0.65, 0.88],
        moatFoam: [0.92, 0.98, 1.0],
        moatBaseHex: 0x0284c7,
      };
    case 'lost_desert':
      return {
        courtyard: 0x5c4028,
        riverbed: 0x2b3d34,
        primaryGround: 0x8c6239,
        secondaryGround: 0xb5834c,
        cliff: 0x6e4b2a,
        moatDeep: [0.04, 0.26, 0.28],
        moatShallow: [0.12, 0.56, 0.52],
        moatFoam: [0.95, 0.88, 0.65],
        moatBaseHex: 0x0d9488,
      };
    case 'atlantis_ocean':
      return {
        courtyard: 0x164e63,
        riverbed: 0x082f49,
        primaryGround: 0x0f5257,
        secondaryGround: 0x14746f,
        cliff: 0x1e3a5f,
        moatDeep: [0.02, 0.22, 0.38],
        moatShallow: [0.06, 0.62, 0.74],
        moatFoam: [0.75, 0.98, 1.0],
        moatBaseHex: 0x0891b2,
      };
    case 'shadow_realm':
      return {
        courtyard: 0x241638,
        riverbed: 0x140924,
        primaryGround: 0x1d112b,
        secondaryGround: 0x311b47,
        cliff: 0x271d33,
        moatDeep: [0.14, 0.03, 0.26],
        moatShallow: [0.44, 0.14, 0.68],
        moatFoam: [0.88, 0.68, 1.0],
        moatBaseHex: 0x6b21a8,
      };
    case 'celestial_sky':
      return {
        courtyard: 0x334155,
        riverbed: 0x1e3a8a,
        primaryGround: 0x475569,
        secondaryGround: 0x64748b,
        cliff: 0x94a3b8,
        moatDeep: [0.08, 0.24, 0.52],
        moatShallow: [0.28, 0.58, 0.92],
        moatFoam: [0.98, 0.94, 0.72],
        moatBaseHex: 0x2563eb,
      };
    case 'ancient_temple':
      return {
        courtyard: 0x3b3528,
        riverbed: 0x18362b,
        primaryGround: 0x2b4c32,
        secondaryGround: 0x4a5d32,
        cliff: 0x524738,
        moatDeep: [0.04, 0.22, 0.18],
        moatShallow: [0.12, 0.48, 0.38],
        moatFoam: [0.94, 0.88, 0.62],
        moatBaseHex: 0x059669,
      };
    case 'enchanted_forest':
    default:
      return {
        courtyard: 0x364152,
        riverbed: 0x1f2e3d,
        primaryGround: 0x274e2d,
        secondaryGround: 0x376633,
        cliff: 0x4b5563,
        moatDeep: [0.03, 0.17, 0.3],
        moatShallow: [0.07, 0.36, 0.48],
        moatFoam: [0.82, 0.94, 1.0],
        moatBaseHex: 0x0c4a6e,
      };
  }
}

function getParticleColors(
  particleStyle: BoardConfig['visualEffects']['particleStyle'],
): [number, number, number] {
  switch (particleStyle) {
    case 'lava_embers':
      return [0xf97316, 0xef4444, 0xfde047];
    case 'snowflakes':
      return [0xe0f2fe, 0xbae6fd, 0xffffff];
    case 'sand_sparks':
      return [0xfbbf24, 0xfde68a, 0xf59e0b];
    case 'sea_bubbles':
      return [0x67e8f9, 0x22d3ee, 0xa5f3fc];
    case 'shadow_wisps':
      return [0xc084fc, 0xa855f7, 0xe879f9];
    case 'starlight':
      return [0xfef08a, 0x93c5fd, 0xffffff];
    case 'golden_runes':
      return [0xfbbf24, 0x34d399, 0xfef08a];
    case 'fireflies':
    default:
      return [0xfde68a, 0x6ee7b7, 0x93c5fd];
  }
}

export function buildArenaEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  quality: QualityConfig = QUALITY_PRESETS.high,
  boardConfig?: BoardConfig,
): ArenaEnvironmentHandle {
  const group = new THREE.Group();
  group.name = 'ArenaRealisticEnvironment';

  let currentQuality = quality;
  const shadows = quality.shadowsEnabled && (boardConfig?.visualEffects.shadowsEnabled ?? true);
  const texSize = quality.pbrTexSize;

  const themeId = boardConfig?.themeId ?? 'enchanted_forest';
  const envCfg = boardConfig?.environmentConfig;
  const vfxCfg = boardConfig?.visualEffects;
  const skyPalette = getSkyPalette(envCfg?.skyPreset ?? 'twilight_forest');
  const biome = getBiomePalette(themeId);

  const showTrees = envCfg?.showTrees ?? true;
  const showRocks = envCfg?.showRocks ?? true;
  const showCastle = envCfg?.showCastle ?? true;
  const showWaterfall = envCfg?.showWaterfall ?? true;
  const decorationStyle = envCfg?.decorations ?? 'runic_obelisks';

  const uTime = { value: 0 };
  const uWindTime = { value: 0 };

  // 1. Shared Resolution-Tiered PBR Texture Sets
  const terrainPbr = createTerrainPbrMaps(maxAnisotropy, texSize);
  const rockPbr = createRockPbrMaps(maxAnisotropy, 2, texSize);
  const barkPbr = createBarkPbrMaps(maxAnisotropy, texSize);
  const stonePbr = createCastleStonePbrMaps(maxAnisotropy, texSize);
  const slatePbr = createCastleSlateRoofPbrMaps(maxAnisotropy, Math.min(512, texSize) as 256 | 512);
  const timberPbr = createTimberPbrMaps(maxAnisotropy, Math.min(512, texSize) as 256 | 512);
  const foliageAtlas = createFoliageAtlasTextures(maxAnisotropy, texSize);
  const mistTex = createMistSpriteTexture();
  const moatTex = createRunicMoatTexture(maxAnisotropy);

  const disposableGeos: THREE.BufferGeometry[] = [];
  const disposableMats: THREE.Material[] = [];

  // 2. Theme-Adaptive Sanctuary Sky Dome
  const skyGeo = new THREE.SphereGeometry(
    95,
    quality.tier === 'potato' ? 18 : 32,
    quality.tier === 'potato' ? 12 : 20,
  );
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(skyPalette.top) },
      uMidColor: { value: new THREE.Color(skyPalette.mid) },
      uHorizonColor: { value: new THREE.Color(skyPalette.horizon) },
    },
    vertexShader: `
      varying vec3 vSkyWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vSkyWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      varying vec3 vSkyWorld;
      void main() {
        float h = clamp(normalize(vSkyWorld).y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.25, h));
        col = mix(col, uTopColor, smoothstep(0.25, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  disposableGeos.push(skyGeo);
  disposableMats.push(skyMat);
  group.add(new THREE.Mesh(skyGeo, skyMat));

  // 3. Sculpted Sanctuary Island, Moat Channel & Biome Terrain with Vertex Biome Colors
  const tSeg = quality.terrainSegments;
  const terrainGeo = new THREE.PlaneGeometry(82, 82, tSeg, tSeg);
  terrainGeo.rotateX(-Math.PI / 2);
  const tPos = terrainGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const z = tPos.getZ(i) - 3.0;
    tPos.setZ(i, z);
    tPos.setY(i, arenaGroundHeightAt(x, z));
  }
  terrainGeo.computeVertexNormals();
  ensureUv2(terrainGeo);

  const tNorm = terrainGeo.attributes.normal;
  const tColors = new Float32Array(tPos.count * 3);
  const cCourtyard = new THREE.Color(biome.courtyard);
  const cRiverbed = new THREE.Color(biome.riverbed);
  const cMoss = new THREE.Color(biome.primaryGround);
  const cLush = new THREE.Color(biome.secondaryGround);
  const cGranite = new THREE.Color(biome.cliff);
  const cTmp = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const y = tPos.getY(i);
    const z = tPos.getZ(i);
    const ny = tNorm.getY(i);
    const s = sanctuarySuperDist(x, z);

    if (s < 1.02) {
      const patina = 0.92 + 0.08 * Math.sin(x * 0.7 + z * 0.7);
      cTmp.copy(cCourtyard).multiplyScalar(patina);
    } else {
      const slopeT = THREE.MathUtils.smoothstep(ny, 0.56, 0.9);
      const biomeNoise = 0.5 + 0.5 * Math.sin(x * 0.32 + z * 0.28);
      cTmp.copy(cMoss).lerp(cLush, biomeNoise);
      cTmp.lerp(cGranite, 1 - slopeT);
      if (y < -0.1) {
        const wetT = THREE.MathUtils.smoothstep(y, -0.95, -0.1);
        cTmp.lerp(cRiverbed, 1 - wetT);
      }
    }

    tColors[i * 3] = cTmp.r;
    tColors[i * 3 + 1] = cTmp.g;
    tColors[i * 3 + 2] = cTmp.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));

  const terrainMat = new THREE.MeshStandardMaterial({
    map: terrainPbr.map,
    normalMap: terrainPbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: terrainPbr.roughnessMap,
    aoMap: terrainPbr.aoMap,
    aoMapIntensity: 0.9,
    vertexColors: true,
    roughness: themeId === 'frozen_kingdom' ? 0.52 : 0.88,
    metalness: themeId === 'frozen_kingdom' ? 0.14 : 0.03,
  });
  disposableGeos.push(terrainGeo);
  disposableMats.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = shadows;
  group.add(terrainMesh);

  // 4. Sacred Moat Surface (Water / Molten Lava / Glacier Ice / Oasis / Abyssal Sea)
  const isLavaTheme = themeId === 'dragon_volcano';
  const waterGeo = new THREE.RingGeometry(
    11.6,
    19.8,
    quality.tier === 'potato' ? 36 : 64,
    quality.tier === 'potato' ? 2 : 5,
  );
  const waterMat = new THREE.MeshPhysicalMaterial({
    map: moatTex,
    color: biome.moatBaseHex,
    roughness: isLavaTheme ? 0.32 : 0.09,
    metalness: isLavaTheme ? 0.08 : 0.14,
    emissive: isLavaTheme ? new THREE.Color(0xdc2626) : new THREE.Color(0x000000),
    emissiveIntensity: isLavaTheme ? 0.55 : 0,
    clearcoat:
      isSoftwareGl || quality.tier === 'potato' || quality.tier === 'low' || isLavaTheme
        ? 0.15
        : 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.92,
  });

  const [mdR, mdG, mdB] = biome.moatDeep;
  const [msR, msG, msB] = biome.moatShallow;
  const [mfR, mfG, mfB] = biome.moatFoam;

  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vArenaWaterWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
         float ang = atan(wp0.z, wp0.x);
         float rD = length(wp0.xz);
         float wave = sin(ang * 10.0 + uTime * 2.1) * 0.035 + cos(rD * 2.8 - uTime * 2.7) * 0.024;
         transformed.z += wave;
         vArenaWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vArenaWaterWorld;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float w1 = sin(vArenaWaterWorld.x * 4.2 + uTime * 2.4 + cos(vArenaWaterWorld.z * 2.8)) * 0.5 + 0.5;
         float w2 = cos(vArenaWaterWorld.z * 5.1 - uTime * 2.9 + sin(vArenaWaterWorld.x * 2.5)) * 0.5 + 0.5;
         float caustic = pow(w1 * w2, 2.4) * 0.26;
         vec3 deepCol = vec3(${mdR.toFixed(3)}, ${mdG.toFixed(3)}, ${mdB.toFixed(3)});
         vec3 shallowCol = vec3(${msR.toFixed(3)}, ${msG.toFixed(3)}, ${msB.toFixed(3)});
         vec3 foamCol = vec3(${mfR.toFixed(3)}, ${mfG.toFixed(3)}, ${mfB.toFixed(3)});
         diffuseColor.rgb = mix(deepCol, shallowCol, 0.38 + caustic);
         diffuseColor.rgb += shallowCol * caustic;

         float dPlunge = length(vArenaWaterWorld.xz - vec2(0.0, -17.4));
         float foam = exp(-dPlunge * 0.45) * (0.55 + 0.45 * sin(dPlunge * 6.0 - uTime * 5.0));
         diffuseColor.rgb = mix(diffuseColor.rgb, foamCol, clamp(foam, 0.0, 0.85));`,
      );
  };
  disposableGeos.push(waterGeo);
  disposableMats.push(waterMat);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = -0.38;
  waterMesh.receiveShadow = shadows;
  group.add(waterMesh);

  // 5. Distant Mountain Waterfall / Lavafall Gorge Cascade (North vista behind Tile 91-100)
  const fallGeo = new THREE.PlaneGeometry(3.8, 5.4, 12, 16);
  const fPos = fallGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const y = fPos.getY(i);
    const x = fPos.getX(i);
    const t = Math.max(0, Math.min(1, 1 - (y + 2.7) / 5.4));
    fPos.setZ(i, Math.pow(t, 1.35) * 1.65 + Math.sin(x * 1.8) * 0.07);
  }
  fallGeo.computeVertexNormals();

  const waterfallMat = new THREE.MeshStandardMaterial({
    color: isLavaTheme ? 0xf97316 : biome.moatBaseHex,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
    emissive: isLavaTheme ? 0xea580c : biome.moatBaseHex,
    emissiveIntensity: isLavaTheme ? 0.65 : 0.2,
  });
  waterfallMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vWfUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vWfUv = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec2 vWfUv;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float flow = vWfUv.y * 4.5 + uTime * 3.2;
         float sA = sin(vWfUv.x * 24.0 + sin(flow * 1.2) * 1.2) * 0.5 + 0.5;
         float sB = cos(vWfUv.x * 38.0 - flow * 1.7) * 0.5 + 0.5;
         float foam = smoothstep(0.45, 0.9, sA * 0.6 + sB * 0.4);
         float bottomChurn = smoothstep(0.3, 0.0, vWfUv.y) * 0.65;
         float edgeFade = smoothstep(0.0, 0.14, vWfUv.x) * smoothstep(1.0, 0.86, vWfUv.x);
         vec3 baseCasc = vec3(${msR.toFixed(3)}, ${msG.toFixed(3)}, ${msB.toFixed(3)});
         vec3 crestCasc = vec3(${mfR.toFixed(3)}, ${mfG.toFixed(3)}, ${mfB.toFixed(3)});
         diffuseColor.rgb = mix(baseCasc, crestCasc, clamp(foam * 0.72 + bottomChurn, 0.0, 1.0));
         diffuseColor.a *= edgeFade;`,
      );
  };
  disposableGeos.push(fallGeo);
  disposableMats.push(waterfallMat);

  const cascadeMesh = new THREE.Mesh(fallGeo, waterfallMat);
  cascadeMesh.position.set(0, 2.0, -19.0);
  cascadeMesh.visible = showWaterfall;
  group.add(cascadeMesh);

  // Waterfall Mist Sprites (InstancedMesh -> 1 draw call!)
  const mistCount = 22;
  const mistGeo = new THREE.PlaneGeometry(2.1, 1.7);
  const mistMat = new THREE.MeshBasicMaterial({
    map: mistTex,
    color: isLavaTheme ? 0xfb923c : themeId === 'shadow_realm' ? 0xc084fc : 0xffffff,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  disposableGeos.push(mistGeo);
  disposableMats.push(mistMat);
  const mistInst = new THREE.InstancedMesh(mistGeo, mistMat, mistCount);
  mistInst.frustumCulled = false;
  group.add(mistInst);

  // 6. Theme-Specific 3D Sanctuary Corner, Perimeter Landmarks & Surrounding Fantasy Buildings
  const ashlarMat = new THREE.MeshStandardMaterial({
    map: stonePbr.map,
    normalMap: stonePbr.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: stonePbr.roughnessMap,
    aoMap: stonePbr.aoMap,
    aoMapIntensity: 0.9,
    color:
      decorationStyle === 'desert_pyramids'
        ? 0xd97706
        : decorationStyle === 'shadow_monoliths' || decorationStyle === 'volcano_braziers'
          ? 0x475569
          : decorationStyle === 'atlantis_pillars' || decorationStyle === 'floating_islands'
            ? 0xe2e8f0
            : 0xb8c4d4,
    roughness: 0.68,
    metalness: 0.12,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    map: slatePbr.map,
    normalMap: slatePbr.normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: slatePbr.roughnessMap,
    aoMap: slatePbr.aoMap,
    aoMapIntensity: 0.88,
    color:
      themeId === 'dragon_volcano'
        ? 0x7f1d1d
        : themeId === 'frozen_kingdom'
          ? 0x0284c7
          : themeId === 'lost_desert' || themeId === 'ancient_temple'
            ? 0xb45309
            : themeId === 'shadow_realm'
              ? 0x581c87
              : 0x3b82f6,
    roughness: 0.48,
    metalness: 0.18,
  });
  const timberBeamMat = new THREE.MeshStandardMaterial({
    map: timberPbr.map,
    normalMap: timberPbr.normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: timberPbr.roughnessMap,
    aoMap: timberPbr.aoMap,
    aoMapIntensity: 0.88,
    color: 0xb47b48,
    roughness: 0.72,
    metalness: 0.05,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color:
      decorationStyle === 'ice_crystals'
        ? 0x38bdf8
        : decorationStyle === 'shadow_monoliths'
          ? 0xa855f7
          : 0xf59e0b,
    roughness: 0.25,
    metalness: 0.88,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color:
      decorationStyle === 'volcano_braziers'
        ? 0xf97316
        : decorationStyle === 'ice_crystals' || decorationStyle === 'atlantis_pillars'
          ? 0x38bdf8
          : decorationStyle === 'shadow_monoliths'
            ? 0xc084fc
            : 0xfef08a,
    emissive:
      decorationStyle === 'volcano_braziers'
        ? 0xea580c
        : decorationStyle === 'ice_crystals' || decorationStyle === 'atlantis_pillars'
          ? 0x0284c7
          : decorationStyle === 'shadow_monoliths'
            ? 0x9333ea
            : 0xf59e0b,
    emissiveIntensity: 0.88,
    roughness: 0.16,
  });
  disposableMats.push(ashlarMat, slateRoofMat, timberBeamMat, bronzeMat, warmLanternMat);

  const plinthGeo = new THREE.CylinderGeometry(0.88, 1.12, 0.48, 8);
  const spireGeo =
    decorationStyle === 'desert_pyramids'
      ? new THREE.ConeGeometry(1.35, 2.6, 4)
      : decorationStyle === 'ice_crystals'
        ? new THREE.CylinderGeometry(0.08, 0.68, 3.2, 6)
        : decorationStyle === 'volcano_braziers'
          ? new THREE.CylinderGeometry(0.78, 0.52, 1.9, 8)
          : new THREE.CylinderGeometry(0.32, 0.62, 2.65, 8);
  const collarGeo = new THREE.TorusGeometry(0.58, 0.048, 8, 24);
  collarGeo.rotateX(Math.PI / 2);
  const lanternGeo = new THREE.OctahedronGeometry(
    decorationStyle === 'volcano_braziers' ? 0.46 : 0.3,
    0,
  );
  ensureUv2(plinthGeo);
  ensureUv2(spireGeo);
  disposableGeos.push(plinthGeo, spireGeo, collarGeo, lanternGeo);

  const obeliskCorners: Array<[number, number]> = [
    [-11.1, -11.1],
    [11.1, -11.1],
    [-11.1, 11.1],
    [11.1, 11.1],
  ];
  const obeliskMeshes: THREE.Mesh[] = [];
  for (const [ox, oz] of obeliskCorners) {
    const obGroup = new THREE.Group();
    obGroup.position.set(ox, -0.25, oz);

    const plinth = new THREE.Mesh(plinthGeo, ashlarMat);
    plinth.position.y = 0.24;
    plinth.castShadow = shadows;
    plinth.receiveShadow = shadows;
    obGroup.add(plinth);
    obeliskMeshes.push(plinth);

    const spire = new THREE.Mesh(
      spireGeo,
      decorationStyle === 'ice_crystals' ? warmLanternMat : ashlarMat,
    );
    spire.position.y = decorationStyle === 'volcano_braziers' ? 1.25 : 1.78;
    if (decorationStyle === 'desert_pyramids') {
      spire.rotation.y = Math.PI / 4;
    }
    spire.castShadow = shadows;
    spire.receiveShadow = shadows;
    obGroup.add(spire);
    obeliskMeshes.push(spire);

    const collar = new THREE.Mesh(collarGeo, bronzeMat);
    collar.position.y = 0.52;
    obGroup.add(collar);

    const cap = new THREE.Mesh(lanternGeo, warmLanternMat);
    cap.position.y = decorationStyle === 'volcano_braziers' ? 2.35 : 3.45;
    obGroup.add(cap);

    group.add(obGroup);
  }

  // 6B. Surrounding Fantasy Village Buildings, Arched Moat Bridges, Watchtowers & Arcane Pavilions
  // Merged by material role so the entire surrounding architectural ring costs only 5 draw calls!
  const surroundStoneGeos: THREE.BufferGeometry[] = [];
  const surroundSlateGeos: THREE.BufferGeometry[] = [];
  const surroundTimberGeos: THREE.BufferGeometry[] = [];
  const surroundBronzeGeos: THREE.BufferGeometry[] = [];
  const surroundGlowGeos: THREE.BufferGeometry[] = [];

  const pushTransformedGeo = (
    bucket: THREE.BufferGeometry[],
    baseGeo: THREE.BufferGeometry,
    px: number,
    py: number,
    pz: number,
    rx = 0,
    ry = 0,
    rz = 0,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    const g = baseGeo.clone();
    _euler.set(rx, ry, rz);
    _quat.setFromEuler(_euler);
    _vec3.set(px, py, pz);
    _scaleVec.set(sx, sy, sz);
    _mat4.compose(_vec3, _quat, _scaleVec);
    g.applyMatrix4(_mat4);
    ensureUv2(g);
    bucket.push(g);
  };

  const toNonIndexedUnit = (raw: THREE.BufferGeometry): THREE.BufferGeometry => {
    if (!raw.index) return raw;
    const nonIdx = raw.toNonIndexed();
    raw.dispose();
    return nonIdx;
  };

  const unitBox = toNonIndexedUnit(new THREE.BoxGeometry(1, 1, 1));
  const unitCyl8 = toNonIndexedUnit(new THREE.CylinderGeometry(1, 1, 1, 8));
  const unitCone8 = toNonIndexedUnit(new THREE.ConeGeometry(1, 1, 8));
  const unitCone4 = toNonIndexedUnit(new THREE.ConeGeometry(1, 1, 4));
  const unitOct = toNonIndexedUnit(new THREE.OctahedronGeometry(1, 0));

  // (i) 8 Inner Sanctuary Perimeter Lantern Pillars framing the board edges
  const innerPosts: Array<[number, number]> = [
    [-11.35, -4.6],
    [-11.35, 4.6],
    [11.35, -4.6],
    [11.35, 4.6],
    [-4.6, -11.35],
    [4.6, -11.35],
    [-5.2, 11.35],
    [5.2, 11.35],
  ];
  for (const [px, pz] of innerPosts) {
    pushTransformedGeo(surroundStoneGeos, unitCyl8, px, -0.05, pz, 0, 0, 0, 0.36, 0.42, 0.36);
    pushTransformedGeo(surroundStoneGeos, unitBox, px, 0.55, pz, 0, 0, 0, 0.38, 0.85, 0.38);
    pushTransformedGeo(surroundBronzeGeos, unitCyl8, px, 1.04, pz, 0, 0, 0, 0.28, 0.12, 0.28);
    pushTransformedGeo(surroundGlowGeos, unitOct, px, 1.28, pz, 0, Math.PI / 4, 0, 0.18, 0.26, 0.18);
  }

  // (ii) 3 Arched Stone Moat Bridges spanning the Sacred Moat (West, East, North)
  const bridgeConfigs: Array<{ x: number; z: number; rotY: number }> = [
    { x: -14.8, z: 0.0, rotY: 0 },
    { x: 14.8, z: 0.0, rotY: 0 },
    { x: 0.0, z: -14.8, rotY: Math.PI / 2 },
  ];
  for (const br of bridgeConfigs) {
    const c = Math.cos(br.rotY);
    const s = Math.sin(br.rotY);
    const toW = (lx: number, lz: number): [number, number] => [
      br.x + lx * c - lz * s,
      br.z + lx * s + lz * c,
    ];
    // Bridge deck & stepped approaches
    for (let seg = -2; seg <= 2; seg++) {
      const lx = seg * 1.15;
      const archY = -0.05 + (1 - (seg * seg) / 6.5) * 0.48;
      const [wx, wz] = toW(lx, 0);
      pushTransformedGeo(surroundStoneGeos, unitBox, wx, archY, wz, 0, br.rotY, 0, 1.24, 0.26, 2.35);
      // Left & right carved stone parapets
      for (const side of [-1.02, 1.02]) {
        const [px, pz] = toW(lx, side);
        pushTransformedGeo(surroundStoneGeos, unitBox, px, archY + 0.32, pz, 0, br.rotY, 0, 1.2, 0.42, 0.22);
        pushTransformedGeo(surroundTimberGeos, unitBox, px, archY + 0.56, pz, 0, br.rotY, 0, 1.24, 0.08, 0.28);
      }
    }
    // Bridge gateway pillars & lanterns at both ends
    for (const endX of [-2.65, 2.65]) {
      for (const sideZ of [-1.08, 1.08]) {
        const [gx, gz] = toW(endX, sideZ);
        pushTransformedGeo(surroundStoneGeos, unitBox, gx, 0.45, gz, 0, br.rotY, 0, 0.48, 1.35, 0.48);
        pushTransformedGeo(surroundBronzeGeos, unitCyl8, gx, 1.18, gz, 0, 0, 0, 0.26, 0.12, 0.26);
        pushTransformedGeo(surroundGlowGeos, unitOct, gx, 1.42, gz, 0, 0.4, 0, 0.19, 0.28, 0.19);
      }
    }
  }

  // (iii) 6 Multi-Part Fantasy Guildhalls, Watchtowers & Sanctuaries around the Board Perimeter
  const addFantasyGuildhall = (bx: number, bz: number, rotY: number, scale = 1.0) => {
    const by = arenaGroundHeightAt(bx, bz) - 0.15;
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const toW = (lx: number, lz: number): [number, number] => [
      bx + (lx * c - lz * s) * scale,
      bz + (lx * s + lz * c) * scale,
    ];

    // 1. Stone foundation plinth
    pushTransformedGeo(
      surroundStoneGeos,
      unitBox,
      bx,
      by + 0.65 * scale,
      bz,
      0,
      rotY,
      0,
      3.4 * scale,
      1.3 * scale,
      2.5 * scale,
    );
    // 2. Upper half-timbered hall body
    pushTransformedGeo(
      surroundStoneGeos,
      unitBox,
      bx,
      by + 2.05 * scale,
      bz,
      0,
      rotY,
      0,
      3.65 * scale,
      1.65 * scale,
      2.7 * scale,
    );
    // 3. Timber framing belt & vertical corner beams
    pushTransformedGeo(
      surroundTimberGeos,
      unitBox,
      bx,
      by + 1.32 * scale,
      bz,
      0,
      rotY,
      0,
      3.78 * scale,
      0.18 * scale,
      2.82 * scale,
    );
    pushTransformedGeo(
      surroundTimberGeos,
      unitBox,
      bx,
      by + 2.82 * scale,
      bz,
      0,
      rotY,
      0,
      3.78 * scale,
      0.18 * scale,
      2.82 * scale,
    );
    for (const cx of [-1.72, 0, 1.72]) {
      for (const cz of [-1.28, 1.28]) {
        const [tx, tz] = toW(cx, cz);
        pushTransformedGeo(
          surroundTimberGeos,
          unitBox,
          tx,
          by + 2.05 * scale,
          tz,
          0,
          rotY,
          0,
          0.16 * scale,
          1.68 * scale,
          0.16 * scale,
        );
      }
    }
    // 4. Steep pitched slate roof (4-sided pyramid rotated 45 deg & scaled to hall length)
    pushTransformedGeo(
      surroundSlateGeos,
      unitCone4,
      bx,
      by + 3.85 * scale,
      bz,
      0,
      rotY + Math.PI / 4,
      0,
      2.95 * scale,
      2.15 * scale,
      2.25 * scale,
    );
    // 5. Golden roof ridge beam & finials
    pushTransformedGeo(
      surroundBronzeGeos,
      unitBox,
      bx,
      by + 4.78 * scale,
      bz,
      0,
      rotY,
      0,
      2.2 * scale,
      0.14 * scale,
      0.14 * scale,
    );
    // 6. Attached Cylindrical Side Watchtower + Conical Slate Spire
    const [twX, twZ] = toW(2.05, 0.35);
    pushTransformedGeo(
      surroundStoneGeos,
      unitCyl8,
      twX,
      by + 2.25 * scale,
      twZ,
      0,
      rotY,
      0,
      0.98 * scale,
      4.5 * scale,
      0.98 * scale,
    );
    pushTransformedGeo(
      surroundTimberGeos,
      unitCyl8,
      twX,
      by + 4.35 * scale,
      twZ,
      0,
      rotY,
      0,
      1.08 * scale,
      0.24 * scale,
      1.08 * scale,
    );
    pushTransformedGeo(
      surroundSlateGeos,
      unitCone8,
      twX,
      by + 5.55 * scale,
      twZ,
      0,
      rotY,
      0,
      1.32 * scale,
      2.35 * scale,
      1.32 * scale,
    );
    pushTransformedGeo(
      surroundBronzeGeos,
      unitCyl8,
      twX,
      by + 6.95 * scale,
      twZ,
      0,
      0,
      0,
      0.06 * scale,
      0.65 * scale,
      0.06 * scale,
    );
    pushTransformedGeo(
      surroundGlowGeos,
      unitOct,
      twX,
      by + 7.35 * scale,
      twZ,
      0,
      0,
      0,
      0.2 * scale,
      0.32 * scale,
      0.2 * scale,
    );
    // 7. Glowing Lancet Windows on front & back facades + tower
    for (const wxOff of [-0.95, 0.65]) {
      for (const wzSide of [-1.37, 1.37]) {
        const [wx, wz] = toW(wxOff, wzSide);
        pushTransformedGeo(
          surroundGlowGeos,
          unitBox,
          wx,
          by + 2.1 * scale,
          wz,
          0,
          rotY,
          0,
          0.42 * scale,
          0.72 * scale,
          0.08 * scale,
        );
      }
    }
    const [tWinX, tWinZ] = toW(2.05, -0.62);
    pushTransformedGeo(
      surroundGlowGeos,
      unitBox,
      tWinX,
      by + 3.45 * scale,
      tWinZ,
      0,
      rotY,
      0,
      0.28 * scale,
      0.68 * scale,
      0.12 * scale,
    );
  };

  const addArcanePagodaSanctuary = (px: number, pz: number, scale = 1.0) => {
    const py = arenaGroundHeightAt(px, pz) - 0.12;
    // Stepped octagonal stone base
    pushTransformedGeo(surroundStoneGeos, unitCyl8, px, py + 0.35 * scale, pz, 0, 0, 0, 2.25 * scale, 0.7 * scale, 2.25 * scale);
    pushTransformedGeo(surroundStoneGeos, unitCyl8, px, py + 0.85 * scale, pz, 0, Math.PI / 8, 0, 1.85 * scale, 0.42 * scale, 1.85 * scale);
    // 6 Carved Colonnade Pillars
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      const colX = px + Math.cos(a) * 1.42 * scale;
      const colZ = pz + Math.sin(a) * 1.42 * scale;
      pushTransformedGeo(surroundStoneGeos, unitCyl8, colX, py + 2.15 * scale, colZ, 0, a, 0, 0.19 * scale, 2.25 * scale, 0.19 * scale);
      pushTransformedGeo(surroundBronzeGeos, unitCyl8, colX, py + 3.25 * scale, colZ, 0, a, 0, 0.25 * scale, 0.14 * scale, 0.25 * scale);
    }
    // Glowing Central Arcane Crystal Core
    pushTransformedGeo(surroundGlowGeos, unitOct, px, py + 2.15 * scale, pz, 0, 0.5, 0, 0.48 * scale, 0.92 * scale, 0.48 * scale);
    // Double-tiered Slate Pagoda Roofs + Bronze Finial
    pushTransformedGeo(surroundSlateGeos, unitCone8, px, py + 3.85 * scale, pz, 0, 0, 0, 2.45 * scale, 1.25 * scale, 2.45 * scale);
    pushTransformedGeo(surroundStoneGeos, unitCyl8, px, py + 4.45 * scale, pz, 0, 0, 0, 1.05 * scale, 0.65 * scale, 1.05 * scale);
    pushTransformedGeo(surroundSlateGeos, unitCone8, px, py + 5.25 * scale, pz, 0, Math.PI / 8, 0, 1.75 * scale, 1.35 * scale, 1.75 * scale);
    pushTransformedGeo(surroundBronzeGeos, unitCyl8, px, py + 6.15 * scale, pz, 0, 0, 0, 0.07 * scale, 0.65 * scale, 0.07 * scale);
    pushTransformedGeo(surroundGlowGeos, unitOct, px, py + 6.55 * scale, pz, 0, 0, 0, 0.22 * scale, 0.34 * scale, 0.22 * scale);
  };

  // Place 4 Fantasy Guildhalls & Watchtowers on the West & East Banks facing the Board
  addFantasyGuildhall(-20.4, -4.6, Math.PI * 0.44, 0.96);
  addFantasyGuildhall(20.4, -4.6, -Math.PI * 0.44, 0.96);
  addFantasyGuildhall(-19.6, 6.2, Math.PI * 0.58, 0.88);
  addFantasyGuildhall(19.6, 6.2, -Math.PI * 0.58, 0.88);

  // Place 2 Arcane Pagoda Sanctuaries on the Northwest & Northeast overlooks
  addArcanePagodaSanctuary(-14.4, -16.4, 0.95);
  addArcanePagodaSanctuary(14.4, -16.4, 0.95);

  unitBox.dispose();
  unitCyl8.dispose();
  unitCone8.dispose();
  unitCone4.dispose();
  unitOct.dispose();

  const buildMergedArchMesh = (
    geos: THREE.BufferGeometry[],
    mat: THREE.Material,
    castSh: boolean,
  ) => {
    if (geos.length === 0) return;
    const hasNonIndexed = geos.some((g) => !g.index);
    const normalized = hasNonIndexed
      ? geos.map((g) => {
          if (g.index) {
            const ni = g.toNonIndexed();
            ensureUv2(ni);
            g.dispose();
            return ni;
          }
          return g;
        })
      : geos;
    const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
    normalized.forEach((g) => g.dispose());
    if (!merged) return;
    ensureUv2(merged);
    disposableGeos.push(merged);
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = castSh && shadows;
    m.receiveShadow = shadows;
    obeliskMeshes.push(m);
    group.add(m);
  };

  buildMergedArchMesh(surroundStoneGeos, ashlarMat, true);
  buildMergedArchMesh(surroundSlateGeos, slateRoofMat, true);
  buildMergedArchMesh(surroundTimberGeos, timberBeamMat, true);
  buildMergedArchMesh(surroundBronzeGeos, bronzeMat, false);
  buildMergedArchMesh(surroundGlowGeos, warmLanternMat, false);

  // Additional Distant Theme Landmarks around the Outer Sanctuary Bank
  if (decorationStyle === 'desert_pyramids') {
    const bigPyramidGeo = new THREE.ConeGeometry(4.6, 6.2, 4);
    ensureUv2(bigPyramidGeo);
    disposableGeos.push(bigPyramidGeo);
    [
      [-22, -19, 1.15],
      [23, -18, 0.92],
    ].forEach(([px, pz, sc]) => {
      const pyr = new THREE.Mesh(bigPyramidGeo, ashlarMat);
      pyr.position.set(px, arenaGroundHeightAt(px, pz) + 2.6 * sc, pz);
      pyr.rotation.y = Math.PI / 4;
      pyr.scale.setScalar(sc);
      pyr.castShadow = shadows;
      pyr.receiveShadow = shadows;
      group.add(pyr);
    });
  } else if (decorationStyle === 'floating_islands') {
    const islandGeo = new THREE.ConeGeometry(2.6, 3.4, 7);
    islandGeo.rotateX(Math.PI);
    ensureUv2(islandGeo);
    disposableGeos.push(islandGeo);
    [
      [-18, 6.5, -15],
      [19, 7.2, -14],
      [-17, 5.8, 12],
      [18, 6.4, 11],
    ].forEach(([ix, iy, iz]) => {
      const isl = new THREE.Mesh(islandGeo, ashlarMat);
      isl.position.set(ix, iy, iz);
      isl.castShadow = shadows;
      group.add(isl);

      const ring = new THREE.Mesh(collarGeo, bronzeMat);
      ring.position.set(ix, iy + 1.8, iz);
      ring.scale.setScalar(2.8);
      group.add(ring);
    });
  }

  // 7. Fractured Granite Boulders (3-tier LOD) & Instanced River Pebbles
  const mossRockMat = createWorldMossRockMaterial(rockPbr);
  disposableMats.push(mossRockMat);

  const boulderHigh = createFracturedRockGeometry(1.0, 3, 21.4, 0.72);
  const boulderMed = createFracturedRockGeometry(1.0, 2, 21.4, 0.72);
  const boulderLow = createFracturedRockGeometry(1.0, 1, 21.4, 0.72);
  disposableGeos.push(boulderHigh, boulderMed, boulderLow);

  const heroBoulderAngles = [
    0.22, 0.65, 1.18, 1.92, 2.48, 3.05, 3.68, 4.18, 4.72, 5.25, 5.75,
  ];
  const boulderLods: THREE.LOD[] = [];
  heroBoulderAngles.forEach((a, idx) => {
    const rad = idx % 2 === 0 ? 17.6 + (idx % 3) * 0.6 : 12.2 + (idx % 2) * 0.4;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const by = arenaGroundHeightAt(bx, bz) - 0.12;
    const s = 0.78 + (idx % 4) * 0.24;

    const lod = new THREE.LOD();
    const mH = new THREE.Mesh(boulderHigh, mossRockMat);
    mH.castShadow = shadows;
    mH.receiveShadow = shadows;
    mH.userData.baseLodDist = 0;

    const mM = new THREE.Mesh(boulderMed, mossRockMat);
    mM.castShadow = shadows && !quality.shadowImportantOnly;
    mM.receiveShadow = shadows;
    mM.userData.baseLodDist = 20;

    const mL = new THREE.Mesh(boulderLow, mossRockMat);
    mL.receiveShadow = shadows;
    mL.userData.baseLodDist = 34;

    lod.addLevel(mH, 0);
    lod.addLevel(mM, 20 * quality.lodBias);
    lod.addLevel(mL, 34 * quality.lodBias);
    lod.position.set(bx, by, bz);
    lod.rotation.y = a * 1.4;
    lod.scale.set(s * 1.25, s * 0.85, s);
    lod.visible = showRocks;
    boulderLods.push(lod);
    group.add(lod);
  });

  const pebbleCount = 120;
  const pebbleGeo = createFracturedRockGeometry(0.42, 2, 47.9, 0.65);
  disposableGeos.push(pebbleGeo);
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, mossRockMat, pebbleCount);
  pebbleInst.castShadow = shadows && !quality.shadowImportantOnly;
  pebbleInst.receiveShadow = shadows;
  pebbleInst.visible = showRocks;
  for (let i = 0; i < pebbleCount; i++) {
    const a = i * 2.39996;
    const r = i % 3 === 0 ? 12.1 + (i % 5) * 0.35 : 17.2 + (i % 7) * 0.6;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    const py = arenaGroundHeightAt(px, pz) - 0.04;
    const s = 0.4 + ((i * 13) % 8) * 0.08;
    _vec3.set(px, py, pz);
    _euler.set((i % 4) * 0.2, a, (i % 3) * 0.15);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s * 1.2, s * 0.7, s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    pebbleInst.setMatrixAt(i, _mat4);
  }
  pebbleInst.instanceMatrix.needsUpdate = true;
  pebbleInst.computeBoundingSphere();
  group.add(pebbleInst);

  // 8. Multi-Ring Realistic LOD Trees (34 Ancient Oaks & Highland Pines) + Instanced Ferns & Grass
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkPbr.map,
    normalMap: barkPbr.normalMap,
    normalScale: new THREE.Vector2(1.65, 1.65),
    roughnessMap: barkPbr.roughnessMap,
    aoMap: barkPbr.aoMap,
    aoMapIntensity: 0.9,
    color: themeId === 'frozen_kingdom' ? 0xcbd5e1 : 0xd6d3d1,
    roughness: 0.86,
    metalness: 0.03,
  });
  const leafTint =
    themeId === 'frozen_kingdom'
      ? 0xbae6fd
      : themeId === 'shadow_realm'
        ? 0xa855f7
        : themeId === 'celestial_sky'
          ? 0xfef08a
          : 0xffffff;
  const leafMat = new THREE.MeshStandardMaterial({
    map: foliageAtlas.map,
    normalMap: foliageAtlas.normalMap,
    normalScale: new THREE.Vector2(1.25, 1.25),
    color: leafTint,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0.04,
  });
  applyWindShader(leafMat, uWindTime, 0.09, 1.6);

  const fernMat = new THREE.MeshStandardMaterial({
    map: foliageAtlas.map,
    normalMap: foliageAtlas.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    color: leafTint,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.62,
    metalness: 0.03,
  });
  applyWindShader(fernMat, uWindTime, 0.07, 2.0);
  disposableMats.push(barkMat, leafMat, fernMat);

  const treeLods: THREE.LOD[] = [];
  // Inner Moat-Bank Ring (14 closer trees right across the moat at r = 16.0..18.4)
  const innerTreeAngles = [
    -2.82, -2.42, -1.96, -1.24, -0.78, -0.34,
    0.34, 0.78, 1.18, 1.96, 2.42, 2.82,
    -1.52, -1.62,
  ];
  innerTreeAngles.forEach((angle, idx) => {
    const r = 16.2 + ((idx * 19) % 5) * 0.45;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    // Keep southern camera corridor & bridge landings open
    if (tz > 10.5 && Math.abs(tx) < 9.5) return;
    if (Math.abs(tz) < 2.2 && Math.abs(tx) > 13.0) return;
    if (Math.abs(tx) < 2.4 && tz < -12.0) return;

    const ty = arenaGroundHeightAt(tx, tz);
    const scale = 0.84 + ((idx * 13) % 24) * 0.012;
    const tree =
      idx % 2 === 0
        ? createAncientOakTree(idx * 1.4 + 1.0, barkMat, leafMat)
        : createHighlandPineTree(idx * 1.8 + 2.0, barkMat, leafMat);
    tree.position.set(tx, ty, tz);
    tree.rotation.y = angle + idx * 0.7;
    tree.scale.setScalar(scale);
    tree.visible = showTrees;
    treeLods.push(tree);
    group.add(tree);
  });

  // Outer Woodland Grove Ring (22 majestic trees at r = 21.0..27.5 framing buildings & castles)
  const outerTreeCount = 22;
  for (let i = 0; i < outerTreeCount; i++) {
    const angle = (i / outerTreeCount) * Math.PI * 2 + (i % 3) * 0.06;
    if (Math.sin(angle) > 0.82 && Math.abs(Math.cos(angle)) < 0.48) continue;

    const r = 21.4 + ((i * 23) % 42) * 0.14;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const ty = arenaGroundHeightAt(tx, tz);
    const scale = 0.94 + ((i * 17) % 32) * 0.014;
    const tree =
      i % 2 === 0
        ? createAncientOakTree(i * 1.3 + 11.0, barkMat, leafMat)
        : createHighlandPineTree(i * 1.7 + 15.0, barkMat, leafMat);
    tree.position.set(tx, ty, tz);
    tree.rotation.y = angle + i;
    tree.scale.setScalar(scale);
    tree.visible = showTrees;
    treeLods.push(tree);
    group.add(tree);
  }

  // Instanced Woodland Fern Rosettes (110 bushes in 1 draw call!)
  const frondGeo = createArchedFoliageCard(0.85, 1.08, 0, 1);
  const fernParts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 5; f++) {
    const fg = frondGeo.clone();
    fg.translate(0, 0.48, 0);
    fg.rotateX(0.92);
    fg.rotateY((f / 5) * Math.PI * 2);
    fernParts.push(fg);
  }
  frondGeo.dispose();
  const fernRosetteGeo = BufferGeometryUtils.mergeGeometries(fernParts, false);
  fernParts.forEach((g) => g.dispose());
  ensureUv2(fernRosetteGeo);
  disposableGeos.push(fernRosetteGeo);

  const fernCount = 110;
  const fernInst = new THREE.InstancedMesh(fernRosetteGeo, fernMat, fernCount);
  fernInst.castShadow = shadows && !quality.shadowImportantOnly;
  fernInst.receiveShadow = shadows;
  fernInst.visible = showTrees;
  for (let i = 0; i < fernCount; i++) {
    const a = (i / fernCount) * Math.PI * 2 + (i % 5) * 0.05;
    const r = i % 3 === 0 ? 11.9 + (i % 4) * 0.25 : 16.8 + ((i * 29) % 56) * 0.15;
    const fx = Math.cos(a) * r;
    const fz = Math.sin(a) * r;
    const fy = arenaGroundHeightAt(fx, fz);
    const s = 0.78 + (i % 4) * 0.14;
    _vec3.set(fx, fy - 0.04, fz);
    _euler.set(0, a * 1.9, 0);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s, s, s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    fernInst.setMatrixAt(i, _mat4);
    const tint = 0.78 + (i % 5) * 0.05;
    _color.setRGB(tint * 0.9, tint * 1.05, tint * 0.85);
    fernInst.setColorAt(i, _color);
  }
  fernInst.instanceMatrix.needsUpdate = true;
  if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
  fernInst.computeBoundingSphere();
  group.add(fernInst);

  // Instanced Wind-Swaying Grass Tufts (380 tufts in 1 draw call!)
  const bladeGeos: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 5; b++) {
    const ba = (b / 5) * Math.PI * 2;
    const blade = new THREE.ConeGeometry(0.055, 0.56, 3, 2);
    blade.translate(0, 0.28, 0);
    blade.rotateZ(0.24);
    blade.rotateY(ba);
    blade.translate(Math.cos(ba) * 0.06, 0, Math.sin(ba) * 0.06);
    ensureUv2(blade);
    bladeGeos.push(blade);
  }
  const grassTuftGeo = BufferGeometryUtils.mergeGeometries(bladeGeos, false);
  bladeGeos.forEach((g) => g.dispose());
  ensureUv2(grassTuftGeo);
  disposableGeos.push(grassTuftGeo);

  const grassMat = new THREE.MeshStandardMaterial({
    color:
      themeId === 'frozen_kingdom'
        ? 0xbae6fd
        : themeId === 'atlantis_ocean'
          ? 0x0d9488
          : themeId === 'shadow_realm'
            ? 0x6b21a8
            : 0x4d7c0f,
    roughness: 0.78,
    metalness: 0.02,
  });
  applyWindShader(grassMat, uWindTime, 0.08, 2.2);
  disposableMats.push(grassMat);

  const grassCount = 380;
  const grassInst = new THREE.InstancedMesh(grassTuftGeo, grassMat, grassCount);
  grassInst.receiveShadow = shadows;
  grassInst.visible = showTrees;
  for (let i = 0; i < grassCount; i++) {
    const a = i * 2.39996;
    const r = 16.4 + Math.sqrt(i / grassCount) * 12.2;
    const gx = Math.cos(a) * r;
    const gz = Math.sin(a) * r;
    const gy = arenaGroundHeightAt(gx, gz);
    const s = 0.75 + ((i * 11) % 7) * 0.1;
    _vec3.set(gx, gy - 0.03, gz);
    _euler.set(0, a * 2.1, 0);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s, s * (0.85 + (i % 3) * 0.18), s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    grassInst.setMatrixAt(i, _mat4);
    const shade = 0.66 + (i % 6) * 0.07;
    _color.setRGB(shade * 0.74, shade * 1.04, shade * 0.58);
    grassInst.setColorAt(i, _color);
  }
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  grassInst.computeBoundingSphere();
  group.add(grassInst);

  // 9. Ambient Floating Sanctuary Spores / Theme Magical Particles (InstancedMesh -> 1 draw call!)
  const sporeCount = 72;
  const sporeGeo = new THREE.OctahedronGeometry(0.065, 0);
  const sporeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  disposableGeos.push(sporeGeo);
  disposableMats.push(sporeMat);
  const sporeInst = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);
  sporeInst.frustumCulled = false;
  const sporeColors = getParticleColors(vfxCfg?.particleStyle ?? 'fireflies');
  for (let i = 0; i < sporeCount; i++) {
    _color.setHex(sporeColors[i % sporeColors.length]);
    sporeInst.setColorAt(i, _color);
  }
  if (sporeInst.instanceColor) sporeInst.instanceColor.needsUpdate = true;
  group.add(sporeInst);

  // 10. Twin Northern Citadel Keeps & Cliff Outcrops (Built immediately so all presets enjoy full castles!)
  const vistaGroup = new THREE.Group();
  vistaGroup.visible = showCastle;
  group.add(vistaGroup);

  const buildCitadelVistas = () => {
    // Primary Northeast Sovereign Citadel Keep
    const eastCastle = buildFantasyCastleGeometryGroup();
    applyCastlePbrMaterials(eastCastle, { stonePbr, slatePbr, timberPbr });
    eastCastle.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = shadows && !quality.shadowImportantOnly;
        obj.receiveShadow = shadows;
      }
    });
    eastCastle.position.set(14.8, 1.9, -24.5);
    eastCastle.rotation.y = -0.36;
    eastCastle.scale.setScalar(1.28);
    vistaGroup.add(eastCastle);

    // Secondary Northwest Bastion Keep flanking the waterfall gorge
    const westCastle = buildFantasyCastleGeometryGroup();
    applyCastlePbrMaterials(westCastle, { stonePbr, slatePbr, timberPbr });
    westCastle.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = shadows && !quality.shadowImportantOnly;
        obj.receiveShadow = shadows;
      }
    });
    westCastle.position.set(-15.2, 1.6, -23.8);
    westCastle.rotation.y = 0.42;
    westCastle.scale.setScalar(1.05);
    vistaGroup.add(westCastle);

    // Northern Waterfall Gorge Cliff Outcrops
    const cliffs = buildCliffFormationsGeometryGroup();
    cliffs.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        ensureUv2(mesh.geometry);
        mesh.material = mossRockMat;
        mesh.castShadow = shadows && !quality.shadowImportantOnly;
        mesh.receiveShadow = shadows;
      }
    });
    cliffs.position.set(0, -0.4, -12.5);
    cliffs.scale.set(1.38, 1.18, 1.15);
    vistaGroup.add(cliffs);
  };
  buildCitadelVistas();

  const applyQuality = (cfg: QualityConfig) => {
    currentQuality = cfg;
    const d = THREE.MathUtils.clamp(cfg.envDensity, 0.35, 1);
    const sh = cfg.shadowsEnabled && (boardConfig?.visualEffects.shadowsEnabled ?? true);
    const impOnly = cfg.shadowImportantOnly;

    pebbleInst.count = showRocks ? Math.max(24, Math.round(pebbleCount * d)) : 0;
    fernInst.count = showTrees ? Math.max(28, Math.round(fernCount * d)) : 0;
    grassInst.count = showTrees ? Math.max(64, Math.round(grassCount * d)) : 0;

    terrainMesh.receiveShadow = sh;
    waterMesh.receiveShadow = sh;
    pebbleInst.castShadow = sh && !impOnly;
    pebbleInst.receiveShadow = sh;
    fernInst.castShadow = sh && !impOnly;
    fernInst.receiveShadow = sh;
    grassInst.receiveShadow = sh;

    for (const m of obeliskMeshes) {
      m.castShadow = sh;
      m.receiveShadow = sh;
    }

    for (const tree of treeLods) {
      tree.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = sh && !impOnly;
          obj.receiveShadow = sh;
        }
      });
    }

    applyLodBiasToGroup(group, cfg.lodBias);

    treeLods.forEach((tree) => {
      tree.visible = showTrees;
    });

    vistaGroup.visible = showCastle;
  };

  applyQuality(quality);
  scene.add(group);

  let lastSecondaryUpdate = -10;
  const userParticleDensity = THREE.MathUtils.clamp(vfxCfg?.particleDensity ?? 0.85, 0, 1);

  const update = (elapsed: number, reducedEffects: boolean) => {
    uTime.value = elapsed;
    uWindTime.value = elapsed;

    const minInterval =
      currentQuality.tier === 'potato' ? 0.055 : currentQuality.tier === 'low' ? 0.035 : 0;
    if (minInterval > 0 && elapsed - lastSecondaryUpdate < minInterval) {
      return;
    }
    lastSecondaryUpdate = elapsed;

    const pRatio =
      THREE.MathUtils.clamp(currentQuality.particleBudget / 128, 0.14, 1) * userParticleDensity;
    const showMist =
      showWaterfall && !reducedEffects && pRatio > 0.2 && currentQuality.tier !== 'potato';
    mistInst.visible = showMist;
    if (showMist) {
      const activeMist = Math.max(4, Math.round(mistCount * pRatio));
      mistInst.count = activeMist;
      for (let i = 0; i < activeMist; i++) {
        const phase = i / activeMist;
        const life = (elapsed * (0.24 + (i % 4) * 0.06) + phase) % 1;
        const a = (i * 137.5 * Math.PI) / 180;
        const spread = 0.4 + life * 1.8;
        _vec3.set(
          Math.cos(a) * spread,
          -0.25 + life * 2.2,
          -17.4 + Math.sin(a) * spread * 0.55,
        );
        const s = 0.7 + Math.sin(life * Math.PI) * 1.1;
        _scaleVec.set(s, s * 0.82, s);
        _quat.identity();
        _mat4.compose(_vec3, _quat, _scaleVec);
        mistInst.setMatrixAt(i, _mat4);
      }
      mistInst.instanceMatrix.needsUpdate = true;
    }

    const activeSpores = Math.max(
      0,
      Math.round(sporeCount * pRatio * (reducedEffects ? 0.45 : 1)),
    );
    sporeInst.count = activeSpores;
    for (let i = 0; i < activeSpores; i++) {
      const a = (i / Math.max(1, activeSpores)) * Math.PI * 2 + elapsed * (0.04 + (i % 3) * 0.015);
      const r = 13.5 + (i % 9) * 1.25;
      const sx = Math.cos(a) * r;
      const sz = Math.sin(a) * r;
      const sy = 0.65 + (i % 5) * 0.65 + Math.sin(elapsed * 1.4 + i) * 0.35;
      const pulse = 0.65 + 0.45 * Math.sin(elapsed * 2.8 + i * 0.7);
      _vec3.set(sx, sy, sz);
      _scaleVec.set(pulse, pulse, pulse);
      _quat.identity();
      _mat4.compose(_vec3, _quat, _scaleVec);
      sporeInst.setMatrixAt(i, _mat4);
    }
    sporeInst.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    scene.remove(group);
    disposePbrTextureSet(terrainPbr);
    disposePbrTextureSet(rockPbr);
    disposePbrTextureSet(barkPbr);
    disposePbrTextureSet(stonePbr);
    disposePbrTextureSet(slatePbr);
    disposePbrTextureSet(timberPbr);
    foliageAtlas.map.dispose();
    foliageAtlas.normalMap.dispose();
    mistTex.dispose();
    moatTex.dispose();
    disposableGeos.forEach((g) => g.dispose());
    disposableMats.forEach((m) => m.dispose());
  };

  return { group, update, applyQuality, dispose };
}
