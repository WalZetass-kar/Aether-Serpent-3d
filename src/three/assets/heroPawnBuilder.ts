import * as THREE from 'three';
import type { QualityConfig } from '../perf/qualityPresets';
import { ensureUv2 } from './rockTerrainBuilder';

export type PawnClipName = 'idle' | 'walk' | 'climb' | 'cast' | 'victory';

export interface PawnModelHandle {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  shieldRing: THREE.Mesh;
  activeHalo: THREE.Mesh;
  adminWinnerAura: THREE.Group;
  crestMesh: THREE.Mesh;
  nameSprite: THREE.Sprite;
  setNameLabel: (name: string, accentColor?: string, isActive?: boolean) => void;
  mixer: THREE.AnimationMixer;
  actions: Record<PawnClipName, THREE.AnimationAction>;
  playClip: (name: PawnClipName, fadeSec?: number) => void;
}

interface PawnPaletteMaterials {
  primaryMat: THREE.MeshStandardMaterial;
  primaryDarkMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  ivoryMat: THREE.MeshStandardMaterial;
  undersuitMat: THREE.MeshStandardMaterial;
  leatherMat: THREE.MeshStandardMaterial;
  darkLeatherMat: THREE.MeshStandardMaterial;
  goldMat: THREE.MeshStandardMaterial;
  steelMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  eyeGlowMat: THREE.MeshStandardMaterial;
  crystalMat: THREE.MeshPhysicalMaterial;
  heraldryMat: THREE.MeshStandardMaterial;
}

export interface PawnBuildDeps {
  bronzePbr: {
    normalMap: THREE.Texture;
    roughnessMap: THREE.Texture;
    aoMap: THREE.Texture;
  };
  contactShadowTex: THREE.CanvasTexture;
}

const heraldryTexCache = new Map<string, THREE.CanvasTexture>();
let sharedArmorMicroMap: THREE.CanvasTexture | null = null;

function getArmorMicroBumpTex(): THREE.CanvasTexture {
  if (sharedArmorMicroMap) return sharedArmorMicroMap;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Ornamental filigree & etched plate micro-relief
  for (let y = 0; y < size; y += 8) {
    for (let x = 0; x < size; x += 8) {
      const shade = 118 + (((x * 13 + y * 29) % 24) - 12);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x, y, 7, 7);
    }
  }
  ctx.strokeStyle = '#9e9e9e';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < size; i += 32) {
    ctx.strokeRect(i + 4, 4, 24, size - 8);
    ctx.beginPath();
    ctx.arc(i + 16, size / 2, 8, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.needsUpdate = true;
  sharedArmorMicroMap = tex;
  return tex;
}

function getHeraldryTexture(
  colorHex: string,
  accentHex: string,
  archetypeIndex: number,
): THREE.CanvasTexture {
  const key = `${colorHex}:${accentHex}:${archetypeIndex}`;
  const existing = heraldryTexCache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cPrimary = new THREE.Color(colorHex);
  const cDark = cPrimary.clone().lerp(new THREE.Color(0x0f172a), 0.45);
  const primaryCss = `#${cPrimary.getHexString()}`;
  const darkCss = `#${cDark.getHexString()}`;

  ctx.fillStyle = primaryCss;
  ctx.fillRect(0, 0, size, size);

  if (archetypeIndex === 0) {
    // Quartered Knight Heraldry (crimson + ivory quarters, golden cross & filigree diamond)
    ctx.fillStyle = '#f8f2e4';
    ctx.fillRect(size / 2, 0, size / 2, size / 2);
    ctx.fillRect(0, size / 2, size / 2, size / 2);

    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size / 2, size / 2);
    ctx.fillRect(size / 2, size / 2, size / 2, size / 2);

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(size / 2 - 11, 0, 22, size);
    ctx.fillRect(0, size / 2 - 11, size, 22);

    ctx.fillStyle = primaryCss;
    ctx.beginPath();
    ctx.moveTo(size / 2, size * 0.23);
    ctx.lineTo(size * 0.74, size / 2);
    ctx.lineTo(size / 2, size * 0.77);
    ctx.lineTo(size * 0.26, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (archetypeIndex === 1) {
    // Arcane Star Compass on Sapphire field
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 86, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 74 : 26;
      const a = (i * Math.PI) / 4 - Math.PI / 2;
      const px = size / 2 + Math.cos(a) * r;
      const py = size / 2 + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else if (archetypeIndex === 2) {
    // Sylvan Emerald Chevron & Leaf Crest
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#f3ead8';
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(size / 2, 138);
    ctx.lineTo(size, 48);
    ctx.lineTo(size, 84);
    ctx.lineTo(size / 2, 174);
    ctx.lineTo(0, 84);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2 - 20, 24, 52, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetypeIndex === 3) {
    // Clockwork Sun Emblem
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 34, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetypeIndex === 4 || archetypeIndex === 13) {
    // Imperial Dragon / Samurai Crescent Heraldry
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 + 12, 72, Math.PI * 0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2 - 18, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetypeIndex === 5 || archetypeIndex === 12) {
    // Radiant Sun Wing / Pharaoh Disk
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(size / 2, 42);
    ctx.lineTo(size * 0.82, size / 2);
    ctx.lineTo(size / 2, size - 42);
    ctx.lineTo(size * 0.18, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 26, 0, Math.PI * 2);
    ctx.fill();
  } else if (archetypeIndex === 7 || archetypeIndex === 11) {
    // Lotus / Crescent Moon Crest
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = primaryCss;
    ctx.beginPath();
    ctx.ellipse(size / 2, size / 2, 28, 60, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Cyber / Shadow / Obsidian / Sky Captain Geometric Rune
    ctx.fillStyle = darkCss;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(48, 48, size - 96, size - 96);
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, size - 18, size - 18);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  heraldryTexCache.set(key, tex);
  return tex;
}

export function clearHeroPawnCaches(): void {
  heraldryTexCache.forEach((tex) => tex.dispose());
  heraldryTexCache.clear();
  if (sharedArmorMicroMap) {
    sharedArmorMicroMap.dispose();
    sharedArmorMicroMap = null;
  }
}

let cachedPawnClips: Record<PawnClipName, THREE.AnimationClip> | null = null;

function buildPawnAnimationClips(): Record<PawnClipName, THREE.AnimationClip> {
  // Smooth, expressive idle animation: gentle levitation/breathing bob, subtle torso & head turn,
  // soft arm & weapon poise, and flowing cloak billow while pawns wait on their tiles.
  const idleClip = new THREE.AnimationClip('idle', 2.4, [
    new THREE.VectorKeyframeTrack(
      '.position',
      [0, 0.6, 1.2, 1.8, 2.4],
      [0, 0, 0, 0, 0.042, 0, 0, 0.072, 0, 0, 0.036, 0, 0, 0, 0],
    ),
    new THREE.NumberKeyframeTrack(
      '.rotation[y]',
      [0, 0.6, 1.2, 1.8, 2.4],
      [0, 0.075, 0, -0.075, 0],
    ),
    new THREE.NumberKeyframeTrack(
      '.rotation[z]',
      [0, 1.2, 2.4],
      [-0.018, 0.018, -0.018],
    ),
    new THREE.NumberKeyframeTrack(
      'leftArmPivot.rotation[x]',
      [0, 1.2, 2.4],
      [0.12, -0.07, 0.12],
    ),
    new THREE.NumberKeyframeTrack(
      'rightArmPivot.rotation[x]',
      [0, 1.2, 2.4],
      [-0.09, 0.09, -0.09],
    ),
    new THREE.NumberKeyframeTrack(
      'leftArmPivot.rotation[z]',
      [0, 1.2, 2.4],
      [0.05, 0.12, 0.05],
    ),
    new THREE.NumberKeyframeTrack(
      'rightArmPivot.rotation[z]',
      [0, 1.2, 2.4],
      [-0.05, -0.12, -0.05],
    ),
    new THREE.NumberKeyframeTrack(
      'headPivot.rotation[y]',
      [0, 0.8, 1.6, 2.4],
      [-0.06, 0.08, -0.07, -0.06],
    ),
    new THREE.NumberKeyframeTrack(
      'headPivot.rotation[x]',
      [0, 1.2, 2.4],
      [0.02, -0.04, 0.02],
    ),
    new THREE.NumberKeyframeTrack(
      'cloakPivot.rotation[x]',
      [0, 0.8, 1.6, 2.4],
      [0.2, 0.31, 0.17, 0.2],
    ),
    new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', [0, 2.4], [0, 0]),
    new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', [0, 2.4], [0, 0]),
  ]);

  const walkClip = new THREE.AnimationClip('walk', 0.44, [
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.22, 0.44], [0.1, 0.18, 0.1]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.22, 0.44], [-0.62, 0.55, -0.62]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.22, 0.44], [0.55, -0.62, 0.55]),
    new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', [0, 0.22, 0.44], [0.58, -0.58, 0.58]),
    new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', [0, 0.22, 0.44], [-0.58, 0.58, -0.58]),
    new THREE.NumberKeyframeTrack('cloakPivot.rotation[x]', [0, 0.22, 0.44], [0.35, 0.52, 0.35]),
  ]);

  const climbClip = new THREE.AnimationClip('climb', 0.64, [
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.32, 0.64], [0.22, 0.3, 0.22]),
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[z]', [0, 0.16, 0.48, 0.64], [0, 0.08, -0.08, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.32, 0.64], [-2.1, -0.48, -2.1]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.32, 0.64], [-0.48, -2.1, -0.48]),
    new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', [0, 0.32, 0.64], [-0.55, 0.35, -0.55]),
    new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', [0, 0.32, 0.64], [0.35, -0.55, 0.35]),
    new THREE.NumberKeyframeTrack('cloakPivot.rotation[x]', [0, 0.32, 0.64], [0.28, 0.44, 0.28]),
  ]);

  const castClip = new THREE.AnimationClip('cast', 0.72, [
    new THREE.NumberKeyframeTrack('bodyPivot.position[y]', [0, 0.36, 0.72], [0, 0.18, 0]),
    new THREE.NumberKeyframeTrack('bodyPivot.rotation[x]', [0, 0.36, 0.72], [0, -0.16, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.3, 0.72], [0, -2.25, -0.2]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.3, 0.72], [0, -2.25, -0.2]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[z]', [0, 0.3, 0.72], [0.1, 0.52, 0.1]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[z]', [0, 0.3, 0.72], [-0.1, -0.52, -0.1]),
    new THREE.NumberKeyframeTrack('cloakPivot.rotation[x]', [0, 0.36, 0.72], [0.2, 0.58, 0.22]),
  ]);

  const victoryClip = new THREE.AnimationClip('victory', 0.9, [
    new THREE.NumberKeyframeTrack('bodyPivot.position[y]', [0, 0.28, 0.56, 0.9], [0, 0.22, 0.04, 0]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[x]', [0, 0.45, 0.9], [-2.35, -2.6, -2.35]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[x]', [0, 0.45, 0.9], [-2.35, -2.6, -2.35]),
    new THREE.NumberKeyframeTrack('leftArmPivot.rotation[z]', [0, 0.45, 0.9], [0.38, 0.6, 0.38]),
    new THREE.NumberKeyframeTrack('rightArmPivot.rotation[z]', [0, 0.45, 0.9], [-0.38, -0.6, -0.38]),
    new THREE.NumberKeyframeTrack('leftLegPivot.rotation[x]', [0, 0.45, 0.9], [0, -0.25, 0]),
    new THREE.NumberKeyframeTrack('rightLegPivot.rotation[x]', [0, 0.45, 0.9], [0, 0.25, 0]),
    new THREE.NumberKeyframeTrack('cloakPivot.rotation[x]', [0, 0.45, 0.9], [0.25, 0.55, 0.25]),
  ]);

  return { idle: idleClip, walk: walkClip, climb: climbClip, cast: castClip, victory: victoryClip };
}

function getPawnClips() {
  if (!cachedPawnClips) {
    cachedPawnClips = buildPawnAnimationClips();
  }
  return cachedPawnClips;
}

function buildPawnMaterials(
  colorHex: string,
  accentHex: string,
  archetypeIndex: number,
  quality: QualityConfig,
  deps: PawnBuildDeps,
): PawnPaletteMaterials {
  const cPrimary = new THREE.Color(colorHex);
  const cDark = cPrimary.clone().lerp(new THREE.Color(0x0b101d), 0.44);
  const microBump = getArmorMicroBumpTex();

  const isArmored =
    archetypeIndex === 0 ||
    archetypeIndex === 3 ||
    archetypeIndex === 4 ||
    archetypeIndex === 5 ||
    archetypeIndex === 8 ||
    archetypeIndex === 9 ||
    archetypeIndex === 12 ||
    archetypeIndex === 13;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: cPrimary,
    bumpMap: microBump,
    bumpScale: 0.012,
    roughness: isArmored ? 0.36 : 0.62,
    metalness: isArmored ? 0.3 : 0.08,
  });

  const primaryDarkMat = new THREE.MeshStandardMaterial({
    color: cDark,
    bumpMap: microBump,
    bumpScale: 0.01,
    roughness: archetypeIndex === 8 ? 0.85 : 0.72,
    metalness: archetypeIndex === 9 ? 0.45 : 0.1,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    roughness: 0.34,
    metalness: 0.22,
  });

  const ivoryMat = new THREE.MeshStandardMaterial({
    color: 0xf4ecdc,
    roughness: 0.56,
    metalness: 0.04,
  });

  const undersuitMat = new THREE.MeshStandardMaterial({
    color: archetypeIndex === 8 ? 0x1c1917 : archetypeIndex === 5 ? 0x1e293b : 0x161d2b,
    roughness: 0.76,
    metalness: 0.24,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: archetypeIndex === 2 || archetypeIndex === 11 ? 0x6f3e1e : 0x5c3419,
    bumpMap: microBump,
    bumpScale: 0.014,
    roughness: 0.62,
    metalness: 0.06,
  });

  const darkLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x331c0f,
    roughness: 0.68,
    metalness: 0.05,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: archetypeIndex === 3 || archetypeIndex === 12 ? 0xf59e0b : 0xeab308,
    normalMap: deps.bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: deps.bronzePbr.roughnessMap,
    aoMap: deps.bronzePbr.aoMap,
    aoMapIntensity: 0.65,
    roughness: 0.24,
    metalness: 0.88,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: archetypeIndex === 9 ? 0x94a3b8 : 0xdce4ef,
    normalMap: deps.bronzePbr.normalMap,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughnessMap: deps.bronzePbr.roughnessMap,
    roughness: 0.24,
    metalness: 0.88,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: archetypeIndex === 8 ? 0x292524 : archetypeIndex === 12 ? 0xd49b72 : 0xefc5a5,
    roughness: archetypeIndex === 8 ? 0.82 : 0.58,
    metalness: 0.02,
  });

  const eyeColorMap = [
    0xfef08a, // 0 Ruby Knight
    0x7dd3fc, // 1 Sapphire Mage
    0x6ee7b7, // 2 Emerald Ranger
    0x38bdf8, // 3 Amber Alchemist
    0xfca5a5, // 4 Samurai Naga
    0xfef08a, // 5 Valkyrie Cahaya
    0xc084fc, // 6 Ksatria Bayangan
    0x67e8f9, // 7 Pendeta Teratai
    0xfb923c, // 8 Golem Obsidian
    0x22d3ee, // 9 Archon Siber
    0xfde047, // 10 Bajak Laut Aether
    0x86efac, // 11 Druid Bulan
    0x38bdf8, // 12 Raja Firaun
    0xfacc15, // 13 Kaisar Naga Abadi
  ];
  const eyeColor = eyeColorMap[archetypeIndex % eyeColorMap.length];
  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: eyeColor,
    emissive: eyeColor,
    emissiveIntensity: 0.95,
    roughness: 0.16,
    metalness: 0.1,
  });

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: accentHex,
    emissive: colorHex,
    emissiveIntensity: 0.48,
    roughness: 0.1,
    metalness: 0.12,
    clearcoat: quality.tier === 'potato' ? 0.0 : 1.0,
    clearcoatRoughness: 0.06,
  });

  const heraldryMat = new THREE.MeshStandardMaterial({
    map: getHeraldryTexture(colorHex, accentHex, archetypeIndex),
    roughness: 0.4,
    metalness: 0.18,
  });

  return {
    primaryMat,
    primaryDarkMat,
    accentMat,
    ivoryMat,
    undersuitMat,
    leatherMat,
    darkLeatherMat,
    goldMat,
    steelMat,
    skinMat,
    eyeGlowMat,
    crystalMat,
    heraldryMat,
  };
}

