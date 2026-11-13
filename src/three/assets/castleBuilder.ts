import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PbrTextureSet } from './pbrTextures';
import { ensureUv2 } from './rockTerrainBuilder';

/**
 * Pure geometry builder for the Fantasy Citadel (safe to bake into fantasy_castle.glb in Node!).
 * Groups meshes cleanly by material role:
 * - 'castle_stone' : ashlar curtain walls, gatehouse arch, battered keep base, battlements, buttresses
 * - 'castle_slate' : steep pitched shingled roofs, conical turret caps, dormers
 * - 'castle_timber': half-timbered upper gallery & studded oak portcullis gate
 * - 'castle_gold'  : weathered bronze spires, finials, turret trim rings
 * - 'castle_glow'  : recessed Gothic lancet windows & gatehouse sconces
 */
export function buildFantasyCastleGeometryGroup(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'fantasy_castle_root';

  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
  const slateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.56 });
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.86 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.85 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
  });

  const stoneGeos: THREE.BufferGeometry[] = [];
  const slateGeos: THREE.BufferGeometry[] = [];
  const timberGeos: THREE.BufferGeometry[] = [];
  const goldGeos: THREE.BufferGeometry[] = [];
  const glowGeos: THREE.BufferGeometry[] = [];

  const pushBox = (
    list: THREE.BufferGeometry[],
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    ry = 0,
  ) => {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ry !== 0) g.rotateY(ry);
    g.translate(x, y, z);
    ensureUv2(g);
    list.push(g);
  };

  const pushCyl = (
    list: THREE.BufferGeometry[],
    rt: number,
    rb: number,
    h: number,
    segs: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const g = new THREE.CylinderGeometry(rt, rb, h, segs);
    g.translate(x, y, z);
    ensureUv2(g);
    list.push(g);
  };

  const pushCone = (
    list: THREE.BufferGeometry[],
    r: number,
    h: number,
    segs: number,
    x: number,
    y: number,
    z: number,
  ) => {
    const g = new THREE.ConeGeometry(r, h, segs);
    g.translate(x, y, z);
    ensureUv2(g);
    list.push(g);
  };

  // 1. Stone Foundation Terrace + Battered Keep Plinth
  pushCyl(stoneGeos, 4.9, 5.5, 1.35, 10, 0, 0.675, 0);
  pushBox(stoneGeos, 5.2, 1.2, 4.2, 0, 1.8, -0.35);

  // 2. Central Citadel Keep (Lower Stone + Corbeled Cornice)
  pushBox(stoneGeos, 3.6, 3.4, 3.1, 0, 3.9, -0.45);
  pushBox(stoneGeos, 3.9, 0.35, 3.4, 0, 5.65, -0.45);

  // Corner Stone Buttresses on Keep
  [
    [-1.78, -1.98],
    [1.78, -1.98],
    [-1.78, 1.08],
    [1.78, 1.08],
  ].forEach(([bx, bz]) => {
    pushBox(stoneGeos, 0.56, 5.1, 0.56, bx, 3.3, bz);
  });

  // 3. Half-Timbered Upper Keep Gallery (authentic Tudor/Fantasy upper story)
  pushBox(timberGeos, 3.45, 1.45, 2.95, 0, 6.45, -0.45);
  // Exposed timber framing ribs
  for (let i = -1; i <= 1; i++) {
    pushBox(timberGeos, 0.16, 1.5, 3.08, i * 1.15, 6.45, -0.45);
  }
  pushBox(timberGeos, 3.6, 0.16, 3.08, 0, 7.12, -0.45);

  // Steep Pitched Slate Roof on Main Keep + Gable Dormers
  const roofGeo = new THREE.ConeGeometry(2.85, 2.65, 4);
  roofGeo.rotateY(Math.PI / 4);
  roofGeo.scale(1.08, 1, 0.94);
  roofGeo.translate(0, 8.48, -0.45);
  ensureUv2(roofGeo);
  slateGeos.push(roofGeo);

  // Front Gothic Gable / Bellcote on Keep Roof
  pushBox(stoneGeos, 0.95, 1.2, 0.9, 0, 7.35, 0.95);
  pushCone(slateGeos, 0.72, 1.1, 4, 0, 8.45, 0.95);
  pushCyl(goldGeos, 0.04, 0.08, 0.7, 8, 0, 9.85, -0.45);
  pushCyl(goldGeos, 0.03, 0.06, 0.45, 8, 0, 9.15, 0.95);

  // 4. Four Multi-Tier Corner Turrets with Machicolations & Conical Slate Caps
  const turrets: Array<[number, number, number, number]> = [
    [-2.75, 1.35, 0.88, 5.4],
    [2.75, 1.35, 0.88, 5.4],
    [-2.95, -2.05, 0.98, 6.4],
    [2.95, -2.05, 0.98, 6.4],
  ];

  for (const [tx, tz, rad, height] of turrets) {
    // Battered stone base + shaft
    pushCyl(stoneGeos, rad * 0.95, rad * 1.18, 1.25, 16, tx, 1.5, tz);
    pushCyl(stoneGeos, rad * 0.86, rad * 0.95, height, 16, tx, 1.5 + height * 0.5, tz);
    // Corbeled overhanging parapet ring
    const topY = 1.5 + height;
    pushCyl(stoneGeos, rad * 1.08, rad * 0.9, 0.46, 16, tx, topY + 0.12, tz);
    // 8 Crenellations around turret crown
    for (let c = 0; c < 8; c++) {
      const a = (c / 8) * Math.PI * 2;
      pushBox(
        stoneGeos,
        0.26,
        0.34,
        0.24,
        tx + Math.cos(a) * rad * 0.96,
        topY + 0.5,
        tz + Math.sin(a) * rad * 0.96,
        -a,
      );
    }
    // Conical Slate Roof + Bronze Finial
    pushCone(slateGeos, rad * 1.22, 2.4, 16, tx, topY + 1.55, tz);
    const ring = new THREE.TorusGeometry(rad * 1.02, 0.055, 8, 24);
    ring.rotateX(Math.PI / 2);
    ring.translate(tx, topY + 0.34, tz);
    ensureUv2(ring);
    goldGeos.push(ring);
    pushCyl(goldGeos, 0.025, 0.06, 0.65, 8, tx, topY + 2.95, tz);

    // Narrow recessed arrow-slit windows on turret upper half
    for (const wy of [topY - 0.85, topY - 2.15]) {
      pushBox(glowGeos, 0.16, 0.42, 0.18, tx, wy, tz + rad * 0.84);
    }
  }

  // 5. Curtain Walls + Battlements + Arched Gatehouse
  // Left & Right curtain walls connecting front & rear turrets
  pushBox(stoneGeos, 0.65, 2.75, 3.4, -2.85, 2.55, -0.35);
  pushBox(stoneGeos, 0.65, 2.75, 3.4, 2.85, 2.55, -0.35);
  // Front curtain ramparts flanking gatehouse
  pushBox(stoneGeos, 1.4, 2.65, 0.72, -1.55, 2.5, 1.45);
  pushBox(stoneGeos, 1.4, 2.65, 0.72, 1.55, 2.5, 1.45);

  // Battlement Merlons along front wall
  for (let m = -2.1; m <= 2.1; m += 0.6) {
    if (Math.abs(m) < 0.55) continue;
    pushBox(stoneGeos, 0.32, 0.42, 0.32, m, 4.05, 1.45);
  }

  // Gatehouse Arched Buttresses + Portcullis Oak Gate
  pushBox(stoneGeos, 0.48, 2.6, 0.92, -0.82, 2.45, 1.55);
  pushBox(stoneGeos, 0.48, 2.6, 0.92, 0.82, 2.45, 1.55);
  pushBox(stoneGeos, 2.15, 0.7, 0.95, 0, 3.9, 1.55);
  // Gatehouse twin corner bartizans
  pushCone(slateGeos, 0.45, 1.05, 8, -0.85, 4.7, 1.62);
  pushCone(slateGeos, 0.45, 1.05, 8, 0.85, 4.7, 1.62);
  // Oak gate & warm doorway glow
  pushBox(timberGeos, 1.15, 1.9, 0.25, 0, 2.1, 1.46);
  pushBox(glowGeos, 0.45, 0.95, 0.16, 0, 2.1, 1.56);

  // 6. Keep Lancet Windows (Warm glowing hearth interiors)
  for (const wx of [-0.95, 0, 0.95]) {
    pushBox(glowGeos, 0.28, 0.72, 0.16, wx, 4.45, 1.06);
    pushBox(glowGeos, 0.28, 0.62, 0.16, wx, 6.45, 1.0);
  }

  const finalize = (
    geos: THREE.BufferGeometry[],
    name: string,
    mat: THREE.Material,
    castShadow: boolean,
  ) => {
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    ensureUv2(merged);
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = name;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);
  };

  finalize(stoneGeos, 'castle_stone', stoneMat, true);
  finalize(slateGeos, 'castle_slate', slateMat, true);
  finalize(timberGeos, 'castle_timber', timberMat, true);
  finalize(goldGeos, 'castle_gold', goldMat, true);
  finalize(glowGeos, 'castle_glow', glowMat, false);

  return root;
}

