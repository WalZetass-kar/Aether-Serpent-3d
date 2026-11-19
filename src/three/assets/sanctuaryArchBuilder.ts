import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PbrTextureSet } from './pbrTextures';
import { ensureUv2, groundHeightAt } from './rockTerrainBuilder';

export interface SanctuaryArchCorridorHandle {
  group: THREE.Group;
  update: (elapsed: number, transitionBoost: number) => void;
  setShadowsEnabled: (enabled: boolean) => void;
  dispose: () => void;
}

interface ArchBuildSpec {
  x: number;
  z: number;
  yaw: number;
  clearHalfSpan: number;
  pierHeight: number;
  archRise: number;
  pierWidth: number;
  pierDepth: number;
  scale?: number;
}

interface BrazierNode {
  flame: THREE.Mesh;
  baseY: number;
  phase: number;
}

function createSoftGlowParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size * 0.5,
      size * 0.5,
      0,
      size * 0.5,
      size * 0.5,
      size * 0.5,
    );
    grad.addColorStop(0, 'rgba(255, 251, 220, 1)');
    grad.addColorStop(0.32, 'rgba(251, 191, 36, 0.85)');
    grad.addColorStop(0.68, 'rgba(16, 185, 129, 0.28)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function pushTransformedBox(
  list: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  ry = 0,
  rz = 0,
) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx !== 0) g.rotateX(rx);
  if (ry !== 0) g.rotateY(ry);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  ensureUv2(g);
  list.push(g);
}

function pushTransformedCyl(
  list: THREE.BufferGeometry[],
  rt: number,
  rb: number,
  h: number,
  segs: number,
  x: number,
  y: number,
  z: number,
  rx = 0,
  rz = 0,
) {
  const g = new THREE.CylinderGeometry(rt, rb, h, segs);
  if (rx !== 0) g.rotateX(rx);
  if (rz !== 0) g.rotateZ(rz);
  g.translate(x, y, z);
  ensureUv2(g);
  list.push(g);
}

/**
 * Normalizes indexed (Box/Cylinder/Cone) and non-indexed (Octahedron/Polyhedron) geometries
 * so BufferGeometryUtils.mergeGeometries never fails due to mismatched index buffers.
 */
function mergeSafeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;
  const normalized: THREE.BufferGeometry[] = geos.map((src) => {
    const g = src.index ? src.toNonIndexed() : src.clone();
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    ensureUv2(g);
    return g;
  });
  geos.forEach((g) => g.dispose());
  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  if (merged) {
    ensureUv2(merged);
  }
  return merged;
}

/**
 * Builds a single multi-part fantasy triumphal stone archway with deep ground-anchored piers,
 * carved plinth moldings, bronze bands, vaulted Gothic voussoir arch blocks, glowing keystone,
 * pitched slate coping roof, and twin animated flame braziers.
 */
