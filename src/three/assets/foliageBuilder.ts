import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  createFoliageAtlasTextures,
  type PbrTextureSet,
} from './pbrTextures';
import { ensureUv2, groundHeightAt } from './rockTerrainBuilder';

export interface FoliageBuildOptions {
  texSize?: 256 | 512 | 1024;
  envDensity?: number;
  lodBias?: number;
  shadowsEnabled?: boolean;
}

export interface VegetationHandle {
  group: THREE.Group;
  updateWind: (elapsed: number) => void;
  applyQualityOptions: (opts: { envDensity: number; lodBias: number; shadowsEnabled: boolean }) => void;
  dispose: () => void;
}

const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

function createTaperedWoodGeo(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  rStart: number,
  rEnd: number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const count = (tubularSegments + 1) * (radialSegments + 1);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const norm = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);
    // Root flare at bottom 15%
    const flare = t < 0.16 ? 1 + Math.pow(1 - t / 0.16, 2) * 0.42 : 1;
    const r = THREE.MathUtils.lerp(rStart, rEnd, t) * flare;

    for (let j = 0; j <= radialSegments; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const cos = -Math.cos(a);
      const sin = Math.sin(a);
      // Subtle organic bark fluting near base
      const flute = t < 0.25 ? 1 + Math.sin(a * 5) * 0.12 * (1 - t / 0.25) : 1;
      norm.set(
        cos * N.x + sin * B.x,
        cos * N.y + sin * B.y,
        cos * N.z + sin * B.z,
      ).normalize();

      const idx = i * (radialSegments + 1) + j;
      positions[idx * 3] = P.x + r * flute * norm.x;
      positions[idx * 3 + 1] = P.y + r * flute * norm.y;
      positions[idx * 3 + 2] = P.z + r * flute * norm.z;
      normals[idx * 3] = norm.x;
      normals[idx * 3 + 1] = norm.y;
      normals[idx * 3 + 2] = norm.z;
      uvs[idx * 2] = j / radialSegments;
      uvs[idx * 2 + 1] = t;
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j;
      const b = (radialSegments + 1) * (i + 1) + j;
      const c = (radialSegments + 1) * (i + 1) + (j + 1);
      const d = (radialSegments + 1) * i + (j + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  ensureUv2(geo);
  return geo;
}

/**
 * Builds an arched, UV-mapped leaf-card quad pointing into a specific 2x2 atlas quadrant.
 * atlasCol: 0 (left) or 1 (right); atlasRow: 0 (top) or 1 (bottom).
 */
export function createArchedFoliageCard(
  width: number,
  height: number,
  atlasCol: 0 | 1,
  atlasRow: 0 | 1,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 3, 3);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  const uMin = atlasCol * 0.5 + 0.02;
  const uMax = (atlasCol + 1) * 0.5 - 0.02;
  // PlaneGeometry V runs bottom=0 -> top=1; CanvasTexture has flipY=true so top row is v [0.5..1]
  const vTop = atlasRow === 0 ? 0.98 : 0.48;
  const vBot = atlasRow === 0 ? 0.52 : 0.02;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = x / (width * 0.5);
    const ny = y / (height * 0.5);
    // Natural organic droop & cup curvature
    const droop = -(nx * nx * 0.14 + Math.max(0, ny) * 0.12) * height;
    pos.setZ(i, droop);

    const u = uv.getX(i);
    const v = uv.getY(i);
    uv.setXY(i, THREE.MathUtils.lerp(uMin, uMax, u), THREE.MathUtils.lerp(vBot, vTop, v));
  }

  geo.computeVertexNormals();
  ensureUv2(geo);
  return geo;
}

/**
 * Creates a crossed 3D leaf-cluster spray (3 intersecting arched cards rotated 60° apart)
 * so tree crowns read lush and volumetric from every camera angle without solid blobs!
 */
function createLeafClusterSprayGeo(
  width: number,
  height: number,
  atlasCol: 0 | 1,
  atlasRow: 0 | 1,
): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const card = createArchedFoliageCard(width, height, atlasCol, atlasRow);
    card.rotateX(0.32);
    card.rotateY((k * Math.PI) / 3);
    geos.push(card);
  }
  const merged = BufferGeometryUtils.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  ensureUv2(merged);
  return merged;
}