/**
 * Applies full PBR texture sets onto a loaded or procedural castle group.
 */
export function applyCastlePbrMaterials(
  castleGroup: THREE.Object3D,
  textures: {
    stonePbr: PbrTextureSet;
    slatePbr: PbrTextureSet;
    timberPbr: PbrTextureSet;
  },
): void {
  const stoneMat = new THREE.MeshStandardMaterial({
    map: textures.stonePbr.map,
    normalMap: textures.stonePbr.normalMap,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughnessMap: textures.stonePbr.roughnessMap,
    aoMap: textures.stonePbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0xcbd5e1,
    roughness: 0.84,
    metalness: 0.05,
  });

  const slateMat = new THREE.MeshStandardMaterial({
    map: textures.slatePbr.map,
    normalMap: textures.slatePbr.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: textures.slatePbr.roughnessMap,
    aoMap: textures.slatePbr.aoMap,
    aoMapIntensity: 0.8,
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.14,
  });

  const timberMat = new THREE.MeshStandardMaterial({
    map: textures.timberPbr.map,
    normalMap: textures.timberPbr.normalMap,
    normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: textures.timberPbr.roughnessMap,
    aoMap: textures.timberPbr.aoMap,
    aoMapIntensity: 0.85,
    roughness: 0.85,
    metalness: 0.05,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.88,
  });

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.35,
    roughness: 0.2,
  });

  castleGroup.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    ensureUv2(mesh.geometry);
    if (mesh.name.includes('castle_stone')) {
      mesh.material = stoneMat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else if (mesh.name.includes('castle_slate')) {
      mesh.material = slateMat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else if (mesh.name.includes('castle_timber')) {
      mesh.material = timberMat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    } else if (mesh.name.includes('castle_gold')) {
      mesh.material = goldMat;
      mesh.castShadow = true;
    } else if (mesh.name.includes('castle_glow')) {
      mesh.material = glowMat;
      mesh.castShadow = false;
    }
  });
}
