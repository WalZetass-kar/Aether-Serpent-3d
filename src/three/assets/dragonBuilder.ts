import * as THREE from 'three';
import {
  createDragonEyeTexture,
  createOrientalDragonPbrMaps,
  disposePbrTextureSet,
  type PbrTextureSet,
} from './pbrTextures';
import { ensureUv2 } from './rockTerrainBuilder';

export interface DragonHandle {
  root: THREE.Group;
  headFocusTarget: THREE.Vector3;
  update: (elapsed: number, dt: number) => void;
  dispose: () => void;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _upWorld = new THREE.Vector3(0, 1, 0);

interface DragonSpineFrames {
  points: THREE.Vector3[];
  tangents: THREE.Vector3[];
  sides: THREE.Vector3[];
  dorsals: THREE.Vector3[];
}

/**
 * Computes a twist-free Parallel Transport (Bishop) orthonormal frame sequence along the dragon spine:
 * - Right-handed basis: (side = X, dorsal = Y, T = Z) with side x dorsal = +T.
 * - Resting ground coils (t < 0.55) keep dorsal aligned near +Y so belly scutes sit flush on stone.
 * - Because the spine enters the rising chest moving forward (+Z), Parallel Transport naturally places
 *   dorsal (-Z) along the back and ventral belly scutes (+Z) facing proudly forward with zero twist crease.
 * - Any residual roll at t = 1 is smoothly distributed over the upper neck so the skull is strictly level.
 */
function computeDragonSpineFrames(
  curve: THREE.CatmullRomCurve3,
  segments: number,
): DragonSpineFrames {
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  const sides: THREE.Vector3[] = [];
  const dorsals: THREE.Vector3[] = [];

  const qStep = new THREE.Quaternion();
  const tmpSide = new THREE.Vector3();
  const tmpDorsal = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(curve.getPointAt(t));
    tangents.push(curve.getTangentAt(t).normalize());
  }

  // Initial frame at tail tip (resting horizontally on stone pedestal, dorsal = +Y)
  tmpSide.crossVectors(_upWorld, tangents[0]);
  if (tmpSide.lengthSq() < 1e-4) tmpSide.set(1, 0, 0);
  tmpSide.normalize();
  tmpDorsal.crossVectors(tangents[0], tmpSide).normalize();
  sides.push(tmpSide.clone());
  dorsals.push(tmpDorsal.clone());

  // Parallel transport along spline
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const prevT = tangents[i - 1];
    const currT = tangents[i];

    qStep.setFromUnitVectors(prevT, currT);
    tmpDorsal.copy(dorsals[i - 1]).applyQuaternion(qStep);
    tmpDorsal.addScaledVector(currT, -tmpDorsal.dot(currT)).normalize();

    if (t < 0.5 && Math.abs(currT.y) < 0.4) {
      const upProj = _upWorld.clone().addScaledVector(currT, -_upWorld.dot(currT));
      if (upProj.lengthSq() > 0.05) {
        upProj.normalize();
        tmpDorsal.lerp(upProj, (1 - t / 0.5) * 0.25).normalize();
      }
    }

    tmpSide.crossVectors(tmpDorsal, currT).normalize();
    tmpDorsal.crossVectors(currT, tmpSide).normalize();

    sides.push(tmpSide.clone());
    dorsals.push(tmpDorsal.clone());
  }

  // Smoothly align final head socket roll to world +Y
  const lastT = tangents[segments];
  const lastDorsal = dorsals[segments];
  const lastSide = sides[segments];
  const desiredUp = _upWorld.clone().addScaledVector(lastT, -_upWorld.dot(lastT));
  if (desiredUp.lengthSq() > 1e-4) {
    desiredUp.normalize();
    const angleErr = Math.atan2(desiredUp.dot(lastSide), desiredUp.dot(lastDorsal));
    if (Math.abs(angleErr) > 1e-4) {
      const qRoll = new THREE.Quaternion();
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const u = THREE.MathUtils.smoothstep(t, 0.48, 1.0);
        if (u > 0) {
          qRoll.setFromAxisAngle(tangents[i], -angleErr * u);
          dorsals[i].applyQuaternion(qRoll).normalize();
          sides[i].crossVectors(dorsals[i], tangents[i]).normalize();
          dorsals[i].crossVectors(tangents[i], sides[i]).normalize();
        }
      }
    }
  }

  return { points, tangents, sides, dorsals };
}

function sampleFrameAt(frames: DragonSpineFrames, t: number) {
  const maxIdx = frames.points.length - 1;
  const fIdx = THREE.MathUtils.clamp(t, 0, 1) * maxIdx;
  const i0 = Math.min(maxIdx, Math.floor(fIdx));
  const i1 = Math.min(maxIdx, i0 + 1);
  const alpha = fIdx - i0;

  const P = new THREE.Vector3().lerpVectors(frames.points[i0], frames.points[i1], alpha);
  const T = new THREE.Vector3().lerpVectors(frames.tangents[i0], frames.tangents[i1], alpha).normalize();
  const dorsal = new THREE.Vector3().lerpVectors(frames.dorsals[i0], frames.dorsals[i1], alpha);
  dorsal.addScaledVector(T, -dorsal.dot(T)).normalize();
  const side = new THREE.Vector3().crossVectors(dorsal, T).normalize();
  return { P, T, side, dorsal };
}

/**
 * Generates an organic tapered mesh along a CatmullRomCurve3.
 * When `scaleOnlyUv` is true, V UVs ping-pong strictly within [0.28..0.72] (emerald scale band,
 * zero belly-scute striping, zero UV seam!).
 */
