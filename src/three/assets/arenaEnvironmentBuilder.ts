import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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

export function buildArenaEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean,
  quality: QualityConfig = QUALITY_PRESETS.high,
): ArenaEnvironmentHandle {
  const group = new THREE.Group();
  group.name = 'ArenaRealisticEnvironment';

  let currentQuality = quality;
  const shadows = quality.shadowsEnabled;
  const texSize = quality.pbrTexSize;

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

  // 2. Twilight Sanctuary Sky Dome
  const skyGeo = new THREE.SphereGeometry(95, quality.tier === 'potato' ? 18 : 32, quality.tier === 'potato' ? 12 : 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x050a18) },
      uMidColor: { value: new THREE.Color(0x101c34) },
      uHorizonColor: { value: new THREE.Color(0x163d4f) },
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

  // 3. Sculpted Sanctuary Island, Moat Channel & Forest Valley Terrain with Vertex Biome Colors
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
  const cCourtyard = new THREE.Color(0x364152);
  const cRiverbed = new THREE.Color(0x1f2e3d);
  const cMoss = new THREE.Color(0x274e2d);
  const cLush = new THREE.Color(0x376633);
  const cGranite = new THREE.Color(0x4b5563);
  const cTmp = new THREE.Color();

  for (let i = 0; i < tPos.count; i++) {
    const x = tPos.getX(i);
    const y = tPos.getY(i);
    const z = tPos.getZ(i);
    const ny = tNorm.getY(i);
    const s = sanctuarySuperDist(x, z);

    if (s < 1.02) {
      // Carved sanctuary terrace stone around board
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
    roughness: 0.9,
    metalness: 0.03,
  });
  disposableGeos.push(terrainGeo);
  disposableMats.push(terrainMat);

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = shadows;
  group.add(terrainMesh);

  // 4. Sacred Moat Water Surface with Physical Fresnel, Caustics & Foam
  const waterGeo = new THREE.RingGeometry(11.6, 19.8, quality.tier === 'potato' ? 36 : 64, quality.tier === 'potato' ? 2 : 5);
  const waterMat = new THREE.MeshPhysicalMaterial({
    map: moatTex,
    color: 0x0c4a6e,
    roughness: 0.09,
    metalness: 0.14,
    clearcoat: isSoftwareGl || quality.tier === 'potato' || quality.tier === 'low' ? 0.15 : 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.92,
  });
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
         float caustic = pow(w1 * w2, 2.4) * 0.24;
         diffuseColor.rgb = mix(vec3(0.03, 0.17, 0.30), vec3(0.07, 0.36, 0.48), 0.35 + caustic);
         diffuseColor.rgb += vec3(0.18, 0.52, 0.65) * caustic;

         float dPlunge = length(vArenaWaterWorld.xz - vec2(0.0, -17.4));
         float foam = exp(-dPlunge * 0.45) * (0.55 + 0.45 * sin(dPlunge * 6.0 - uTime * 5.0));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.94, 1.0), clamp(foam, 0.0, 0.85));`,
      );
  };
  disposableGeos.push(waterGeo);
  disposableMats.push(waterMat);
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.y = -0.38;
  waterMesh.receiveShadow = shadows;
  group.add(waterMesh);

  // 5. Distant Mountain Waterfall Gorge Cascade (North vista behind Tile 91-100)
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
    color: 0x38bdf8,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.85,
    emissive: 0x0369a1,
    emissiveIntensity: 0.16,
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
         diffuseColor.rgb = mix(vec3(0.08, 0.44, 0.68), vec3(0.86, 0.96, 1.0), clamp(foam * 0.72 + bottomChurn, 0.0, 1.0));
         diffuseColor.a *= edgeFade;`,
      );
  };
  disposableGeos.push(fallGeo);
  disposableMats.push(waterfallMat);

  const cascadeMesh = new THREE.Mesh(fallGeo, waterfallMat);
  cascadeMesh.position.set(0, 2.0, -19.0);
  group.add(cascadeMesh);

  // Waterfall Mist Sprites (InstancedMesh -> 1 draw call!)
  const mistCount = 22;
  const mistGeo = new THREE.PlaneGeometry(2.1, 1.7);
  const mistMat = new THREE.MeshBasicMaterial({
    map: mistTex,
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

  // 6. Carved Ashlar Stone Runic Obelisks at Sanctuary Corners (PBR Masonry + Bronze + Subtle Lanterns)
  const ashlarMat = new THREE.MeshStandardMaterial({
    map: stonePbr.map,
    normalMap: stonePbr.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: stonePbr.roughnessMap,
    aoMap: stonePbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0x94a3b8,
    roughness: 0.76,
    metalness: 0.08,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.28,
    metalness: 0.86,
  });
  const warmLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });
  disposableMats.push(ashlarMat, bronzeMat, warmLanternMat);

  const plinthGeo = new THREE.CylinderGeometry(0.88, 1.12, 0.48, 8);
  const spireGeo = new THREE.CylinderGeometry(0.32, 0.62, 2.65, 8);
  const collarGeo = new THREE.TorusGeometry(0.54, 0.045, 8, 24);
  collarGeo.rotateX(Math.PI / 2);
  const lanternGeo = new THREE.OctahedronGeometry(0.28, 0);
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

    const spire = new THREE.Mesh(spireGeo, ashlarMat);
    spire.position.y = 1.78;
    spire.castShadow = shadows;
    spire.receiveShadow = shadows;
    obGroup.add(spire);
    obeliskMeshes.push(spire);

    const collar = new THREE.Mesh(collarGeo, bronzeMat);
    collar.position.y = 0.52;
    obGroup.add(collar);

    const cap = new THREE.Mesh(lanternGeo, warmLanternMat);
    cap.position.y = 3.45;
    obGroup.add(cap);

    group.add(obGroup);
  }

  // 7. Fractured Granite Boulders (3-tier LOD) & Instanced River Pebbles with World-Space Moss
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
    boulderLods.push(lod);
    group.add(lod);
  });

  const pebbleCount = 110;
  const pebbleGeo = createFracturedRockGeometry(0.42, 2, 47.9, 0.65);
  disposableGeos.push(pebbleGeo);
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, mossRockMat, pebbleCount);
  pebbleInst.castShadow = shadows && !quality.shadowImportantOnly;
  pebbleInst.receiveShadow = shadows;
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

  // 8. Realistic LOD Trees (Ancient Oaks & Highland Pines) + Instanced Wind-Swaying Ferns & Grass
  const barkMat = new THREE.MeshStandardMaterial({
    map: barkPbr.map,
    normalMap: barkPbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: barkPbr.roughnessMap,
    aoMap: barkPbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0xd6d3d1,
    roughness: 0.9,
    metalness: 0.03,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    map: foliageAtlas.map,
    normalMap: foliageAtlas.normalMap,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.68,
    metalness: 0.04,
  });
  applyWindShader(leafMat, uWindTime, 0.09, 1.6);

  const fernMat = new THREE.MeshStandardMaterial({
    map: foliageAtlas.map,
    normalMap: foliageAtlas.normalMap,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.03,
  });
  applyWindShader(fernMat, uWindTime, 0.07, 2.0);
  disposableMats.push(barkMat, leafMat, fernMat);

  // Place 18 varied Ancient Oaks & Highland Pines around outer bank (keeping front camera corridor open!)
  const treeCount = 18;
  const treeLods: THREE.LOD[] = [];
  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.07;
    if (Math.sin(angle) > 0.78 && Math.abs(Math.cos(angle)) < 0.55) continue;

    const r = 19.6 + ((i * 23) % 38) * 0.12;
    const tx = Math.cos(angle) * r;
    const tz = Math.sin(angle) * r;
    const ty = arenaGroundHeightAt(tx, tz);
    const scale = 0.88 + ((i * 17) % 30) * 0.012;
    const tree =
      i % 2 === 0
        ? createAncientOakTree(i * 1.3 + 1.0, barkMat, leafMat)
        : createHighlandPineTree(i * 1.7 + 2.0, barkMat, leafMat);
    tree.position.set(tx, ty, tz);
    tree.rotation.y = angle + i;
    tree.scale.setScalar(scale);
    treeLods.push(tree);
    group.add(tree);
  }

  // Instanced Woodland Fern Rosettes (80 bushes in 1 draw call!)
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

  const fernCount = 80;
  const fernInst = new THREE.InstancedMesh(fernRosetteGeo, fernMat, fernCount);
  fernInst.castShadow = shadows && !quality.shadowImportantOnly;
  fernInst.receiveShadow = shadows;
  for (let i = 0; i < fernCount; i++) {
    const a = (i / fernCount) * Math.PI * 2 + (i % 5) * 0.05;
    const r = 18.2 + ((i * 29) % 52) * 0.14;
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

  // Instanced Wind-Swaying Grass Tufts (320 tufts in 1 draw call!)
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
    color: 0x4d7c0f,
    roughness: 0.78,
    metalness: 0.02,
  });
  applyWindShader(grassMat, uWindTime, 0.08, 2.2);
  disposableMats.push(grassMat);

  const grassCount = 320;
  const grassInst = new THREE.InstancedMesh(grassTuftGeo, grassMat, grassCount);
  grassInst.receiveShadow = shadows;
  for (let i = 0; i < grassCount; i++) {
    const a = i * 2.39996;
    const r = 17.8 + Math.sqrt(i / grassCount) * 11.5;
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

  // 9. Ambient Floating Sanctuary Spores / Fireflies (InstancedMesh -> 1 draw call!)
  const sporeCount = 72;
  const sporeGeo = new THREE.OctahedronGeometry(0.06, 0);
  const sporeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  disposableGeos.push(sporeGeo);
  disposableMats.push(sporeMat);
  const sporeInst = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);
  sporeInst.frustumCulled = false;
  const sporeColors = [0xfde68a, 0x6ee7b7, 0x93c5fd];
  for (let i = 0; i < sporeCount; i++) {
    _color.setHex(sporeColors[i % sporeColors.length]);
    sporeInst.setColorAt(i, _color);
  }
  if (sporeInst.instanceColor) sporeInst.instanceColor.needsUpdate = true;
  group.add(sporeInst);

  // 10. Lazy/Async GLB Landmarks (skipped on Potato preset to save memory & bandwidth)
  let disposed = false;
  let vistaLoaded = false;
  const vistaGroup = new THREE.Group();
  group.add(vistaGroup);

  THREE.Cache.enabled = true;
  const manager = new THREE.LoadingManager();
  const draco = new DRACOLoader(manager);
  const gltfLoader = new GLTFLoader(manager);
  gltfLoader.setDRACOLoader(draco);

  const loadVistaGlbs = async () => {
    if (vistaLoaded || !currentQuality.loadVistaGlbs) return;
    vistaLoaded = true;
    let castle: THREE.Group;
    let cliffs: THREE.Group;
    try {
      const [cGltf, rGltf] = await Promise.all([
        gltfLoader.loadAsync('/models/fantasy_castle.glb'),
        gltfLoader.loadAsync('/models/cliff_outcrops.glb'),
      ]);
      castle = cGltf.scene;
      cliffs = rGltf.scene;
    } catch {
      castle = buildFantasyCastleGeometryGroup();
      cliffs = buildCliffFormationsGeometryGroup();
    }
    if (disposed) return;

    applyCastlePbrMaterials(castle, { stonePbr, slatePbr, timberPbr });
    castle.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = currentQuality.shadowsEnabled && !currentQuality.shadowImportantOnly;
        obj.receiveShadow = currentQuality.shadowsEnabled;
      }
    });
    castle.position.set(16.5, 2.2, -29.0);
    castle.rotation.y = -0.38;
    castle.scale.setScalar(1.35);
    vistaGroup.add(castle);

    cliffs.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        ensureUv2(mesh.geometry);
        mesh.material = mossRockMat;
        mesh.castShadow = currentQuality.shadowsEnabled && !currentQuality.shadowImportantOnly;
        mesh.receiveShadow = currentQuality.shadowsEnabled;
      }
    });
    cliffs.position.set(0, -0.4, -12.5);
    cliffs.scale.set(1.38, 1.18, 1.15);
    vistaGroup.add(cliffs);
    draco.dispose();
  };
  if (quality.loadVistaGlbs) {
    void loadVistaGlbs();
  }

  const applyQuality = (cfg: QualityConfig) => {
    currentQuality = cfg;
    const d = THREE.MathUtils.clamp(cfg.envDensity, 0.2, 1);
    const sh = cfg.shadowsEnabled;
    const impOnly = cfg.shadowImportantOnly;

    pebbleInst.count = Math.max(12, Math.round(pebbleCount * d));
    fernInst.count = Math.max(10, Math.round(fernCount * d));
    grassInst.count = Math.max(28, Math.round(grassCount * d));

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

    // Hide outer trees on Potato past 40% to save raster fill
    treeLods.forEach((tree, idx) => {
      tree.visible = cfg.tier === 'potato' ? idx % 2 === 0 : true;
    });

    vistaGroup.visible = cfg.loadVistaGlbs;
    if (cfg.loadVistaGlbs && !vistaLoaded) {
      void loadVistaGlbs();
    }
  };

  applyQuality(quality);
  scene.add(group);

  let lastSecondaryUpdate = -10;
  const update = (elapsed: number, reducedEffects: boolean) => {
    uTime.value = elapsed;
    uWindTime.value = elapsed;

    // Throttle mist & spore matrix rebuilds on Potato/Low to ~20 Hz while keeping smooth shader waves
    const minInterval = currentQuality.tier === 'potato' ? 0.055 : currentQuality.tier === 'low' ? 0.035 : 0;
    if (minInterval > 0 && elapsed - lastSecondaryUpdate < minInterval) {
      return;
    }
    lastSecondaryUpdate = elapsed;

    const pRatio = THREE.MathUtils.clamp(currentQuality.particleBudget / 128, 0.14, 1);
    const showMist = !reducedEffects && pRatio > 0.25 && currentQuality.tier !== 'potato';
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
      8,
      Math.round(sporeCount * pRatio * (reducedEffects ? 0.45 : 1)),
    );
    sporeInst.count = activeSpores;
    for (let i = 0; i < activeSpores; i++) {
      const a = (i / activeSpores) * Math.PI * 2 + elapsed * (0.04 + (i % 3) * 0.015);
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
    disposed = true;
    draco.dispose();
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