function addPart(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  shadows: boolean,
  rot: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
): THREE.Mesh {
  ensureUv2(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

function buildSculptedPedestal(
  bodyPivot: THREE.Group,
  mats: PawnPaletteMaterials,
  seg: number,
  shadows: boolean,
) {
  // Lower dark chamfered stone plinth
  addPart(
    bodyPivot,
    new THREE.CylinderGeometry(0.39, 0.44, 0.085, seg),
    mats.undersuitMat,
    [0, 0.0425, 0],
    shadows,
  );
  // Hero color-coded pedestal ring so player color pops from steep camera angles
  addPart(
    bodyPivot,
    new THREE.CylinderGeometry(0.375, 0.395, 0.036, seg),
    mats.primaryMat,
    [0, 0.102, 0],
    shadows,
  );
  // Burnished gilded top rim collar
  addPart(
    bodyPivot,
    new THREE.CylinderGeometry(0.34, 0.375, 0.036, seg),
    mats.goldMat,
    [0, 0.136, 0],
    shadows,
  );
  // Subtle inner stone floor disk
  addPart(
    bodyPivot,
    new THREE.CylinderGeometry(0.31, 0.32, 0.015, seg),
    mats.darkLeatherMat,
    [0, 0.155, 0],
    shadows,
  );
  // 4 cardinal brass bezel studs around pedestal rim
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    addPart(
      bodyPivot,
      new THREE.OctahedronGeometry(0.03, 0),
      mats.accentMat,
      [Math.cos(a) * 0.385, 0.102, Math.sin(a) * 0.385],
      false,
    );
  }
}

function buildArticulatedLeg(
  name: string,
  side: -1 | 1,
  archetypeIndex: number,
  mats: PawnPaletteMaterials,
  seg: number,
  shadows: boolean,
): THREE.Group {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(side * 0.115, 0.47, 0);

  const legSeg = Math.max(6, Math.floor(seg * 0.65));

  // Hip socket in dark undersuit
  addPart(pivot, new THREE.SphereGeometry(0.068, legSeg, 6), mats.undersuitMat, [0, -0.01, 0], shadows);

  const isHeavyArmor =
    archetypeIndex === 0 ||
    archetypeIndex === 4 ||
    archetypeIndex === 5 ||
    archetypeIndex === 8 ||
    archetypeIndex === 9 ||
    archetypeIndex === 13;

  // Thigh (undersuit + armored/painted cuisse wrap)
  addPart(
    pivot,
    new THREE.CylinderGeometry(0.066, 0.056, 0.145, legSeg),
    isHeavyArmor ? mats.primaryMat : mats.undersuitMat,
    [0, -0.09, 0],
    shadows,
  );

  // Knee Poleyn / Guard
  const kneeMat =
    archetypeIndex === 0 || archetypeIndex === 4 || archetypeIndex === 9
      ? mats.steelMat
      : archetypeIndex === 3 || archetypeIndex === 5 || archetypeIndex === 12 || archetypeIndex === 13
        ? mats.goldMat
        : mats.leatherMat;
  addPart(
    pivot,
    new THREE.SphereGeometry(0.058, legSeg, 6),
    kneeMat,
    [0, -0.16, 0.018],
    shadows,
    [0, 0, 0],
    [1.05, 0.9, 1.15],
  );

  // Shin / Boot shaft
  const bootMat =
    archetypeIndex === 0 || archetypeIndex === 9
      ? mats.steelMat
      : archetypeIndex === 5 || archetypeIndex === 12 || archetypeIndex === 13
        ? mats.goldMat
        : archetypeIndex === 8
          ? mats.undersuitMat
          : mats.leatherMat;
  addPart(
    pivot,
    new THREE.CylinderGeometry(0.058, 0.052, 0.145, legSeg),
    bootMat,
    [0, -0.235, 0],
    shadows,
  );

  // Boot folded top cuff for crisp silhouette break
  const cuffMat =
    archetypeIndex === 0 || archetypeIndex === 4 || archetypeIndex === 5 || archetypeIndex === 13
      ? mats.goldMat
      : archetypeIndex === 2 || archetypeIndex === 6 || archetypeIndex === 7 || archetypeIndex === 11
        ? mats.primaryMat
        : mats.darkLeatherMat;
  addPart(
    pivot,
    new THREE.CylinderGeometry(0.066, 0.061, 0.036, legSeg),
    cuffMat,
    [0, -0.175, 0],
    shadows,
  );

  // Grounded Boot Foot & Toe Cap (reaches y = -0.31 -> world y = 0.16 on plinth)
  addPart(
    pivot,
    new THREE.BoxGeometry(0.102, 0.056, 0.165),
    isHeavyArmor ? mats.undersuitMat : mats.darkLeatherMat,
    [0, -0.292, 0.032],
    shadows,
  );
  addPart(
    pivot,
    new THREE.SphereGeometry(0.052, legSeg, 6),
    isHeavyArmor || archetypeIndex === 3 || archetypeIndex === 12 ? mats.goldMat : mats.leatherMat,
    [0, -0.292, 0.105],
    shadows,
    [0, 0, 0],
    [0.95, 0.56, 1.15],
  );

  return pivot;
}

function buildArmSkeleton(
  name: string,
  side: -1 | 1,
  archetypeIndex: number,
  mats: PawnPaletteMaterials,
  seg: number,
  shadows: boolean,
): { pivot: THREE.Group; handAnchor: THREE.Group } {
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(side * 0.255, 0.785, 0);

  const armSeg = Math.max(6, Math.floor(seg * 0.65));

  // Shoulder Pauldron / Mantle Cap
  if (archetypeIndex === 0 || archetypeIndex === 5 || archetypeIndex === 13) {
    // Layered Knight / Valkyrie / Dragon Emperor Pauldron
    addPart(pivot, new THREE.SphereGeometry(0.082, armSeg, 6), mats.undersuitMat, [0, 0, 0], shadows);
    addPart(
      pivot,
      new THREE.SphereGeometry(0.095, armSeg, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      mats.primaryMat,
      [side * 0.015, 0.015, 0],
      shadows,
      [0, 0, -side * 0.35],
      [1.15, 1.0, 1.1],
    );
    addPart(
      pivot,
      new THREE.TorusGeometry(0.082, 0.016, 6, armSeg),
      mats.goldMat,
      [side * 0.02, -0.015, 0],
      shadows,
      [Math.PI / 2, side * 0.35, 0],
    );
  } else if (archetypeIndex === 4) {
    // Samurai Layered Lamellar Sode Plate
    addPart(pivot, new THREE.SphereGeometry(0.078, armSeg, 6), mats.undersuitMat, [0, 0, 0], shadows);
    addPart(
      pivot,
      new THREE.BoxGeometry(0.11, 0.14, 0.14),
      mats.primaryMat,
      [side * 0.04, -0.02, 0],
      shadows,
      [0, 0, -side * 0.25],
    );
    addPart(
      pivot,
      new THREE.BoxGeometry(0.116, 0.026, 0.146),
      mats.goldMat,
      [side * 0.045, -0.075, 0],
      false,
      [0, 0, -side * 0.25],
    );
  } else if (archetypeIndex === 8) {
    // Obsidian Golem Jagged Magma Crystal Shoulder
    addPart(pivot, new THREE.DodecahedronGeometry(0.095, 0), mats.undersuitMat, [side * 0.015, 0.01, 0], shadows);
    addPart(
      pivot,
      new THREE.ConeGeometry(0.048, 0.14, 5),
      mats.eyeGlowMat,
      [side * 0.04, 0.085, 0],
      false,
      [0, 0, -side * 0.45],
    );
  } else if (archetypeIndex === 9) {
    // Cyber Archon Angular Tech Pauldron + Neon Trim
    addPart(
      pivot,
      new THREE.BoxGeometry(0.12, 0.095, 0.13),
      mats.steelMat,
      [side * 0.02, 0.01, 0],
      shadows,
      [0, 0, -side * 0.22],
    );
    addPart(
      pivot,
      new THREE.BoxGeometry(0.124, 0.018, 0.134),
      mats.eyeGlowMat,
      [side * 0.024, -0.02, 0],
      false,
      [0, 0, -side * 0.22],
    );
  } else if (archetypeIndex === 1 || archetypeIndex === 7 || archetypeIndex === 11) {
    // Wizard / Lotus Priest / Moon Druid Gilded Mantle Shoulder Puff
    addPart(
      pivot,
      new THREE.SphereGeometry(0.086, armSeg, 8),
      mats.primaryMat,
      [side * 0.01, 0.01, 0],
      shadows,
      [0, 0, 0],
      [1.1, 0.9, 1.1],
    );
    addPart(
      pivot,
      new THREE.TorusGeometry(0.074, 0.014, 6, armSeg),
      mats.goldMat,
      [side * 0.015, -0.045, 0],
      shadows,
      [Math.PI / 2, side * 0.25, 0],
    );
  } else if (archetypeIndex === 2 || archetypeIndex === 6) {
    // Ranger / Shadow Knight Asymmetric Shoulder Guard
    addPart(pivot, new THREE.SphereGeometry(0.072, armSeg, 6), mats.primaryMat, [0, 0, 0], shadows);
    if (side === -1 || archetypeIndex === 6) {
      addPart(
        pivot,
        new THREE.SphereGeometry(0.086, armSeg, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
        archetypeIndex === 6 ? mats.undersuitMat : mats.leatherMat,
        [side * 0.01, 0.015, 0],
        shadows,
        [0, 0, -side * 0.35],
      );
    }
  } else {
    // Alchemist / Sky Pirate / Pharaoh Brass & Gold Pauldron
    addPart(pivot, new THREE.SphereGeometry(0.084, armSeg, 8), mats.primaryMat, [0, 0.01, 0], shadows);
    addPart(
      pivot,
      new THREE.TorusGeometry(0.08, 0.017, 6, armSeg),
      mats.goldMat,
      [side * 0.018, -0.012, 0],
      shadows,
      [Math.PI / 2, side * 0.32, 0],
    );
  }

  // Upper Arm Sleeve
  const upperMat =
    archetypeIndex === 0 || archetypeIndex === 4 || archetypeIndex === 6 || archetypeIndex === 8
      ? mats.undersuitMat
      : archetypeIndex === 1 || archetypeIndex === 7 || archetypeIndex === 10 || archetypeIndex === 11
        ? mats.primaryDarkMat
        : archetypeIndex === 2 || archetypeIndex === 9 || archetypeIndex === 13
          ? mats.primaryMat
          : mats.ivoryMat;
  addPart(
    pivot,
    new THREE.CylinderGeometry(0.046, 0.05, 0.16, armSeg),
    upperMat,
    [side * 0.025, -0.1, 0.015],
    shadows,
    [0, 0, side * 0.14],
  );

  // Dark Recessed Elbow Pad
  addPart(
    pivot,
    new THREE.SphereGeometry(0.048, armSeg, 6),
    mats.undersuitMat,
    [side * 0.042, -0.175, 0.025],
    shadows,
  );

  // Forearm Bracer / Wizard Bell Cuff
  const hasBellCuff = archetypeIndex === 1 || archetypeIndex === 7;
  const bracerGeo = hasBellCuff
    ? new THREE.CylinderGeometry(0.045, 0.078, 0.15, armSeg)
    : new THREE.CylinderGeometry(0.052, 0.042, 0.15, armSeg);
  const bracerMat =
    archetypeIndex === 0 || archetypeIndex === 9
      ? mats.steelMat
      : hasBellCuff || archetypeIndex === 11
        ? mats.primaryMat
        : archetypeIndex === 2 || archetypeIndex === 6 || archetypeIndex === 8
          ? mats.leatherMat
          : mats.goldMat;
  addPart(
    pivot,
    bracerGeo,
    bracerMat,
    [side * 0.05, -0.245, 0.058],
    shadows,
    [-0.28, 0, side * 0.08],
  );

  if (hasBellCuff) {
    addPart(
      pivot,
      new THREE.TorusGeometry(0.072, 0.012, 6, armSeg),
      mats.goldMat,
      [side * 0.055, -0.31, 0.078],
      shadows,
      [Math.PI / 2 - 0.28, 0, side * 0.08],
    );
  }

  // Sculpted Gloved Hand Anchor
  const handAnchor = new THREE.Group();
  handAnchor.position.set(side * 0.058, -0.325, 0.085);
  pivot.add(handAnchor);

  const gloveMat =
    archetypeIndex === 0 || archetypeIndex === 5 || archetypeIndex === 9 || archetypeIndex === 13
      ? mats.steelMat
      : archetypeIndex === 12
        ? mats.goldMat
        : mats.darkLeatherMat;
  addPart(handAnchor, new THREE.SphereGeometry(0.046, armSeg, 6), gloveMat, [0, 0, 0], shadows);

  return { pivot, handAnchor };
}

function buildArchetypeGearAndHead(
  bodyLod0: THREE.Group,
  headPivot: THREE.Group,
  cloakPivot: THREE.Group,
  leftHand: THREE.Group,
  rightHand: THREE.Group,
  archetypeIndex: number,
  mats: PawnPaletteMaterials,
  seg: number,
  shadows: boolean,
  bevel: boolean,
) {
  const highSeg = Math.max(8, seg);

  // --- Shared Belt Buckle & Hip Ring Base ---
  addPart(
    bodyLod0,
    new THREE.CylinderGeometry(0.202, 0.21, 0.068, highSeg),
    mats.darkLeatherMat,
    [0, 0.515, 0],
    shadows,
    [0, 0, 0],
    [1.06, 1, 0.92],
  );
  // Gold front belt buckle
  addPart(
    bodyLod0,
    new THREE.BoxGeometry(0.11, 0.082, 0.042),
    mats.goldMat,
    [0, 0.515, 0.19],
    shadows,
  );
  addPart(
    bodyLod0,
    new THREE.BoxGeometry(0.062, 0.042, 0.048),
    mats.accentMat,
    [0, 0.515, 0.194],
    false,
  );

  // =========================================================================
  // ARCHETYPE 0: KSATRIA RUBY (Royal Vanguard Knight)
  // =========================================================================
  if (archetypeIndex === 0) {
    // Sculpted Steel Cuirass + Crimson Central Heraldry Surcoat
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.245, 0.188, 0.29, highSeg),
      mats.steelMat,
      [0, 0.695, 0],
      shadows,
      [0, 0, 0],
      [1.08, 1, 0.9],
    );
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.252, 0.192, 0.22, highSeg, 1, false, -0.78, 1.56),
      mats.primaryMat,
      [0, 0.68, 0.012],
      shadows,
      [0, 0, 0],
      [1.08, 1, 0.92],
    );
    // Ornamental Gold Filigree Ribs on Cuirass
    [-0.08, 0.08].forEach((rx) => {
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.018, 0.21, 0.02),
        mats.goldMat,
        [rx, 0.68, 0.215],
        false,
        [0, 0, rx > 0 ? -0.14 : 0.14],
      );
    });
    // Gold Collar Gorget + Sun Chest Medallion
    addPart(
      bodyLod0,
      new THREE.TorusGeometry(0.165, 0.032, 8, highSeg),
      mats.goldMat,
      [0, 0.835, 0],
      shadows,
      [Math.PI / 2, 0, 0],
    );
    addPart(
      bodyLod0,
      new THREE.OctahedronGeometry(0.048, 0),
      mats.goldMat,
      [0, 0.72, 0.225],
      shadows,
      [0, 0, 0],
      [1, 1.2, 0.5],
    );

    // Front Heraldic Tabard (crimson cloth + ivory border stripes + gold bottom bar)
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.155, 0.26, 0.028),
      mats.primaryMat,
      [0, 0.365, 0.185],
      shadows,
      [-0.14, 0, 0],
    );
    [-0.068, 0.068].forEach((tx) => {
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.022, 0.262, 0.032),
        mats.ivoryMat,
        [tx, 0.365, 0.186],
        false,
        [-0.14, 0, 0],
      );
    });
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.162, 0.028, 0.034),
      mats.goldMat,
      [0, 0.245, 0.203],
      false,
      [-0.14, 0, 0],
    );

    // Sculpted Armored Tassets (hip armor plates)
    [-1, 1].forEach((side) => {
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.095, 0.14, 0.16),
        mats.steelMat,
        [side * 0.205, 0.43, 0.02],
        shadows,
        [0, 0, side * 0.22],
      );
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.102, 0.03, 0.168),
        mats.goldMat,
        [side * 0.215, 0.37, 0.02],
        false,
        [0, 0, side * 0.22],
      );
    });

    // Animated Flowing Royal Cape on cloakPivot
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.18, 0);
    capeShape.lineTo(0.18, 0);
    capeShape.lineTo(0.29, -0.58);
    capeShape.quadraticCurveTo(0, -0.66, -0.29, -0.58);
    capeShape.closePath();
    const capeGeo = new THREE.ExtrudeGeometry(capeShape, {
      depth: 0.026,
      bevelEnabled: bevel,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    addPart(cloakPivot, capeGeo, mats.primaryMat, [0, 0, 0], shadows);
    addPart(
      cloakPivot,
      new THREE.BoxGeometry(0.36, 0.52, 0.012),
      mats.primaryDarkMat,
      [0, -0.28, -0.02],
      false,
    );
    // Gold cape clasps on chest collar
    [-0.14, 0.14].forEach((cx) => {
      addPart(bodyLod0, new THREE.SphereGeometry(0.032, 8, 6), mats.goldMat, [cx, 0.82, 0.12], shadows);
    });

    // RIGHT HAND: Ornate Winged Royal Greatsword
    const swordGroup = new THREE.Group();
    swordGroup.rotation.set(0.38, 0, -0.08);
    addPart(swordGroup, new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8), mats.darkLeatherMat, [0, 0, 0], shadows);
    addPart(swordGroup, new THREE.SphereGeometry(0.032, 8, 6), mats.goldMat, [0, -0.085, 0], shadows);
    // Swept Winged Crossguard
    addPart(swordGroup, new THREE.BoxGeometry(0.175, 0.028, 0.038), mats.goldMat, [0, 0.08, 0], shadows);
    [-0.085, 0.085].forEach((wx) => {
      addPart(
        swordGroup,
        new THREE.ConeGeometry(0.022, 0.06, 4),
        mats.goldMat,
        [wx, 0.1, 0],
        false,
        [0, 0, wx > 0 ? -0.45 : 0.45],
      );
    });
    // Tapered Steel Blade + Glowing Ruby Rune Core
    addPart(swordGroup, new THREE.BoxGeometry(0.056, 0.44, 0.016), mats.steelMat, [0, 0.31, 0], shadows);
    addPart(swordGroup, new THREE.BoxGeometry(0.018, 0.34, 0.02), mats.goldMat, [0, 0.28, 0], false);
    addPart(
      swordGroup,
      new THREE.ConeGeometry(0.032, 0.11, 4),
      mats.steelMat,
      [0, 0.585, 0],
      shadows,
      [0, Math.PI / 4, 0],
      [1.2, 1, 0.4],
    );
    addPart(swordGroup, new THREE.OctahedronGeometry(0.026, 0), mats.crystalMat, [0, 0.082, 0.022], false);
    rightHand.add(swordGroup);

    // LEFT HAND: Heraldic Kite Shield
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.07, 0.02, 0.05);
    shieldGroup.rotation.set(-0.15, -0.58, 0.08);

    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 0.21);
    shieldShape.lineTo(0.16, 0.17);
    shieldShape.quadraticCurveTo(0.15, -0.08, 0, -0.25);
    shieldShape.quadraticCurveTo(-0.15, -0.08, -0.16, 0.17);
    shieldShape.closePath();

    const shieldBaseGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.03,
      bevelEnabled: bevel,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    addPart(shieldGroup, shieldBaseGeo, mats.steelMat, [0, 0, -0.015], shadows);
    addPart(shieldGroup, new THREE.BoxGeometry(0.24, 0.31, 0.014), mats.heraldryMat, [0, 0.01, 0.016], shadows);
    addPart(
      shieldGroup,
      new THREE.SphereGeometry(0.048, 10, 8),
      mats.goldMat,
      [0, 0.01, 0.024],
      shadows,
      [0, 0, 0],
      [1, 1, 0.55],
    );
    leftHand.add(shieldGroup);

    // HEAD: Knight Greathelm with Painted Crimson Visor, Glowing Eye Slit & Sweeping Plume
    addPart(headPivot, new THREE.CylinderGeometry(0.11, 0.125, 0.09, 10), mats.undersuitMat, [0, 0.02, 0], shadows);
    addPart(
      headPivot,
      new THREE.SphereGeometry(0.148, highSeg, 10),
      mats.steelMat,
      [0, 0.135, 0],
      shadows,
      [0, 0, 0],
      [0.95, 1.08, 1.02],
    );
    addPart(
      headPivot,
      new THREE.CylinderGeometry(0.154, 0.132, 0.115, highSeg, 1, false, -0.95, 1.9),
      mats.primaryMat,
      [0, 0.115, 0.028],
      shadows,
    );
    addPart(headPivot, new THREE.BoxGeometry(0.175, 0.026, 0.05), mats.undersuitMat, [0, 0.152, 0.135], false);
    [-0.044, 0.044].forEach((ex) => {
      addPart(headPivot, new THREE.BoxGeometry(0.036, 0.016, 0.02), mats.eyeGlowMat, [ex, 0.152, 0.154], false);
    });
    addPart(
      headPivot,
      new THREE.TorusGeometry(0.146, 0.018, 6, highSeg),
      mats.goldMat,
      [0, 0.195, 0.01],
      shadows,
      [Math.PI / 2 - 0.12, 0, 0],
    );
    const plumeShape = new THREE.Shape();
    plumeShape.moveTo(0, 0);
    plumeShape.quadraticCurveTo(0.14, 0.15, 0.02, 0.24);
    plumeShape.quadraticCurveTo(-0.16, 0.22, -0.24, -0.02);
    plumeShape.quadraticCurveTo(-0.12, 0.04, 0, 0);
    const plumeGeo = new THREE.ExtrudeGeometry(plumeShape, {
      depth: 0.036,
      bevelEnabled: bevel,
      bevelThickness: 0.008,
      bevelSize: 0.008,
      bevelSegments: 2,
    });
    addPart(headPivot, plumeGeo, mats.primaryMat, [-0.018, 0.255, 0.02], shadows, [0, -Math.PI / 2, 0]);
    addPart(
      headPivot,
      new THREE.SphereGeometry(0.038, 8, 6),
      mats.accentMat,
      [0, 0.44, -0.04],
      false,
      [0, 0, 0],
      [0.6, 1.1, 1.9],
    );
  }

  // =========================================================================
  // ARCHETYPE 1: PENYIHIR SAFIR (Archmage of the Sapphire Spire)
  // =========================================================================
  else if (archetypeIndex === 1) {
    // Flared Lower Mage Coat Split Panels
    [-1, 1].forEach((side) => {
      addPart(
        bodyLod0,
        new THREE.CylinderGeometry(0.12, 0.19, 0.34, 10, 1, false, side > 0 ? -0.3 : 1.8, 2.3),
        mats.primaryMat,
        [side * 0.075, 0.335, -0.02],
        shadows,
      );
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.022, 0.33, 0.024),
        mats.goldMat,
        [side * 0.085, 0.335, 0.165],
        false,
        [-0.16, side * 0.22, 0],
      );
    });
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.18, 0.26, 0.35, 12, 1, false, Math.PI * 0.55, Math.PI * 0.9),
      mats.primaryDarkMat,
      [0, 0.335, -0.03],
      shadows,
    );

    // Fitted Sapphire Mage Torso + Ivory Inner Vest + Diagonal Gold Arcane Stole
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.22, 0.185, 0.28, highSeg),
      mats.primaryMat,
      [0, 0.68, 0],
      shadows,
      [0, 0, 0],
      [1.04, 1, 0.9],
    );
    addPart(bodyLod0, new THREE.BoxGeometry(0.12, 0.25, 0.04), mats.ivoryMat, [0, 0.68, 0.178], shadows);
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.075, 0.3, 0.046),
      mats.goldMat,
      [0.02, 0.68, 0.186],
      shadows,
      [0, 0, 0.38],
    );

    // Belt Mana Potion & Leather Spell Pouch
    addPart(bodyLod0, new THREE.SphereGeometry(0.044, 8, 8), mats.crystalMat, [-0.19, 0.47, 0.11], shadows);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.018, 0.018, 0.028, 6), mats.goldMat, [-0.19, 0.515, 0.11], false);
    addPart(bodyLod0, new THREE.BoxGeometry(0.075, 0.09, 0.055), mats.leatherMat, [0.2, 0.47, 0.08], shadows);

    // High-Collared Arcane Shoulder Mantle + Animated Flowing Cloak on cloakPivot
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.25, 0.19, 0.14, 12, 1, false, Math.PI * 0.42, Math.PI * 1.16),
      mats.primaryDarkMat,
      [0, 0.87, -0.03],
      shadows,
    );
    addPart(
      bodyLod0,
      new THREE.TorusGeometry(0.21, 0.026, 8, highSeg),
      mats.goldMat,
      [0, 0.81, -0.01],
      shadows,
      [Math.PI / 2, 0, 0],
    );
    const wizCapeShape = new THREE.Shape();
    wizCapeShape.moveTo(-0.16, 0);
    wizCapeShape.lineTo(0.16, 0);
    wizCapeShape.lineTo(0.26, -0.6);
    wizCapeShape.quadraticCurveTo(0, -0.68, -0.26, -0.6);
    wizCapeShape.closePath();
    addPart(
      cloakPivot,
      new THREE.ExtrudeGeometry(wizCapeShape, {
        depth: 0.024,
        bevelEnabled: bevel,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      }),
      mats.primaryMat,
      [0, 0, 0],
      shadows,
    );

    // RIGHT HAND: Twisted Arcane Staff with Silver Crescent Prongs & Glowing Sapphire Orb
    const staffGroup = new THREE.Group();
    staffGroup.rotation.set(0.24, 0, -0.06);
    const staffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.26, 0),
      new THREE.Vector3(0.012, 0.0, 0.01),
      new THREE.Vector3(-0.014, 0.25, -0.01),
      new THREE.Vector3(0.012, 0.48, 0.012),
      new THREE.Vector3(0, 0.62, 0),
    ]);
    addPart(staffGroup, new THREE.TubeGeometry(staffCurve, 14, 0.022, 7, false), mats.leatherMat, [0, 0, 0], shadows);
    [0.08, 0.34, 0.56].forEach((ry) => {
      addPart(
        staffGroup,
        new THREE.TorusGeometry(0.028, 0.008, 6, 12),
        mats.goldMat,
        [0, ry, 0],
        false,
        [Math.PI / 2, 0, 0],
      );
    });
    [-1, 1].forEach((ps) => {
      addPart(
        staffGroup,
        new THREE.TorusGeometry(0.082, 0.012, 6, 14, Math.PI * 0.78),
        mats.steelMat,
        [ps * 0.018, 0.67, 0],
        shadows,
        [0, 0, ps > 0 ? -Math.PI * 0.38 : Math.PI * 0.62],
      );
    });
    addPart(staffGroup, new THREE.OctahedronGeometry(0.058, 1), mats.crystalMat, [0, 0.685, 0], false);
    rightHand.add(staffGroup);

    // LEFT HAND: Open Spellbook Grimoire with Parchment Pages & Floating Cyan Rune
    const bookGroup = new THREE.Group();
    bookGroup.position.set(0.03, 0.03, 0.06);
    bookGroup.rotation.set(0.55, 0.35, -0.18);
    addPart(bookGroup, new THREE.BoxGeometry(0.11, 0.022, 0.14), mats.darkLeatherMat, [-0.048, 0, 0], shadows, [0, 0, -0.26]);
    addPart(bookGroup, new THREE.BoxGeometry(0.11, 0.022, 0.14), mats.darkLeatherMat, [0.048, 0, 0], shadows, [0, 0, 0.26]);
    addPart(bookGroup, new THREE.BoxGeometry(0.096, 0.02, 0.124), mats.ivoryMat, [-0.044, 0.012, 0], shadows, [0, 0, -0.26]);
    addPart(bookGroup, new THREE.BoxGeometry(0.096, 0.02, 0.124), mats.ivoryMat, [0.044, 0.012, 0], shadows, [0, 0, 0.26]);
    addPart(bookGroup, new THREE.OctahedronGeometry(0.034, 0), mats.eyeGlowMat, [0, 0.085, 0], false);
    leftHand.add(bookGroup);

    // HEAD: Sculpted Wizard Face, Flowing Silver Beard & Crooked Pointed Wizard Hat + Astrolabe Ring
    addPart(headPivot, new THREE.CylinderGeometry(0.085, 0.105, 0.07, 10), mats.undersuitMat, [0, 0.015, 0], shadows);
    addPart(
      headPivot,
      new THREE.SphereGeometry(0.125, highSeg, 10),
      mats.skinMat,
      [0, 0.118, 0.012],
      shadows,
      [0, 0, 0],
      [0.94, 1.05, 0.96],
    );
    [-0.042, 0.042].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [ex, 0.132, 0.122], false);
      addPart(
        headPivot,
        new THREE.BoxGeometry(0.044, 0.016, 0.024),
        mats.ivoryMat,
        [ex, 0.156, 0.124],
        false,
        [0, 0, ex > 0 ? 0.18 : -0.18],
      );
    });
    addPart(
      headPivot,
      new THREE.ConeGeometry(0.075, 0.19, 8),
      mats.ivoryMat,
      [0, -0.005, 0.1],
      shadows,
      [Math.PI - 0.18, 0, 0],
    );
    [-0.036, 0.036].forEach((mx) => {
      addPart(
        headPivot,
        new THREE.ConeGeometry(0.026, 0.085, 6),
        mats.ivoryMat,
        [mx, 0.068, 0.132],
        false,
        [0, 0, mx > 0 ? -1.15 : 1.15],
      );
    });
    addPart(
      headPivot,
      new THREE.CylinderGeometry(0.255, 0.27, 0.026, highSeg),
      mats.primaryMat,
      [0, 0.21, -0.01],
      shadows,
      [-0.1, 0, 0.05],
    );
    addPart(
      headPivot,
      new THREE.CylinderGeometry(0.138, 0.148, 0.038, highSeg),
      mats.goldMat,
      [0, 0.23, -0.01],
      shadows,
      [-0.1, 0, 0.05],
    );
    addPart(
      headPivot,
      new THREE.ConeGeometry(0.14, 0.21, highSeg),
      mats.primaryMat,
      [0, 0.32, -0.03],
      shadows,
      [-0.22, 0, 0.12],
    );
    addPart(
      headPivot,
      new THREE.ConeGeometry(0.072, 0.15, 10),
      mats.primaryDarkMat,
      [-0.04, 0.425, -0.095],
      shadows,
      [-0.65, 0, 0.42],
    );
    addPart(
      headPivot,
      new THREE.TorusGeometry(0.24, 0.014, 6, 24),
      mats.goldMat,
      [0, 0.28, -0.02],
      shadows,
      [Math.PI / 2.6, 0.3, -0.25],
    );
  }

  // =========================================================================
  // ARCHETYPE 2: PENJELAJAH ZAMRUD (Sylvan Woodland Ranger)
  // =========================================================================
  else if (archetypeIndex === 2) {
    // Emerald Cloth Tunic + Layered Brown Leather Brigandine Chest Armor
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.22, 0.185, 0.29, highSeg),
      mats.primaryMat,
      [0, 0.685, 0],
      shadows,
      [0, 0, 0],
      [1.06, 1, 0.9],
    );
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.228, 0.192, 0.21, highSeg, 1, false, -1.1, 2.2),
      mats.leatherMat,
      [0, 0.675, 0.008],
      shadows,
      [0, 0, 0],
      [1.06, 1, 0.92],
    );
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.068, 0.35, 0.36),
      mats.darkLeatherMat,
      [0, 0.685, 0],
      shadows,
      [0, 0, -0.58],
    );
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.064, 0.064, 0.045),
      mats.goldMat,
      [0.03, 0.71, 0.19],
      shadows,
      [0, 0, -0.58],
    );

    // Split Emerald Ranger Coat Skirts + Twin Leather Hip Pouches
    [-1, 1].forEach((side) => {
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.145, 0.18, 0.18),
        mats.primaryDarkMat,
        [side * 0.14, 0.41, -0.02],
        shadows,
        [0, 0, side * 0.18],
      );
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.068, 0.085, 0.055),
        mats.leatherMat,
        [side * 0.21, 0.47, 0.07],
        shadows,
      );
    });

    // Animated Asymmetric Woodland Cloak on cloakPivot
    const rangerCape = new THREE.Shape();
    rangerCape.moveTo(-0.18, 0);
    rangerCape.lineTo(0.14, 0.02);
    rangerCape.lineTo(0.2, -0.55);
    rangerCape.lineTo(-0.08, -0.62);
    rangerCape.lineTo(-0.24, -0.45);
    rangerCape.closePath();
    addPart(
      cloakPivot,
      new THREE.ExtrudeGeometry(rangerCape, {
        depth: 0.022,
        bevelEnabled: bevel,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      }),
      mats.primaryDarkMat,
      [0, 0, 0.01],
      shadows,
      [0, 0, 0.08],
    );

    // Quiver on back
    const quiverGroup = new THREE.Group();
    quiverGroup.position.set(0.12, 0.71, -0.21);
    quiverGroup.rotation.set(-0.28, 0, -0.42);
    addPart(quiverGroup, new THREE.CylinderGeometry(0.058, 0.044, 0.34, 8), mats.leatherMat, [0, 0, 0], shadows);
    addPart(quiverGroup, new THREE.TorusGeometry(0.058, 0.012, 6, 12), mats.goldMat, [0, 0.165, 0], false, [Math.PI / 2, 0, 0]);
    [-0.02, 0, 0.02].forEach((ax, i) => {
      addPart(
        quiverGroup,
        new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5),
        mats.ivoryMat,
        [ax, 0.22, (i - 1) * 0.018],
        false,
      );
      addPart(
        quiverGroup,
        new THREE.ConeGeometry(0.02, 0.05, 4),
        i === 1 ? mats.accentMat : mats.ivoryMat,
        [ax, 0.28, (i - 1) * 0.018],
        false,
      );
    });
    bodyLod0.add(quiverGroup);

    // LEFT HAND: Sylvan Recurve Bow + Bowstring + Nocked Arrow
    const bowGroup = new THREE.Group();
    bowGroup.position.set(-0.02, 0.02, 0.06);
    bowGroup.rotation.set(0.2, 0.35, 0.12);
    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.34, -0.09),
      new THREE.Vector3(0, -0.16, 0.02),
      new THREE.Vector3(0, 0, 0.055),
      new THREE.Vector3(0, 0.16, 0.02),
      new THREE.Vector3(0, 0.34, -0.09),
    ]);
    addPart(bowGroup, new THREE.TubeGeometry(bowCurve, 16, 0.018, 6, false), mats.leatherMat, [0, 0, 0], shadows);
    addPart(bowGroup, new THREE.SphereGeometry(0.022, 6, 6), mats.goldMat, [0, 0.34, -0.09], false);
    addPart(bowGroup, new THREE.SphereGeometry(0.022, 6, 6), mats.goldMat, [0, -0.34, -0.09], false);
    addPart(bowGroup, new THREE.CylinderGeometry(0.005, 0.005, 0.67, 4), mats.ivoryMat, [0, 0, -0.088], false);
    addPart(
      bowGroup,
      new THREE.CylinderGeometry(0.009, 0.009, 0.42, 5),
      mats.ivoryMat,
      [0, 0, 0.12],
      false,
      [Math.PI / 2, 0, 0],
    );
    addPart(
      bowGroup,
      new THREE.ConeGeometry(0.022, 0.058, 4),
      mats.crystalMat,
      [0, 0, 0.35],
      false,
      [Math.PI / 2, 0, 0],
    );
    leftHand.add(bowGroup);

    // RIGHT HAND: Curved Sylvan Hunting Dagger
    const daggerGroup = new THREE.Group();
    daggerGroup.rotation.set(0.95, 0, -0.15);
    addPart(daggerGroup, new THREE.CylinderGeometry(0.016, 0.016, 0.11, 6), mats.darkLeatherMat, [0, 0, 0], shadows);
    addPart(daggerGroup, new THREE.BoxGeometry(0.1, 0.02, 0.028), mats.goldMat, [0, 0.055, 0], shadows);
    addPart(daggerGroup, new THREE.BoxGeometry(0.036, 0.23, 0.012), mats.steelMat, [0, 0.18, 0], shadows);
    addPart(
      daggerGroup,
      new THREE.ConeGeometry(0.022, 0.075, 4),
      mats.steelMat,
      [0, 0.33, 0],
      shadows,
      [0, Math.PI / 4, 0],
      [1, 1, 0.4],
    );
    rightHand.add(daggerGroup);

    // HEAD: Hooded Ranger Cowl, Dark Scarf Mask, Glowing Jade Eyes & Stag Antlers
    addPart(headPivot, new THREE.CylinderGeometry(0.115, 0.135, 0.105, highSeg), mats.primaryDarkMat, [0, 0.045, 0.01], shadows);
    addPart(headPivot, new THREE.SphereGeometry(0.122, highSeg, 10), mats.skinMat, [0, 0.135, 0.015], shadows);
    addPart(
      headPivot,
      new THREE.CylinderGeometry(0.126, 0.118, 0.075, highSeg, 1, false, -0.95, 1.9),
      mats.primaryDarkMat,
      [0, 0.095, 0.022],
      shadows,
    );
    [-0.042, 0.042].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [ex, 0.15, 0.122], false);
    });
    addPart(
      headPivot,
      new THREE.SphereGeometry(0.152, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.65),
      mats.primaryMat,
      [0, 0.145, -0.015],
      shadows,
      [-0.3, 0, 0],
    );
    addPart(
      headPivot,
      new THREE.ConeGeometry(0.135, 0.24, 10),
      mats.primaryMat,
      [0, 0.23, -0.09],
      shadows,
      [-0.95, 0, 0],
    );
    [-1, 1].forEach((side) => {
      const antlerCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.11, 0.2, 0.02),
        new THREE.Vector3(side * 0.19, 0.31, -0.01),
        new THREE.Vector3(side * 0.14, 0.42, -0.02),
      ]);
      addPart(headPivot, new THREE.TubeGeometry(antlerCurve, 10, 0.018, 6, false), mats.goldMat, [0, 0, 0], shadows);
      addPart(
        headPivot,
        new THREE.ConeGeometry(0.016, 0.095, 5),
        mats.ivoryMat,
        [side * 0.21, 0.34, 0.02],
        shadows,
        [0.2, 0, -side * 0.85],
      );
    });
  }

  // =========================================================================
  // ARCHETYPE 3: ALKEMIS AMBER (Clockwork Sun-Alchemist)
  // =========================================================================
  else if (archetypeIndex === 3) {
    // Quilted Amber Coat + Dark Leather Apron + Potion Bandolier
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.235, 0.195, 0.3, highSeg),
      mats.primaryMat,
      [0, 0.685, 0],
      shadows,
      [0, 0, 0],
      [1.06, 1, 0.92],
    );
    addPart(
      bodyLod0,
      new THREE.TorusGeometry(0.155, 0.032, 8, highSeg),
      mats.ivoryMat,
      [0, 0.84, 0.01],
      shadows,
      [Math.PI / 2, 0, 0],
    );
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.18, 0.36, 0.032),
      mats.leatherMat,
      [0, 0.44, 0.182],
      shadows,
      [-0.12, 0, 0],
    );
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.064, 0.064, 0.024, 8),
      mats.goldMat,
      [0.06, 0.72, 0.215],
      shadows,
      [Math.PI / 2, 0, 0],
    );
    addPart(
      bodyLod0,
      new THREE.BoxGeometry(0.056, 0.34, 0.36),
      mats.darkLeatherMat,
      [0, 0.69, 0],
      shadows,
      [0, 0, 0.56],
    );
    const vialColors = [mats.crystalMat, mats.eyeGlowMat, mats.accentMat];
    [-0.07, 0, 0.07].forEach((vx, idx) => {
      const vy = 0.72 - vx * 0.52;
      addPart(
        bodyLod0,
        new THREE.CylinderGeometry(0.02, 0.02, 0.075, 6),
        vialColors[idx],
        [vx, vy, 0.215],
        false,
        [0, 0, 0.56],
      );
      addPart(
        bodyLod0,
        new THREE.CylinderGeometry(0.022, 0.022, 0.018, 6),
        mats.goldMat,
        [vx - 0.02, vy + 0.032, 0.215],
        false,
        [0, 0, 0.56],
      );
    });

    // Animated Alchemist Half-Mantle & Coat Tail on cloakPivot
    const alchCape = new THREE.Shape();
    alchCape.moveTo(-0.15, 0);
    alchCape.lineTo(0.15, 0);
    alchCape.lineTo(0.22, -0.48);
    alchCape.quadraticCurveTo(0, -0.54, -0.22, -0.48);
    alchCape.closePath();
    addPart(
      cloakPivot,
      new THREE.ExtrudeGeometry(alchCape, {
        depth: 0.02,
        bevelEnabled: bevel,
        bevelThickness: 0.007,
        bevelSize: 0.007,
        bevelSegments: 2,
      }),
      mats.primaryDarkMat,
      [0, -0.05, 0.01],
      shadows,
    );

    // Brass Aether Boiler Backpack on Back
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.7, -0.24);
    addPart(packGroup, new THREE.BoxGeometry(0.24, 0.24, 0.13), mats.leatherMat, [0, 0, 0], shadows);
    addPart(packGroup, new THREE.CylinderGeometry(0.068, 0.068, 0.18, 10), mats.goldMat, [0, 0.01, -0.05], shadows);
    addPart(packGroup, new THREE.SphereGeometry(0.062, 10, 8), mats.crystalMat, [0, 0.01, -0.09], false);
    [-0.085, 0.085].forEach((cx) => {
      addPart(packGroup, new THREE.CylinderGeometry(0.024, 0.028, 0.18, 8), mats.goldMat, [cx, 0.17, -0.02], shadows);
      addPart(packGroup, new THREE.TorusGeometry(0.028, 0.008, 6, 10), mats.steelMat, [cx, 0.26, -0.02], false, [Math.PI / 2, 0, 0]);
    });
    bodyLod0.add(packGroup);

    // RIGHT HAND: Brass Solar Aether Lantern-Scepter
    const scepterGroup = new THREE.Group();
    scepterGroup.rotation.set(0.32, 0, -0.08);
    addPart(scepterGroup, new THREE.CylinderGeometry(0.02, 0.022, 0.44, 8), mats.darkLeatherMat, [0, 0.1, 0], shadows);
    addPart(scepterGroup, new THREE.CylinderGeometry(0.055, 0.032, 0.04, 8), mats.goldMat, [0, 0.34, 0], shadows);
    addPart(scepterGroup, new THREE.CylinderGeometry(0.035, 0.062, 0.05, 8), mats.goldMat, [0, 0.48, 0], shadows);
    addPart(scepterGroup, new THREE.SphereGeometry(0.052, 10, 8), mats.crystalMat, [0, 0.41, 0], false);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      addPart(
        scepterGroup,
        new THREE.CylinderGeometry(0.008, 0.008, 0.13, 5),
        mats.goldMat,
        [Math.cos(a) * 0.058, 0.41, Math.sin(a) * 0.058],
        false,
      );
    }
    rightHand.add(scepterGroup);

    // LEFT HAND: Glowing Round Elixir Potion Flask
    const flaskGroup = new THREE.Group();
    flaskGroup.position.set(0.01, 0.05, 0.04);
    addPart(flaskGroup, new THREE.SphereGeometry(0.072, 10, 8), mats.eyeGlowMat, [0, 0, 0], shadows);
    addPart(flaskGroup, new THREE.CylinderGeometry(0.024, 0.032, 0.065, 8), mats.steelMat, [0, 0.075, 0], shadows);
    addPart(flaskGroup, new THREE.TorusGeometry(0.028, 0.009, 6, 10), mats.goldMat, [0, 0.1, 0], false, [Math.PI / 2, 0, 0]);
    addPart(flaskGroup, new THREE.CylinderGeometry(0.02, 0.018, 0.03, 6), mats.leatherMat, [0, 0.118, 0], false);
    leftHand.add(flaskGroup);

    // HEAD: Leather Aviator Cap, Prominent Brass Goggles with Glowing Lenses & Sun Diadem
    addPart(headPivot, new THREE.CylinderGeometry(0.095, 0.115, 0.08, 10), mats.undersuitMat, [0, 0.02, 0], shadows);
    addPart(headPivot, new THREE.SphereGeometry(0.128, highSeg, 10), mats.skinMat, [0, 0.125, 0.012], shadows);
    addPart(
      headPivot,
      new THREE.SphereGeometry(0.142, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      mats.leatherMat,
      [0, 0.145, -0.005],
      shadows,
    );
    [-1, 1].forEach((side) => {
      addPart(headPivot, new THREE.BoxGeometry(0.036, 0.1, 0.07), mats.leatherMat, [side * 0.132, 0.115, -0.01], shadows);
    });
    addPart(headPivot, new THREE.BoxGeometry(0.24, 0.028, 0.24), mats.darkLeatherMat, [0, 0.16, -0.01], false);
    [-0.052, 0.052].forEach((gx) => {
      addPart(
        headPivot,
        new THREE.CylinderGeometry(0.044, 0.044, 0.038, 12),
        mats.goldMat,
        [gx, 0.155, 0.128],
        shadows,
        [Math.PI / 2, 0, 0],
      );
      addPart(
        headPivot,
        new THREE.SphereGeometry(0.034, 10, 8),
        mats.eyeGlowMat,
        [gx, 0.155, 0.142],
        false,
        [0, 0, 0],
        [1, 1, 0.5],
      );
    });
    [-0.032, 0.032].forEach((mx) => {
      addPart(
        headPivot,
        new THREE.ConeGeometry(0.022, 0.068, 6),
        mats.primaryDarkMat,
        [mx, 0.075, 0.134],
        false,
        [0, 0, mx > 0 ? -1.25 : 1.25],
      );
    });
    addPart(
      headPivot,
      new THREE.TorusGeometry(0.2, 0.016, 6, 20, Math.PI),
      mats.goldMat,
      [0, 0.22, -0.03],
      shadows,
    );
    for (let r = -2; r <= 2; r++) {
      const angle = r * 0.42;
      addPart(
        headPivot,
        new THREE.ConeGeometry(0.02, 0.085, 4),
        mats.goldMat,
        [Math.sin(angle) * 0.23, 0.22 + Math.cos(angle) * 0.23, -0.03],
        shadows,
        [0, 0, -angle],
      );
    }
  }

  // =========================================================================
  // ARCHETYPE 4: SAMURAI NAGA (Dragon Shogun Ronin)
  // =========================================================================
  else if (archetypeIndex === 4) {
    // Crimson Lamellar Dou Cuirass + Gold Dragon Sash + Kusazuri Skirt Plates
    addPart(
      bodyLod0,
      new THREE.CylinderGeometry(0.24, 0.195, 0.3, highSeg),
      mats.primaryMat,
      [0, 0.69, 0],
      shadows,
      [0, 0, 0],
      [1.08, 1, 0.92],
    );
    for (let tier = 0; tier < 3; tier++) {
      addPart(
        bodyLod0,
        new THREE.CylinderGeometry(0.244 - tier * 0.012, 0.23 - tier * 0.012, 0.032, highSeg),
        tier % 2 === 0 ? mats.primaryDarkMat : mats.goldMat,
        [0, 0.76 - tier * 0.065, 0.008],
        false,
        [0, 0, 0],
        [1.08, 1, 0.93],
      );
    }
    // Kusazuri Armored Tassets Front & Sides
    [-1, 0, 1].forEach((s) => {
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.125, 0.18, 0.032),
        s === 0 ? mats.primaryMat : mats.primaryDarkMat,
        [s * 0.125, 0.39, 0.17],
        shadows,
        [-0.18, s * 0.25, 0],
      );
      addPart(
        bodyLod0,
        new THREE.BoxGeometry(0.13, 0.026, 0.036),
        mats.goldMat,
        [s * 0.125, 0.31, 0.182],
        false,
        [-0.18, s * 0.25, 0],
      );
    });
    // Back Sash Banner Bow & Scabbard
    addPart(bodyLod0, new THREE.CylinderGeometry(0.022, 0.018, 0.56, 8), mats.darkLeatherMat, [-0.14, 0.66, -0.21], shadows, [0.18, 0, -0.68]);
    addPart(bodyLod0, new THREE.SphereGeometry(0.028, 6, 6), mats.goldMat, [0.04, 0.87, -0.17], false);
    addPart(cloakPivot, new THREE.BoxGeometry(0.28, 0.48, 0.02), mats.primaryDarkMat, [0, -0.24, 0], shadows);

    // RIGHT HAND: Curved Dragon Ember Katana
    const katanaGroup = new THREE.Group();
    katanaGroup.rotation.set(0.32, 0, -0.1);
    addPart(katanaGroup, new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), mats.darkLeatherMat, [0, 0, 0], shadows);
    addPart(katanaGroup, new THREE.CylinderGeometry(0.052, 0.052, 0.016, 12), mats.goldMat, [0, 0.085, 0], shadows);
    const bladeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.09, 0),
      new THREE.Vector3(0, 0.32, 0.018),
      new THREE.Vector3(0, 0.56, 0.052),
    ]);
    addPart(katanaGroup, new THREE.TubeGeometry(bladeCurve, 12, 0.016, 6, false), mats.steelMat, [0, 0, 0], shadows, [0, 0, 0], [0.55, 1, 1.3]);
    addPart(katanaGroup, new THREE.TubeGeometry(bladeCurve, 10, 0.008, 5, false), mats.eyeGlowMat, [0, 0, 0.008], false);
    rightHand.add(katanaGroup);

    // LEFT HAND: Short Wakizashi Blade
    const wakiGroup = new THREE.Group();
    wakiGroup.rotation.set(0.85, 0, 0.18);
    addPart(wakiGroup, new THREE.CylinderGeometry(0.014, 0.014, 0.11, 6), mats.darkLeatherMat, [0, 0, 0], shadows);
    addPart(wakiGroup, new THREE.CylinderGeometry(0.042, 0.042, 0.014, 10), mats.goldMat, [0, 0.06, 0], shadows);
    addPart(wakiGroup, new THREE.BoxGeometry(0.028, 0.28, 0.012), mats.steelMat, [0, 0.21, 0], shadows);
    leftHand.add(wakiGroup);

    // HEAD: Kabuto Helmet with Wide Shikoro Neck Flaps, Oni Half-Mask & Crescent Dragon Horns
    addPart(headPivot, new THREE.SphereGeometry(0.145, highSeg, 10), mats.undersuitMat, [0, 0.135, 0], shadows);
    addPart(headPivot, new THREE.CylinderGeometry(0.135, 0.115, 0.08, highSeg, 1, false, -0.95, 1.9), mats.primaryDarkMat, [0, 0.09, 0.03], shadows);
    [-0.044, 0.044].forEach((ex) => {
      addPart(headPivot, new THREE.BoxGeometry(0.036, 0.018, 0.02), mats.eyeGlowMat, [ex, 0.145, 0.14], false);
    });
    // Kabuto bowl + sweeping neck guard
    addPart(headPivot, new THREE.SphereGeometry(0.16, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), mats.primaryMat, [0, 0.15, -0.005], shadows);
    addPart(headPivot, new THREE.CylinderGeometry(0.155, 0.22, 0.11, highSeg, 1, false, Math.PI * 0.35, Math.PI * 1.3), mats.primaryDarkMat, [0, 0.11, -0.02], shadows);
    // Iconic Gold Kuwa-gata Crescent Horns + Dragon Gem
    [-1, 1].forEach((side) => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.03, 0.23, 0.13),
        new THREE.Vector3(side * 0.15, 0.31, 0.11),
        new THREE.Vector3(side * 0.21, 0.43, 0.06),
      ]);
      addPart(headPivot, new THREE.TubeGeometry(hornCurve, 10, 0.018, 6, false), mats.goldMat, [0, 0, 0], shadows);
    });
    addPart(headPivot, new THREE.OctahedronGeometry(0.038, 0), mats.crystalMat, [0, 0.24, 0.145], false);
  }

  // =========================================================================
  // ARCHETYPE 5: VALKYRIE CAHAYA (Radiant Winged Champion)
  // =========================================================================
  else if (archetypeIndex === 5) {
    // Ivory & Gold Winged Battle Cuirass + White Pleated Battle Skirt
    addPart(bodyLod0, new THREE.CylinderGeometry(0.24, 0.185, 0.3, highSeg), mats.ivoryMat, [0, 0.69, 0], shadows, [0, 0, 0], [1.08, 1, 0.9]);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.246, 0.19, 0.2, highSeg, 1, false, -0.8, 1.6), mats.goldMat, [0, 0.68, 0.01], shadows);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.18, 0.27, 0.26, highSeg), mats.ivoryMat, [0, 0.37, 0], shadows);
    addPart(bodyLod0, new THREE.BoxGeometry(0.14, 0.28, 0.024), mats.primaryMat, [0, 0.37, 0.2], shadows, [-0.16, 0, 0]);
    // Grand Feathered Golden Wings mounted on cloakPivot
    [-1, 1].forEach((side) => {
      for (let f = 0; f < 4; f++) {
        addPart(
          cloakPivot,
          new THREE.BoxGeometry(0.26 - f * 0.035, 0.07, 0.02),
          f % 2 === 0 ? mats.goldMat : mats.ivoryMat,
          [side * (0.21 + f * 0.02), -0.02 - f * 0.085, -0.03],
          shadows,
          [0, side * 0.24, side * (0.35 - f * 0.16)],
        );
      }
    });

    // RIGHT HAND: Radiant Dawn Spear
    const spearGroup = new THREE.Group();
    spearGroup.rotation.set(0.22, 0, -0.06);
    addPart(spearGroup, new THREE.CylinderGeometry(0.017, 0.019, 0.78, 8), mats.goldMat, [0, 0.16, 0], shadows);
    addPart(spearGroup, new THREE.ConeGeometry(0.048, 0.19, 4), mats.crystalMat, [0, 0.63, 0], shadows, [0, Math.PI / 4, 0], [1.1, 1, 0.45]);
    addPart(spearGroup, new THREE.BoxGeometry(0.13, 0.024, 0.03), mats.goldMat, [0, 0.52, 0], shadows);
    rightHand.add(spearGroup);

    // LEFT HAND: Radiant Sun Buckler Shield
    const sunShield = new THREE.Group();
    sunShield.position.set(-0.05, 0.02, 0.05);
    sunShield.rotation.set(-0.12, -0.52, 0);
    addPart(sunShield, new THREE.CylinderGeometry(0.19, 0.19, 0.028, 16), mats.goldMat, [0, 0, 0], shadows, [Math.PI / 2, 0, 0]);
    addPart(sunShield, new THREE.CylinderGeometry(0.13, 0.13, 0.034, 16), mats.heraldryMat, [0, 0, 0.004], shadows, [Math.PI / 2, 0, 0]);
    addPart(sunShield, new THREE.SphereGeometry(0.045, 8, 8), mats.crystalMat, [0, 0, 0.022], false);
    leftHand.add(sunShield);

    // HEAD: Winged Valkyrie Helm + Glowing Halo Crest
    addPart(headPivot, new THREE.SphereGeometry(0.135, highSeg, 10), mats.skinMat, [0, 0.125, 0.01], shadows);
    addPart(headPivot, new THREE.SphereGeometry(0.148, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), mats.goldMat, [0, 0.14, 0], shadows);
    addPart(headPivot, new THREE.BoxGeometry(0.034, 0.11, 0.036), mats.goldMat, [0, 0.14, 0.13], shadows);
    [-0.04, 0.04].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [ex, 0.135, 0.128], false);
    });
    [-1, 1].forEach((side) => {
      addPart(headPivot, new THREE.BoxGeometry(0.13, 0.065, 0.018), mats.ivoryMat, [side * 0.175, 0.22, -0.02], shadows, [0, -side * 0.3, side * 0.45]);
      addPart(headPivot, new THREE.BoxGeometry(0.1, 0.04, 0.018), mats.goldMat, [side * 0.165, 0.27, -0.02], false, [0, -side * 0.3, side * 0.62]);
    });
  }

  // =========================================================================
  // ARCHETYPE 6: KSATRIA BAYANGAN (Violet Shadow Assassin)
  // =========================================================================
  else if (archetypeIndex === 6) {
    // Sleek Dark Assassin Vest + Crossed Void Straps + Twin Cloak Tails
    addPart(bodyLod0, new THREE.CylinderGeometry(0.215, 0.175, 0.29, highSeg), mats.undersuitMat, [0, 0.685, 0], shadows, [0, 0, 0], [1.04, 1, 0.88]);
    addPart(bodyLod0, new THREE.BoxGeometry(0.052, 0.34, 0.35), mats.primaryMat, [0, 0.685, 0], shadows, [0, 0, 0.56]);
    addPart(bodyLod0, new THREE.BoxGeometry(0.052, 0.34, 0.35), mats.primaryMat, [0, 0.685, 0], shadows, [0, 0, -0.56]);
    addPart(bodyLod0, new THREE.TorusGeometry(0.165, 0.036, 8, highSeg), mats.primaryDarkMat, [0, 0.84, 0], shadows, [Math.PI / 2, 0, 0]);
    // Split Twin Tattered Shadow Ribbons
    [-1, 1].forEach((side) => {
      addPart(cloakPivot, new THREE.BoxGeometry(0.14, 0.62, 0.018), mats.primaryDarkMat, [side * 0.11, -0.3, 0], shadows, [0, 0, side * 0.12]);
      addPart(bodyLod0, new THREE.BoxGeometry(0.08, 0.22, 0.022), mats.primaryMat, [side * 0.14, 0.39, 0.16], shadows, [-0.14, side * 0.3, 0]);
    });

    // RIGHT & LEFT HANDS: Dual Curved Void Katars/Daggers
    [-1, 1].forEach((side) => {
      const targetHand = side < 0 ? leftHand : rightHand;
      const blade = new THREE.Group();
      blade.rotation.set(0.95, 0, -side * 0.14);
      addPart(blade, new THREE.CylinderGeometry(0.014, 0.014, 0.11, 6), mats.darkLeatherMat, [0, 0, 0], shadows);
      addPart(blade, new THREE.BoxGeometry(0.11, 0.02, 0.026), mats.steelMat, [0, 0.06, 0], shadows);
      addPart(blade, new THREE.BoxGeometry(0.036, 0.3, 0.012), mats.primaryMat, [0, 0.22, 0], shadows);
      addPart(blade, new THREE.ConeGeometry(0.024, 0.09, 4), mats.crystalMat, [0, 0.4, 0], false, [0, Math.PI / 4, 0], [1, 1, 0.4]);
      targetHand.add(blade);
    });

    // HEAD: Pointed Assassin Hood + Mask + Glowing Violet Eyes
    addPart(headPivot, new THREE.SphereGeometry(0.132, highSeg, 10), mats.undersuitMat, [0, 0.128, 0], shadows);
    addPart(headPivot, new THREE.CylinderGeometry(0.136, 0.124, 0.095, highSeg, 1, false, -1.0, 2.0), mats.primaryDarkMat, [0, 0.095, 0.02], shadows);
    [-0.042, 0.042].forEach((ex) => {
      addPart(headPivot, new THREE.BoxGeometry(0.034, 0.016, 0.022), mats.eyeGlowMat, [ex, 0.15, 0.126], false, [0, 0, ex > 0 ? 0.18 : -0.18]);
    });
    addPart(headPivot, new THREE.SphereGeometry(0.152, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mats.primaryMat, [0, 0.145, -0.012], shadows, [-0.24, 0, 0]);
    addPart(headPivot, new THREE.ConeGeometry(0.13, 0.26, 10), mats.primaryMat, [0, 0.23, -0.11], shadows, [-1.05, 0, 0]);
  }

  // =========================================================================
  // ARCHETYPE 7: PENDETA TERATAI (Cyan Jade Lotus Mystic)
  // =========================================================================
  else if (archetypeIndex === 7) {
    // Flowing Cyan Temple Robes + Giant Jade Prayer Beads Necklace
    addPart(bodyLod0, new THREE.CylinderGeometry(0.22, 0.19, 0.28, highSeg), mats.primaryMat, [0, 0.68, 0], shadows);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.19, 0.28, 0.34, highSeg), mats.primaryDarkMat, [0, 0.34, 0], shadows);
    addPart(bodyLod0, new THREE.BoxGeometry(0.14, 0.32, 0.032), mats.ivoryMat, [0, 0.35, 0.195], shadows, [-0.16, 0, 0]);
    // Giant Prayer Bead Collar (8 beads around chest)
    for (let b = 0; b < 8; b++) {
      const a = (b / 8) * Math.PI * 2;
      addPart(
        bodyLod0,
        new THREE.SphereGeometry(0.036, 8, 6),
        b % 2 === 0 ? mats.crystalMat : mats.goldMat,
        [Math.cos(a) * 0.19, 0.81 - Math.sin(a) * 0.04, Math.sin(a) * 0.17],
        shadows,
      );
    }
    addPart(cloakPivot, new THREE.BoxGeometry(0.3, 0.52, 0.022), mats.ivoryMat, [0, -0.26, 0], shadows);

    // RIGHT HAND: Shakkhara Temple Ring Staff
    const ringStaff = new THREE.Group();
    ringStaff.rotation.set(0.2, 0, -0.05);
    addPart(ringStaff, new THREE.CylinderGeometry(0.018, 0.02, 0.72, 8), mats.goldMat, [0, 0.14, 0], shadows);
    addPart(ringStaff, new THREE.TorusGeometry(0.095, 0.015, 8, 18), mats.goldMat, [0, 0.59, 0], shadows);
    [-1, 1].forEach((side) => {
      addPart(ringStaff, new THREE.TorusGeometry(0.032, 0.008, 6, 12), mats.crystalMat, [side * 0.092, 0.56, 0], false);
    });
    rightHand.add(ringStaff);

    // LEFT HAND: Floating Water Lotus Orb
    const lotusGroup = new THREE.Group();
    lotusGroup.position.set(0.02, 0.05, 0.05);
    addPart(lotusGroup, new THREE.SphereGeometry(0.068, 12, 10), mats.crystalMat, [0, 0.03, 0], false);
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      addPart(lotusGroup, new THREE.ConeGeometry(0.028, 0.07, 4), mats.ivoryMat, [Math.cos(a) * 0.055, 0, Math.sin(a) * 0.055], false, [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
    }
    leftHand.add(lotusGroup);

    // HEAD: Serene Sage + Layered Lotus Petal Crown
    addPart(headPivot, new THREE.SphereGeometry(0.128, highSeg, 10), mats.skinMat, [0, 0.125, 0.01], shadows);
    [-0.04, 0.04].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.017, 8, 6), mats.eyeGlowMat, [ex, 0.135, 0.125], false);
    });
    addPart(headPivot, new THREE.TorusGeometry(0.135, 0.022, 8, highSeg), mats.goldMat, [0, 0.21, 0], shadows, [Math.PI / 2, 0, 0]);
    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      addPart(
        headPivot,
        new THREE.ConeGeometry(0.042, 0.12, 4),
        p % 2 === 0 ? mats.primaryMat : mats.ivoryMat,
        [Math.cos(a) * 0.125, 0.27, Math.sin(a) * 0.125],
        shadows,
        [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45],
      );
    }
  }

  // =========================================================================
  // ARCHETYPE 8: GOLEM OBSIDIAN (Magma Core Titan)
  // =========================================================================
  else if (archetypeIndex === 8) {
    // Broad Faceted Obsidian Stone Torso + Glowing Magma Chest Core
    addPart(bodyLod0, new THREE.DodecahedronGeometry(0.245, 0), mats.undersuitMat, [0, 0.69, 0], shadows, [0, 0, 0], [1.14, 1.05, 0.96]);
    addPart(bodyLod0, new THREE.OctahedronGeometry(0.105, 0), mats.eyeGlowMat, [0, 0.7, 0.2], false);
    addPart(bodyLod0, new THREE.TorusGeometry(0.12, 0.02, 6, 12), mats.primaryMat, [0, 0.7, 0.19], shadows);
    [-1, 1].forEach((side) => {
      addPart(bodyLod0, new THREE.BoxGeometry(0.11, 0.18, 0.16), mats.undersuitMat, [side * 0.18, 0.41, 0], shadows, [0, 0, side * 0.2]);
    });
    // Back Magma Crystal Spires
    [-0.1, 0, 0.1].forEach((bx, idx) => {
      addPart(bodyLod0, new THREE.ConeGeometry(0.046, 0.24 + (idx === 1 ? 0.08 : 0), 5), mats.primaryMat, [bx, 0.85, -0.22], shadows, [-0.45, 0, -bx * 1.4]);
    });

    // RIGHT HAND: Massive Tectonic Magma Warhammer
    const hammerGroup = new THREE.Group();
    hammerGroup.rotation.set(0.35, 0, -0.1);
    addPart(hammerGroup, new THREE.CylinderGeometry(0.022, 0.024, 0.6, 8), mats.darkLeatherMat, [0, 0.18, 0], shadows);
    addPart(hammerGroup, new THREE.BoxGeometry(0.28, 0.16, 0.16), mats.undersuitMat, [0, 0.5, 0], shadows);
    addPart(hammerGroup, new THREE.BoxGeometry(0.3, 0.07, 0.07), mats.eyeGlowMat, [0, 0.5, 0], false);
    rightHand.add(hammerGroup);

    // LEFT HAND: Glowing Molten Crystal Shard
    addPart(leftHand, new THREE.OctahedronGeometry(0.085, 0), mats.crystalMat, [0, 0.04, 0.04], false);

    // HEAD: Jagged Horned Obsidian Monolith Helm
    addPart(headPivot, new THREE.DodecahedronGeometry(0.148, 0), mats.undersuitMat, [0, 0.135, 0], shadows);
    [-0.045, 0.045].forEach((ex) => {
      addPart(headPivot, new THREE.BoxGeometry(0.038, 0.022, 0.025), mats.eyeGlowMat, [ex, 0.145, 0.132], false);
    });
    [-1, 1].forEach((side) => {
      addPart(headPivot, new THREE.ConeGeometry(0.042, 0.19, 5), mats.primaryMat, [side * 0.13, 0.27, 0], shadows, [0.1, 0, -side * 0.42]);
    });
  }

  // =========================================================================
  // ARCHETYPE 9: ARCHON SIBER (Cyber Technomancer)
  // =========================================================================
  else if (archetypeIndex === 9) {
    // Sleek Angular Cyber Suit + Glowing Neon Chest Reactor
    addPart(bodyLod0, new THREE.CylinderGeometry(0.23, 0.18, 0.29, 8), mats.steelMat, [0, 0.69, 0], shadows, [0, 0, 0], [1.08, 1, 0.9]);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.07, 0.07, 0.03, 6), mats.eyeGlowMat, [0, 0.71, 0.2], false, [Math.PI / 2, 0, 0]);
    addPart(bodyLod0, new THREE.TorusGeometry(0.082, 0.012, 6, 12), mats.primaryMat, [0, 0.71, 0.205], false);
    // Mechanical Holo-Wing Thrusters on Back
    [-1, 1].forEach((side) => {
      addPart(cloakPivot, new THREE.BoxGeometry(0.24, 0.055, 0.02), mats.steelMat, [side * 0.19, 0.02, -0.02], shadows, [0, 0, side * 0.38]);
      addPart(cloakPivot, new THREE.BoxGeometry(0.22, 0.022, 0.014), mats.eyeGlowMat, [side * 0.21, -0.06, -0.02], false, [0, 0, side * 0.25]);
      addPart(cloakPivot, new THREE.BoxGeometry(0.18, 0.022, 0.014), mats.eyeGlowMat, [side * 0.19, -0.14, -0.02], false, [0, 0, side * 0.1]);
    });

    // RIGHT HAND: Glowing Plasma Energy Blade
    const plasmaGroup = new THREE.Group();
    plasmaGroup.rotation.set(0.36, 0, -0.08);
    addPart(plasmaGroup, new THREE.CylinderGeometry(0.02, 0.022, 0.16, 8), mats.undersuitMat, [0, 0, 0], shadows);
    addPart(plasmaGroup, new THREE.BoxGeometry(0.08, 0.032, 0.04), mats.steelMat, [0, 0.085, 0], shadows);
    addPart(plasmaGroup, new THREE.BoxGeometry(0.044, 0.46, 0.014), mats.eyeGlowMat, [0, 0.33, 0], false);
    addPart(plasmaGroup, new THREE.ConeGeometry(0.028, 0.1, 4), mats.crystalMat, [0, 0.61, 0], false, [0, Math.PI / 4, 0]);
    rightHand.add(plasmaGroup);

    // LEFT HAND: Hexagonal Hologram Shield
    const holoShield = new THREE.Group();
    holoShield.position.set(-0.05, 0.02, 0.05);
    holoShield.rotation.set(-0.1, -0.5, 0);
    addPart(holoShield, new THREE.CylinderGeometry(0.18, 0.18, 0.018, 6), mats.crystalMat, [0, 0, 0], false, [Math.PI / 2, 0, 0]);
    addPart(holoShield, new THREE.TorusGeometry(0.17, 0.015, 6, 6), mats.steelMat, [0, 0, 0.01], shadows);
    leftHand.add(holoShield);

    // HEAD: Sleek Cyber Helmet + Glowing Cyan Visor + Twin Antenna Fins
    addPart(headPivot, new THREE.SphereGeometry(0.138, highSeg, 10), mats.steelMat, [0, 0.135, 0], shadows, [0, 0, 0], [0.95, 1.06, 1.04]);
    addPart(headPivot, new THREE.CylinderGeometry(0.145, 0.145, 0.048, highSeg, 1, false, -0.85, 1.7), mats.eyeGlowMat, [0, 0.148, 0.01], false);
    [-1, 1].forEach((side) => {
      addPart(headPivot, new THREE.BoxGeometry(0.018, 0.15, 0.065), mats.primaryMat, [side * 0.145, 0.21, -0.02], shadows, [-0.25, 0, -side * 0.1]);
    });
  }

  // =========================================================================
  // ARCHETYPE 10: BAJAK LAUT AETHER (Sky Corsair Captain)
  // =========================================================================
  else if (archetypeIndex === 10) {
    // Captain's Coat + Gold Epaulettes + Crossed Cutlass Baldric
    addPart(bodyLod0, new THREE.CylinderGeometry(0.23, 0.19, 0.29, highSeg), mats.primaryMat, [0, 0.685, 0], shadows);
    addPart(bodyLod0, new THREE.BoxGeometry(0.12, 0.26, 0.036), mats.ivoryMat, [0, 0.68, 0.18], shadows);
    addPart(bodyLod0, new THREE.BoxGeometry(0.056, 0.34, 0.35), mats.darkLeatherMat, [0, 0.69, 0], shadows, [0, 0, -0.55]);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.21, 0.27, 0.26, highSeg, 1, false, 0.55, Math.PI * 1.65), mats.primaryDarkMat, [0, 0.36, -0.02], shadows);
    addPart(cloakPivot, new THREE.BoxGeometry(0.32, 0.52, 0.02), mats.primaryMat, [0, -0.26, 0], shadows);

    // RIGHT HAND: Curved Golden Sky-Cutlass
    const cutlass = new THREE.Group();
    cutlass.rotation.set(0.38, 0, -0.08);
    addPart(cutlass, new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), mats.darkLeatherMat, [0, 0, 0], shadows);
    addPart(cutlass, new THREE.TorusGeometry(0.048, 0.01, 6, 12, Math.PI), mats.goldMat, [0, 0.02, 0.035], shadows, [0, Math.PI / 2, 0]);
    const cutlassCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.08, 0),
      new THREE.Vector3(0, 0.28, 0.025),
      new THREE.Vector3(0, 0.48, 0.06),
    ]);
    addPart(cutlass, new THREE.TubeGeometry(cutlassCurve, 10, 0.022, 6, false), mats.steelMat, [0, 0, 0], shadows, [0, 0, 0], [0.45, 1, 1.4]);
    rightHand.add(cutlass);

    // LEFT HAND: Golden Sky-Compass Astrolabe Orb
    const compass = new THREE.Group();
    compass.position.set(0.02, 0.04, 0.05);
    addPart(compass, new THREE.CylinderGeometry(0.075, 0.075, 0.026, 14), mats.goldMat, [0, 0, 0], shadows, [Math.PI / 2.4, 0, 0]);
    addPart(compass, new THREE.SphereGeometry(0.042, 8, 8), mats.crystalMat, [0, 0.01, 0.015], false);
    leftHand.add(compass);

    // HEAD: Tricorn Pirate Captain Hat with Sweeping Feather Plume + Eyepatch Detail
    addPart(headPivot, new THREE.SphereGeometry(0.128, highSeg, 10), mats.skinMat, [0, 0.125, 0.012], shadows);
    addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [-0.042, 0.135, 0.126], false);
    addPart(headPivot, new THREE.BoxGeometry(0.046, 0.032, 0.02), mats.darkLeatherMat, [0.042, 0.135, 0.128], false);
    // Tricorn hat bowl + three upturned triangular brims + feather
    addPart(headPivot, new THREE.SphereGeometry(0.138, highSeg, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.darkLeatherMat, [0, 0.18, 0], shadows);
    addPart(headPivot, new THREE.CylinderGeometry(0.24, 0.25, 0.035, 3), mats.primaryDarkMat, [0, 0.21, 0.01], shadows, [-0.08, Math.PI, 0]);
    addPart(headPivot, new THREE.CylinderGeometry(0.255, 0.255, 0.014, 3), mats.goldMat, [0, 0.228, 0.01], false, [-0.08, Math.PI, 0]);
    addPart(headPivot, new THREE.SphereGeometry(0.045, 8, 6), mats.accentMat, [-0.14, 0.31, -0.04], false, [0.2, 0, 0.6], [0.55, 1.8, 0.65]);
  }

  // =========================================================================
  // ARCHETYPE 11: DRUID BULAN (Crescent Forest Guardian)
  // =========================================================================
  else if (archetypeIndex === 11) {
    // Sylvan Emerald ceremonial tunic + bark mantle + crescent sash
    addPart(bodyLod0, new THREE.CylinderGeometry(0.225, 0.19, 0.29, highSeg), mats.primaryMat, [0, 0.685, 0], shadows);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.185, 0.265, 0.34, highSeg), mats.primaryDarkMat, [0, 0.34, 0], shadows);
    addPart(bodyLod0, new THREE.TorusGeometry(0.215, 0.034, 8, highSeg), mats.leatherMat, [0, 0.82, 0], shadows, [Math.PI / 2, 0, 0]);
    addPart(bodyLod0, new THREE.OctahedronGeometry(0.052, 0), mats.crystalMat, [0, 0.72, 0.215], false);
    addPart(cloakPivot, new THREE.BoxGeometry(0.32, 0.56, 0.022), mats.primaryDarkMat, [0, -0.28, 0], shadows);

    // RIGHT HAND: Moonwood Firefly Lantern Staff
    const druidStaff = new THREE.Group();
    druidStaff.rotation.set(0.22, 0, -0.06);
    const woodCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.24, 0),
      new THREE.Vector3(-0.02, 0.15, 0),
      new THREE.Vector3(0.02, 0.48, 0.02),
      new THREE.Vector3(-0.04, 0.68, 0.05),
    ]);
    addPart(druidStaff, new THREE.TubeGeometry(woodCurve, 12, 0.022, 7, false), mats.leatherMat, [0, 0, 0], shadows);
    addPart(druidStaff, new THREE.TorusGeometry(0.08, 0.014, 6, 16, Math.PI * 1.45), mats.goldMat, [0, 0.68, 0.05], shadows, [0, 0, -0.6]);
    addPart(druidStaff, new THREE.SphereGeometry(0.048, 10, 8), mats.eyeGlowMat, [0, 0.65, 0.05], false);
    rightHand.add(druidStaff);

    // LEFT HAND: Glowing Moon Charm
    addPart(leftHand, new THREE.TorusGeometry(0.065, 0.015, 6, 16, Math.PI * 1.35), mats.crystalMat, [0, 0.05, 0.04], false, [0, 0, 0.6]);

    // HEAD: Hooded Sage + Grand Branching Antlers & Crescent Moon Crown
    addPart(headPivot, new THREE.SphereGeometry(0.126, highSeg, 10), mats.skinMat, [0, 0.125, 0.012], shadows);
    [-0.04, 0.04].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [ex, 0.135, 0.124], false);
    });
    addPart(headPivot, new THREE.SphereGeometry(0.146, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mats.primaryMat, [0, 0.145, -0.01], shadows, [-0.25, 0, 0]);
    addPart(headPivot, new THREE.TorusGeometry(0.085, 0.016, 6, 16, Math.PI * 1.35), mats.goldMat, [0, 0.34, 0.05], shadows, [0, 0, -Math.PI * 0.17]);
    [-1, 1].forEach((side) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.1, 0.21, 0),
        new THREE.Vector3(side * 0.2, 0.34, -0.02),
        new THREE.Vector3(side * 0.16, 0.45, -0.03),
      ]);
      addPart(headPivot, new THREE.TubeGeometry(curve, 10, 0.017, 6, false), mats.ivoryMat, [0, 0, 0], shadows);
    });
  }

  // =========================================================================
  // ARCHETYPE 12: RAJA FIRAUN (Sun Pharaoh Sovereign)
  // =========================================================================
  else if (archetypeIndex === 12) {
    // Royal Pleated Kilt + Broad Usekh Jeweled Collar Necklace
    addPart(bodyLod0, new THREE.CylinderGeometry(0.23, 0.185, 0.28, highSeg), mats.skinMat, [0, 0.69, 0], shadows);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.24, 0.2, 0.11, highSeg), mats.goldMat, [0, 0.79, 0], shadows);
    addPart(bodyLod0, new THREE.TorusGeometry(0.18, 0.024, 8, highSeg), mats.crystalMat, [0, 0.81, 0.01], false, [Math.PI / 2, 0, 0]);
    addPart(bodyLod0, new THREE.CylinderGeometry(0.19, 0.26, 0.32, highSeg), mats.ivoryMat, [0, 0.35, 0], shadows);
    addPart(bodyLod0, new THREE.BoxGeometry(0.14, 0.3, 0.03), mats.goldMat, [0, 0.36, 0.195], shadows, [-0.15, 0, 0]);
    addPart(cloakPivot, new THREE.BoxGeometry(0.28, 0.5, 0.02), mats.ivoryMat, [0, -0.25, 0], shadows);

    // RIGHT HAND: Golden Ankh Scepter
    const ankhGroup = new THREE.Group();
    ankhGroup.rotation.set(0.25, 0, -0.08);
    addPart(ankhGroup, new THREE.CylinderGeometry(0.018, 0.02, 0.56, 8), mats.goldMat, [0, 0.14, 0], shadows);
    addPart(ankhGroup, new THREE.BoxGeometry(0.16, 0.028, 0.028), mats.goldMat, [0, 0.42, 0], shadows);
    addPart(ankhGroup, new THREE.TorusGeometry(0.068, 0.018, 8, 16), mats.goldMat, [0, 0.51, 0], shadows);
    addPart(ankhGroup, new THREE.OctahedronGeometry(0.036, 0), mats.crystalMat, [0, 0.51, 0], false);
    rightHand.add(ankhGroup);

    // LEFT HAND: Royal Lapis Scarab Orb
    addPart(leftHand, new THREE.SphereGeometry(0.068, 10, 8), mats.crystalMat, [0, 0.04, 0.04], false);
    addPart(leftHand, new THREE.TorusGeometry(0.075, 0.014, 6, 14), mats.goldMat, [0, 0.04, 0.04], shadows, [Math.PI / 2, 0, 0]);

    // HEAD: Iconic Striped Gold & Lapis Nemes Pharaoh Headdress + Uraeus Cobra Crest
    addPart(headPivot, new THREE.SphereGeometry(0.126, highSeg, 10), mats.skinMat, [0, 0.125, 0.015], shadows);
    [-0.04, 0.04].forEach((ex) => {
      addPart(headPivot, new THREE.SphereGeometry(0.018, 8, 6), mats.eyeGlowMat, [ex, 0.135, 0.128], false);
    });
    // Nemes top crown + wide flared side lappets
    addPart(headPivot, new THREE.SphereGeometry(0.146, highSeg, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mats.goldMat, [0, 0.15, 0], shadows);
    addPart(headPivot, new THREE.BoxGeometry(0.32, 0.055, 0.14), mats.goldMat, [0, 0.19, -0.02], shadows);
    [-1, 1].forEach((side) => {
      addPart(headPivot, new THREE.BoxGeometry(0.078, 0.24, 0.1), mats.goldMat, [side * 0.145, 0.06, 0.01], shadows, [0, 0, -side * 0.14]);
      addPart(headPivot, new THREE.BoxGeometry(0.082, 0.032, 0.105), mats.crystalMat, [side * 0.148, 0.06, 0.01], false, [0, 0, -side * 0.14]);
    });
    // Golden Uraeus Cobra Emblem at Forehead
    addPart(headPivot, new THREE.CylinderGeometry(0.016, 0.022, 0.095, 8), mats.goldMat, [0, 0.255, 0.135], shadows, [0.22, 0, 0]);
    addPart(headPivot, new THREE.SphereGeometry(0.028, 8, 8), mats.crystalMat, [0, 0.295, 0.15], false);
  }

  // =========================================================================
  // ARCHETYPE 13: KAISAR NAGA ABADI (Mythic Cosmic Dragon Emperor)
  // =========================================================================
  else {
    // Imperial Violet & Gold Dragon-Scale Cuirass + Grand Spread Cosmic Wings
    addPart(bodyLod0, new THREE.CylinderGeometry(0.25, 0.19, 0.31, highSeg), mats.primaryMat, [0, 0.695, 0], shadows, [0, 0, 0], [1.1, 1, 0.94]);
    addPart(bodyLod0, new THREE.TorusGeometry(0.18, 0.036, 8, highSeg), mats.goldMat, [0, 0.84, 0], shadows, [Math.PI / 2, 0, 0]);
    addPart(bodyLod0, new THREE.OctahedronGeometry(0.065, 0), mats.crystalMat, [0, 0.72, 0.225], false);
    addPart(bodyLod0, new THREE.BoxGeometry(0.16, 0.29, 0.032), mats.primaryDarkMat, [0, 0.36, 0.19], shadows, [-0.15, 0, 0]);
    addPart(bodyLod0, new THREE.BoxGeometry(0.166, 0.032, 0.036), mats.goldMat, [0, 0.23, 0.21], false, [-0.15, 0, 0]);
    // Grand Cosmic Dragon Wings on cloakPivot
    [-1, 1].forEach((side) => {
      addPart(cloakPivot, new THREE.BoxGeometry(0.32, 0.045, 0.026), mats.goldMat, [side * 0.24, 0.08, -0.02], shadows, [0, side * 0.25, side * 0.52]);
      addPart(cloakPivot, new THREE.BoxGeometry(0.28, 0.22, 0.016), mats.primaryMat, [side * 0.24, -0.05, -0.03], shadows, [0, side * 0.25, side * 0.35]);
      addPart(cloakPivot, new THREE.ConeGeometry(0.03, 0.16, 4), mats.goldMat, [side * 0.42, 0.18, -0.05], false, [0, 0, -side * 0.7]);
    });
    // Floating Imperial Golden Halo Ring behind shoulders
    addPart(bodyLod0, new THREE.TorusGeometry(0.34, 0.018, 8, 28), mats.goldMat, [0, 1.04, -0.14], false);

    // RIGHT HAND: Imperial Dragon Halberd Spear
    const halberd = new THREE.Group();
    halberd.rotation.set(0.22, 0, -0.06);
    addPart(halberd, new THREE.CylinderGeometry(0.019, 0.021, 0.82, 8), mats.darkLeatherMat, [0, 0.16, 0], shadows);
    addPart(halberd, new THREE.BoxGeometry(0.18, 0.032, 0.036), mats.goldMat, [0, 0.52, 0], shadows);
    addPart(halberd, new THREE.ConeGeometry(0.048, 0.21, 4), mats.goldMat, [0, 0.65, 0], shadows, [0, Math.PI / 4, 0], [1.1, 1, 0.45]);
    addPart(halberd, new THREE.BoxGeometry(0.11, 0.12, 0.016), mats.crystalMat, [0.06, 0.58, 0], false);
    rightHand.add(halberd);

    // LEFT HAND: Orbiting Cosmic Dragon Pearl
    const pearl = new THREE.Group();
    pearl.position.set(0.02, 0.05, 0.05);
    addPart(pearl, new THREE.SphereGeometry(0.068, 12, 10), mats.crystalMat, [0, 0, 0], false);
    addPart(pearl, new THREE.TorusGeometry(0.095, 0.012, 6, 16), mats.goldMat, [0, 0, 0], false, [0.8, 0.4, 0]);
    leftHand.add(pearl);

    // HEAD: Mythic Dragon Crown Helm + Sweeping Gold Dragon Horns
    addPart(headPivot, new THREE.SphereGeometry(0.14, highSeg, 10), mats.goldMat, [0, 0.135, 0], shadows);
    addPart(headPivot, new THREE.CylinderGeometry(0.145, 0.13, 0.09, highSeg, 1, false, -0.9, 1.8), mats.primaryDarkMat, [0, 0.11, 0.02], shadows);
    [-0.044, 0.044].forEach((ex) => {
      addPart(headPivot, new THREE.BoxGeometry(0.036, 0.018, 0.024), mats.eyeGlowMat, [ex, 0.15, 0.142], false);
    });
    for (let s = -2; s <= 2; s++) {
      addPart(headPivot, new THREE.ConeGeometry(0.024, 0.11, 4), mats.goldMat, [s * 0.042, 0.285, 0.08], shadows, [0.15, 0, -s * 0.18]);
    }
    [-1, 1].forEach((side) => {
      const horn = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.11, 0.21, 0.01),
        new THREE.Vector3(side * 0.21, 0.34, -0.05),
        new THREE.Vector3(side * 0.24, 0.48, -0.01),
      ]);
      addPart(headPivot, new THREE.TubeGeometry(horn, 10, 0.02, 6, false), mats.goldMat, [0, 0, 0], shadows);
    });
  }
}

