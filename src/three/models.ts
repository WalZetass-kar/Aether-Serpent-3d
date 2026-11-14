import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  BOARD_SIZE,
  TILE_SPACING,
  getDiceSkinDef,
  tileToWorld,
  type DiceSkinId,
  type SpecialTileType,
} from '../../shared/gameConfig';
import type { BoardConfig } from '../../shared/boardThemes';
import {
  createContactShadowTexture,
  createDiceFaceTexture,
} from './textures';
import {
  createCastleStonePbrMaps,
  createDragonEyeTexture,
  createTimberPbrMaps,
  disposePbrTextureSet,
  type PbrTextureSet,
} from './assets/pbrTextures';
import {
  createBoardStonePbrSet,
  createHammeredBronzePbrMaps,
  createLadderMaterialPbrMaps,
  createSerpentIdentityPbrMaps,
} from './assets/arenaPbrMaps';
import { ensureUv2 } from './assets/rockTerrainBuilder';
import {
  buildArenaEnvironment,
  type ArenaEnvironmentHandle,
} from './assets/arenaEnvironmentBuilder';
import { applyLodBiasToGroup } from './assets/foliageBuilder';
import { QUALITY_PRESETS, type QualityConfig } from './perf/qualityPresets';

let sharedContactShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTex(): THREE.CanvasTexture {
  if (!sharedContactShadowTex) {
    sharedContactShadowTex = createContactShadowTexture();
  }
  return sharedContactShadowTex;
}

let sharedBronzePbr: Omit<PbrTextureSet, 'map'> | null = null;
let sharedBronzeKey = '';
function getBronzePbr(maxAnisotropy: number, texSize: 256 | 512 | 1024 = 512) {
  const key = `${texSize}:${maxAnisotropy}`;
  if (!sharedBronzePbr || sharedBronzeKey !== key) {
    if (sharedBronzePbr) {
      sharedBronzePbr.normalMap.dispose();
      sharedBronzePbr.roughnessMap.dispose();
      if (sharedBronzePbr.aoMap !== sharedBronzePbr.roughnessMap) {
        sharedBronzePbr.aoMap.dispose();
      }
    }
    sharedBronzePbr = createHammeredBronzePbrMaps(maxAnisotropy, texSize);
    sharedBronzeKey = key;
  }
  return sharedBronzePbr;
}

let sharedDragonEyeTex: THREE.CanvasTexture | null = null;
function getDragonEyeTex(maxAnisotropy: number) {
  if (!sharedDragonEyeTex) {
    sharedDragonEyeTex = createDragonEyeTexture(maxAnisotropy);
  }
  return sharedDragonEyeTex;
}

let sharedTimberPbr: PbrTextureSet | null = null;
let sharedTimberKey = '';
function getTimberPbr(maxAnisotropy: number, texSize: 256 | 512 | 1024 = 512): PbrTextureSet {
  const key = `${texSize}:${maxAnisotropy}`;
  if (!sharedTimberPbr || sharedTimberKey !== key) {
    if (sharedTimberPbr) {
      disposePbrTextureSet(sharedTimberPbr);
    }
    sharedTimberPbr = createTimberPbrMaps(maxAnisotropy, texSize);
    sharedTimberKey = key;
  }
  return sharedTimberPbr;
}

let sharedStonePlinthPbr: PbrTextureSet | null = null;
let sharedStonePlinthKey = '';
function getStonePlinthPbr(maxAnisotropy: number, texSize: 256 | 512 | 1024 = 512): PbrTextureSet {
  const key = `${texSize}:${maxAnisotropy}`;
  if (!sharedStonePlinthPbr || sharedStonePlinthKey !== key) {
    if (sharedStonePlinthPbr) {
      disposePbrTextureSet(sharedStonePlinthPbr);
    }
    sharedStonePlinthPbr = createCastleStonePbrMaps(maxAnisotropy, texSize);
    sharedStonePlinthKey = key;
  }
  return sharedStonePlinthPbr;
}

const sharedSerpentPbrCache = new Map<string, PbrTextureSet>();
function getSerpentPbr(
  primaryHex: string,
  stripeHex: string,
  bellyHex: string,
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024,
  scalePattern: 'diamond_keel' | 'royal_hex' | 'draconic_plate' | 'frost_shard',
): PbrTextureSet {
  const key = `${primaryHex}:${stripeHex}:${bellyHex}:${scalePattern}:${texSize}:${maxAnisotropy}`;
  let cached = sharedSerpentPbrCache.get(key);
  if (!cached) {
    if (sharedSerpentPbrCache.size >= 16) {
      const oldestKey = sharedSerpentPbrCache.keys().next().value;
      if (oldestKey) {
        const oldSet = sharedSerpentPbrCache.get(oldestKey);
        if (oldSet) disposePbrTextureSet(oldSet);
        sharedSerpentPbrCache.delete(oldestKey);
      }
    }
    cached = createSerpentIdentityPbrMaps(
      primaryHex,
      stripeHex,
      bellyHex,
      maxAnisotropy,
      texSize,
      scalePattern,
    );
    sharedSerpentPbrCache.set(key, cached);
  }
  return cached;
}

const sharedLadderPbrCache = new Map<string, PbrTextureSet>();
function getLadderPbr(
  materialStyle: BoardConfig['ladderConfig']['materialStyle'],
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024,
): PbrTextureSet {
  const key = `${materialStyle}:${primaryHex}:${accentHex}:${texSize}:${maxAnisotropy}`;
  let cached = sharedLadderPbrCache.get(key);
  if (!cached) {
    if (sharedLadderPbrCache.size >= 8) {
      const oldestKey = sharedLadderPbrCache.keys().next().value;
      if (oldestKey) {
        const oldSet = sharedLadderPbrCache.get(oldestKey);
        if (oldSet) disposePbrTextureSet(oldSet);
        sharedLadderPbrCache.delete(oldestKey);
      }
    }
    cached = createLadderMaterialPbrMaps(
      materialStyle,
      primaryHex,
      accentHex,
      maxAnisotropy,
      texSize,
    );
    sharedLadderPbrCache.set(key, cached);
  }
  return cached;
}

let sharedSnakeStaticMats: {
  ivory: THREE.MeshStandardMaterial;
  gullet: THREE.MeshStandardMaterial;
  tongue: THREE.MeshStandardMaterial;
  eye: THREE.MeshPhysicalMaterial;
} | null = null;

function getSharedSnakeStaticMats(maxAnisotropy: number) {
  if (!sharedSnakeStaticMats) {
    const ivory = new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      roughness: 0.25,
      metalness: 0.06,
    });
    ivory.userData.isSharedStatic = true;

    const gullet = new THREE.MeshStandardMaterial({
      color: 0x16070d,
      roughness: 0.92,
    });
    gullet.userData.isSharedStatic = true;

    const tongue = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.32,
    });
    tongue.userData.isSharedStatic = true;

    const eye = new THREE.MeshPhysicalMaterial({
      map: getDragonEyeTex(maxAnisotropy),
      roughness: 0.06,
      metalness: 0.05,
      clearcoat: 1.0,
      emissive: 0x92400e,
      emissiveIntensity: 0.28,
    });
    eye.userData.isSharedStatic = true;

    sharedSnakeStaticMats = {
      ivory,
      gullet,
      tongue,
      eye,
    };
  }
  return sharedSnakeStaticMats;
}

/**
 * Releases cached textures & materials created for Arena entities so VRAM
 * is cleanly reclaimed when leaving a match.
 */
export function clearSharedArenaCaches(): void {
  if (sharedContactShadowTex) {
    sharedContactShadowTex.dispose();
    sharedContactShadowTex = null;
  }
  if (sharedBronzePbr) {
    sharedBronzePbr.normalMap.dispose();
    sharedBronzePbr.roughnessMap.dispose();
    if (sharedBronzePbr.aoMap !== sharedBronzePbr.roughnessMap) {
      sharedBronzePbr.aoMap.dispose();
    }
    sharedBronzePbr = null;
    sharedBronzeKey = '';
  }
  if (sharedDragonEyeTex) {
    sharedDragonEyeTex.dispose();
    sharedDragonEyeTex = null;
  }
  if (sharedTimberPbr) {
    disposePbrTextureSet(sharedTimberPbr);
    sharedTimberPbr = null;
    sharedTimberKey = '';
  }
  if (sharedStonePlinthPbr) {
    disposePbrTextureSet(sharedStonePlinthPbr);
    sharedStonePlinthPbr = null;
    sharedStonePlinthKey = '';
  }
  sharedSerpentPbrCache.forEach((set) => disposePbrTextureSet(set));
  sharedSerpentPbrCache.clear();
  sharedLadderPbrCache.forEach((set) => disposePbrTextureSet(set));
  sharedLadderPbrCache.clear();
  if (sharedSnakeStaticMats) {
    sharedSnakeStaticMats.ivory.dispose();
    sharedSnakeStaticMats.gullet.dispose();
    sharedSnakeStaticMats.tongue.dispose();
    sharedSnakeStaticMats.eye.dispose();
    sharedSnakeStaticMats = null;
  }
}

export type PawnClipName = 'idle' | 'walk' | 'climb' | 'cast' | 'victory';

export interface PawnModelHandle {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  shieldRing: THREE.Mesh;
  activeHalo: THREE.Mesh;
  crestMesh: THREE.Mesh;
  mixer: THREE.AnimationMixer;
  actions: Record<PawnClipName, THREE.AnimationAction>;
  playClip: (name: PawnClipName, fadeSec?: number) => void;
}

