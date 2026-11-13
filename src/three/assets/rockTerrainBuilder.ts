import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PbrTextureSet } from './pbrTextures';

const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

// Deterministic 3D value noise for ridged cliff & boulder sculpting (zero DOM deps)
function hash3(x: number, y: number, z: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453123;
  return n - Math.floor(n);
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz, seed);
  const n100 = hash3(ix + 1, iy, iz, seed);
  const n010 = hash3(ix, iy + 1, iz, seed);
  const n110 = hash3(ix + 1, iy + 1, iz, seed);
  const n001 = hash3(ix, iy, iz + 1, seed);
  const n101 = hash3(ix + 1, iy, iz + 1, seed);
  const n011 = hash3(ix, iy + 1, iz + 1, seed);
  const n111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const nx00 = n000 * (1 - ux) + n100 * ux;
  const nx10 = n010 * (1 - ux) + n110 * ux;
  const nx01 = n001 * (1 - ux) + n101 * ux;
  const nx11 = n011 * (1 - ux) + n111 * ux;

  const nxy0 = nx00 * (1 - uy) + nx10 * uy;
  const nxy1 = nx01 * (1 - uy) + nx11 * uy;

  return nxy0 * (1 - uz) + nxy1 * uz;
}

function ridgedFbm3(x: number, y: number, z: number, seed: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < 4; i++) {
    const n = noise3(x * freq, y * freq, z * freq, seed + i * 29.1);
    const ridge = 1 - Math.abs(n * 2 - 1);
    sum += amp * ridge * ridge;
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum / norm;
}

/**
 * Shared ground elevation sampler across the Sanctuary Valley so all trees, rocks,
 * ferns, grass, and structures anchor cleanly to the terrain without floating.
 */
export function groundHeightAt(x: number, z: number): number {
  // 1. Central lagoon depression centered around (0, -4.4), elongated gently
  const lx = x / 7.8;
  const lz = (z + 4.35) / 5.4;
  const lagoonDist = Math.sqrt(lx * lx + lz * lz);
  const lagoonBasin = lagoonDist < 1.25 ? -1.42 * Math.pow(Math.max(0, 1 - lagoonDist / 1.25), 1.45) : 0;

  // Outflow stream winding slightly from lagoon toward foreground right
  const streamCenter = 1.6 + Math.sin(z * 0.25) * 1.1;
  const streamDist = Math.abs(x - streamCenter);
  const inStreamZone = z > -0.5 && z < 16 ? Math.max(0, 1 - streamDist / 2.2) : 0;
  const streamCarve = -0.62 * inStreamZone * inStreamZone;

  // 2. Dragon sanctuary knoll on the left foreground (-4.35, 2.2)
  const dx = (x + 4.35) / 3.8;
  const dz = (z - 2.2) / 3.8;
  const dragonDist = Math.sqrt(dx * dx + dz * dz);
  const dragonMound = dragonDist < 1.35 ? 0.58 * Math.pow(Math.max(0, 1 - dragonDist / 1.35), 1.6) : 0;

  // 3. Elevated castle plateau on the back-right (7.8, -11.5)
  const cx = (x - 7.8) / 6.2;
  const cz = (z + 11.5) / 5.5;
  const castleDist = Math.sqrt(cx * cx + cz * cz);
  const castlePlateau = castleDist < 1.35 ? 3.85 * Math.min(1, Math.pow(Math.max(0, 1 - castleDist / 1.35), 0.75) * 1.55) : 0;

  // 4. Backdrop waterfall gorge cliffs (z < -8.2)
  const gorgeWall =
    z < -8.2
      ? Math.min(6.4, (-8.2 - z) * 0.85) * (0.68 + 0.32 * Math.sin(x * 0.22 + 0.8))
      : 0;
  // Carve central waterfall spillway chute around x = 0
  const chuteMask = z < -6.5 ? Math.exp(-Math.pow(x / 2.4, 2)) : 0;

  // 5. Rolling valley flanks & organic micro-undulation
  const rValley = Math.sqrt(x * x + (z + 2) * (z + 2));
  const flankRise = Math.max(0, rValley - 13.5) * 0.14;
  const micro =
    0.26 * Math.sin(x * 0.31 + 0.4) * Math.cos(z * 0.27 - 0.3) +
    0.11 * Math.sin(x * 0.85 - z * 0.62);

  return (
    lagoonBasin +
    streamCarve +
    dragonMound +
    Math.max(castlePlateau, gorgeWall * (1 - chuteMask * 0.42)) +
    flankRise +
    micro * (1 - Math.min(1, Math.abs(lagoonBasin)))
  );
}