function createTaperedBranchGeo(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  radiusAt: (t: number) => number,
  uvRepeatU = 1,
  scaleOnlyUv = false,
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
    const r = radiusAt(t);

    for (let j = 0; j <= radialSegments; j++) {
      const vFrac = j / radialSegments;
      const a = vFrac * Math.PI * 2;
      const cos = -Math.cos(a);
      const sin = Math.sin(a);
      norm
        .set(
          cos * N.x + sin * B.x,
          cos * N.y + sin * B.y,
          cos * N.z + sin * B.z,
        )
        .normalize();

      const idx = i * (radialSegments + 1) + j;
      positions[idx * 3] = P.x + r * norm.x;
      positions[idx * 3 + 1] = P.y + r * norm.y;
      positions[idx * 3 + 2] = P.z + r * norm.z;
      normals[idx * 3] = norm.x;
      normals[idx * 3 + 1] = norm.y;
      normals[idx * 3 + 2] = norm.z;
      uvs[idx * 2] = t * uvRepeatU;
      uvs[idx * 2 + 1] = scaleOnlyUv
        ? 0.28 + 0.44 * (1 - Math.abs(vFrac * 2 - 1))
        : vFrac;
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
 * Computes anatomical cross-section radius of the Oriental Dragon at spine parameter t in [0..1].
 */
function dragonSpineRadiusAt(t: number): number {
  if (t < 0.04) {
    return THREE.MathUtils.lerp(0.022, 0.11, Math.pow(t / 0.04, 0.72));
  }
  if (t < 0.24) {
    return THREE.MathUtils.lerp(0.11, 0.28, (t - 0.04) / 0.2);
  }
  if (t < 0.56) {
    return THREE.MathUtils.lerp(0.28, 0.36, (t - 0.24) / 0.32);
  }
  if (t < 0.76) {
    const u = (t - 0.56) / 0.2;
    return THREE.MathUtils.lerp(0.36, 0.4, u) + Math.sin(u * Math.PI) * 0.075;
  }
  const u = (t - 0.76) / 0.24;
  return THREE.MathUtils.lerp(0.4, 0.255, Math.pow(u, 0.85));
}

/**
 * Builds the watertight 24-bone SkinnedMesh Oriental Dragon body using twist-free Parallel Transport frames.
 */
function buildSkinnedDragonBody(
  frames: DragonSpineFrames,
  boneTs: number[],
  radialSegments = 26,
): THREE.BufferGeometry {
  const tubularSegments = frames.points.length - 1;
  const vertexCount = (tubularSegments + 1) * (radialSegments + 1);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  const indices: number[] = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    const P = frames.points[i];
    const sideAxis = frames.sides[i];
    const dorsalAxis = frames.dorsals[i];
    const baseRadius = dragonSpineRadiusAt(t);

    let b0 = 0;
    let b1 = 0;
    let w0 = 1;
    let w1 = 0;
    for (let k = 0; k < boneTs.length - 1; k++) {
      if (t >= boneTs[k] && t <= boneTs[k + 1]) {
        b0 = k;
        b1 = k + 1;
        const span = Math.max(1e-5, boneTs[k + 1] - boneTs[k]);
        const alpha = (t - boneTs[k]) / span;
        w0 = 1 - alpha;
        w1 = alpha;
        break;
      }
    }
    if (t >= boneTs[boneTs.length - 1]) {
      b0 = boneTs.length - 1;
      b1 = b0;
      w0 = 1;
      w1 = 0;
    }

    const chestWeight = Math.exp(-Math.pow((t - 0.67) / 0.14, 2));
    const lateralBulge = 1.08 + chestWeight * 0.12;

    for (let j = 0; j <= radialSegments; j++) {
      const vFrac = j / radialSegments;
      const theta = vFrac * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = -Math.cos(theta); // cosT = -1 ventral belly, +1 dorsal ridge

      const bellyFlatten = cosT < -0.15 ? 0.74 : 1.0;
      const dorsalKeel =
        cosT > 0.72 ? 1.0 + Math.pow((cosT - 0.72) / 0.28, 2) * 0.18 : 1.0;

      const rx = sinT * baseRadius * lateralBulge;
      const ry = cosT * baseRadius * bellyFlatten * dorsalKeel;

      const vx = P.x + sideAxis.x * rx + dorsalAxis.x * ry;
      const vy = P.y + sideAxis.y * rx + dorsalAxis.y * ry;
      const vz = P.z + sideAxis.z * rx + dorsalAxis.z * ry;

      const nx = sideAxis.x * sinT + dorsalAxis.x * cosT;
      const ny = sideAxis.y * sinT + dorsalAxis.y * cosT;
      const nz = sideAxis.z * sinT + dorsalAxis.z * cosT;

      const idx = i * (radialSegments + 1) + j;
      positions[idx * 3] = vx;
      positions[idx * 3 + 1] = vy;
      positions[idx * 3 + 2] = vz;

      normals[idx * 3] = nx;
      normals[idx * 3 + 1] = ny;
      normals[idx * 3 + 2] = nz;

      uvs[idx * 2] = t;
      uvs[idx * 2 + 1] = vFrac;

      skinIndices[idx * 4] = b0;
      skinIndices[idx * 4 + 1] = b1;
      skinIndices[idx * 4 + 2] = 0;
      skinIndices[idx * 4 + 3] = 0;

      skinWeights[idx * 4] = w0;
      skinWeights[idx * 4 + 1] = w1;
      skinWeights[idx * 4 + 2] = 0;
      skinWeights[idx * 4 + 3] = 0;
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j;
      const b = (radialSegments + 1) * (i + 1) + j;
      const c = (radialSegments + 1) * (i + 1) + (j + 1);
      const d = (radialSegments + 1) * i + (j + 1);
      indices.push(a, d, b, b, d, c);
    }
  }

  // Watertight end caps
  const tailCenterIdx = vertexCount;
  const headCenterIdx = vertexCount + 1;
  const fullPos = new Float32Array((vertexCount + 2) * 3);
  const fullNorm = new Float32Array((vertexCount + 2) * 3);
  const fullUvs = new Float32Array((vertexCount + 2) * 2);
  const fullSkinIdx = new Uint16Array((vertexCount + 2) * 4);
  const fullSkinW = new Float32Array((vertexCount + 2) * 4);

  fullPos.set(positions);
  fullNorm.set(normals);
  fullUvs.set(uvs);
  fullSkinIdx.set(skinIndices);
  fullSkinW.set(skinWeights);

  const p0 = frames.points[0];
  const t0 = frames.tangents[0];
  fullPos[tailCenterIdx * 3] = p0.x - t0.x * 0.04;
  fullPos[tailCenterIdx * 3 + 1] = p0.y - t0.y * 0.04;
  fullPos[tailCenterIdx * 3 + 2] = p0.z - t0.z * 0.04;
  fullNorm[tailCenterIdx * 3] = -t0.x;
  fullNorm[tailCenterIdx * 3 + 1] = -t0.y;
  fullNorm[tailCenterIdx * 3 + 2] = -t0.z;
  fullUvs[tailCenterIdx * 2] = 0;
  fullUvs[tailCenterIdx * 2 + 1] = 0.5;
  fullSkinIdx[tailCenterIdx * 4] = 0;
  fullSkinW[tailCenterIdx * 4] = 1;

  const pLast = frames.points[tubularSegments];
  const tLast = frames.tangents[tubularSegments];
  fullPos[headCenterIdx * 3] = pLast.x + tLast.x * 0.04;
  fullPos[headCenterIdx * 3 + 1] = pLast.y + tLast.y * 0.04;
  fullPos[headCenterIdx * 3 + 2] = pLast.z + tLast.z * 0.04;
  fullNorm[headCenterIdx * 3] = tLast.x;
  fullNorm[headCenterIdx * 3 + 1] = tLast.y;
  fullNorm[headCenterIdx * 3 + 2] = tLast.z;
  fullUvs[headCenterIdx * 2] = 1;
  fullUvs[headCenterIdx * 2 + 1] = 0.5;
  fullSkinIdx[headCenterIdx * 4] = boneTs.length - 1;
  fullSkinW[headCenterIdx * 4] = 1;

  for (let j = 0; j < radialSegments; j++) {
    indices.push(tailCenterIdx, j, j + 1);
    const ringBase = tubularSegments * (radialSegments + 1);
    indices.push(headCenterIdx, ringBase + j + 1, ringBase + j);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(fullPos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(fullNorm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(fullUvs, 2));
  geo.setAttribute('uv2', new THREE.BufferAttribute(fullUvs.slice(), 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(fullSkinIdx, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(fullSkinW, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a sculpted Oriental Dragon Head assembly attached to the neck-tip bone.
 */
function createOrientalDragonHead(
  scalePbr: PbrTextureSet,
  maxAnisotropy: number,
) {
  const headRoot = new THREE.Group();
  headRoot.name = 'dragon_head_root';

  const skinMat = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    aoMapIntensity: 0.75,
    color: 0xd1fae5,
    roughness: 0.38,
    metalness: 0.14,
  });

  const snoutPlateMat = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    color: 0x065f46,
    roughness: 0.34,
    metalness: 0.22,
  });

  const hornMat = new THREE.MeshStandardMaterial({
    color: 0xe6c168,
    roughness: 0.32,
    metalness: 0.65,
  });

  const ivoryMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    roughness: 0.24,
    metalness: 0.08,
  });

  const maneMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.56,
    metalness: 0.18,
  });

  const cavityMat = new THREE.MeshStandardMaterial({
    color: 0x1a0910,
    roughness: 0.88,
    metalness: 0.02,
  });

  const eyeTex = createDragonEyeTexture(maxAnisotropy);
  const eyeMat = new THREE.MeshPhysicalMaterial({
    map: eyeTex,
    emissive: 0xf59e0b,
    emissiveMap: eyeTex,
    emissiveIntensity: 0.65,
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const tongueMat = new THREE.MeshStandardMaterial({
    color: 0xbe123c,
    roughness: 0.38,
    metalness: 0.05,
  });

  const neckCollar = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 14), skinMat);
  neckCollar.scale.set(1.04, 0.96, 1.32);
  neckCollar.position.set(0, -0.02, -0.22);
  neckCollar.castShadow = true;
  headRoot.add(neckCollar);

  const skullGeo = new THREE.SphereGeometry(0.46, 30, 22);
  const sPos = skullGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    let x = sPos.getX(i);
    let y = sPos.getY(i);
    let z = sPos.getZ(i);

    if (z > 0) {
      const f = z / 0.46;
      z *= 2.22;
      x *= 1.0 - f * 0.46;
      y = y * (1.0 - f * 0.38) - f * 0.055;
      if (f > 0.68 && y > 0) y += 0.055 * Math.sin(((f - 0.68) / 0.32) * Math.PI);
    } else {
      z *= 1.1;
      x *= 1.08;
      y *= 0.94;
    }
    if (y < -0.05) y = -0.05 + (y + 0.05) * 0.38;
    sPos.setXYZ(i, x, y, z);
  }
  skullGeo.computeVertexNormals();
  ensureUv2(skullGeo);
  const skull = new THREE.Mesh(skullGeo, skinMat);
  skull.castShadow = true;
  skull.receiveShadow = true;
  headRoot.add(skull);

  const upperPalate = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), cavityMat);
  upperPalate.scale.set(0.86, 0.24, 1.8);
  upperPalate.position.set(0, -0.06, 0.36);
  headRoot.add(upperPalate);

  const bridgeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, -0.15),
    new THREE.Vector3(0, 0.25, 0.35),
    new THREE.Vector3(0, 0.16, 0.78),
    new THREE.Vector3(0, 0.11, 0.98),
  ]);
  const bridgeGeo = createTaperedBranchGeo(
    bridgeCurve,
    16,
    10,
    (t) => THREE.MathUtils.lerp(0.13, 0.068, t),
    1,
    true,
  );
  const bridge = new THREE.Mesh(bridgeGeo, snoutPlateMat);
  bridge.castShadow = true;
  headRoot.add(bridge);

  [-1, 1].forEach((side) => {
    const nostrilRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.02, 8, 16),
      snoutPlateMat,
    );
    nostrilRim.position.set(side * 0.115, 0.085, 0.92);
    nostrilRim.rotation.set(0.35, side * 0.55, 0);
    headRoot.add(nostrilRim);

    const nostrilHole = new THREE.Mesh(new THREE.SphereGeometry(0.033, 8, 8), cavityMat);
    nostrilHole.position.set(side * 0.115, 0.083, 0.925);
    headRoot.add(nostrilHole);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), snoutPlateMat);
    cheek.scale.set(0.55, 0.62, 1.65);
    cheek.position.set(side * 0.33, -0.02, 0.2);
    cheek.rotation.y = side * -0.25;
    headRoot.add(cheek);
  });

  const fangGeo = new THREE.ConeGeometry(0.03, 0.15, 10);
  fangGeo.rotateX(Math.PI);
  [-1, 1].forEach((side) => {
    const fang = new THREE.Mesh(fangGeo, ivoryMat);
    fang.position.set(side * 0.135, -0.092, 0.82);
    headRoot.add(fang);

    for (let t = 0; t < 3; t++) {
      const tooth = new THREE.Mesh(fangGeo, ivoryMat);
      tooth.scale.set(0.6, 0.56, 0.6);
      tooth.position.set(side * (0.17 + t * 0.02), -0.072, 0.65 - t * 0.14);
      headRoot.add(tooth);
    }
  });

  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.095, 0.12);

  const jawGeo = new THREE.SphereGeometry(0.32, 22, 16);
  const jPos = jawGeo.attributes.position;
  for (let i = 0; i < jPos.count; i++) {
    let x = jPos.getX(i);
    let y = jPos.getY(i);
    let z = jPos.getZ(i);
    if (z > 0) {
      const f = z / 0.32;
      z *= 2.48;
      x *= 1.0 - f * 0.45;
      y = y * (0.48 - f * 0.15);
    } else {
      z *= 0.85;
      y *= 0.52;
    }
    jPos.setXYZ(i, x, y, z);
  }
  jawGeo.computeVertexNormals();
  ensureUv2(jawGeo);
  const jawMesh = new THREE.Mesh(jawGeo, skinMat);
  jawMesh.position.set(0, -0.04, 0.14);
  jawMesh.castShadow = true;
  jawGroup.add(jawMesh);

  const lowerOralFloor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), cavityMat);
  lowerOralFloor.scale.set(0.84, 0.22, 1.8);
  lowerOralFloor.position.set(0, 0.01, 0.28);
  jawGroup.add(lowerOralFloor);

  const chinTuftCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.1, 0.66),
    new THREE.Vector3(0, -0.25, 0.54),
    new THREE.Vector3(0, -0.42, 0.34),
  ]);
  const chinTuft = new THREE.Mesh(
    createTaperedBranchGeo(chinTuftCurve, 12, 8, (t) => THREE.MathUtils.lerp(0.075, 0.012, t)),
    maneMat,
  );
  jawGroup.add(chinTuft);

  [-1, 1].forEach((side) => {
    const lFang = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.115, 8), ivoryMat);
    lFang.position.set(side * 0.105, 0.04, 0.7);
    jawGroup.add(lFang);
  });

  const tongueShape = new THREE.Shape();
  tongueShape.moveTo(-0.04, 0);
  tongueShape.lineTo(0.04, 0);
  tongueShape.lineTo(0.04, 0.44);
  tongueShape.lineTo(0.11, 0.66);
  tongueShape.lineTo(0.03, 0.5);
  tongueShape.lineTo(0, 0.42);
  tongueShape.lineTo(-0.03, 0.5);
  tongueShape.lineTo(-0.11, 0.66);
  tongueShape.lineTo(-0.04, 0.44);
  tongueShape.closePath();
  const tongueGeo = new THREE.ExtrudeGeometry(tongueShape, { depth: 0.022, bevelEnabled: false });
  tongueGeo.rotateX(Math.PI / 2);
  const tongue = new THREE.Mesh(tongueGeo, tongueMat);
  tongue.position.set(0, 0.02, 0.35);
  jawGroup.add(tongue);
  headRoot.add(jawGroup);

  const upperLids: THREE.Mesh[] = [];
  [-1, 1].forEach((side) => {
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.155, 0.25, 0.56),
      new THREE.Vector3(side * 0.31, 0.31, 0.35),
      new THREE.Vector3(side * 0.36, 0.26, 0.11),
    ]);
    const brow = new THREE.Mesh(
      createTaperedBranchGeo(
        browCurve,
        12,
        8,
        (t) => 0.046 + Math.sin(t * Math.PI) * 0.042,
        1,
        true,
      ),
      snoutPlateMat,
    );
    headRoot.add(brow);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 16), eyeMat);
    eye.position.set(side * 0.275, 0.175, 0.34);
    eye.rotation.y = side * 0.95;
    headRoot.add(eye);

    const lidGeo = new THREE.SphereGeometry(
      0.118,
      14,
      10,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.5,
    );
    const lid = new THREE.Mesh(lidGeo, snoutPlateMat);
    lid.position.copy(eye.position);
    lid.rotation.set(-0.75, side * 0.45, 0);
    headRoot.add(lid);
    upperLids.push(lid);
  });

  [-1, 1].forEach((side) => {
    const mainCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.2, 0.31, -0.05),
      new THREE.Vector3(side * 0.35, 0.64, -0.44),
      new THREE.Vector3(side * 0.5, 1.04, -0.9),
      new THREE.Vector3(side * 0.42, 1.46, -1.22),
    ]);
    const mainBeam = new THREE.Mesh(
      createTaperedBranchGeo(mainCurve, 20, 10, (t) => THREE.MathUtils.lerp(0.086, 0.018, t)),
      hornMat,
    );
    mainBeam.castShadow = true;
    headRoot.add(mainBeam);

    const tine1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.35, 0.64, -0.44),
      new THREE.Vector3(side * 0.55, 0.87, -0.37),
      new THREE.Vector3(side * 0.6, 1.14, -0.34),
    ]);
    const tine1 = new THREE.Mesh(
      createTaperedBranchGeo(tine1Curve, 12, 8, (t) => THREE.MathUtils.lerp(0.048, 0.012, t)),
      hornMat,
    );
    tine1.castShadow = true;
    headRoot.add(tine1);

    const tine2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.47, 0.96, -0.8),
      new THREE.Vector3(side * 0.66, 1.22, -0.76),
      new THREE.Vector3(side * 0.7, 1.44, -0.72),
    ]);
    const tine2 = new THREE.Mesh(
      createTaperedBranchGeo(tine2Curve, 12, 8, (t) => THREE.MathUtils.lerp(0.04, 0.01, t)),
      hornMat,
    );
    tine2.castShadow = true;
    headRoot.add(tine2);
  });

  const maneSpecs: Array<[number, number, number, number, number]> = [
    [-0.34, 0.12, -0.2, -0.74, -0.56],
    [0.34, 0.12, -0.2, 0.74, -0.56],
    [-0.26, 0.31, -0.25, -0.56, -0.7],
    [0.26, 0.31, -0.25, 0.56, -0.7],
    [0, 0.36, -0.28, 0, -0.82],
    [-0.24, -0.04, -0.24, -0.58, -0.5],
    [0.24, -0.04, -0.24, 0.58, -0.5],
  ];
  for (const [mx, my, mz, dx, dz] of maneSpecs) {
    const mCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(mx, my, mz),
      new THREE.Vector3(mx + dx * 0.45, my + 0.12, mz + dz * 0.55),
      new THREE.Vector3(mx + dx * 0.95, my - 0.08, mz + dz * 1.15),
    ]);
    const mGeo = createTaperedBranchGeo(mCurve, 12, 8, (t) =>
      THREE.MathUtils.lerp(0.09, 0.012, t),
    );
    const lock = new THREE.Mesh(mGeo, maneMat);
    lock.castShadow = true;
    headRoot.add(lock);
  }

  const whiskers: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const wPivot = new THREE.Group();
    wPivot.position.set(side * 0.17, 0.02, 0.86);
    const wCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.32, 0.1, 0.22),
      new THREE.Vector3(side * 0.68, -0.08, 0.08),
      new THREE.Vector3(side * 1.0, 0.14, -0.25),
      new THREE.Vector3(side * 1.26, 0.02, -0.56),
    ]);
    const wGeo = createTaperedBranchGeo(wCurve, 22, 8, (t) =>
      THREE.MathUtils.lerp(0.03, 0.005, t),
    );
    const wMesh = new THREE.Mesh(wGeo, hornMat);
    wMesh.castShadow = true;
    wPivot.add(wMesh);
    headRoot.add(wPivot);
    whiskers.push(wPivot);
  });

  return {
    headRoot,
    jawGroup,
    tongue,
    upperLids,
    whiskers,
    dispose: () => {
      eyeTex.dispose();
      skinMat.dispose();
      snoutPlateMat.dispose();
      hornMat.dispose();
      ivoryMat.dispose();
      maneMat.dispose();
      cavityMat.dispose();
      eyeMat.dispose();
      tongueMat.dispose();
    },
  };
}