function buildPawnAnimationClips(): Record<PawnClipName, THREE.AnimationClip> {
  const idleClip = new THREE.AnimationClip('idle', 1.8, [
    new THREE.VectorKeyframeTrack('.position', [0, 0.9, 1.8], [0, 0, 0, 0, 0.03, 0, 0, 0, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.9, 1.8], [0.08, -0.05, 0.08]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.9, 1.8], [-0.05, 0.08, -0.05]),
  ]);

  const walkClip = new THREE.AnimationClip('walk', 0.44, [
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.22, 0.44], [0.12, 0.22, 0.12]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.22, 0.44], [-0.65, 0.55, -0.65]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.22, 0.44], [0.55, -0.65, 0.55]),
  ]);

  const climbClip = new THREE.AnimationClip('climb', 0.64, [
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.32, 0.64], [0.24, 0.32, 0.24]),
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[z]', [0, 0.16, 0.48, 0.64], [0, 0.09, -0.09, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.32, 0.64], [-2.15, -0.45, -2.15]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.32, 0.64], [-0.45, -2.15, -0.45]),
  ]);

  const castClip = new THREE.AnimationClip('cast', 0.72, [
    new THREE.NumberKeyframeTrack('bodyPivot.position[y]', [0, 0.36, 0.72], [0, 0.18, 0]),
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.36, 0.72], [0, -0.18, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.3, 0.72], [0, -2.35, -0.2]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.3, 0.72], [0, -2.35, -0.2]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[z]', [0, 0.3, 0.72], [0.1, 0.55, 0.1]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[z]', [0, 0.3, 0.72], [-0.1, -0.55, -0.1]),
  ]);

  const victoryClip = new THREE.AnimationClip('victory', 0.9, [
    new THREE.NumberKeyframeTrack('bodyPivot.position[y]', [0, 0.28, 0.56, 0.9], [0, 0.22, 0.04, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.45, 0.9], [-2.4, -2.6, -2.4]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.45, 0.9], [-2.4, -2.6, -2.4]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[z]', [0, 0.45, 0.9], [0.42, 0.65, 0.42]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[z]', [0, 0.45, 0.9], [-0.42, -0.65, -0.42]),
  ]);

  return { idle: idleClip, walk: walkClip, climb: climbClip, cast: castClip, victory: victoryClip };
}

let cachedPawnClips: Record<PawnClipName, THREE.AnimationClip> | null = null;
function getPawnClips() {
  if (!cachedPawnClips) {
    cachedPawnClips = buildPawnAnimationClips();
  }
  return cachedPawnClips;
}

/**
 * Builds a Detailed Fantasy Hero Figurine Pawn with hammered-bronze PBR armor,
 * woven cape/cloak, sculpted helmet/crown unique to archetypeIndex, grounded shadow,
 * active-turn base halo, and articulated AnimationMixer rig.
 */
export function createHeroPawn(
  colorHex: string,
  accentHex: string,
  archetypeIndex: number,
  quality: QualityConfig = QUALITY_PRESETS.high,
): PawnModelHandle {
  const shadows = quality.shadowsEnabled;
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'bodyPivot';
  group.add(bodyPivot);

  const bronzePbr = getBronzePbr(quality.anisotropyCap, Math.min(512, quality.pbrTexSize) as 256 | 512);

  const clothMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.78,
    metalness: 0.08,
  });
  const armorMetalMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: bronzePbr.roughnessMap,
    aoMap: bronzePbr.aoMap,
    aoMapIntensity: 0.75,
    roughness: 0.26,
    metalness: 0.88,
  });
  const steelTrimMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: bronzePbr.roughnessMap,
    roughness: 0.24,
    metalness: 0.9,
  });
  const basaltBaseMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.22,
  });
  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: accentHex,
    emissive: colorHex,
    emissiveIntensity: 0.3,
    roughness: 0.12,
    metalness: 0.14,
    clearcoat: quality.tier === 'potato' ? 0.0 : 1.0,
    clearcoatRoughness: 0.08,
  });

  // Soft Grounded Contact Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 1.18),
    new THREE.MeshBasicMaterial({
      map: getContactShadowTex(),
      transparent: true,
      depthWrite: false,
      opacity: 0.64,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  group.add(shadowPlane);

  // Subtle Active-Turn Gilded Floor Halo (toggled by FantasyBoardEngine)
  const activeHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.57, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  activeHalo.rotation.x = -Math.PI / 2;
  activeHalo.position.y = 0.025;
  activeHalo.visible = false;
  group.add(activeHalo);

  // Stepped Carved Basalt & Bronze Plinth
  const baseGeo = new THREE.CylinderGeometry(0.36, 0.44, 0.12, 8);
  ensureUv2(baseGeo);
  const baseMesh = new THREE.Mesh(baseGeo, basaltBaseMat);
  baseMesh.position.y = 0.06;
  baseMesh.castShadow = shadows;
  baseMesh.receiveShadow = shadows;
  bodyPivot.add(baseMesh);

  const rimGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.045, 8);
  ensureUv2(rimGeo);
  const baseRim = new THREE.Mesh(rimGeo, armorMetalMat);
  baseRim.position.y = 0.135;
  baseRim.castShadow = shadows;
  bodyPivot.add(baseRim);

  // Sculpted Hero Body LOD (LOD0 full Lathe + cloak + collar; LOD1 low-poly silhouette >20m)
  const bodyLod = new THREE.LOD();
  const bodyLod0 = new THREE.Group();
  bodyLod0.userData.baseLodDist = 0;

  const lathePoints = [
    new THREE.Vector2(0.0, 0.15),
    new THREE.Vector2(0.31, 0.15),
    new THREE.Vector2(0.25, 0.34),
    new THREE.Vector2(0.185, 0.56),
    new THREE.Vector2(0.27, 0.76),
    new THREE.Vector2(0.15, 0.92),
    new THREE.Vector2(0.0, 0.94),
  ];
  const torsoGeo = new THREE.LatheGeometry(lathePoints, quality.tier === 'potato' ? 12 : 20);
  ensureUv2(torsoGeo);
  const torsoMesh = new THREE.Mesh(torsoGeo, clothMat);
  torsoMesh.castShadow = shadows;
  torsoMesh.receiveShadow = shadows;
  bodyLod0.add(torsoMesh);

  // Brushed Chestplate Armor & Waist Belt
  const breastplateGeo = new THREE.CylinderGeometry(0.278, 0.218, 0.24, 12);
  ensureUv2(breastplateGeo);
  const breastplate = new THREE.Mesh(breastplateGeo, steelTrimMat);
  breastplate.position.y = 0.69;
  breastplate.scale.set(1.04, 1, 0.94);
  breastplate.castShadow = shadows;
  bodyLod0.add(breastplate);

  const collarGeo = new THREE.TorusGeometry(0.215, 0.038, 8, 20);
  ensureUv2(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, armorMetalMat);
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.y = 0.55;
  collarMesh.castShadow = shadows;
  bodyLod0.add(collarMesh);

  // Flowing Woven Back Cloak
  const cloakShape = new THREE.Shape();
  cloakShape.moveTo(-0.18, 0);
  cloakShape.lineTo(0.18, 0);
  cloakShape.lineTo(0.28, -0.58);
  cloakShape.quadraticCurveTo(0, -0.66, -0.28, -0.58);
  cloakShape.closePath();
  const cloakGeo = new THREE.ExtrudeGeometry(cloakShape, {
    depth: 0.03,
    bevelEnabled: quality.tier !== 'potato',
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  ensureUv2(cloakGeo);
  const cloakMesh = new THREE.Mesh(cloakGeo, clothMat);
  cloakMesh.position.set(0, 0.79, -0.2);
  cloakMesh.rotation.x = 0.22;
  cloakMesh.castShadow = shadows;
  bodyLod0.add(cloakMesh);

  // Gorget / Shoulder Mantle
  const mantleGeo = new THREE.CylinderGeometry(0.28, 0.2, 0.11, 10);
  ensureUv2(mantleGeo);
  const mantleMesh = new THREE.Mesh(mantleGeo, armorMetalMat);
  mantleMesh.position.y = 0.83;
  mantleMesh.castShadow = shadows;
  bodyLod0.add(mantleMesh);

  // LOD1 simplified torso silhouette for distant overview
  const bodyLod1 = new THREE.Group();
  bodyLod1.userData.baseLodDist = 20;
  const simpleTorso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 0.76, 8),
    clothMat,
  );
  simpleTorso.position.y = 0.54;
  simpleTorso.castShadow = shadows;
  bodyLod1.add(simpleTorso);

  bodyLod.addLevel(bodyLod0, 0);
  bodyLod.addLevel(bodyLod1, 20 * quality.lodBias);
  bodyPivot.add(bodyLod);

  // Sculpted Head & Helmet Base
  const headBaseGeo = new THREE.SphereGeometry(0.155, 12, 10);
  headBaseGeo.scale(0.95, 1.08, 1.0);
  ensureUv2(headBaseGeo);
  const headMesh = new THREE.Mesh(headBaseGeo, steelTrimMat);
  headMesh.position.y = 0.99;
  headMesh.castShadow = shadows;
  bodyPivot.add(headMesh);

  // Articulated Hero Arms & Gauntlets
  const buildArmPivot = (name: string, side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(side * 0.29, 0.77, 0);

    const pauldronGeo = new THREE.SphereGeometry(0.088, 10, 8);
    pauldronGeo.scale(1.1, 0.85, 1.05);
    ensureUv2(pauldronGeo);
    const pauldron = new THREE.Mesh(pauldronGeo, armorMetalMat);
    pauldron.castShadow = true;
    pivot.add(pauldron);

    const upperArmGeo = new THREE.CylinderGeometry(0.044, 0.052, 0.23, 8);
    ensureUv2(upperArmGeo);
    const upperArm = new THREE.Mesh(upperArmGeo, clothMat);
    upperArm.position.set(side * 0.03, -0.14, 0.04);
    upperArm.rotation.z = side * 0.18;
    upperArm.castShadow = true;
    pivot.add(upperArm);

    const gauntletGeo = new THREE.CylinderGeometry(0.056, 0.042, 0.15, 8);
    ensureUv2(gauntletGeo);
    const gauntlet = new THREE.Mesh(gauntletGeo, steelTrimMat);
    gauntlet.position.set(side * 0.055, -0.29, 0.07);
    gauntlet.castShadow = true;
    pivot.add(gauntlet);

    return pivot;
  };

  const leftArmPivot = buildArmPivot('leftArmPivot', -1);
  const rightArmPivot = buildArmPivot('rightArmPivot', 1);
  bodyPivot.add(leftArmPivot);
  bodyPivot.add(rightArmPivot);

  // Archetype-distinct Sculpted Helms & Regalia
  if (archetypeIndex === 0) {
    // Winged Valkyrie Knight Helm
    const visorGeo = new THREE.CylinderGeometry(0.165, 0.15, 0.11, 10, 1, false, -0.9, 1.8);
    const visor = new THREE.Mesh(visorGeo, armorMetalMat);
    visor.position.set(0, 0.98, 0.02);
    bodyPivot.add(visor);

    const wingGeo = new THREE.ConeGeometry(0.058, 0.36, 5);
    [-1, 1].forEach((side) => {
      const plume = new THREE.Mesh(wingGeo, armorMetalMat);
      plume.position.set(side * 0.21, 1.05, -0.02);
      plume.rotation.z = -side * 0.46;
      plume.castShadow = true;
      bodyPivot.add(plume);
    });
  } else if (archetypeIndex === 1) {
    // Arcane Scholar Hood & Astrolabe Ring
    const hoodGeo = new THREE.ConeGeometry(0.21, 0.32, 10);
    const hood = new THREE.Mesh(hoodGeo, clothMat);
    hood.position.set(0, 1.04, -0.03);
    hood.rotation.x = -0.22;
    bodyPivot.add(hood);

    const arcaneRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 28), armorMetalMat);
    arcaneRing.position.y = 1.15;
    arcaneRing.rotation.set(Math.PI / 3, 0.2, 0.35);
    bodyPivot.add(arcaneRing);
  } else if (archetypeIndex === 2) {
    // Verdant Ranger Stag Horns & Mantle
    const antlerGeo = new THREE.ConeGeometry(0.032, 0.28, 6);
    [-1, 1].forEach((side) => {
      const horn = new THREE.Mesh(antlerGeo, armorMetalMat);
      horn.position.set(side * 0.14, 1.13, 0);
      horn.rotation.z = -side * 0.52;
      horn.castShadow = true;
      bodyPivot.add(horn);
    });
  } else {
    // Solar Sentinel Sun-Crested Crown
    const crownBand = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 8, 20), armorMetalMat);
    crownBand.rotation.x = Math.PI / 2;
    crownBand.position.y = 1.07;
    bodyPivot.add(crownBand);

    const sunHalo = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 8, 24), armorMetalMat);
    sunHalo.position.set(0, 1.14, -0.06);
    bodyPivot.add(sunHalo);
  }

  let crestGeo: THREE.BufferGeometry;
  if (archetypeIndex === 0) crestGeo = new THREE.ConeGeometry(0.14, 0.32, 6);
  else if (archetypeIndex === 1) crestGeo = new THREE.OctahedronGeometry(0.15, 0);
  else if (archetypeIndex === 2) crestGeo = new THREE.DodecahedronGeometry(0.14, 0);
  else crestGeo = new THREE.IcosahedronGeometry(0.14, 0);

  const crestMesh = new THREE.Mesh(crestGeo, crystalMat);
  crestMesh.position.y = 1.28;
  crestMesh.castShadow = true;
  bodyPivot.add(crestMesh);

  const shieldRingMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x2563eb,
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.82,
  });
  const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.03, 10, 28), shieldRingMat);
  shieldRing.rotation.x = Math.PI / 2.2;
  shieldRing.position.y = 0.64;
  shieldRing.visible = false;
  bodyPivot.add(shieldRing);

  const mixer = new THREE.AnimationMixer(bodyPivot);
  const clips = getPawnClips();
  const actions: Record<PawnClipName, THREE.AnimationAction> = {
    idle: mixer.clipAction(clips.idle),
    walk: mixer.clipAction(clips.walk),
    climb: mixer.clipAction(clips.climb),
    cast: mixer.clipAction(clips.cast),
    victory: mixer.clipAction(clips.victory),
  };
  actions.cast.loop = THREE.LoopOnce;
  actions.cast.clampWhenFinished = true;

  let activeClip: PawnClipName = 'idle';
  actions.idle.play();

  const playClip = (name: PawnClipName, fadeSec = 0.16) => {
    if (name === activeClip && name !== 'cast') return;
    const prevAction = actions[activeClip];
    const nextAction = actions[name];
    nextAction.reset();
    nextAction.enabled = true;
    nextAction.play();
    if (prevAction && prevAction !== nextAction) {
      prevAction.crossFadeTo(nextAction, fadeSec, false);
    }
    activeClip = name;
  };

  return {
    group,
    bodyPivot,
    leftArmPivot,
    rightArmPivot,
    shieldRing,
    activeHalo,
    crestMesh,
    mixer,
    actions,
    playClip,
  };
}