/**
 * Ensures UV2 exists on BufferGeometry so Three.js aoMap samples cleanly.
 */
export function ensureUv2(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geo.attributes.uv2 && geo.attributes.uv) {
    geo.setAttribute('uv2', geo.attributes.uv.clone());
  }
  return geo;
}

/**
 * Creates a smooth sculpted organic fractured rock/boulder BufferGeometry
 * using 3D ridged FBM + planar strata cleavage (never low-poly flatShading).
 */
export function createFracturedRockGeometry(
  radius: number,
  detail: number,
  seed: number,
  ySquash = 0.76,
): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;

  const p = new THREE.Vector3();
  const planeA = new THREE.Vector3(
    Math.sin(seed * 1.3),
    0.65,
    Math.cos(seed * 0.9),
  ).normalize();
  const planeB = new THREE.Vector3(
    Math.cos(seed * 2.1),
    0.35,
    -Math.sin(seed * 1.7),
  ).normalize();

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();

    const fbm = ridgedFbm3(p.x * 1.6 + seed * 0.31, p.y * 1.6, p.z * 1.6 - seed * 0.19, seed);
    const strata = Math.sin(p.y * 8.5 + fbm * 2.2) * 0.055;

    // Subtle cleavage flattening on two mineral fracture planes
    const dA = Math.abs(p.dot(planeA));
    const dB = Math.abs(p.dot(planeB));
    const bevelA = dA > 0.72 ? (dA - 0.72) * 0.45 : 0;
    const bevelB = dB > 0.76 ? (dB - 0.76) * 0.38 : 0;

    const disp = (0.76 + fbm * 0.44 + strata - bevelA - bevelB) * radius;
    const x = p.x * disp;
    const y = Math.max(-radius * 0.42, p.y * disp * ySquash);
    const z = p.z * disp;
    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  ensureUv2(geo);
  return geo;
}

/**
 * Creates a sculpted valley terrain mesh with vertex-color biome transitions:
 * Wet river slate near water, lush emerald forest moss on valley floors, granite on steep cliffs.
 */
export function createSculptedTerrain(
  terrainPbr: PbrTextureSet,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(66, 60, 128, 120);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i) - 3.0; // Shift center slightly into background
    pos.setZ(i, z);
    pos.setY(i, groundHeightAt(x, z));
  }
  geo.computeVertexNormals();
  ensureUv2(geo);

  // Paint biomechanical vertex colors based on elevation, slope normal.y, and water proximity
  const norm = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const mossCol = new THREE.Color(0x285430);
  const lushCol = new THREE.Color(0x3a6b35);
  const mudStoneCol = new THREE.Color(0x36414d);
  const cliffCol = new THREE.Color(0x475569);
  const workCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = norm.getY(i);

    // Base biome by slope (flat = mossy soil, steep = granite cliff)
    const slopeT = THREE.MathUtils.smoothstep(ny, 0.52, 0.88);
    const noiseTint = 0.5 + 0.5 * Math.sin(x * 0.45 + z * 0.35);
    workCol.copy(mossCol).lerp(lushCol, noiseTint);
    const finalCol = new THREE.Color().copy(cliffCol).lerp(workCol, slopeT);

    // Wet shoreline & submerged river bed darkening
    if (y < 0.22) {
      const wetT = THREE.MathUtils.smoothstep(y, -0.8, 0.22);
      finalCol.lerp(mudStoneCol, 1 - wetT);
    }

    colors[i * 3] = finalCol.r;
    colors[i * 3 + 1] = finalCol.g;
    colors[i * 3 + 2] = finalCol.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    map: terrainPbr.map,
    normalMap: terrainPbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: terrainPbr.roughnessMap,
    aoMap: terrainPbr.aoMap,
    aoMapIntensity: 0.9,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.03,
  });

  const terrain = new THREE.Mesh(geo, mat);
  terrain.name = 'valley_terrain';
  terrain.receiveShadow = true;
  return terrain;
}