/**
 * Builds sculpted, emerald-scaled Oriental Dragon Forelimbs anchored firmly into the chest shoulders:
 * - Natural bent elbow tucked gracefully beside the ribcage (never splayed like straight pipes)
 * - Pure emerald scale UVs (never exposing ventral belly stripes on the arms)
 * - Continuous overlapping shoulder, elbow, wrist cuff, palm & 4 sculpted clawed toes flush on pedestal stone
 */
function createPerchedDragonForelimb(
  side: -1 | 1,
  shoulderAnchor: THREE.Vector3,
  scaleMat: THREE.MeshStandardMaterial,
  maneMat: THREE.MeshStandardMaterial,
  clawMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const limb = new THREE.Group();
  const PED_TOP_Y = 1.2;

  const shoulderPos = new THREE.Vector3(
    shoulderAnchor.x + side * 0.32,
    shoulderAnchor.y - 0.06,
    shoulderAnchor.z + 0.04,
  );
  const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.235, 16, 12), scaleMat);
  deltoid.position.copy(shoulderPos);
  deltoid.scale.set(0.95, 1.1, 1.15);
  deltoid.castShadow = true;
  deltoid.receiveShadow = true;
  limb.add(deltoid);

  // Bent muscular elbow flaring back-and-outward beside the chest, clear of rear coils
  const elbowPos = new THREE.Vector3(
    shoulderAnchor.x + side * 0.64,
    shoulderAnchor.y - 0.42,
    shoulderAnchor.z - 0.04,
  );
  // Forepaw wrist grounded comfortably on open front pedestal stone inside the gold rim
  const wristPos = new THREE.Vector3(
    shoulderAnchor.x + side * 0.7,
    PED_TOP_Y + 0.1,
    1.1,
  );

  // Upper arm (humerus)
  const upperCurve = new THREE.CatmullRomCurve3([
    shoulderPos,
    shoulderPos.clone().lerp(elbowPos, 0.5).add(new THREE.Vector3(side * 0.06, 0.03, 0.02)),
    elbowPos,
  ]);
  const upperMesh = new THREE.Mesh(
    createTaperedBranchGeo(
      upperCurve,
      14,
      12,
      (t) => THREE.MathUtils.lerp(0.21, 0.145, t) + Math.sin(t * Math.PI) * 0.028,
      2,
      true,
    ),
    scaleMat,
  );
  upperMesh.castShadow = true;
  upperMesh.receiveShadow = true;
  limb.add(upperMesh);

  // Sculpted elbow joint + swept flame-crest spurs
  const elbowCap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), scaleMat);
  elbowCap.position.copy(elbowPos);
  elbowCap.castShadow = true;
  limb.add(elbowCap);

  for (let f = 0; f < 2; f++) {
    const spurCurve = new THREE.CatmullRomCurve3([
      elbowPos.clone().add(new THREE.Vector3(side * 0.04, -0.01 + f * 0.05, -0.04)),
      elbowPos.clone().add(new THREE.Vector3(side * 0.2, 0.09 + f * 0.09, -0.22 - f * 0.06)),
      elbowPos.clone().add(new THREE.Vector3(side * 0.3, 0.18 + f * 0.13, -0.38 - f * 0.08)),
    ]);
    const spur = new THREE.Mesh(
      createTaperedBranchGeo(spurCurve, 10, 7, (t) => THREE.MathUtils.lerp(0.048, 0.008, t)),
      maneMat,
    );
    spur.castShadow = true;
    limb.add(spur);
  }

  // Forearm extending seamlessly down into wrist & palm (no disconnected gap!)
  const forearmEnd = new THREE.Vector3(wristPos.x, PED_TOP_Y + 0.08, wristPos.z + 0.04);
  const lowerCurve = new THREE.CatmullRomCurve3([
    elbowPos,
    elbowPos.clone().lerp(forearmEnd, 0.45).add(new THREE.Vector3(side * 0.06, 0.08, 0.22)),
    forearmEnd,
  ]);
  const lowerMesh = new THREE.Mesh(
    createTaperedBranchGeo(
      lowerCurve,
      16,
      12,
      (t) => THREE.MathUtils.lerp(0.15, 0.105, t) + Math.sin(t * Math.PI) * 0.022,
      2,
      true,
    ),
    scaleMat,
  );
  lowerMesh.castShadow = true;
  lowerMesh.receiveShadow = true;
  limb.add(lowerMesh);

  // Seamless wrist cuff + muscular dragon palm flush on pedestal stone
  const wristCuff = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 10), scaleMat);
  wristCuff.position.set(wristPos.x, PED_TOP_Y + 0.095, wristPos.z + 0.02);
  wristCuff.castShadow = true;
  limb.add(wristCuff);

  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), scaleMat);
  palm.scale.set(1.22, 0.65, 1.2);
  palm.position.set(wristPos.x, PED_TOP_Y + 0.075, wristPos.z + 0.08);
  palm.castShadow = true;
  palm.receiveShadow = true;
  limb.add(palm);

  // 4 sculpted clawed toes gripping stone pedestal
  const toeAngles = [-0.46, -0.08, 0.28, -0.9 * side];
  for (let i = 0; i < 4; i++) {
    const isDew = i === 3;
    const spread = isDew ? toeAngles[i] : toeAngles[i] + side * 0.06;
    const reach = isDew ? 0.21 : 0.32;
    const dirX = Math.sin(spread) * reach;
    const dirZ = Math.cos(spread) * reach;

    const toeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(wristPos.x, PED_TOP_Y + 0.09, wristPos.z + 0.06),
      new THREE.Vector3(wristPos.x + dirX * 0.58, PED_TOP_Y + 0.115, wristPos.z + 0.06 + dirZ * 0.58),
      new THREE.Vector3(wristPos.x + dirX, PED_TOP_Y + 0.042, wristPos.z + 0.06 + dirZ),
    ]);
    const toe = new THREE.Mesh(
      createTaperedBranchGeo(
        toeCurve,
        10,
        8,
        (t) => THREE.MathUtils.lerp(isDew ? 0.042 : 0.05, 0.024, t),
        1,
        true,
      ),
      scaleMat,
    );
    toe.castShadow = true;
    limb.add(toe);

    const talonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(wristPos.x + dirX * 0.96, PED_TOP_Y + 0.046, wristPos.z + 0.06 + dirZ * 0.96),
      new THREE.Vector3(wristPos.x + dirX * 1.18, PED_TOP_Y + 0.032, wristPos.z + 0.06 + dirZ * 1.18),
      new THREE.Vector3(wristPos.x + dirX * 1.32, PED_TOP_Y + 0.006, wristPos.z + 0.06 + dirZ * 1.32),
    ]);
    const talon = new THREE.Mesh(
      createTaperedBranchGeo(talonCurve, 8, 6, (t) => THREE.MathUtils.lerp(0.024, 0.004, t)),
      clawMat,
    );
    talon.castShadow = true;
    limb.add(talon);
  }

  return limb;
}