function buildTriumphalArch(
  spec: ArchBuildSpec,
  mats: {
    stone: THREE.MeshStandardMaterial;
    slate: THREE.MeshStandardMaterial;
    gold: THREE.MeshStandardMaterial;
    rune: THREE.MeshStandardMaterial;
    flame: THREE.MeshStandardMaterial;
  },
  braziersOut: BrazierNode[],
  shadowsEnabled: boolean,
  phaseSeed: number,
): THREE.Group {
  const archGroup = new THREE.Group();
  const baseGroundY = groundHeightAt(spec.x, spec.z);
  archGroup.position.set(spec.x, baseGroundY, spec.z);
  archGroup.rotation.y = spec.yaw;
  if (spec.scale && spec.scale !== 1) {
    archGroup.scale.setScalar(spec.scale);
  }

  const stoneGeos: THREE.BufferGeometry[] = [];
  const slateGeos: THREE.BufferGeometry[] = [];
  const goldGeos: THREE.BufferGeometry[] = [];
  const runeGeos: THREE.BufferGeometry[] = [];

  const pierCenterOffset = spec.clearHalfSpan + spec.pierWidth * 0.5;
  const footingDepth = 2.4;
  const springY = spec.pierHeight;

  // 1. Twin Stepped Ashlar Piers (deeply rooted into terrain/lagoon shore)
  for (const side of [-1, 1] as const) {
    const px = side * pierCenterOffset;

    // Submerged / terrain-embedded battered foundation footing
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth * 1.42,
      footingDepth,
      spec.pierDepth * 1.38,
      px,
      -footingDepth * 0.5 + 0.35,
      0,
    );
    // Stepped carved plinth collar
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth * 1.24,
      0.58,
      spec.pierDepth * 1.22,
      px,
      0.62,
      0,
    );
    // Main vertical pier shaft
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth,
      spec.pierHeight,
      spec.pierDepth,
      px,
      0.8 + spec.pierHeight * 0.5,
      0,
    );
    // Outer buttress rib for architectural silhouette depth
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth * 0.42,
      spec.pierHeight * 0.82,
      spec.pierDepth * 0.62,
      px + side * (spec.pierWidth * 0.56),
      0.65 + spec.pierHeight * 0.41,
      0,
    );
    // Mid-height bronze collar molding
    pushTransformedBox(
      goldGeos,
      spec.pierWidth * 1.08,
      0.16,
      spec.pierDepth * 1.08,
      px,
      0.8 + spec.pierHeight * 0.48,
      0,
    );
    // Corbeled springer capital supporting the vaulted arch
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth * 1.28,
      0.38,
      spec.pierDepth * 1.26,
      px,
      0.8 + springY + 0.12,
      0,
    );
    pushTransformedBox(
      goldGeos,
      spec.pierWidth * 1.32,
      0.1,
      spec.pierDepth * 1.3,
      px,
      0.8 + springY + 0.34,
      0,
    );

    // Recessed vertical runic channel facing the flight corridor
    pushTransformedBox(
      runeGeos,
      0.08,
      spec.pierHeight * 0.42,
      0.16,
      px - side * (spec.pierWidth * 0.51),
      0.8 + spec.pierHeight * 0.32,
      0,
    );

    // Inner-facing wrought-bronze wall brazier bracket & bowl
    const brazierX = px - side * (spec.pierWidth * 0.5 + 0.34);
    const brazierY = 0.8 + spec.pierHeight * 0.68;
    pushTransformedBox(
      goldGeos,
      0.44,
      0.12,
      0.16,
      px - side * (spec.pierWidth * 0.5 + 0.16),
      brazierY - 0.14,
      0,
      0,
      0,
      side * 0.24,
    );
    pushTransformedCyl(goldGeos, 0.34, 0.16, 0.28, 8, brazierX, brazierY, 0);

    // Animated flame crystal inside each brazier
    const flameGeo = new THREE.OctahedronGeometry(0.24, 1);
    flameGeo.scale(0.82, 1.55, 0.82);
    const flameMesh = new THREE.Mesh(flameGeo, mats.flame);
    flameMesh.position.set(brazierX, brazierY + 0.34, 0);
    archGroup.add(flameMesh);
    braziersOut.push({
      flame: flameMesh,
      baseY: brazierY + 0.34,
      phase: phaseSeed + (side > 0 ? 1.7 : 0.2),
    });

    // Turret-style cap finial atop each pier
    const capY = 0.8 + springY + 0.95;
    pushTransformedBox(
      stoneGeos,
      spec.pierWidth * 1.06,
      0.95,
      spec.pierDepth * 1.06,
      px,
      capY,
      0,
    );
    const spireGeo = new THREE.ConeGeometry(spec.pierWidth * 0.72, 1.35, 4);
    spireGeo.rotateY(Math.PI / 4);
    spireGeo.translate(px, capY + 1.12, 0);
    ensureUv2(spireGeo);
    slateGeos.push(spireGeo);
    pushTransformedCyl(goldGeos, 0.04, 0.08, 0.48, 6, px, capY + 1.92, 0);
  }

  // 2. Segmented Gothic Vaulted Stone Voussoir Arch
  const archCenterY = 0.8 + springY + 0.22;
  const archRadiusX = spec.clearHalfSpan + spec.pierWidth * 0.22;
  const archRadiusY = spec.archRise;
  const segments = 11;

  for (let i = 0; i < segments; i++) {
    const t = (i + 0.5) / segments;
    const angle = Math.PI * (1 - t); // left (PI) -> apex (PI/2) -> right (0)
    const vx = Math.cos(angle) * archRadiusX;
    // Slight Gothic pointed inflection near apex
    const sinA = Math.sin(angle);
    const gothicLift = Math.pow(sinA, 1.35) * 0.36;
    const vy = archCenterY + sinA * archRadiusY + gothicLift;

    // Tangent orientation for each stone voussoir wedge
    const tangentX = -Math.sin(angle) * archRadiusX;
    const tangentY = Math.cos(angle) * archRadiusY;
    const rotZ = Math.atan2(tangentY, tangentX);

    const isKeystone = i === Math.floor(segments / 2);
    const blockW = isKeystone ? 0.92 : 0.76;
    const blockH = isKeystone ? 1.08 : 0.74;
    const blockD = isKeystone ? spec.pierDepth * 1.02 : spec.pierDepth * 0.84;

    pushTransformedBox(stoneGeos, blockW, blockH, blockD, vx, vy, 0, 0, 0, rotZ);

    if (isKeystone) {
      // Gold framing collar & glowing Aether Rune Core embedded in keystone
      pushTransformedBox(
        goldGeos,
        0.54,
        0.74,
        blockD + 0.14,
        vx,
        vy + 0.04,
        0,
      );
      const crystal = new THREE.OctahedronGeometry(0.28, 0);
      crystal.scale(0.85, 1.35, 0.85);
      crystal.translate(vx, vy + 0.02, 0);
      ensureUv2(crystal);
      runeGeos.push(crystal);
    }
  }

  // 3. Upper Spandrel Entablature & Pitched Slate Coping Roof
  const crownY = archCenterY + archRadiusY + 0.95;
  const totalSpan = (spec.clearHalfSpan + spec.pierWidth * 0.55) * 2;
  pushTransformedBox(
    stoneGeos,
    totalSpan * 0.78,
    0.42,
    spec.pierDepth * 0.96,
    0,
    crownY,
    0,
  );
  pushTransformedBox(
    goldGeos,
    totalSpan * 0.82,
    0.1,
    spec.pierDepth * 1.04,
    0,
    crownY + 0.24,
    0,
  );

  // Twin pitched slate roof slopes meeting along ridge
  const roofWidth = totalSpan * 0.84;
  const slopeDepth = spec.pierDepth * 0.76;
  pushTransformedBox(
    slateGeos,
    roofWidth,
    0.16,
    slopeDepth,
    0,
    crownY + 0.58,
    slopeDepth * 0.34,
    0.46,
    0,
    0,
  );
  pushTransformedBox(
    slateGeos,
    roofWidth,
    0.16,
    slopeDepth,
    0,
    crownY + 0.58,
    -slopeDepth * 0.34,
    -0.46,
    0,
    0,
  );
  // Central bronze crest spire above the keystone
  pushTransformedCyl(goldGeos, 0.04, 0.1, 1.05, 8, 0, crownY + 1.24, 0);

  // Merge grouped geometries by material for ultra-low draw calls
  const addMerged = (geos: THREE.BufferGeometry[], mat: THREE.Material, castShadow: boolean) => {
    const merged = mergeSafeGeometries(geos);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = castShadow && shadowsEnabled;
    mesh.receiveShadow = shadowsEnabled;
    archGroup.add(mesh);
  };

  addMerged(stoneGeos, mats.stone, true);
  addMerged(slateGeos, mats.slate, true);
  addMerged(goldGeos, mats.gold, true);
  addMerged(runeGeos, mats.rune, false);

  return archGroup;
}