/**
 * Builds a Detailed, Richly Painted Fantasy Hero Figurine Pawn with:
 * - Sculpted multi-stepped plinth + team color ring
 * - Articulated legs & boots (`leftLegPivot`, `rightLegPivot`)
 * - Animated flowing cloak (`cloakPivot`)
 * - Layered high-contrast armor/robe/leather/trim paint zones & ornamental filigree
 * - Distinct archetype weapons, shields, quivers, spellbooks, backpacks & headgear
 * - Smooth floating/swaying idle animation and full AnimationMixer rig
 */
export function buildDetailedHeroPawn(
  colorHex: string,
  accentHex: string,
  archetypeIndex: number,
  quality: QualityConfig,
  deps: PawnBuildDeps,
): PawnModelHandle {
  const shadows = quality.shadowsEnabled;
  const bevel = quality.tier !== 'potato';
  const seg = quality.tier === 'potato' ? 10 : quality.tier === 'low' ? 12 : 16;

  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  bodyPivot.name = 'bodyPivot';
  group.add(bodyPivot);

  const mats = buildPawnMaterials(colorHex, accentHex, archetypeIndex, quality, deps);

  // Soft Grounded Contact Shadow
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.18, 1.18),
    new THREE.MeshBasicMaterial({
      map: deps.contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.015;
  group.add(shadowPlane);

  // Active-Turn Gilded Floor Halo
  const activeHalo = new THREE.Mesh(
    new THREE.RingGeometry(0.47, 0.59, 28),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),
  );
  activeHalo.rotation.x = -Math.PI / 2;
  activeHalo.position.y = 0.025;
  activeHalo.visible = false;
  group.add(activeHalo);

  // Admin-Only Designated Winner Golden Aura (hidden unless Admin Winner Override targets this player)
  const adminWinnerAura = new THREE.Group();
  adminWinnerAura.visible = false;

  const auraDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.78, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  auraDisc.rotation.x = -Math.PI / 2;
  auraDisc.position.y = 0.032;
  adminWinnerAura.add(auraDisc);

  const auraColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.62, 1.5, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  auraColumn.position.y = 0.78;
  adminWinnerAura.add(auraColumn);

  const auraRingMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.9,
  });
  const auraOrbitGroup = new THREE.Group();
  const auraTorus = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.024, 8, 36), auraRingMat);
  auraTorus.rotation.x = Math.PI / 2;
  auraTorus.position.y = 0.05;
  auraOrbitGroup.add(auraTorus);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const mote = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), auraRingMat);
    mote.position.set(Math.cos(angle) * 0.64, 0.24 + (i % 2) * 0.16, Math.sin(angle) * 0.64);
    auraOrbitGroup.add(mote);
  }
  adminWinnerAura.add(auraOrbitGroup);
  adminWinnerAura.userData.orbitGroup = auraOrbitGroup;
  group.add(adminWinnerAura);

  // 1. Stepped Carved Stone + Team Color + Gold Plinth Base
  buildSculptedPedestal(bodyPivot, mats, seg, shadows);

  // 2. Articulated Legs & Boots
  const leftLegPivot = buildArticulatedLeg('leftLegPivot', -1, archetypeIndex, mats, seg, shadows);
  const rightLegPivot = buildArticulatedLeg('rightLegPivot', 1, archetypeIndex, mats, seg, shadows);
  bodyPivot.add(leftLegPivot);
  bodyPivot.add(rightLegPivot);

  // 3. Sculpted Torso, Belt, Cloak & Gear inside LOD
  const bodyLod = new THREE.LOD();
  const bodyLod0 = new THREE.Group();
  bodyLod0.userData.baseLodDist = 0;

  // Articulated Arms & Hand Anchors
  const leftArm = buildArmSkeleton('leftArmPivot', -1, archetypeIndex, mats, seg, shadows);
  const rightArm = buildArmSkeleton('rightArmPivot', 1, archetypeIndex, mats, seg, shadows);
  bodyPivot.add(leftArm.pivot);
  bodyPivot.add(rightArm.pivot);

  // Head Pivot
  const headPivot = new THREE.Group();
  headPivot.name = 'headPivot';
  headPivot.position.set(0, 0.86, 0);
  bodyPivot.add(headPivot);

  // Animated Flowing Cloak Pivot
  const cloakPivot = new THREE.Group();
  cloakPivot.name = 'cloakPivot';
  cloakPivot.position.set(0, 0.81, -0.2);
  cloakPivot.rotation.x = 0.22;
  bodyPivot.add(cloakPivot);

  // Build rich archetype-specific body, cloak, weapons, and sculpted head/helm
  buildArchetypeGearAndHead(
    bodyLod0,
    headPivot,
    cloakPivot,
    leftArm.handAnchor,
    rightArm.handAnchor,
    archetypeIndex,
    mats,
    seg,
    shadows,
    bevel,
  );

  // Simplified LOD1 torso silhouette only used at extreme far overview (>28m)
  const bodyLod1 = new THREE.Group();
  bodyLod1.userData.baseLodDist = 28;
  addPart(
    bodyLod1,
    new THREE.CylinderGeometry(0.22, 0.25, 0.62, 8),
    mats.primaryMat,
    [0, 0.5, 0],
    shadows,
  );
  addPart(
    bodyLod1,
    new THREE.CylinderGeometry(0.24, 0.24, 0.08, 8),
    mats.goldMat,
    [0, 0.52, 0],
    false,
  );

  bodyLod.addLevel(bodyLod0, 0);
  bodyLod.addLevel(bodyLod1, 28 * quality.lodBias);
  bodyPivot.add(bodyLod);

  // 4. Floating Archetype Crest Crystal (positioned cleanly above all hats/plumes!)
  let crestGeo: THREE.BufferGeometry;
  let crestBaseY = 1.44;
  if (archetypeIndex === 0) {
    crestGeo = new THREE.OctahedronGeometry(0.115, 0);
    crestBaseY = 1.44;
  } else if (archetypeIndex === 1) {
    crestGeo = new THREE.OctahedronGeometry(0.12, 0);
    crestBaseY = 1.52;
  } else if (archetypeIndex === 2 || archetypeIndex === 11) {
    crestGeo = new THREE.DodecahedronGeometry(0.11, 0);
    crestBaseY = 1.48;
  } else if (archetypeIndex === 4 || archetypeIndex === 13) {
    crestGeo = new THREE.OctahedronGeometry(0.125, 0);
    crestBaseY = 1.56;
  } else {
    crestGeo = new THREE.IcosahedronGeometry(0.11, 0);
    crestBaseY = 1.48;
  }
  ensureUv2(crestGeo);

  const crestMesh = new THREE.Mesh(crestGeo, mats.crystalMat);
  crestMesh.position.y = crestBaseY;
  crestMesh.userData.baseY = crestBaseY;
  crestMesh.castShadow = shadows;
  bodyPivot.add(crestMesh);

  // 5. Arcane Shield Bubble Ring
  const shieldRingMat = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x2563eb,
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.82,
  });
  const shieldRing = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.03, 10, 28), shieldRingMat);
  shieldRing.rotation.x = Math.PI / 2.2;
  shieldRing.position.y = 0.66;
  shieldRing.visible = false;
  bodyPivot.add(shieldRing);

  // 6. Floating 3D Username Label Sprite above the hero pawn
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 320;
  labelCanvas.height = 76;
  const labelCtx = labelCanvas.getContext('2d');
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.minFilter = THREE.LinearFilter;
  labelTexture.magFilter = THREE.LinearFilter;

  const labelMat = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const nameSprite = new THREE.Sprite(labelMat);
  nameSprite.position.set(0, crestBaseY + 0.56, 0);
  nameSprite.scale.set(1.75, 0.42, 1);
  nameSprite.renderOrder = 18;
  group.add(nameSprite);

  let lastLabelKey = '';
  const setNameLabel = (rawName: string, borderHex = accentHex, isActiveTurn = false) => {
    const clean = (rawName || 'Pemain').trim().slice(0, 16) || 'Pemain';
    const key = `${clean}|${borderHex}|${isActiveTurn ? '1' : '0'}`;
    if (key === lastLabelKey || !labelCtx) return;
    lastLabelKey = key;

    const w = labelCanvas.width;
    const h = labelCanvas.height;
    labelCtx.clearRect(0, 0, w, h);

    // Measure text to size the pill tightly around the username
    labelCtx.font = '700 28px "Inter", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    const textWidth = Math.min(256, Math.ceil(labelCtx.measureText(clean).width));
    const pillW = Math.max(118, textWidth + 46);
    const pillH = 52;
    const x = (w - pillW) / 2;
    const y = (h - pillH) / 2;
    const r = 14;

    const drawRoundedRect = (
      ctx: CanvasRenderingContext2D,
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      radius: number,
    ) => {
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
    };

    // Subtle outer glow when active turn
    if (isActiveTurn) {
      labelCtx.save();
      labelCtx.shadowColor = '#fbbf24';
      labelCtx.shadowBlur = 12;
      drawRoundedRect(labelCtx, x, y, pillW, pillH, r);
      labelCtx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      labelCtx.fill();
      labelCtx.restore();
    } else {
      drawRoundedRect(labelCtx, x, y, pillW, pillH, r);
      labelCtx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      labelCtx.fill();
    }

    // Top sheen
    const grad = labelCtx.createLinearGradient(0, y, 0, y + pillH);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    drawRoundedRect(labelCtx, x, y, pillW, pillH, r);
    labelCtx.fillStyle = grad;
    labelCtx.fill();

    // Accent border
    drawRoundedRect(labelCtx, x + 1.5, y + 1.5, pillW - 3, pillH - 3, r - 1);
    labelCtx.lineWidth = isActiveTurn ? 3.5 : 2.5;
    labelCtx.strokeStyle = isActiveTurn ? '#fbbf24' : borderHex;
    labelCtx.stroke();

    // Player color dot on the left
    labelCtx.beginPath();
    labelCtx.arc(x + 20, h / 2, 6, 0, Math.PI * 2);
    labelCtx.fillStyle = isActiveTurn ? '#fde047' : borderHex;
    labelCtx.fill();

    // Crisp username text
    labelCtx.font = '700 26px "Inter", "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';
    labelCtx.textAlign = 'center';
    labelCtx.textBaseline = 'middle';
    labelCtx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    labelCtx.fillText(clean, w / 2 + 8, h / 2 + 2.5, pillW - 44);
    labelCtx.fillStyle = isActiveTurn ? '#fef08a' : '#f8fafc';
    labelCtx.fillText(clean, w / 2 + 8, h / 2 + 0.5, pillW - 44);

    labelTexture.needsUpdate = true;
  };
  setNameLabel('Pemain', accentHex, false);

  // 7. AnimationMixer Setup
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
    leftArmPivot: leftArm.pivot,
    rightArmPivot: rightArm.pivot,
    shieldRing,
    activeHalo,
    adminWinnerAura,
    crestMesh,
    nameSprite,
    setNameLabel,
    mixer,
    actions,
    playClip,
  };
}