/**
 * Generates an organic tapered spline BufferGeometry along a CatmullRomCurve3.
 */
function createTaperedSplineGeometry(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  radiusAt: (t: number) => number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);
    const r = radiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      // Subtle muscular lateral rib fullness
      const ovalScale = 1.0 + 0.08 * Math.cos(v * 2);
      vertex.x = P.x + r * ovalScale * normal.x;
      vertex.y = P.y + r * normal.y;
      vertex.z = P.z + r * ovalScale * normal.z;

      const idx = i * (radialSegments + 1) + j;
      positions[idx * 3] = vertex.x;
      positions[idx * 3 + 1] = vertex.y;
      positions[idx * 3 + 2] = vertex.z;

      normals[idx * 3] = normal.x;
      normals[idx * 3 + 1] = normal.y;
      normals[idx * 3 + 2] = normal.z;

      uvs[idx * 2] = t;
      uvs[idx * 2 + 1] = j / radialSegments;
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j;
      const b = (radialSegments + 1) * (i + 1) + j;
      const c = (radialSegments + 1) * (i + 1) + (j + 1);
      const d = (radialSegments + 1) * i + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
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

export interface SerpentBuildResult {
  group: THREE.Group;
  bodyLod: THREE.LOD;
  curve: THREE.CatmullRomCurve3;
  headGroup: THREE.Group;
  upperJawGroup: THREE.Group;
  jawGroup: THREE.Group;
  tongueMesh: THREE.Mesh;
  gulletTarget: THREE.Object3D;
  bodyMaterial: THREE.MeshStandardMaterial;
  baseHeadPos: THREE.Vector3;
  baseHeadQuat: THREE.Quaternion;
  setForcedLod0: (force: boolean) => void;
  eatState: {
    active: boolean;
    swallowProgress: number;
    swallowAmp: number;
  };
}

/**
 * Builds an anatomical 3D Fantasy Serpent with resolution-scaled PBR identity scale maps,
 * 3-tier body/spine THREE.LOD (pinning to LOD0 whenever eating cinematics run),
 * dorsal ridge spines synced to the slithering + swallowing GPU shader, and shared non-unique materials.
 */