/**
 * Builds flanking carved waystone obelisks along the sanctuary causeway for
 * dramatic foreground parallax during the 3D camera fly-through.
 */
function buildWaystoneObelisks(
  mats: {
    stone: THREE.MeshStandardMaterial;
    gold: THREE.MeshStandardMaterial;
    rune: THREE.MeshStandardMaterial;
  },
  shadowsEnabled: boolean,
): THREE.Group {
  const obeliskGroup = new THREE.Group();
  const stoneGeos: THREE.BufferGeometry[] = [];
  const goldGeos: THREE.BufferGeometry[] = [];
  const runeGeos: THREE.BufferGeometry[] = [];

  // Positioned cleanly outside the central flight corridor to frame both edges
  const placements: Array<{ x: number; z: number; h: number; yaw: number }> = [
    { x: 0.45, z: 6.4, h: 2.3, yaw: 0.42 },
    { x: 5.75, z: 5.2, h: 2.55, yaw: -0.58 },
    { x: 1.55, z: 0.85, h: 2.7, yaw: 0.25 },
    { x: 7.35, z: 0.15, h: 2.6, yaw: -0.45 },
  ];

  for (const p of placements) {
    const gy = groundHeightAt(p.x, p.z);
    // Grounded stepped plinth
    pushTransformedBox(stoneGeos, 0.92, 1.3, 0.92, p.x, gy - 0.35, p.z, 0, p.yaw, 0);
    // Tapered obelisk monolith
    const shaft = new THREE.CylinderGeometry(0.24, 0.38, p.h, 4);
    shaft.rotateY(p.yaw + Math.PI / 4);
    shaft.translate(p.x, gy + 0.3 + p.h * 0.5, p.z);
    ensureUv2(shaft);
    stoneGeos.push(shaft);

    // Gold collar + pyramidion finial
    const collar = new THREE.CylinderGeometry(0.27, 0.29, 0.12, 4);
    collar.rotateY(p.yaw + Math.PI / 4);
    collar.translate(p.x, gy + 0.3 + p.h * 0.72, p.z);
    ensureUv2(collar);
    goldGeos.push(collar);

    const tip = new THREE.ConeGeometry(0.25, 0.46, 4);
    tip.rotateY(p.yaw + Math.PI / 4);
    tip.translate(p.x, gy + 0.3 + p.h + 0.23, p.z);
    ensureUv2(tip);
    goldGeos.push(tip);

    // Floating crystal lantern hovering slightly above the obelisk tip
    const orb = new THREE.OctahedronGeometry(0.14, 0);
    orb.scale(0.85, 1.35, 0.85);
    orb.translate(p.x, gy + 0.3 + p.h + 0.68, p.z);
    ensureUv2(orb);
    runeGeos.push(orb);
  }

  const mount = (geos: THREE.BufferGeometry[], mat: THREE.Material, castShadow: boolean) => {
    const merged = mergeSafeGeometries(geos);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = castShadow && shadowsEnabled;
    mesh.receiveShadow = shadowsEnabled;
    obeliskGroup.add(mesh);
  };

  mount(stoneGeos, mats.stone, true);
  mount(goldGeos, mats.gold, true);
  mount(runeGeos, mats.rune, false);

  return obeliskGroup;
}