/**
 * Injects smooth GPU vertex wind-sway into foliage & grass materials.
 */
export function applyWindShader(
  mat: THREE.MeshStandardMaterial,
  uTime: { value: number },
  swayAmp: number,
  swayFreq: number,
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uTime;
    shader.uniforms.uSwayAmp = { value: swayAmp };
    shader.uniforms.uSwayFreq = { value: swayFreq };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uWindTime;
         uniform float uSwayAmp;
         uniform float uSwayFreq;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 windWp = vec4(transformed, 1.0);
         #ifdef USE_INSTANCING
           windWp = instanceMatrix * windWp;
         #endif
         windWp = modelMatrix * windWp;
         float gust = sin(uWindTime * uSwayFreq + windWp.x * 0.45 + windWp.z * 0.35);
         float flutter = cos(uWindTime * (uSwayFreq * 2.1) + windWp.y * 1.4 + windWp.x);
         float heightFactor = clamp(transformed.y * 0.5 + 0.5, 0.0, 1.0);
         transformed.x += (gust * 0.75 + flutter * 0.25) * uSwayAmp * heightFactor;
         transformed.z += (gust * 0.5 - flutter * 0.2) * uSwayAmp * heightFactor;`,
      );
  };
}

/**
 * Scales LOD threshold distances cleanly across any subtree of THREE.LOD nodes.
 */
export function applyLodBiasToGroup(root: THREE.Object3D, lodBias: number): void {
  const safeBias = THREE.MathUtils.clamp(lodBias, 0.35, 1.5);
  root.traverse((obj) => {
    if ((obj as THREE.LOD).isLOD) {
      const lod = obj as THREE.LOD;
      for (const lvl of lod.levels) {
        const baseDist = lvl.object.userData.baseLodDist as number | undefined;
        if (typeof baseDist === 'number') {
          lvl.distance = baseDist * safeBias;
        }
      }
    }
  });
}

function createCrossedTreeBillboard(
  width: number,
  height: number,
  centerY: number,
  atlasCol: 0 | 1,
  atlasRow: 0 | 1,
  mat: THREE.Material,
): THREE.Mesh {
  const p1 = createArchedFoliageCard(width, height, atlasCol, atlasRow);
  p1.translate(0, centerY, 0);
  const p2 = p1.clone();
  p2.rotateY(Math.PI / 2);
  const merged = BufferGeometryUtils.mergeGeometries([p1, p2], false);
  p1.dispose();
  p2.dispose();
  ensureUv2(merged);
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Builds Species 1: Ancient Fantasy Oak with buttress roots, gnarled primary & secondary boughs,
 * and crossed oak leaf sprays (LOD0 full / LOD1 simplified / LOD2 billboard impostor).
 */
export function createAncientOakTree(
  seed: number,
  barkMat: THREE.Material,
  leafMat: THREE.Material,
): THREE.LOD {
  const lod = new THREE.LOD();

  // --- LOD0: Detailed gnarled trunk + buttress roots + 4 primary boughs + dense leaf sprays ---
  const lod0 = new THREE.Group();
  const trunkGeos: THREE.BufferGeometry[] = [];
  const crownGeos: THREE.BufferGeometry[] = [];

  const leanX = Math.sin(seed * 2.1) * 0.32;
  const leanZ = Math.cos(seed * 1.7) * 0.28;
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.25, 0),
    new THREE.Vector3(leanX * 0.4, 1.2, leanZ * 0.4),
    new THREE.Vector3(leanX * 0.9, 2.5, leanZ * 0.8),
    new THREE.Vector3(leanX * 0.5, 3.6, leanZ * 0.5),
  ]);
  trunkGeos.push(createTaperedWoodGeo(trunkCurve, 12, 10, 0.36, 0.16));

  // 4 Buttress roots anchoring smoothly into soil
  for (let r = 0; r < 4; r++) {
    const ra = (r / 4) * Math.PI * 2 + seed;
    const rootCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(ra) * 0.15, 0.58, Math.sin(ra) * 0.15),
      new THREE.Vector3(Math.cos(ra) * 0.45, 0.18, Math.sin(ra) * 0.45),
      new THREE.Vector3(Math.cos(ra) * 0.85, -0.28, Math.sin(ra) * 0.85),
    ]);
    trunkGeos.push(createTaperedWoodGeo(rootCurve, 6, 6, 0.14, 0.035));
  }

  // 5 Spreading primary boughs + leaf clusters
  const tipSprayBase = createLeafClusterSprayGeo(1.75, 1.45, 0, 0);
  for (let b = 0; b < 5; b++) {
    const ba = (b / 5) * Math.PI * 2 + seed * 0.7;
    const startY = 2.3 + (b % 2) * 0.65;
    const reach = 1.45 + (b % 3) * 0.32;
    const tipY = startY + 1.25 + (b % 2) * 0.55;
    const tx = leanX * 0.6 + Math.cos(ba) * reach;
    const tz = leanZ * 0.6 + Math.sin(ba) * reach;

    const branchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(leanX * 0.65, startY, leanZ * 0.65),
      new THREE.Vector3(leanX * 0.65 + Math.cos(ba) * reach * 0.55, startY + 0.68, leanZ * 0.65 + Math.sin(ba) * reach * 0.55),
      new THREE.Vector3(tx, tipY, tz),
    ]);
    trunkGeos.push(createTaperedWoodGeo(branchCurve, 7, 6, 0.13, 0.04));

    // Attach 3 overlapping leaf-spray clusters around each bough tip
    for (let s = 0; s < 3; s++) {
      const sg = tipSprayBase.clone();
      const sa = ba + (s - 1) * 0.9;
      const sx = tx + Math.cos(sa) * 0.48;
      const sz = tz + Math.sin(sa) * 0.48;
      const sy = tipY + (s === 1 ? 0.36 : 0.05);
      sg.rotateY(sa + seed);
      sg.scale(0.85 + s * 0.12, 0.85 + s * 0.12, 0.85 + s * 0.12);
      sg.translate(sx, sy, sz);
      crownGeos.push(sg);
    }
  }
  // Upper apex spray
  const apex = tipSprayBase.clone();
  apex.scale(1.25, 1.15, 1.25);
  apex.translate(leanX * 0.5, 4.45, leanZ * 0.5);
  crownGeos.push(apex);
  tipSprayBase.dispose();

  const mergedWood0 = BufferGeometryUtils.mergeGeometries(trunkGeos, false);
  trunkGeos.forEach((g) => g.dispose());
  ensureUv2(mergedWood0);
  const woodMesh0 = new THREE.Mesh(mergedWood0, barkMat);
  woodMesh0.castShadow = true;
  woodMesh0.receiveShadow = true;
  lod0.add(woodMesh0);

  const mergedCrown0 = BufferGeometryUtils.mergeGeometries(crownGeos, false);
  crownGeos.forEach((g) => g.dispose());
  ensureUv2(mergedCrown0);
  const crownMesh0 = new THREE.Mesh(mergedCrown0, leafMat);
  crownMesh0.castShadow = true;
  crownMesh0.receiveShadow = true;
  lod0.add(crownMesh0);

  // --- LOD1: Lightweight silhouette for medium distance trees ---
  const lod1 = new THREE.Group();
  const simpleTrunk = createTaperedWoodGeo(trunkCurve, 5, 6, 0.36, 0.16);
  const sWood = new THREE.Mesh(simpleTrunk, barkMat);
  sWood.castShadow = true;
  lod1.add(sWood);

  const simpleSpray = createLeafClusterSprayGeo(3.2, 2.5, 0, 0);
  simpleSpray.translate(leanX * 0.5, 3.85, leanZ * 0.5);
  const sCrown = new THREE.Mesh(simpleSpray, leafMat);
  sCrown.castShadow = true;
  lod1.add(sCrown);

  // --- LOD2: Ultra-light crossed billboard impostor for distant horizon ---
  const lod2 = createCrossedTreeBillboard(4.2, 4.6, 2.6, 0, 0, leafMat);

  lod0.userData.baseLodDist = 0;
  lod1.userData.baseLodDist = 20;
  lod2.userData.baseLodDist = 33;

  lod.addLevel(lod0, 0);
  lod.addLevel(lod1, 20);
  lod.addLevel(lod2, 33);
  return lod;
}

/**
 * Builds Species 2: Highland Pine with straight fluted trunk & tiered drooping needle bough whorls.
 */
export function createHighlandPineTree(
  seed: number,
  barkMat: THREE.Material,
  pineMat: THREE.Material,
): THREE.LOD {
  const lod = new THREE.LOD();
  const lod0 = new THREE.Group();

  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.25, 0),
    new THREE.Vector3(Math.sin(seed) * 0.12, 2.6, Math.cos(seed) * 0.12),
    new THREE.Vector3(0, 5.8, 0),
  ]);
  const trunkGeo = createTaperedWoodGeo(trunkCurve, 10, 8, 0.28, 0.045);
  const trunkMesh = new THREE.Mesh(trunkGeo, barkMat);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  lod0.add(trunkMesh);

  const boughBase = createArchedFoliageCard(1.4, 2.0, 1, 0);
  const needleGeos: THREE.BufferGeometry[] = [];
  const tiers = 5;
  for (let tier = 0; tier < tiers; tier++) {
    const tf = tier / (tiers - 1);
    const y = 2.0 + tf * 3.35;
    const count = 6 - Math.floor(tf * 2);
    const radiusScale = 1.15 - tf * 0.62;
    for (let b = 0; b < count; b++) {
      const a = (b / count) * Math.PI * 2 + tier * 0.65 + seed;
      const card = boughBase.clone();
      card.translate(0, 0.9, 0);
      card.rotateX(1.18 + tf * 0.14); // droop outward gracefully
      card.rotateY(a);
      card.scale(radiusScale, radiusScale, radiusScale);
      card.translate(Math.sin(a) * 0.15, y, Math.cos(a) * 0.15);
      needleGeos.push(card);
    }
  }
  boughBase.dispose();

  const mergedNeedles0 = BufferGeometryUtils.mergeGeometries(needleGeos, false);
  needleGeos.forEach((g) => g.dispose());
  ensureUv2(mergedNeedles0);
  const needles0 = new THREE.Mesh(mergedNeedles0, pineMat);
  needles0.castShadow = true;
  needles0.receiveShadow = true;
  lod0.add(needles0);

  // LOD1 simplified pine
  const lod1 = new THREE.Group();
  const sTrunk = new THREE.Mesh(trunkGeo.clone(), barkMat);
  lod1.add(sTrunk);
  const sConeCrown = createLeafClusterSprayGeo(2.5, 3.6, 1, 0);
  sConeCrown.translate(0, 3.9, 0);
  const sCrown = new THREE.Mesh(sConeCrown, pineMat);
  sCrown.castShadow = true;
  lod1.add(sCrown);

  // LOD2 ultra-light billboard impostor
  const lod2 = createCrossedTreeBillboard(3.4, 5.2, 3.1, 1, 0, pineMat);

  lod0.userData.baseLodDist = 0;
  lod1.userData.baseLodDist = 22;
  lod2.userData.baseLodDist = 34;

  lod.addLevel(lod0, 0);
  lod.addLevel(lod1, 22);
  lod.addLevel(lod2, 34);
  return lod;
}

/**
 * Builds the entire Main Menu Forest:
 * - Natural Ancient Oaks & Highland Pines with 3-tier LOD (including billboard LOD2) + wind sway
 * - InstancedMesh Curved Grass Tufts (scalable count)
 * - InstancedMesh Woodland Fern Bushes (scalable count)
 */
export function buildForestVegetation(
  maxAnisotropy: number,
  barkPbr: PbrTextureSet,
  options: FoliageBuildOptions = {},
): VegetationHandle {
  const group = new THREE.Group();
  group.name = 'forest_vegetation';

  const texSize = options.texSize ?? 1024;
  const initialDensity = THREE.MathUtils.clamp(options.envDensity ?? 1, 0.15, 1);
  const initialLodBias = options.lodBias ?? 1;
  const initialShadows = options.shadowsEnabled !== false;

  const uWindTime = { value: 0 };
  const atlas = createFoliageAtlasTextures(maxAnisotropy, texSize);

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

  const foliageMat = new THREE.MeshStandardMaterial({
    map: atlas.map,
    normalMap: atlas.normalMap,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.68,
    metalness: 0.04,
  });
  applyWindShader(foliageMat, uWindTime, 0.095, 1.65);

  const fernMat = new THREE.MeshStandardMaterial({
    map: atlas.map,
    normalMap: atlas.normalMap,
    alphaTest: 0.38,
    side: THREE.DoubleSide,
    roughness: 0.64,
    metalness: 0.03,
  });
  applyWindShader(fernMat, uWindTime, 0.075, 2.05);

  const treeSpecs: Array<{
    x: number;
    z: number;
    scale: number;
    species: 'oak' | 'pine';
    seed: number;
  }> = [
    { x: -11.4, z: 3.4, scale: 1.08, species: 'oak', seed: 1.1 },
    { x: -13.2, z: -1.8, scale: 1.18, species: 'pine', seed: 2.4 },
    { x: -10.5, z: -6.8, scale: 1.02, species: 'oak', seed: 3.2 },
    { x: -8.6, z: -12.4, scale: 1.26, species: 'pine', seed: 4.7 },
    { x: -15.4, z: -7.5, scale: 1.32, species: 'pine', seed: 5.3 },
    { x: 11.2, z: -2.4, scale: 1.05, species: 'oak', seed: 6.1 },
    { x: 14.2, z: -6.2, scale: 1.24, species: 'pine', seed: 7.5 },
    { x: 12.6, z: 3.2, scale: 0.95, species: 'oak', seed: 8.8 },
    { x: 15.8, z: -11.4, scale: 1.3, species: 'pine', seed: 9.4 },
    { x: 3.8, z: -14.2, scale: 1.15, species: 'pine', seed: 10.6 },
    { x: -3.9, z: -14.8, scale: 1.12, species: 'oak', seed: 11.2 },
    { x: -9.8, z: 7.5, scale: 0.98, species: 'pine', seed: 12.1 },
  ];

  const treeNodes: THREE.LOD[] = [];
  for (const t of treeSpecs) {
    const y = groundHeightAt(t.x, t.z);
    const tree =
      t.species === 'oak'
        ? createAncientOakTree(t.seed, barkMat, foliageMat)
        : createHighlandPineTree(t.seed, barkMat, foliageMat);
    tree.position.set(t.x, y, t.z);
    tree.rotation.y = t.seed * 1.37;
    tree.scale.setScalar(t.scale);
    treeNodes.push(tree);
    group.add(tree);
  }

  // 2. Instanced Woodland Fern Bushes (96 multi-frond rosettes in 1 draw call!)
  const frondGeo = createArchedFoliageCard(0.82, 1.05, 0, 1);
  const fernParts: THREE.BufferGeometry[] = [];
  for (let f = 0; f < 5; f++) {
    const a = (f / 5) * Math.PI * 2;
    const fg = frondGeo.clone();
    fg.translate(0, 0.48, 0);
    fg.rotateX(0.95);
    fg.rotateY(a);
    fernParts.push(fg);
  }
  frondGeo.dispose();
  const fernRosetteGeo = BufferGeometryUtils.mergeGeometries(fernParts, false);
  fernParts.forEach((g) => g.dispose());
  ensureUv2(fernRosetteGeo);

  const fernCount = 96;
  const fernInst = new THREE.InstancedMesh(fernRosetteGeo, fernMat, fernCount);
  fernInst.castShadow = initialShadows;
  fernInst.receiveShadow = initialShadows;

  let placedFerns = 0;
  for (let i = 0; i < 240 && placedFerns < fernCount; i++) {
    const a = i * 2.39996;
    const r = 3.2 + Math.sqrt(i / 240) * 14.5;
    const x = Math.cos(a) * r * 1.12;
    const z = Math.sin(a) * r * 0.86 - 2.2;
    const y = groundHeightAt(x, z);
    const distDragon = Math.hypot(x + 4.35, z - 2.2);
    if (y < 0.08 || distDragon < 3.15) continue;

    const s = 0.72 + ((i * 13) % 7) * 0.1;
    _vec3.set(x, y - 0.04, z);
    _euler.set(0, a, 0);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s, s, s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    fernInst.setMatrixAt(placedFerns, _mat4);

    const gShift = 0.78 + ((i * 7) % 5) * 0.06;
    _color.setRGB(gShift * 0.9, gShift * 1.05, gShift * 0.85);
    fernInst.setColorAt(placedFerns, _color);
    placedFerns++;
  }
  fernInst.instanceMatrix.needsUpdate = true;
  if (fernInst.instanceColor) fernInst.instanceColor.needsUpdate = true;
  fernInst.computeBoundingSphere();
  group.add(fernInst);

  // 3. Instanced Curved Grass Tufts (380 tufts in 1 draw call!)
  const bladeGeos: THREE.BufferGeometry[] = [];
  for (let b = 0; b < 5; b++) {
    const ba = (b / 5) * Math.PI * 2;
    const blade = new THREE.ConeGeometry(0.055, 0.58, 3, 2);
    blade.translate(0, 0.29, 0);
    blade.rotateZ(0.24);
    blade.rotateY(ba);
    blade.translate(Math.cos(ba) * 0.06, 0, Math.sin(ba) * 0.06);
    ensureUv2(blade);
    bladeGeos.push(blade);
  }
  const grassTuftGeo = BufferGeometryUtils.mergeGeometries(bladeGeos, false);
  bladeGeos.forEach((g) => g.dispose());
  ensureUv2(grassTuftGeo);

  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f,
    roughness: 0.76,
    metalness: 0.02,
  });
  applyWindShader(grassMat, uWindTime, 0.085, 2.3);

  const grassCount = 380;
  const grassInst = new THREE.InstancedMesh(grassTuftGeo, grassMat, grassCount);
  grassInst.receiveShadow = initialShadows;

  let placedGrass = 0;
  for (let i = 0; i < 680 && placedGrass < grassCount; i++) {
    const a = i * 2.39996 + 0.5;
    const r = 2.4 + Math.sqrt(i / 680) * 16.5;
    const x = Math.cos(a) * r * 1.15;
    const z = Math.sin(a) * r * 0.88 - 2.0;
    const y = groundHeightAt(x, z);
    const distDragon = Math.hypot(x + 4.35, z - 2.2);
    if (y < 0.05 || distDragon < 3.0) continue;

    const s = 0.75 + ((i * 19) % 8) * 0.09;
    _vec3.set(x, y - 0.03, z);
    _euler.set(0, a * 1.7, 0);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s, s * (0.85 + (i % 3) * 0.2), s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    grassInst.setMatrixAt(placedGrass, _mat4);

    const shade = 0.65 + ((i * 11) % 6) * 0.08;
    _color.setRGB(shade * 0.72, shade * 1.05, shade * 0.58);
    grassInst.setColorAt(placedGrass, _color);
    placedGrass++;
  }
  grassInst.instanceMatrix.needsUpdate = true;
  if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
  grassInst.computeBoundingSphere();
  group.add(grassInst);

  const applyQualityOptions = (opts: {
    envDensity: number;
    lodBias: number;
    shadowsEnabled: boolean;
  }) => {
    const d = THREE.MathUtils.clamp(opts.envDensity, 0.15, 1);
    fernInst.count = Math.max(8, Math.round(placedFerns * d));
    grassInst.count = Math.max(24, Math.round(placedGrass * d));
    fernInst.castShadow = opts.shadowsEnabled && d >= 0.6;
    fernInst.receiveShadow = opts.shadowsEnabled;
    grassInst.receiveShadow = opts.shadowsEnabled;
    applyLodBiasToGroup(group, opts.lodBias);
    for (const tree of treeNodes) {
      tree.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = opts.shadowsEnabled;
          obj.receiveShadow = opts.shadowsEnabled;
        }
      });
    }
  };

  applyQualityOptions({
    envDensity: initialDensity,
    lodBias: initialLodBias,
    shadowsEnabled: initialShadows,
  });

  const updateWind = (elapsed: number) => {
    uWindTime.value = elapsed;
  };

  const dispose = () => {
    atlas.map.dispose();
    atlas.normalMap.dispose();
    barkMat.dispose();
    foliageMat.dispose();
    fernMat.dispose();
    grassMat.dispose();
    fernRosetteGeo.dispose();
    grassTuftGeo.dispose();
  };

  return { group, updateWind, applyQualityOptions, dispose };
}