export function createFantasySnake(
  fromPos: { x: number; z: number },
  toPos: { x: number; z: number },
  palette: { primary: string; stripe: string; belly: string; horn: number },
  maxAnisotropy: number,
  quality: QualityConfig = QUALITY_PRESETS.high,
  boardConfig?: BoardConfig,
): SerpentBuildResult {
  const shadows = quality.shadowsEnabled;
  const group = new THREE.Group();
  const snakeCfg = boardConfig?.snakeConfig;
  const sizeScale = THREE.MathUtils.clamp(snakeCfg?.sizeScale ?? 1.0, 0.75, 1.35);
  const scalePattern = snakeCfg?.scalePattern ?? 'diamond_keel';
  const headModel = snakeCfg?.headModel ?? 'oriental_dragon';
  const matFinish = snakeCfg?.materialFinish ?? 'glossy_scales';

  const start = new THREE.Vector3(fromPos.x, 0.36, fromPos.z);
  const end = new THREE.Vector3(toPos.x, 0.14, toPos.z);
  const delta = new THREE.Vector3().subVectors(end, start);
  const len = delta.length();
  const dir = delta.clone().normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);

  const waveAmp = Math.min(1.22, Math.max(0.62, len * 0.145));
  const points: THREE.Vector3[] = [];
  const numCtrl = 10;
  for (let i = 0; i <= numCtrl; i++) {
    const t = i / numCtrl;
    const p = new THREE.Vector3().lerpVectors(start, end, t);
    const wave = Math.sin(t * Math.PI * 3.0) * waveAmp * Math.sin(t * Math.PI);
    p.addScaledVector(perp, wave);
    p.y += Math.sin(t * Math.PI) * 0.44 + (1 - t) * 0.08;
    points.push(p);
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const scalePbr = getSerpentPbr(
    palette.primary,
    palette.stripe,
    palette.belly,
    maxAnisotropy,
    quality.pbrTexSize,
    scalePattern,
  );

  const bodyRoughness =
    matFinish === 'crystalline'
      ? 0.22
      : matFinish === 'metallic_drake'
        ? 0.34
        : matFinish === 'matte_reptile'
          ? 0.85
          : 0.56;
  const bodyMetalness =
    matFinish === 'metallic_drake' ? 0.82 : matFinish === 'crystalline' ? 0.55 : 0.38;

  const bodyMaterial = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(1.65, 1.65),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    metalnessMap: scalePbr.metalnessMap ?? null,
    aoMapIntensity: 0.92,
    roughness: bodyRoughness,
    metalness: bodyMetalness,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  });

  bodyMaterial.userData.uTime = { value: 0 };
  bodyMaterial.userData.uSwallowPos = { value: -1 };
  bodyMaterial.userData.uSwallowAmp = { value: 0 };
  bodyMaterial.userData.perpDir = { value: new THREE.Vector3(perp.x, 0, perp.z) };
  bodyMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = bodyMaterial.userData.uTime;
    shader.uniforms.uSwallowPos = bodyMaterial.userData.uSwallowPos;
    shader.uniforms.uSwallowAmp = bodyMaterial.userData.uSwallowAmp;
    shader.uniforms.uPerpDir = bodyMaterial.userData.perpDir;
    shader.vertexShader =
      'uniform float uTime;\nuniform float uSwallowPos;\nuniform float uSwallowAmp;\nuniform vec3 uPerpDir;\n' +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float slitherEnv = sin(uv.x * 3.14159265);
      float slitherWave = sin(uv.x * 16.0 - uTime * 3.2) * 0.14 * slitherEnv;
      transformed += uPerpDir * slitherWave;
      transformed.y += cos(uv.x * 12.0 - uTime * 2.6) * 0.045 * slitherEnv;
      if (uSwallowAmp > 0.001) {
        float distSw = abs(uv.x - uSwallowPos);
        float bulge = exp(-pow(distSw / 0.085, 2.0)) * uSwallowAmp * (1.0 - uv.x * 0.45);
        transformed += objectNormal * (bulge * 0.28);
      }
      `,
    );
  };

  const bodyRadiusAt = (t: number) => {
    let baseR = 0.2;
    if (t < 0.08) baseR = THREE.MathUtils.lerp(0.145, 0.2, t / 0.08);
    else if (t < 0.45) baseR = THREE.MathUtils.lerp(0.2, 0.225, (t - 0.08) / 0.37);
    else {
      const tailT = (t - 0.45) / 0.55;
      baseR = THREE.MathUtils.lerp(0.225, 0.026, Math.pow(tailT, 1.35));
    }
    return baseR * sizeScale;
  };

  const buildSpineMesh = (step: number, mat: THREE.Material): THREE.Mesh | null => {
    const spineGeos: THREE.BufferGeometry[] = [];
    const spineCount = Math.max(14, Math.floor(len * 3.2));
    const upVec = new THREE.Vector3(0, 1, 0);
    const pSample = new THREE.Vector3();
    const tang = new THREE.Vector3();
    const spineNormal = new THREE.Vector3();
    const qSpine = new THREE.Quaternion();
    const mSpine = new THREE.Matrix4();
    const unitScale = new THREE.Vector3(1, 1, 1);

    for (let k = 1; k < spineCount - 1; k += step) {
      const t = k / spineCount;
      if (t < 0.06 || t > 0.92) continue;
      curve.getPointAt(t, pSample);
      curve.getTangentAt(t, tang).normalize();
      spineNormal.set(0, 1, 0).addScaledVector(tang, -0.25).normalize();

      const rBody = bodyRadiusAt(t);
      const spikeSize =
        (0.095 + Math.sin(t * Math.PI) * 0.075) *
        (1 - t * 0.35) *
        sizeScale *
        (headModel === 'abyssal_wyrm' ? 1.35 : 1.0);
      const fin = new THREE.ConeGeometry(spikeSize * 0.42, spikeSize * 1.45, 4);
      fin.scale(0.55, 1.0, 1.25);
      fin.translate(0, spikeSize * 0.55, 0);

      const fUv = fin.attributes.uv;
      for (let uIdx = 0; uIdx < fUv.count; uIdx++) {
        fUv.setXY(uIdx, t, 0.5);
      }

      qSpine.setFromUnitVectors(upVec, spineNormal);
      pSample.y += rBody * 0.88;
      mSpine.compose(pSample, qSpine, unitScale);
      fin.applyMatrix4(mSpine);
      ensureUv2(fin);
      spineGeos.push(fin);
    }
    if (spineGeos.length === 0) return null;
    const mergedSpines = BufferGeometryUtils.mergeGeometries(spineGeos, false);
    spineGeos.forEach((g) => g.dispose());
    const spineMesh = new THREE.Mesh(mergedSpines, mat);
    spineMesh.castShadow = shadows;
    return spineMesh;
  };

  const bronzePbr = getBronzePbr(maxAnisotropy, Math.min(512, quality.pbrTexSize) as 256 | 512);
  const hornMat = new THREE.MeshStandardMaterial({
    color: palette.horn,
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: bronzePbr.roughnessMap,
    aoMap: bronzePbr.aoMap,
    metalnessMap: bronzePbr.metalnessMap ?? null,
    aoMapIntensity: 0.78,
    roughness: 0.28,
    metalness: 0.84,
  });
  const spineMat = hornMat.clone();
  spineMat.userData.uTime = bodyMaterial.userData.uTime;
  spineMat.userData.uSwallowPos = bodyMaterial.userData.uSwallowPos;
  spineMat.userData.uSwallowAmp = bodyMaterial.userData.uSwallowAmp;
  spineMat.userData.perpDir = bodyMaterial.userData.perpDir;
  spineMat.onBeforeCompile = bodyMaterial.onBeforeCompile;

  // 3-tier Body & Dorsal Spine LOD
  const bodyLod = new THREE.LOD();
  const lodBias = quality.lodBias;

  // LOD0: Hero detail
  const bodyLod0 = new THREE.Group();
  bodyLod0.userData.baseLodDist = 0;
  const bodyMesh0 = new THREE.Mesh(
    createTaperedSplineGeometry(curve, 76, 18, bodyRadiusAt),
    bodyMaterial,
  );
  bodyMesh0.castShadow = shadows;
  bodyMesh0.receiveShadow = shadows;
  bodyLod0.add(bodyMesh0);
  const spine0 = buildSpineMesh(1, spineMat);
  if (spine0) bodyLod0.add(spine0);

  // LOD1: Medium distance (~55% fewer triangles)
  const bodyLod1 = new THREE.Group();
  bodyLod1.userData.baseLodDist = 14;
  const bodyMesh1 = new THREE.Mesh(
    createTaperedSplineGeometry(curve, 38, 11, bodyRadiusAt),
    bodyMaterial,
  );
  bodyMesh1.castShadow = shadows;
  bodyMesh1.receiveShadow = shadows;
  bodyLod1.add(bodyMesh1);
  const spine1 = buildSpineMesh(2, spineMat);
  if (spine1) bodyLod1.add(spine1);

  // LOD2: Distant silhouette (~82% fewer triangles)
  const bodyLod2 = new THREE.Group();
  bodyLod2.userData.baseLodDist = 24;
  const bodyMesh2 = new THREE.Mesh(
    createTaperedSplineGeometry(curve, 22, 8, bodyRadiusAt),
    bodyMaterial,
  );
  bodyMesh2.receiveShadow = shadows;
  bodyLod2.add(bodyMesh2);

  bodyLod.addLevel(bodyLod0, 0);
  bodyLod.addLevel(bodyLod1, 14 * lodBias);
  bodyLod.addLevel(bodyLod2, 24 * lodBias);
  group.add(bodyLod);

  // Articulated Anatomical Serpent Head Pivot
  const headGroup = new THREE.Group();
  headGroup.up.set(0, 1, 0);
  headGroup.rotation.order = 'YXZ';
  headGroup.position.copy(start);
  headGroup.position.y += 0.05;
  const startTangent = curve.getTangent(0).normalize();
  const lookTarget = start.clone().sub(startTangent);
  headGroup.lookAt(lookTarget.x, headGroup.position.y, lookTarget.z);
  const baseHeadPos = headGroup.position.clone();
  const baseHeadQuat = headGroup.quaternion.clone();

  const craniumMat = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(1.5, 1.5),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    metalnessMap: scalePbr.metalnessMap ?? null,
    aoMapIntensity: 0.88,
    roughness: bodyRoughness,
    metalness: bodyMetalness,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: palette.belly,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    aoMapIntensity: 0.75,
    roughness: 0.52,
    metalness: 0.14,
  });
  const sharedMats = getSharedSnakeStaticMats(maxAnisotropy);
  const ivoryMat = sharedMats.ivory;
  const gulletMat = sharedMats.gullet;
  const eyeMat = sharedMats.eye;
  const tongueMat = sharedMats.tongue;

  const headDetail = quality.tier === 'potato' ? 1 : 2;
  const radialDetail = quality.tier === 'potato' ? 8 : 12;

  const neckGeo = new THREE.SphereGeometry(0.188, radialDetail, Math.max(6, radialDetail - 4));
  neckGeo.scale(1.06, 0.92, 1.32);
  ensureUv2(neckGeo);
  const neckCollar = new THREE.Mesh(neckGeo, craniumMat);
  neckCollar.position.set(0, 0.01, -0.06);
  headGroup.add(neckCollar);

  const gulletTarget = new THREE.Object3D();
  gulletTarget.position.set(0, 0.0, 0.18);
  headGroup.add(gulletTarget);

  const throatCavity = new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8), gulletMat);
  throatCavity.scale.set(1.0, 0.85, 1.45);
  throatCavity.position.set(0, 0.0, 0.14);
  headGroup.add(throatCavity);

  const upperJawGroup = new THREE.Group();
  upperJawGroup.position.set(0, 0.02, 0.06);

  const craniumGeo = new THREE.IcosahedronGeometry(0.23, headDetail);
  const cPos = craniumGeo.attributes.position;
  for (let i = 0; i < cPos.count; i++) {
    const cx = cPos.getX(i);
    const cy = cPos.getY(i);
    const cz = cPos.getZ(i);
    const taper = cz > 0 ? 1 - cz * 0.95 : 1 + Math.abs(cz) * 0.55;
    const flatVentral = cy < 0 ? 0.55 : 0.84;
    cPos.setXYZ(i, cx * (1.12 * taper), cy * flatVentral, cz * 1.42);
  }
  craniumGeo.computeVertexNormals();
  ensureUv2(craniumGeo);
  const cranium = new THREE.Mesh(craniumGeo, craniumMat);
  cranium.position.set(0, 0.07, 0.11);
  cranium.castShadow = shadows;
  upperJawGroup.add(cranium);

  const snoutGeo = new THREE.IcosahedronGeometry(0.15, headDetail);
  const sPos = snoutGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const sx = sPos.getX(i);
    const sy = sPos.getY(i);
    const sz = sPos.getZ(i);
    const muzzleTaper = sz > 0 ? 1 - sz * 1.25 : 1.05;
    sPos.setXYZ(i, sx * muzzleTaper, sy * (sy < 0 ? 0.45 : 0.72), sz * 1.55);
  }
  snoutGeo.computeVertexNormals();
  ensureUv2(snoutGeo);
  const snout = new THREE.Mesh(snoutGeo, craniumMat);
  snout.position.set(0, 0.045, 0.34);
  snout.castShadow = shadows;
  upperJawGroup.add(snout);

  const upperPalate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.36), gulletMat);
  upperPalate.position.set(0, -0.005, 0.24);
  upperJawGroup.add(upperPalate);

  const upperFangGeo = new THREE.ConeGeometry(0.02, 0.105, 7);
  upperFangGeo.rotateX(Math.PI);

  [-1, 1].forEach((side) => {
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.13, 0.145, 0.02),
      new THREE.Vector3(side * 0.22, 0.29, -0.14),
      new THREE.Vector3(side * 0.19, 0.41, -0.34),
    ]);
    const hornGeo = createTaperedSplineGeometry(
      hornCurve,
      quality.tier === 'potato' ? 7 : 12,
      quality.tier === 'potato' ? 6 : 8,
      (t) => THREE.MathUtils.lerp(0.048, 0.008, t),
    );
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.castShadow = shadows;
    upperJawGroup.add(horn);

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.125, 0.148, 0.08),
      new THREE.Vector3(side * 0.185, 0.162, 0.21),
      new THREE.Vector3(side * 0.142, 0.122, 0.34),
    ]);
    const browMesh = new THREE.Mesh(
      createTaperedSplineGeometry(browCurve, 6, 5, (t) =>
        THREE.MathUtils.lerp(0.036, 0.018, t),
      ),
      craniumMat,
    );
    upperJawGroup.add(browMesh);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.064, 12, 10), eyeMat);
    eye.position.set(side * 0.195, 0.108, 0.215);
    eye.rotation.y = side > 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
    upperJawGroup.add(eye);

    const nostrilRim = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.006, 5, 10), craniumMat);
    nostrilRim.position.set(side * 0.055, 0.072, 0.49);
    nostrilRim.rotation.set(-0.4, side * 0.5, 0);
    upperJawGroup.add(nostrilRim);

    const nostrilHole = new THREE.Mesh(new THREE.SphereGeometry(0.012, 5, 5), gulletMat);
    nostrilHole.position.set(side * 0.056, 0.07, 0.495);
    upperJawGroup.add(nostrilHole);

    const fang = new THREE.Mesh(upperFangGeo, ivoryMat);
    fang.position.set(side * 0.085, -0.025, 0.44);
    fang.rotation.x = -0.12;
    upperJawGroup.add(fang);
  });
  headGroup.add(upperJawGroup);

  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.02, 0.08);
  const jawGeo = new THREE.IcosahedronGeometry(0.145, headDetail);
  jawGeo.scale(0.92, 0.44, 1.85);
  ensureUv2(jawGeo);
  const jawMesh = new THREE.Mesh(jawGeo, bellyMat);
  jawMesh.position.set(0, -0.025, 0.22);
  jawGroup.add(jawMesh);

  const lowerFloor = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.32), gulletMat);
  lowerFloor.position.set(0, 0.005, 0.2);
  jawGroup.add(lowerFloor);

  [-1, 1].forEach((side) => {
    const lFang = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.072, 6), ivoryMat);
    lFang.position.set(side * 0.072, 0.022, 0.41);
    lFang.rotation.x = 0.14;
    jawGroup.add(lFang);
  });

  const tongueShape = new THREE.Shape();
  tongueShape.moveTo(-0.022, 0);
  tongueShape.lineTo(0.022, 0);
  tongueShape.lineTo(0.022, 0.24);
  tongueShape.lineTo(0.06, 0.34);
  tongueShape.lineTo(0.015, 0.27);
  tongueShape.lineTo(0, 0.23);
  tongueShape.lineTo(-0.015, 0.27);
  tongueShape.lineTo(-0.06, 0.34);
  tongueShape.lineTo(-0.022, 0.24);
  tongueShape.closePath();

  const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, { depth: 0.012, bevelEnabled: false });
  tongueGeo.rotateX(Math.PI / 2);
  const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
  tongueMesh.position.set(0, 0.015, 0.34);
  jawGroup.add(tongueMesh);
  headGroup.add(jawGroup);
  headGroup.scale.setScalar(sizeScale);

  // Head model specific crest / hood ornament
  if (headModel === 'crowned_cobra') {
    const hoodGeo = new THREE.CylinderGeometry(0.28, 0.14, 0.36, 10);
    hoodGeo.scale(1.4, 0.28, 0.9);
    const hoodMesh = new THREE.Mesh(hoodGeo, craniumMat);
    hoodMesh.position.set(0, 0.04, -0.05);
    hoodMesh.rotation.x = Math.PI * 0.22;
    upperJawGroup.add(hoodMesh);
  } else if (headModel === 'abyssal_wyrm') {
    const finGeo = new THREE.ConeGeometry(0.14, 0.42, 4);
    finGeo.scale(0.3, 1.0, 1.2);
    const finMesh = new THREE.Mesh(finGeo, hornMat);
    finMesh.position.set(0, 0.28, -0.04);
    finMesh.rotation.x = -0.35;
    upperJawGroup.add(finMesh);
  }

  group.add(headGroup);

  const setForcedLod0 = (force: boolean) => {
    if (force) {
      bodyLod.autoUpdate = false;
      bodyLod0.visible = true;
      bodyLod1.visible = false;
      bodyLod2.visible = false;
    } else {
      bodyLod.autoUpdate = true;
    }
  };

  return {
    group,
    bodyLod,
    curve,
    headGroup,
    upperJawGroup,
    jawGroup,
    tongueMesh,
    gulletTarget,
    bodyMaterial,
    baseHeadPos,
    baseHeadQuat,
    setForcedLod0,
    eatState: { active: false, swallowProgress: -1, swallowAmp: 0 },
  };
}

export interface LadderBuildResult {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  rungPositions: THREE.Vector3[];
  climbForward: THREE.Vector3;
}

/**
 * Generates a chamfered rectangular timber rail along a CatmullRomCurve3 (avoiding plastic tubes).
 */
function createBeveledTimberRailGeo(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  halfW: number,
  halfH: number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(segments, false);
  // 8-point chamfered octagon cross-section
  const c = 0.32;
  const profile: Array<[number, number]> = [
    [-halfW, -halfH * (1 - c)],
    [-halfW * (1 - c), -halfH],
    [halfW * (1 - c), -halfH],
    [halfW, -halfH * (1 - c)],
    [halfW, halfH * (1 - c)],
    [halfW * (1 - c), halfH],
    [-halfW * (1 - c), halfH],
    [-halfW, halfH * (1 - c)],
  ];
  const pLen = profile.length;
  const positions = new Float32Array((segments + 1) * (pLen + 1) * 3);
  const uvs = new Float32Array((segments + 1) * (pLen + 1) * 2);
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);

    for (let j = 0; j <= pLen; j++) {
      const [px, py] = profile[j % pLen];
      const vx = P.x + px * N.x + py * B.x;
      const vy = P.y + px * N.y + py * B.y;
      const vz = P.z + px * N.z + py * B.z;

      const idx = i * (pLen + 1) + j;
      positions[idx * 3] = vx;
      positions[idx * 3 + 1] = vy;
      positions[idx * 3 + 2] = vz;
      uvs[idx * 2] = t * 3;
      uvs[idx * 2 + 1] = j / pLen;
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < pLen; j++) {
      const a = (pLen + 1) * i + j;
      const b = (pLen + 1) * (i + 1) + j;
      const cIdx = (pLen + 1) * (i + 1) + (j + 1);
      const d = (pLen + 1) * i + (j + 1);
      indices.push(a, b, d, b, cIdx, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  ensureUv2(geo);
  return geo;
}

/**
 * Builds a Realistic Timber Fantasy Ladder with chamfered oak stiles, full wood PBR maps
 * (albedo, normal, roughness, AO), hand-hewn wooden rungs, hammered-bronze mortise brackets,
 * rope lashings, and carved stone-bronze tile sockets.
 */
export function createEnchantedLadder(
  fromPos: { x: number; z: number },
  toPos: { x: number; z: number },
  maxAnisotropy: number,
  quality: QualityConfig = QUALITY_PRESETS.high,
  boardConfig?: BoardConfig,
): LadderBuildResult {
  const shadows = quality.shadowsEnabled;
  const group = new THREE.Group();
  const ladderCfg = boardConfig?.ladderConfig;
  const widthScale = THREE.MathUtils.clamp(ladderCfg?.widthScale ?? 1.0, 0.75, 1.35);
  const modelStyle = ladderCfg?.modelStyle ?? 'arch_bridge';
  const matStyle = ladderCfg?.materialStyle ?? 'ancient_oak';

  const start = new THREE.Vector3(fromPos.x, 0.14, fromPos.z);
  const end = new THREE.Vector3(toPos.x, 0.14, toPos.z);
  const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
  mid.y += modelStyle === 'crystal_spire' ? 0.85 : modelStyle === 'royal_steps' ? 0.45 : 0.62;
  const climbCurve = new THREE.CatmullRomCurve3([start, mid, end]);

  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x);
  const halfWidth = 0.31 * widthScale;

  const ladderTexSize = Math.min(512, quality.pbrTexSize) as 256 | 512;
  const primaryHex = ladderCfg?.primaryColor ?? '#b47b48';
  const accentHex = ladderCfg?.accentColor ?? '#f59e0b';
  const ladderPbr = getLadderPbr(matStyle, primaryHex, accentHex, maxAnisotropy, ladderTexSize);
  const bronzePbr = getBronzePbr(maxAnisotropy, ladderTexSize);

  const primaryLadderColor = new THREE.Color(primaryHex);
  const accentLadderColor = new THREE.Color(accentHex);
  const isCrystalOrMarble =
    matStyle === 'glacier_crystal' || matStyle === 'celestial_marble' || matStyle === 'coral_pearl';
  const isMetallicLadder =
    matStyle === 'obsidian_iron' || matStyle === 'shadow_wrought' || matStyle === 'temple_bronze';

  const railMat = new THREE.MeshStandardMaterial({
    map: ladderPbr.map,
    normalMap: ladderPbr.normalMap,
    normalScale: new THREE.Vector2(1.55, 1.55),
    roughnessMap: ladderPbr.roughnessMap,
    aoMap: ladderPbr.aoMap,
    metalnessMap: ladderPbr.metalnessMap ?? null,
    aoMapIntensity: 0.9,
    color: 0xffffff,
    roughness: isCrystalOrMarble ? 0.34 : isMetallicLadder ? 0.52 : 0.85,
    metalness: isMetallicLadder ? 0.88 : isCrystalOrMarble ? 0.45 : 0.25,
  });
  const rungMat = new THREE.MeshStandardMaterial({
    map: ladderPbr.map,
    normalMap: ladderPbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: ladderPbr.roughnessMap,
    aoMap: ladderPbr.aoMap,
    metalnessMap: ladderPbr.metalnessMap ?? null,
    aoMapIntensity: 0.86,
    color: new THREE.Color(0xffffff).lerp(accentLadderColor, 0.14),
    roughness: isCrystalOrMarble ? 0.3 : isMetallicLadder ? 0.48 : 0.82,
    metalness: isMetallicLadder ? 0.85 : isCrystalOrMarble ? 0.42 : 0.22,
  });
  const ironBronzeMat = new THREE.MeshStandardMaterial({
    color: accentLadderColor,
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughnessMap: bronzePbr.roughnessMap,
    aoMap: bronzePbr.aoMap,
    metalnessMap: bronzePbr.metalnessMap ?? null,
    aoMapIntensity: 0.82,
    roughness: 0.32,
    metalness: 0.9,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: accentLadderColor.clone().multiplyScalar(0.78),
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: bronzePbr.roughnessMap,
    aoMap: bronzePbr.aoMap,
    aoMapIntensity: 0.75,
    roughness: 0.78,
    metalness: 0.18,
  });

  // Merge both side stiles -> 1 draw call
  const railGeos: THREE.BufferGeometry[] = [];
  const bronzeGeos: THREE.BufferGeometry[] = [];
  const capBaseGeo = new THREE.CylinderGeometry(0.088, 0.095, 0.1, 8);
  ensureUv2(capBaseGeo);

  [-1, 1].forEach((side) => {
    const offset = perp.clone().multiplyScalar(side * halfWidth);
    const p0 = start.clone().add(offset);
    const p1 = mid.clone().add(offset);
    const p2 = end.clone().add(offset);
    const railCurve = new THREE.CatmullRomCurve3([p0, p1, p2]);
    const railGeo = createBeveledTimberRailGeo(
      railCurve,
      quality.tier === 'potato' ? 16 : 26,
      0.068,
      0.056,
    );
    railGeos.push(railGeo);

    [p0, p2].forEach((capPos) => {
      const capG = capBaseGeo.clone();
      capG.translate(capPos.x, capPos.y, capPos.z);
      bronzeGeos.push(capG);
    });
  });
  capBaseGeo.dispose();

  const mergedRails = BufferGeometryUtils.mergeGeometries(railGeos, false);
  railGeos.forEach((g) => g.dispose());
  const railMesh = new THREE.Mesh(mergedRails, railMat);
  railMesh.castShadow = shadows;
  railMesh.receiveShadow = shadows;
  group.add(railMesh);

  const totalDist = start.distanceTo(end);
  const rungCount = Math.max(5, Math.floor(totalDist / 0.68));
  const rungProfile = [
    new THREE.Vector2(0.056, -halfWidth - 0.03),
    new THREE.Vector2(0.052, -halfWidth * 0.55),
    new THREE.Vector2(0.046, 0),
    new THREE.Vector2(0.052, halfWidth * 0.55),
    new THREE.Vector2(0.056, halfWidth + 0.03),
  ];
  const rungBaseGeo = new THREE.LatheGeometry(rungProfile, quality.tier === 'potato' ? 8 : 12);
  ensureUv2(rungBaseGeo);

  const bandBaseGeo = new THREE.BoxGeometry(0.145, 0.08, 0.145);
  ensureUv2(bandBaseGeo);
  const ropeBaseGeo = new THREE.TorusGeometry(0.064, 0.016, 5, 10);
  ropeBaseGeo.rotateX(Math.PI / 2);
  ensureUv2(ropeBaseGeo);

  const yAxis = new THREE.Vector3(0, 1, 0);
  const rungPositions: THREE.Vector3[] = [];
  const rungGeos: THREE.BufferGeometry[] = [];
  const ropeGeos: THREE.BufferGeometry[] = [];
  const qTmp = new THREE.Quaternion();
  const mTmp = new THREE.Matrix4();
  const vPosTmp = new THREE.Vector3();
  const unitScale = new THREE.Vector3(1, 1, 1);

  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount;
    const pos = climbCurve.getPoint(t);
    rungPositions.push(pos.clone());

    qTmp.setFromUnitVectors(yAxis, perp);
    mTmp.compose(pos, qTmp, unitScale);
    const rg = rungBaseGeo.clone();
    rg.applyMatrix4(mTmp);
    rungGeos.push(rg);

    [-1, 1].forEach((side) => {
      vPosTmp.copy(pos).addScaledVector(perp, side * halfWidth);
      mTmp.compose(vPosTmp, qTmp, unitScale);
      const cg = bandBaseGeo.clone();
      cg.applyMatrix4(mTmp);
      bronzeGeos.push(cg);

      vPosTmp.copy(pos).addScaledVector(perp, side * (halfWidth - 0.065));
      mTmp.compose(vPosTmp, qTmp, unitScale);
      const rlg = ropeBaseGeo.clone();
      rlg.applyMatrix4(mTmp);
      ropeGeos.push(rlg);
    });
  }
  rungBaseGeo.dispose();
  bandBaseGeo.dispose();
  ropeBaseGeo.dispose();

  // Carved Stone & Bronze Anchor Sockets merged into bronzeGeos
  const socketRingBase = new THREE.TorusGeometry(0.45, 0.034, 6, 20);
  socketRingBase.rotateX(Math.PI / 2);
  ensureUv2(socketRingBase);
  [start, end].forEach((pt) => {
    const sg = socketRingBase.clone();
    sg.translate(pt.x, 0.052, pt.z);
    bronzeGeos.push(sg);
  });
  socketRingBase.dispose();

  if (rungGeos.length > 0) {
    const mergedRungs = BufferGeometryUtils.mergeGeometries(rungGeos, false);
    rungGeos.forEach((g) => g.dispose());
    const rungsMesh = new THREE.Mesh(mergedRungs, rungMat);
    rungsMesh.castShadow = shadows;
    rungsMesh.receiveShadow = shadows;
    group.add(rungsMesh);
  }

  if (bronzeGeos.length > 0) {
    const mergedBronze = BufferGeometryUtils.mergeGeometries(bronzeGeos, false);
    bronzeGeos.forEach((g) => g.dispose());
    const bronzeMesh = new THREE.Mesh(mergedBronze, ironBronzeMat);
    bronzeMesh.castShadow = shadows;
    group.add(bronzeMesh);
  }

  if (ropeGeos.length > 0) {
    const mergedRopes = BufferGeometryUtils.mergeGeometries(ropeGeos, false);
    ropeGeos.forEach((g) => g.dispose());
    const ropesMesh = new THREE.Mesh(mergedRopes, ropeMat);
    group.add(ropesMesh);
  }

  return { group, curve: climbCurve, rungPositions, climbForward: dir };
}

export function createSpecialShrineProp(type: SpecialTileType): THREE.Group {
  const group = new THREE.Group();

  const colorMap: Record<SpecialTileType, { color: number; emissive: number }> = {
    boost: { color: 0x34d399, emissive: 0x059669 },
    extra_roll: { color: 0xfbbf24, emissive: 0xd97706 },
    shield: { color: 0x60a5fa, emissive: 0x2563eb },
    curse: { color: 0xc084fc, emissive: 0x7e22ce },
  };
  const cfg = colorMap[type];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.74,
    metalness: 0.24,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.24,
    metalness: 0.88,
  });
  const gemMat = new THREE.MeshPhysicalMaterial({
    color: cfg.color,
    emissive: cfg.emissive,
    emissiveIntensity: 0.45,
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: 1.0,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.08, 6), plinthMat);
  plinth.position.y = 0.04;
  group.add(plinth);

  const brassCap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 6), brassMat);
  brassCap.position.y = 0.085;
  group.add(brassCap);

  const prongGeo = new THREE.ConeGeometry(0.022, 0.13, 5);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const prong = new THREE.Mesh(prongGeo, brassMat);
    prong.position.set(Math.cos(angle) * 0.11, 0.14, Math.sin(angle) * 0.11);
    prong.rotation.z = Math.cos(angle) * 0.28;
    prong.rotation.x = -Math.sin(angle) * 0.28;
    group.add(prong);
  }

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.135, 0), gemMat);
  crystal.position.y = 0.29;
  crystal.scale.set(0.88, 1.25, 0.88);
  crystal.name = 'floatingCrystal';
  group.add(crystal);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.018, 6, 24),
    brassMat,
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.13;
  group.add(halo);

  return group;
}

export function createFantasyDice(
  maxAnisotropy: number,
  skinId: DiceSkinId = 'royal_obsidian',
): THREE.Group {
  const group = new THREE.Group();
  group.name = `FantasyDice_${skinId}`;
  const skin = getDiceSkinDef(skinId);
  const tm = skin.threeMaterials;
  const bronzePbr = getBronzePbr(maxAnisotropy);

  const useRockNormals = skinId === 'molten_rock';
  const coreMat = new THREE.MeshStandardMaterial({
    color: tm.coreColor,
    normalMap: bronzePbr.normalMap,
    roughnessMap: useRockNormals ? bronzePbr.roughnessMap : null,
    normalScale: new THREE.Vector2(useRockNormals ? 1.15 : 0.55, useRockNormals ? 1.15 : 0.55),
    roughness: tm.coreRoughness,
    metalness: tm.coreMetalness,
    emissive: new THREE.Color(tm.coreEmissive),
    emissiveIntensity: tm.coreEmissiveIntensity,
  });
  const core = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.18, 1.18, 3, 0.13), coreMat);
  core.castShadow = true;
  group.add(core);

  const studMat = new THREE.MeshStandardMaterial({
    color: tm.studColor,
    roughness: 0.18,
    metalness: 0.88,
    emissive: new THREE.Color(tm.studEmissive),
    emissiveIntensity: tm.studEmissiveIntensity,
  });
  const studGeo = new THREE.OctahedronGeometry(
    skinId === 'celestial_core' || skinId === 'sovereign_gold' ? 0.088 : 0.075,
    0,
  );
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const stud = new THREE.Mesh(studGeo, studMat);
        stud.position.set(sx * 0.48, sy * 0.48, sz * 0.48);
        group.add(stud);
      }
    }
  }

  // Custom skin 3D energy/trim rings on the 6 faces
  if (skinId !== 'royal_obsidian') {
    const ringMat = new THREE.MeshStandardMaterial({
      color: tm.ringColor,
      roughness: 0.2,
      metalness: 0.85,
      emissive: new THREE.Color(tm.ringColor),
      emissiveIntensity: 0.45,
    });
    const ringGeo = new THREE.RingGeometry(0.42, 0.465, 24);
    const ringRots: Array<[[number, number, number], [number, number, number]]> = [
      [[0, 0.598, 0], [-Math.PI / 2, 0, 0]],
      [[0, -0.598, 0], [Math.PI / 2, 0, 0]],
      [[0, 0, 0.598], [0, 0, 0]],
      [[0, 0, -0.598], [0, Math.PI, 0]],
      [[0.598, 0, 0], [0, Math.PI / 2, 0]],
      [[-0.598, 0, 0], [0, -Math.PI / 2, 0]],
    ];
    for (const [pos, rot] of ringRots) {
      const rMesh = new THREE.Mesh(ringGeo, ringMat);
      rMesh.position.set(...pos);
      rMesh.rotation.set(...rot);
      group.add(rMesh);
    }
  }

  const faceConfigs: Array<{
    pips: number;
    pos: [number, number, number];
    rot: [number, number, number];
  }> = [
    { pips: 1, pos: [0, 0.595, 0], rot: [-Math.PI / 2, 0, 0] },
    { pips: 6, pos: [0, -0.595, 0], rot: [Math.PI / 2, 0, 0] },
    { pips: 2, pos: [0, 0, 0.595], rot: [0, 0, 0] },
    { pips: 5, pos: [0, 0, -0.595], rot: [0, Math.PI, 0] },
    { pips: 3, pos: [0.595, 0, 0], rot: [0, Math.PI / 2, 0] },
    { pips: 4, pos: [-0.595, 0, 0], rot: [0, -Math.PI / 2, 0] },
  ];

  const isLuminousSkin = skinId === 'celestial_core' || skinId === 'molten_rock';
  const plateGeo = new THREE.PlaneGeometry(0.94, 0.94);
  for (const f of faceConfigs) {
    const tex = createDiceFaceTexture(f.pips, maxAnisotropy, skinId);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: skinId === 'molten_rock' ? 0.36 : 0.22,
      metalness: skinId === 'sovereign_gold' ? 0.32 : 0.16,
      emissiveMap: isLuminousSkin ? tex : null,
      emissive: isLuminousSkin ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
      emissiveIntensity: isLuminousSkin ? 0.24 : 0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const plate = new THREE.Mesh(plateGeo, mat);
    plate.position.set(...f.pos);
    plate.rotation.set(...f.rot);
    group.add(plate);
  }

  return group;
}

export function getDiceTargetQuaternion(faceValue: number): THREE.Quaternion {
  const q = new THREE.Quaternion();
  const euler = new THREE.Euler();
  switch (faceValue) {
    case 1:
      euler.set(0, 0, 0);
      break;
    case 6:
      euler.set(Math.PI, 0, 0);
      break;
    case 2:
      euler.set(-Math.PI / 2, 0, 0);
      break;
    case 5:
      euler.set(Math.PI / 2, 0, 0);
      break;
    case 3:
      euler.set(0, 0, Math.PI / 2);
      break;
    case 4:
      euler.set(0, 0, -Math.PI / 2);
      break;
    default:
      euler.set(0, 0, 0);
  }
  return q.setFromEuler(euler);
}

/**
 * Builds 100 individually beveled 3D Chiseled Stone Tiles with mortar AO depth,
 * normal/roughness/AO stone PBR relief, hairline cracks, selective moss,
 * and crisp engraved tile numerals 1..100 preserving exact coordinate geometry.
 */
export function buildBeveledStoneBoard(
  maxAnisotropy: number,
  quality: QualityConfig = QUALITY_PRESETS.high,
  boardConfig?: BoardConfig,
): {
  boardGroup: THREE.Group;
  boardCollider: THREE.Mesh;
  tileHighlight: THREE.Mesh;
} {
  const shadows = quality.shadowsEnabled;
  const boardSpan = BOARD_SIZE * TILE_SPACING;
  const boardGroup = new THREE.Group();
  boardGroup.name = 'BeveledStoneBoard';

  const bSettings = boardConfig?.boardSettings;
  const tConfig = boardConfig?.tileConfig;
  const boardShape = bSettings?.shape ?? 'classic_square';
  const boardMatFinish = bSettings?.material ?? 'satin';
  const primaryBoardColor = new THREE.Color(bSettings?.primaryColor ?? '#1e293b');
  const secondaryBoardColor = new THREE.Color(bSettings?.secondaryColor ?? '#d97706');
  const plinthSizeScale = THREE.MathUtils.clamp(bSettings?.sizeScale ?? 1.0, 0.88, 1.15);

  const stonePlinthPbr = getStonePlinthPbr(maxAnisotropy, quality.pbrTexSize);
  const bronzePbr = getBronzePbr(maxAnisotropy, Math.min(512, quality.pbrTexSize) as 256 | 512);
  const boardTilePbr = createBoardStonePbrSet(
    maxAnisotropy,
    quality.boardAtlasSize,
    quality.pbrTexSize,
    boardConfig,
  );

  const plinthRoughness =
    boardMatFinish === 'glossy'
      ? 0.24
      : boardMatFinish === 'metallic'
        ? 0.32
        : boardMatFinish === 'matte'
          ? 0.88
          : 0.68;
  const plinthMetalness = boardMatFinish === 'metallic' ? 0.65 : boardMatFinish === 'glossy' ? 0.25 : 0.18;

  const plinthMat = new THREE.MeshStandardMaterial({
    map: stonePlinthPbr.map,
    normalMap: stonePlinthPbr.normalMap,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: stonePlinthPbr.roughnessMap,
    aoMap: stonePlinthPbr.aoMap,
    metalnessMap: stonePlinthPbr.metalnessMap ?? null,
    aoMapIntensity: 0.88,
    color: primaryBoardColor.clone().offsetHSL(0, 0, 0.14),
    roughness: plinthRoughness,
    metalness: plinthMetalness,
  });

  const outerSpan = (boardSpan + 1.55) * plinthSizeScale;
  const plinthGeo =
    boardShape === 'octagon_bastion'
      ? new THREE.CylinderGeometry(outerSpan * 0.74, outerSpan * 0.78, 0.56, 8)
      : new THREE.BoxGeometry(outerSpan, 0.54, outerSpan);
  if (boardShape === 'octagon_bastion') {
    plinthGeo.rotateY(Math.PI / 8);
  }
  ensureUv2(plinthGeo);
  const outerPlinth = new THREE.Mesh(plinthGeo, plinthMat);
  outerPlinth.position.y = -0.34;
  outerPlinth.receiveShadow = shadows;
  outerPlinth.castShadow = shadows;
  boardGroup.add(outerPlinth);

  if (boardShape === 'citadel_terrace') {
    const lowerStepGeo = new THREE.BoxGeometry(outerSpan + 1.2, 0.32, outerSpan + 1.2);
    ensureUv2(lowerStepGeo);
    const lowerStep = new THREE.Mesh(lowerStepGeo, plinthMat);
    lowerStep.position.y = -0.52;
    lowerStep.receiveShadow = shadows;
    boardGroup.add(lowerStep);
  }

  const bronzeMat = new THREE.MeshStandardMaterial({
    color: secondaryBoardColor,
    normalMap: bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: bronzePbr.roughnessMap,
    roughness: 0.28,
    metalness: 0.88,
  });
  const bezelGeo = new THREE.BoxGeometry(boardSpan + 0.46, 0.56, boardSpan + 0.46);
  ensureUv2(bezelGeo);
  const goldBezel = new THREE.Mesh(bezelGeo, bronzeMat);
  goldBezel.position.y = -0.345;
  boardGroup.add(goldBezel);

  // Carved Corner Bronze Clasps on the Board Plinth
  const claspGeo = new THREE.BoxGeometry(1.1, 0.62, 1.1);
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const clasp = new THREE.Mesh(claspGeo, bronzeMat);
    clasp.position.set(sx * (boardSpan * 0.5 + 0.45), -0.33, sz * (boardSpan * 0.5 + 0.45));
    clasp.castShadow = shadows;
    boardGroup.add(clasp);
  });

  const mortarBed = new THREE.Mesh(
    new THREE.BoxGeometry(boardSpan + 0.08, 0.16, boardSpan + 0.08),
    new THREE.MeshStandardMaterial({ color: primaryBoardColor, roughness: 0.94, metalness: 0.04 }),
  );
  mortarBed.position.y = -0.15;
  mortarBed.receiveShadow = shadows;
  boardGroup.add(mortarBed);

  const tileHalf = TILE_SPACING * 0.455;
  const tileShapeKind = tConfig?.shape ?? 'beveled_square';
  const stoneShape = new THREE.Shape();

  if (tileShapeKind === 'octagon_cut') {
    const cut = tileHalf * 0.24;
    stoneShape.moveTo(-tileHalf + cut, -tileHalf);
    stoneShape.lineTo(tileHalf - cut, -tileHalf);
    stoneShape.lineTo(tileHalf, -tileHalf + cut);
    stoneShape.lineTo(tileHalf, tileHalf - cut);
    stoneShape.lineTo(tileHalf - cut, tileHalf);
    stoneShape.lineTo(-tileHalf + cut, tileHalf);
    stoneShape.lineTo(-tileHalf, tileHalf - cut);
    stoneShape.lineTo(-tileHalf, -tileHalf + cut);
    stoneShape.closePath();
  } else if (tileShapeKind === 'rounded_tablet') {
    const r = tileHalf * 0.2;
    stoneShape.moveTo(-tileHalf + r, -tileHalf);
    stoneShape.lineTo(tileHalf - r, -tileHalf);
    stoneShape.quadraticCurveTo(tileHalf, -tileHalf, tileHalf, -tileHalf + r);
    stoneShape.lineTo(tileHalf, tileHalf - r);
    stoneShape.quadraticCurveTo(tileHalf, tileHalf, tileHalf - r, tileHalf);
    stoneShape.lineTo(-tileHalf + r, tileHalf);
    stoneShape.quadraticCurveTo(-tileHalf, tileHalf, -tileHalf, tileHalf - r);
    stoneShape.lineTo(-tileHalf, -tileHalf + r);
    stoneShape.quadraticCurveTo(-tileHalf, -tileHalf, -tileHalf + r, -tileHalf);
  } else {
    stoneShape.moveTo(-tileHalf, -tileHalf);
    stoneShape.lineTo(tileHalf, -tileHalf);
    stoneShape.lineTo(tileHalf, tileHalf);
    stoneShape.lineTo(-tileHalf, tileHalf);
    stoneShape.closePath();
  }

  const isCrystalFacet = tileShapeKind === 'crystal_facet';
  const stoneGeo = new THREE.ExtrudeGeometry(stoneShape, {
    depth: 0.12,
    bevelEnabled: quality.tier !== 'potato',
    bevelThickness: isCrystalFacet ? 0.065 : 0.04,
    bevelSize: isCrystalFacet ? 0.065 : 0.04,
    bevelSegments: isCrystalFacet ? 1 : quality.tier === 'low' ? 1 : 2,
  });
  stoneGeo.rotateX(-Math.PI / 2);
  ensureUv2(stoneGeo);

  const tileMatFinish = tConfig?.material ?? 'satin';
  const tileRoughness =
    tileMatFinish === 'glossy'
      ? 0.26
      : tileMatFinish === 'metallic'
        ? 0.38
        : tileMatFinish === 'matte'
          ? 0.88
          : 0.72;
  const tileMetalness = tileMatFinish === 'metallic' ? 0.75 : tileMatFinish === 'glossy' ? 0.36 : 0.28;

  const stoneBaseMat = new THREE.MeshStandardMaterial({
    normalMap: stonePlinthPbr.normalMap,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: stonePlinthPbr.roughnessMap,
    aoMap: stonePlinthPbr.aoMap,
    metalnessMap: stonePlinthPbr.metalnessMap ?? null,
    aoMapIntensity: 0.82,
    color: 0xffffff,
    roughness: tileRoughness,
    metalness: tileMetalness,
  });
  const tileBasesInst = new THREE.InstancedMesh(stoneGeo, stoneBaseMat, 100);
  tileBasesInst.receiveShadow = shadows;
  tileBasesInst.castShadow = shadows && !quality.shadowImportantOnly;

  const dummy = new THREE.Object3D();
  const baseColor = new THREE.Color();
  const primaryTileCol = new THREE.Color(tConfig?.primaryColor ?? '#283548');
  const altTileCol = new THREE.Color(tConfig?.alternateColor ?? '#38485e');
  const capPlanes: THREE.BufferGeometry[] = [];
  const capSize = TILE_SPACING * (tileShapeKind === 'octagon_cut' ? 0.84 : 0.89);

  for (let tile = 1; tile <= 100; tile++) {
    const pos = tileToWorld(tile);
    const heightJitter = ((tile * 17) % 5) * 0.005 - 0.01;
    dummy.position.set(pos.x, -0.14 + heightJitter, pos.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    tileBasesInst.setMatrixAt(tile - 1, dummy.matrix);

    const isAlt = (pos.row + pos.col) % 2 === 0;
    if (tile === 100) {
      baseColor.setHex(0x92400e);
    } else {
      baseColor.copy(isAlt ? primaryTileCol : altTileCol);
    }
    tileBasesInst.setColorAt(tile - 1, baseColor);

    const capGeo = new THREE.PlaneGeometry(capSize, capSize);
    capGeo.rotateX(-Math.PI / 2);
    capGeo.translate(pos.x, 0.021 + heightJitter, pos.z);

    const uvAttr = capGeo.attributes.uv;
    const zeroBased = tile - 1;
    const rowFromBottom = Math.floor(zeroBased / BOARD_SIZE);
    const rawCol = zeroBased % BOARD_SIZE;
    const col = rowFromBottom % 2 === 0 ? rawCol : BOARD_SIZE - 1 - rawCol;

    const uMin = col / BOARD_SIZE;
    const uMax = (col + 1) / BOARD_SIZE;
    const vMin = rowFromBottom / BOARD_SIZE;
    const vMax = (rowFromBottom + 1) / BOARD_SIZE;

    for (let k = 0; k < uvAttr.count; k++) {
      const u = uvAttr.getX(k);
      const v = uvAttr.getY(k);
      uvAttr.setXY(k, THREE.MathUtils.lerp(uMin, uMax, u), THREE.MathUtils.lerp(vMin, vMax, v));
    }
    uvAttr.needsUpdate = true;
    ensureUv2(capGeo);
    capPlanes.push(capGeo);
  }
  tileBasesInst.instanceMatrix.needsUpdate = true;
  if (tileBasesInst.instanceColor) tileBasesInst.instanceColor.needsUpdate = true;
  tileBasesInst.computeBoundingSphere();
  boardGroup.add(tileBasesInst);

  const mergedCaps = BufferGeometryUtils.mergeGeometries(capPlanes);
  capPlanes.forEach((g) => g.dispose());
  ensureUv2(mergedCaps);

  const glowIntensity = boardConfig?.visualEffects.glowIntensity ?? 0.55;
  const tileEffect = tConfig?.visualEffect ?? 'subtle_rune_glow';
  const atlasMat = new THREE.MeshStandardMaterial({
    map: boardTilePbr.map,
    normalMap: boardTilePbr.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: boardTilePbr.roughnessMap,
    aoMap: boardTilePbr.aoMap,
    metalnessMap: boardTilePbr.metalnessMap ?? null,
    aoMapIntensity: 0.88,
    roughness: tileRoughness,
    metalness: tileMetalness,
    emissive: tileEffect === 'none' ? new THREE.Color(0x000000) : secondaryBoardColor,
    emissiveIntensity: tileEffect === 'none' ? 0 : glowIntensity * 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  atlasMat.userData.ownedPbrSet = boardTilePbr;
  const capsMesh = new THREE.Mesh(mergedCaps, atlasMat);
  capsMesh.receiveShadow = shadows;
  boardGroup.add(capsMesh);

  const boardCollider = new THREE.Mesh(
    new THREE.PlaneGeometry(boardSpan, boardSpan),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  boardCollider.rotation.x = -Math.PI / 2;
  boardCollider.position.y = 0.03;
  boardCollider.visible = false;
  boardCollider.layers.set(1);
  boardGroup.add(boardCollider);

  const tileHighlight = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.86, 4),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.88,
    }),
  );
  tileHighlight.rotation.x = -Math.PI / 2;
  tileHighlight.rotation.z = Math.PI / 4;
  tileHighlight.position.y = 0.04;
  tileHighlight.visible = false;
  boardGroup.add(tileHighlight);

  const finishPos = tileToWorld(100);
  const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.048, 8, 24), bronzeMat);
  crownRing.rotation.x = Math.PI / 2;
  crownRing.position.set(finishPos.x, 0.05, finishPos.z);
  boardGroup.add(crownRing);

  const cornerPillarGeo = new THREE.CylinderGeometry(0.035, 0.055, 0.26, 6);
  const finialGemGeo = new THREE.OctahedronGeometry(0.055, 0);
  const finialGemMat = new THREE.MeshPhysicalMaterial({
    color: 0xfef08a,
    emissive: secondaryBoardColor,
    emissiveIntensity: 0.55,
    roughness: 0.14,
    metalness: 0.2,
    clearcoat: quality.tier === 'potato' ? 0.0 : 1.0,
  });
  [
    [-0.58, -0.58],
    [0.58, -0.58],
    [-0.58, 0.58],
    [0.58, 0.58],
  ].forEach(([ox, oz]) => {
    const pillar = new THREE.Mesh(cornerPillarGeo, bronzeMat);
    pillar.position.set(finishPos.x + ox, 0.14, finishPos.z + oz);
    pillar.castShadow = shadows;
    boardGroup.add(pillar);

    const gem = new THREE.Mesh(finialGemGeo, finialGemMat);
    gem.position.set(finishPos.x + ox, 0.31, finishPos.z + oz);
    boardGroup.add(gem);
  });

  if (quality.lodBias !== 1) {
    applyLodBiasToGroup(boardGroup, quality.lodBias);
  }

  return { boardGroup, boardCollider, tileHighlight };
}

/**
 * Builds the full Realistic Fantasy Arena Environment (terrain, sacred moat, waterfall cascade,
 * LOD Oaks & Pines, wind-swaying ferns & grass, fractured moss boulders, stone obelisks, & theme landmarks).
 */
export function createSanctuaryEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl = false,
  quality: QualityConfig = QUALITY_PRESETS.high,
  boardConfig?: BoardConfig,
): ArenaEnvironmentHandle {
  return buildArenaEnvironment(scene, maxAnisotropy, isSoftwareGl, quality, boardConfig);
}