/**
 * Builds the complete Fantasy Architectural Causeway connecting the Oriental Dragon Sanctuary
 * (MainMenuView) to the elevated Fantasy Citadel (MultiplayerLobbyView).
 */
export function buildSanctuaryArchCorridor(
  bank: {
    stonePbr: PbrTextureSet;
    slatePbr: PbrTextureSet;
  },
  options: { shadowsEnabled?: boolean } = {},
): SanctuaryArchCorridorHandle {
  const shadowsEnabled = options.shadowsEnabled !== false;
  const group = new THREE.Group();
  group.name = 'sanctuary_arch_corridor';

  const stoneMat = new THREE.MeshStandardMaterial({
    map: bank.stonePbr.map,
    normalMap: bank.stonePbr.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: bank.stonePbr.roughnessMap,
    aoMap: bank.stonePbr.aoMap,
    aoMapIntensity: 0.88,
    color: 0x94a3b8,
    roughness: 0.82,
    metalness: 0.06,
  });

  const slateMat = new THREE.MeshStandardMaterial({
    map: bank.slatePbr.map,
    normalMap: bank.slatePbr.normalMap,
    normalScale: new THREE.Vector2(1.05, 1.05),
    roughnessMap: bank.slatePbr.roughnessMap,
    aoMap: bank.slatePbr.aoMap,
    aoMapIntensity: 0.82,
    color: 0x334e73,
    roughness: 0.56,
    metalness: 0.14,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.3,
    metalness: 0.86,
  });

  const runeMat = new THREE.MeshStandardMaterial({
    color: 0x6ee7b7,
    emissive: 0x10b981,
    emissiveIntensity: 1.75,
    roughness: 0.2,
    metalness: 0.1,
  });

  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.5,
    roughness: 0.15,
    metalness: 0.05,
  });

  const braziers: BrazierNode[] = [];

  // Archway #1: Outer Sanctuary Gateway (visible framing right edge of Main Menu vista; camera flies right through it!)
  const outerArch = buildTriumphalArch(
    {
      x: 3.15,
      z: 3.65,
      yaw: -0.34,
      clearHalfSpan: 2.45,
      pierHeight: 3.25,
      archRise: 2.25,
      pierWidth: 0.92,
      pierDepth: 1.05,
    },
    { stone: stoneMat, slate: slateMat, gold: goldMat, rune: runeMat, flame: flameMat },
    braziers,
    shadowsEnabled,
    0.4,
  );
  group.add(outerArch);

  // Archway #2: Grand Citadel Approach Portal rising above the lagoon flank
  const innerArch = buildTriumphalArch(
    {
      x: 4.58,
      z: -1.35,
      yaw: -0.36,
      clearHalfSpan: 2.65,
      pierHeight: 4.55,
      archRise: 2.45,
      pierWidth: 1.02,
      pierDepth: 1.16,
    },
    { stone: stoneMat, slate: slateMat, gold: goldMat, rune: runeMat, flame: flameMat },
    braziers,
    shadowsEnabled,
    2.1,
  );
  group.add(innerArch);

  // Flanking Waystone Obelisk Pillars for crisp 3D depth parallax
  const obelisks = buildWaystoneObelisks(
    { stone: stoneMat, gold: goldMat, rune: runeMat },
    shadowsEnabled,
  );
  group.add(obelisks);

  // Warm ambient archway corridor beacon light (shadowless for crisp performance)
  const corridorLight = new THREE.PointLight(0xfbbf24, 3.6, 15, 1.5);
  corridorLight.position.set(3.85, 4.35, 1.15);
  group.add(corridorLight);

  // Floating Golden/Emerald Aether Motes drifting inside the archway corridor
  const moteCount = 54;
  const motePositions = new Float32Array(moteCount * 3);
  const moteBasePositions = new Float32Array(moteCount * 3);
  const motePhases = new Float32Array(moteCount);

  for (let i = 0; i < moteCount; i++) {
    // Distribute deterministically along the flight corridor from z = 7 to z = -5.5
    const t = i / moteCount;
    const h1 = Math.sin(i * 12.9898) * 43758.5453;
    const r1 = h1 - Math.floor(h1);
    const h2 = Math.sin(i * 78.233 + 1.7) * 43758.5453;
    const r2 = h2 - Math.floor(h2);

    const cx = THREE.MathUtils.lerp(2.2, 5.6, t) + (r1 - 0.5) * 4.4;
    const cz = THREE.MathUtils.lerp(6.4, -4.6, t) + (r2 - 0.5) * 1.8;
    const cy = THREE.MathUtils.lerp(1.4, 7.1, r1 * 0.65 + t * 0.35);

    moteBasePositions[i * 3] = cx;
    moteBasePositions[i * 3 + 1] = cy;
    moteBasePositions[i * 3 + 2] = cz;
    motePositions[i * 3] = cx;
    motePositions[i * 3 + 1] = cy;
    motePositions[i * 3 + 2] = cz;
    motePhases[i] = r2 * Math.PI * 2;
  }

  const moteGeo = new THREE.BufferGeometry();
  const motePosAttr = new THREE.BufferAttribute(motePositions, 3);
  moteGeo.setAttribute('position', motePosAttr);

  const moteTex = createSoftGlowParticleTexture();
  const moteMat = new THREE.PointsMaterial({
    map: moteTex,
    color: 0xfde68a,
    size: 0.34,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const motes = new THREE.Points(moteGeo, moteMat);
  motes.frustumCulled = false;
  group.add(motes);

  const update = (elapsed: number, transitionBoost: number) => {
    const boost = THREE.MathUtils.clamp(transitionBoost, 0, 1);

    // Subtle organic brazier flame pulse & vertical shimmer
    for (let i = 0; i < braziers.length; i++) {
      const b = braziers[i];
      const flicker =
        0.92 +
        Math.sin(elapsed * 7.2 + b.phase) * 0.08 +
        Math.cos(elapsed * 13.4 + b.phase * 1.7) * 0.05;
      const scaleLift = flicker + boost * 0.22;
      b.flame.scale.set(scaleLift, scaleLift * 1.08, scaleLift);
      b.flame.position.y = b.baseY + Math.sin(elapsed * 5.4 + b.phase) * 0.04;
      b.flame.rotation.y = elapsed * 1.4 + b.phase;
    }

    // Pulse keystone runes & corridor light warmth slightly stronger during active fly-through
    runeMat.emissiveIntensity = 1.55 + Math.sin(elapsed * 2.2) * 0.35 + boost * 1.1;
    flameMat.emissiveIntensity = 2.35 + Math.sin(elapsed * 6.5) * 0.28 + boost * 0.85;
    corridorLight.intensity = 3.4 + Math.sin(elapsed * 4.8) * 0.35 + boost * 2.4;
    moteMat.opacity = 0.62 + boost * 0.32;
    moteMat.size = 0.32 + boost * 0.12;

    // Zero-GC drift of floating Aether motes inside the archway corridor
    const arr = motePosAttr.array as Float32Array;
    for (let i = 0; i < moteCount; i++) {
      const idx = i * 3;
      const phase = motePhases[i];
      const rise = ((elapsed * (0.28 + boost * 0.25) + phase) % 2.6) - 1.3;
      arr[idx] = moteBasePositions[idx] + Math.sin(elapsed * 0.85 + phase) * 0.24;
      arr[idx + 1] = moteBasePositions[idx + 1] + rise;
      arr[idx + 2] = moteBasePositions[idx + 2] + Math.cos(elapsed * 0.72 + phase) * 0.2;
    }
    motePosAttr.needsUpdate = true;
  };

  const setShadowsEnabled = (enabled: boolean) => {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        if (mesh.material !== runeMat && mesh.material !== flameMat) {
          mesh.castShadow = enabled;
          mesh.receiveShadow = enabled;
        }
      }
    });
  };

  const dispose = () => {
    moteTex.dispose();
    moteGeo.dispose();
    moteMat.dispose();
    stoneMat.dispose();
    slateMat.dispose();
    goldMat.dispose();
    runeMat.dispose();
    flameMat.dispose();
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry?.dispose();
      }
    });
  };

  return { group, update, setShadowsEnabled, dispose };
}