/**
 * Custom PBR rock material enhanced with world-space upward moss accumulation
 * via onBeforeCompile so cliffs and boulders naturally grow moss on top ledges.
 */
export function createWorldMossRockMaterial(rockPbr: PbrTextureSet): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    map: rockPbr.map,
    normalMap: rockPbr.normalMap,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughnessMap: rockPbr.roughnessMap,
    aoMap: rockPbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0xdbeafe,
    roughness: 0.88,
    metalness: 0.04,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRockWorldPos;
         varying vec3 vRockWorldNormal;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vec4 rockWp = vec4(transformed, 1.0);
         #ifdef USE_INSTANCING
           rockWp = instanceMatrix * rockWp;
         #endif
         rockWp = modelMatrix * rockWp;
         vRockWorldPos = rockWp.xyz;
         vec3 rockWn = objectNormal;
         #ifdef USE_INSTANCING
           rockWn = mat3(instanceMatrix) * rockWn;
         #endif
         vRockWorldNormal = normalize(mat3(modelMatrix) * rockWn);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRockWorldPos;
         varying vec3 vRockWorldNormal;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float upFacing = smoothstep(0.45, 0.88, vRockWorldNormal.y);
         float mossVar = 0.5 + 0.5 * sin(vRockWorldPos.x * 1.7 + vRockWorldPos.z * 1.3);
         float wetBand = 1.0 - smoothstep(-0.35, 0.35, vRockWorldPos.y);
         vec3 mossTint = mix(vec3(0.11, 0.27, 0.12), vec3(0.18, 0.36, 0.14), mossVar);
         diffuseColor.rgb = mix(diffuseColor.rgb, mossTint, upFacing * 0.58 * (1.0 - wetBand * 0.7));
         diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.52, wetBand * 0.55);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         float wetZone = 1.0 - smoothstep(-0.25, 0.4, vRockWorldPos.y);
         roughnessFactor = mix(roughnessFactor, 0.22, wetZone * 0.72);`,
      );
  };

  return mat;
}

/**
 * Pure geometry builder for the cliff gorge outcrops (safe to bake into cliff_outcrops.glb in Node!).
 * Names every mesh 'cliff_rock' so runtime asset loader binds PBR rock+moss materials automatically.
 */
export function buildCliffFormationsGeometryGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'cliff_outcrops_root';

  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.85,
  });

  const cliffSpecs: Array<{
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
    scale: [number, number, number];
    seed: number;
    detail: number;
  }> = [
    // Left waterfall gorge monoliths
    { x: -5.4, y: 3.1, z: -10.8, rx: 0.1, ry: 0.4, rz: -0.08, scale: [3.2, 4.4, 2.8], seed: 1.7, detail: 4 },
    { x: -8.6, y: 2.3, z: -9.5, rx: -0.1, ry: 1.1, rz: 0.12, scale: [2.7, 3.6, 2.5], seed: 2.3, detail: 3 },
    { x: -3.2, y: 2.4, z: -11.8, rx: 0.08, ry: 0.7, rz: 0.05, scale: [2.1, 3.4, 2.2], seed: 3.1, detail: 3 },
    // Right waterfall gorge & castle foundation buttresses
    { x: 4.8, y: 3.3, z: -11.0, rx: 0.06, ry: -0.5, rz: 0.1, scale: [3.4, 4.7, 2.9], seed: 4.4, detail: 4 },
    { x: 8.6, y: 2.9, z: -10.6, rx: -0.05, ry: 0.3, rz: -0.08, scale: [4.2, 3.5, 3.4], seed: 5.9, detail: 3 },
    { x: 12.2, y: 2.2, z: -8.8, rx: 0.12, ry: 0.9, rz: 0.1, scale: [2.8, 3.0, 2.7], seed: 6.8, detail: 3 },
    // Upper spillway lip rocks behind cascade
    { x: 0.0, y: 5.4, z: -12.6, rx: 0.05, ry: 0.2, rz: 0, scale: [4.8, 2.1, 2.3], seed: 7.5, detail: 3 },
    { x: -1.8, y: 4.7, z: -11.4, rx: 0.14, ry: -0.4, rz: 0.09, scale: [1.4, 1.3, 1.4], seed: 8.2, detail: 3 },
    { x: 1.9, y: 4.8, z: -11.3, rx: -0.1, ry: 0.6, rz: -0.1, scale: [1.5, 1.4, 1.5], seed: 9.1, detail: 3 },
    // Flanking foreground cliff spurs
    { x: -12.5, y: 1.2, z: -3.5, rx: 0.08, ry: 0.8, rz: -0.1, scale: [2.6, 2.4, 2.5], seed: 10.4, detail: 3 },
    { x: 13.4, y: 1.4, z: -2.2, rx: -0.06, ry: -0.7, rz: 0.08, scale: [2.5, 2.5, 2.4], seed: 11.7, detail: 3 },
  ];

  const geos: THREE.BufferGeometry[] = [];
  for (const s of cliffSpecs) {
    const g = createFracturedRockGeometry(1.0, s.detail, s.seed, 0.85);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(s.x, s.y, s.z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(s.rx, s.ry, s.rz)),
      new THREE.Vector3(s.scale[0], s.scale[1], s.scale[2]),
    );
    g.applyMatrix4(m);
    geos.push(g);
  }

  const mergedCliffs = BufferGeometryUtils.mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  ensureUv2(mergedCliffs);

  const mesh = new THREE.Mesh(mergedCliffs, placeholderMat);
  mesh.name = 'cliff_rock';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}

/**
 * Pure geometry builder for the carved octagonal sanctuary dais beneath the Dragon
 * (safe to bake into sanctuary_pedestal.glb in Node!).
 */
export function buildSanctuaryPedestalGeometryGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'sanctuary_pedestal_root';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.34, metalness: 0.82 });
  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.4,
  });

  const stoneGeos: THREE.BufferGeometry[] = [];
  const addCyl = (rt: number, rb: number, h: number, segs: number, y: number, bevel = 0) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, segs, 1);
    g.translate(0, y, 0);
    if (bevel > 0) g.rotateY(Math.PI / segs);
    ensureUv2(g);
    stoneGeos.push(g);
  };

  // Stepped octagonal foundation + beveled plinth + upper carved altar cap
  addCyl(2.95, 3.35, 0.42, 8, 0.21);
  addCyl(2.58, 2.86, 0.38, 8, 0.61);
  addCyl(2.26, 2.48, 0.34, 8, 0.96);
  addCyl(2.38, 2.28, 0.16, 16, 1.2);

  // 8 carved corner stone brackets
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const bx = Math.cos(a) * 2.48;
    const bz = Math.sin(a) * 2.48;
    const pillar = new THREE.BoxGeometry(0.32, 0.85, 0.42);
    pillar.rotateY(-a + Math.PI / 2);
    pillar.translate(bx, 0.62, bz);
    ensureUv2(pillar);
    stoneGeos.push(pillar);
  }

  const mergedStone = BufferGeometryUtils.mergeGeometries(stoneGeos, false);
  stoneGeos.forEach((g) => g.dispose());
  ensureUv2(mergedStone);
  const stoneMesh = new THREE.Mesh(mergedStone, stoneMat);
  stoneMesh.name = 'pedestal_stone';
  stoneMesh.castShadow = true;
  stoneMesh.receiveShadow = true;
  group.add(stoneMesh);

  // Bronze/Gold carved trim rings
  const trimGeos: THREE.BufferGeometry[] = [];
  const ringTop = new THREE.TorusGeometry(2.29, 0.055, 10, 40);
  ringTop.rotateX(Math.PI / 2);
  ringTop.translate(0, 1.27, 0);
  ensureUv2(ringTop);
  trimGeos.push(ringTop);

  const ringMid = new THREE.TorusGeometry(2.52, 0.04, 10, 40);
  ringMid.rotateX(Math.PI / 2);
  ringMid.translate(0, 0.81, 0);
  ensureUv2(ringMid);
  trimGeos.push(ringMid);

  const mergedTrim = BufferGeometryUtils.mergeGeometries(trimGeos, false);
  trimGeos.forEach((g) => g.dispose());
  ensureUv2(mergedTrim);
  const trimMesh = new THREE.Mesh(mergedTrim, goldMat);
  trimMesh.name = 'pedestal_gold';
  trimMesh.castShadow = true;
  group.add(trimMesh);

  // Subtle recessed emerald rune ring on pedestal surface
  const runeGeo = new THREE.RingGeometry(1.78, 1.9, 32);
  runeGeo.rotateX(-Math.PI / 2);
  runeGeo.translate(0, 1.288, 0);
  ensureUv2(runeGeo);
  const runeMesh = new THREE.Mesh(runeGeo, runeMat);
  runeMesh.name = 'pedestal_rune';
  group.add(runeMesh);

  return group;
}

/**
 * Builds instanced shoreline boulders, moss rocks, and river pebbles grounded
 * flush to groundHeightAt(x, z), with LOD for larger foreground boulders.
 */
export function buildShoreBouldersAndPebbles(
  rockPbr: PbrTextureSet,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'shore_rocks';
  const rockMat = createWorldMossRockMaterial(rockPbr);

  // 1. Hero foreground / shoreline boulders with LOD (high detail close, medium far)
  const heroGeoHigh = createFracturedRockGeometry(1.0, 3, 21.4, 0.72);
  const heroGeoLow = createFracturedRockGeometry(1.0, 2, 21.4, 0.72);

  const heroPlacements: Array<[number, number, number, number, number, number]> = [
    // [x, z, sx, sy, sz, rotY]
    [-7.3, 1.4, 1.35, 0.95, 1.15, 0.5],
    [-6.6, -2.5, 1.15, 0.82, 1.0, 1.9],
    [-2.4, -0.4, 0.92, 0.62, 0.85, 0.8],
    [4.4, -1.3, 1.25, 0.85, 1.1, 2.4],
    [6.9, -4.6, 1.45, 1.05, 1.25, 1.2],
    [-5.8, -6.8, 1.5, 1.15, 1.3, 0.3],
    [5.2, -7.2, 1.55, 1.2, 1.35, 2.8],
    [3.8, 3.8, 1.05, 0.72, 0.95, 1.1],
    [-8.9, 4.2, 1.4, 0.9, 1.2, 0.9],
  ];

  for (const [x, z, sx, sy, sz, rotY] of heroPlacements) {
    const lod = new THREE.LOD();
    const y = groundHeightAt(x, z) - sy * 0.14;
    const mHigh = new THREE.Mesh(heroGeoHigh, rockMat);
    mHigh.castShadow = true;
    mHigh.receiveShadow = true;
    const mLow = new THREE.Mesh(heroGeoLow, rockMat);
    mLow.castShadow = true;
    mLow.receiveShadow = true;

    lod.addLevel(mHigh, 0);
    lod.addLevel(mLow, 22);
    lod.position.set(x, y, z);
    lod.rotation.y = rotY;
    lod.scale.set(sx, sy, sz);
    group.add(lod);
  }

  // 2. Instanced river pebbles & clustered rock debris (140 instances -> 1 draw call!)
  const pebbleCount = 140;
  const pebbleGeo = createFracturedRockGeometry(0.45, 2, 47.9, 0.65);
  const pebbleInst = new THREE.InstancedMesh(pebbleGeo, rockMat, pebbleCount);
  pebbleInst.castShadow = true;
  pebbleInst.receiveShadow = true;

  for (let i = 0; i < pebbleCount; i++) {
    const angle = i * 2.39996;
    const ring = 2.6 + Math.sqrt(i / pebbleCount) * 12.5;
    const x = Math.cos(angle) * ring * 1.15;
    const z = Math.sin(angle) * ring * 0.85 - 2.6;
    const y = groundHeightAt(x, z) - 0.05;

    const s = 0.35 + ((i * 17) % 10) * 0.085;
    _vec3.set(x, y, z);
    _euler.set((i % 5) * 0.25, angle, ((i * 3) % 5) * 0.2);
    _quat.setFromEuler(_euler);
    _scaleVec.set(s * 1.2, s * 0.72, s);
    _mat4.compose(_vec3, _quat, _scaleVec);
    pebbleInst.setMatrixAt(i, _mat4);

    const shade = 0.78 + ((i * 11) % 7) * 0.04;
    _color.setRGB(shade, shade * 1.02, shade * 1.05);
    pebbleInst.setColorAt(i, _color);
  }
  pebbleInst.instanceMatrix.needsUpdate = true;
  if (pebbleInst.instanceColor) pebbleInst.instanceColor.needsUpdate = true;
  pebbleInst.computeBoundingSphere();
  group.add(pebbleInst);

  return group;
}