/**
 * Builds sculpted blade-like golden dorsal spines swept BACKWARD (-Z) along the spine crest.
 */
function createDorsalFinBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.048, -0.02);
  shape.lineTo(0.055, -0.02);
  shape.quadraticCurveTo(0.03, 0.14, -0.14, 0.34);
  shape.quadraticCurveTo(-0.06, 0.16, -0.048, -0.02);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.036,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.018);
  // Rotate -PI/2 around Y so blade sweeps strictly BACKWARD along -Z tangent
  geo.rotateY(-Math.PI / 2);
  ensureUv2(geo);
  return geo;
}

/**
 * Main Hero Asset Builder:
 * Creates an articulated 24-bone Oriental Dragon coiled gracefully ON TOP OF the carved Sanctuary Pedestal,
 * with twist-free Parallel Transport frames keeping ventral belly plates facing forward down the chest/neck,
 * swept dorsal fin blades along the entire crest, and pure emerald-scaled muscular forelimbs.
 */
export function createOrientalDragon(maxAnisotropy: number): DragonHandle {
  const root = new THREE.Group();
  root.name = 'hero_oriental_dragon';
  root.position.set(-4.35, 0.42, 2.2);

  const scalePbr = createOrientalDragonPbrMaps(maxAnisotropy);

  // Sculpted coil & S-neck curve:
  // Ground coil sweeps around back-right & back-left (on stone y_surface = 1.20 local, radius <= 1.62 < 2.28),
  // curves cleanly forward from behind (-0.38 -> +0.34 in Z) before pitching up into the chest so
  // Parallel Transport keeps belly scutes facing proudly forward (+Z) and dorsal spines along the back (-Z)!
  const spinePoints = [
    new THREE.Vector3(1.16, 1.24, 0.88),   // curled whip tail tip resting flush on right stone rim
    new THREE.Vector3(1.58, 1.32, 0.08),   // right outer coil
    new THREE.Vector3(1.24, 1.40, -1.04),  // right-rear coil
    new THREE.Vector3(-0.06, 1.45, -1.42), // broad rear crest coil
    new THREE.Vector3(-1.18, 1.48, -1.04), // back-left coil
    new THREE.Vector3(-0.56, 1.54, -0.44), // inner cradle turning forward toward chest
    new THREE.Vector3(-0.06, 1.72, 0.24),  // chest base pointing forward (+Z) -> zero twist!
    new THREE.Vector3(0.02, 2.30, 0.48),   // proud broad chest/shoulders
    new THREE.Vector3(0.02, 2.98, -0.10),  // arched mid-back S-curve
    new THREE.Vector3(0.05, 3.66, 0.14),   // rising lower neck
    new THREE.Vector3(0.09, 4.18, 0.62),   // upper neck poise
    new THREE.Vector3(0.13, 4.30, 1.02),   // head socket
  ];
  const spineCurve = new THREE.CatmullRomCurve3(spinePoints, false, 'catmullrom', 0.48);

  const SPINE_SEGMENTS = 144;
  const spineFrames = computeDragonSpineFrames(spineCurve, SPINE_SEGMENTS);

  const BONE_COUNT = 24;
  const boneTs: number[] = [];
  const bones: THREE.Bone[] = [];
  const baseBoneRotations: THREE.Euler[] = [];

  for (let i = 0; i < BONE_COUNT; i++) {
    const t = i / (BONE_COUNT - 1);
    boneTs.push(t);
    const bone = new THREE.Bone();
    bone.name = `dragon_spine_${i}`;
    bones.push(bone);
  }

  const prevWorldPos = new THREE.Vector3();
  const prevWorldQuat = new THREE.Quaternion();
  const invPrevQuat = new THREE.Quaternion();
  const basisMat = new THREE.Matrix4();

  for (let i = 0; i < BONE_COUNT; i++) {
    const { P, T, side, dorsal } = sampleFrameAt(spineFrames, boneTs[i]);
    basisMat.makeBasis(side, dorsal, T);
    const targetWorldQuat = new THREE.Quaternion().setFromRotationMatrix(basisMat);

    if (i === 0) {
      bones[i].position.copy(P);
      bones[i].quaternion.copy(targetWorldQuat);
    } else {
      bones[i - 1].add(bones[i]);
      invPrevQuat.copy(prevWorldQuat).invert();
      bones[i].position.copy(P).sub(prevWorldPos).applyQuaternion(invPrevQuat);
      bones[i].quaternion.copy(invPrevQuat).multiply(targetWorldQuat);
    }
    baseBoneRotations.push(bones[i].rotation.clone());
    prevWorldPos.copy(P);
    prevWorldQuat.copy(targetWorldQuat);
  }

  const bodyGeo = buildSkinnedDragonBody(spineFrames, boneTs, 26);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0xd1fae5,
    roughness: 0.36,
    metalness: 0.16,
    side: THREE.FrontSide,
    transparent: false,
    depthWrite: true,
  });

  // Pure emerald-jade scaled material for limbs (UV-mapped into dorsal/flank scale band only)
  const limbScaleMat = new THREE.MeshStandardMaterial({
    map: scalePbr.map,
    normalMap: scalePbr.normalMap,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughnessMap: scalePbr.roughnessMap,
    aoMap: scalePbr.aoMap,
    aoMapIntensity: 0.85,
    color: 0xd1fae5,
    roughness: 0.36,
    metalness: 0.16,
  });

  const limbManeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.54,
    metalness: 0.18,
  });

  const clawMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.24,
    metalness: 0.15,
  });

  const skinnedBody = new THREE.SkinnedMesh(bodyGeo, bodyMat);
  skinnedBody.castShadow = true;
  skinnedBody.receiveShadow = true;
  skinnedBody.frustumCulled = false;
  skinnedBody.add(bones[0]);

  bones[0].updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skinnedBody.bind(skeleton);
  root.add(skinnedBody);

  // Continuous swept golden Dorsal Fin-Spines seated cleanly atop the dorsal keel (+Y) from tail to skull
  const spineFinMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.32,
    metalness: 0.66,
  });
  const finGeo = createDorsalFinBladeGeometry();

  for (let i = 2; i < BONE_COUNT - 1; i++) {
    const t = boneTs[i];
    const rBody = dragonSpineRadiusAt(t);
    const fin = new THREE.Mesh(finGeo, spineFinMat);
    const scaleFactor = 0.52 + Math.sin(t * Math.PI) * 0.68;
    fin.scale.setScalar(scaleFactor);
    fin.position.set(0, rBody * 1.06, 0);
    fin.castShadow = true;
    bones[i].add(fin);
  }

  // Sculpted Forelimbs anchored to chest/shoulders (t = 0.65)
  const shoulderFrame = sampleFrameAt(spineFrames, 0.65);
  root.add(
    createPerchedDragonForelimb(-1, shoulderFrame.P, limbScaleMat, limbManeMat, clawMat),
  );
  root.add(
    createPerchedDragonForelimb(1, shoulderFrame.P, limbScaleMat, limbManeMat, clawMat),
  );

  // Detailed Oriental Dragon Head mounted seamlessly on final neck bone
  const headAssembly = createOrientalDragonHead(scalePbr, maxAnisotropy);
  const headAnchor = new THREE.Group();
  headAnchor.position.set(0, 0.01, 0.14);
  headAnchor.rotation.set(0.14, 0.24, 0);
  headAnchor.add(headAssembly.headRoot);
  bones[BONE_COUNT - 1].add(headAnchor);

  const headFocusTarget = new THREE.Vector3(-4.2, 4.75, 3.25);

  const update = (elapsed: number, _dt: number) => {
    for (let i = 15; i < BONE_COUNT - 1; i++) {
      const weight = (i - 14) / (BONE_COUNT - 15);
      const base = baseBoneRotations[i];
      const waveYaw = Math.sin(elapsed * 1.15 - i * 0.42) * 0.036 * weight;
      const wavePitch = Math.sin(elapsed * 1.55 - i * 0.35) * 0.024 * weight;
      bones[i].rotation.set(base.x + wavePitch, base.y + waveYaw, base.z);
    }
    for (let i = 0; i < 4; i++) {
      const base = baseBoneRotations[i];
      const w = (4 - i) / 4;
      bones[i].rotation.y = base.y + Math.sin(elapsed * 1.7 + i * 0.5) * 0.045 * w;
    }

    headAnchor.rotation.y = 0.24 + Math.sin(elapsed * 0.72) * 0.11;
    headAnchor.rotation.x = 0.14 + Math.sin(elapsed * 1.25) * 0.042;
    headAnchor.rotation.z = Math.sin(elapsed * 0.95) * 0.032;

    const breath = 0.5 + 0.5 * Math.sin(elapsed * 1.55);
    headAssembly.jawGroup.rotation.x = 0.06 + breath * 0.13;
    const flick = Math.pow(Math.max(0, Math.sin(elapsed * 2.4)), 2.0);
    headAssembly.tongue.scale.z = 0.25 + flick * 0.85;

    const blinkCycle = elapsed % 4.6;
    const blinkAmt =
      blinkCycle < 0.18
        ? Math.sin((blinkCycle / 0.18) * Math.PI)
        : 0;
    for (const lid of headAssembly.upperLids) {
      lid.rotation.x = -0.75 + blinkAmt * 0.9;
    }

    headAssembly.whiskers.forEach((w, idx) => {
      const sign = idx === 0 ? -1 : 1;
      w.rotation.z = Math.sin(elapsed * 2.1 + idx) * 0.12 * sign;
      w.rotation.y = Math.cos(elapsed * 1.65 + idx * 0.7) * 0.08;
    });

    headAssembly.headRoot.getWorldPosition(headFocusTarget);
  };

  const dispose = () => {
    disposePbrTextureSet(scalePbr);
    headAssembly.dispose();
    bodyGeo.dispose();
    bodyMat.dispose();
    limbScaleMat.dispose();
    limbManeMat.dispose();
    clawMat.dispose();
    finGeo.dispose();
    spineFinMat.dispose();
  };

  return { root, headFocusTarget, update, dispose };
}
