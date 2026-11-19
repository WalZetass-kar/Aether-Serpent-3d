import * as THREE from 'three';
import { getDiceTargetQuaternion } from '../models';

export interface DiceImpactEvent {
  timeSec: number;
  intensity: number; // 0..1 normalized impact strength
  x: number;
  y: number;
  z: number;
  isRimHit: boolean;
}

export interface DicePhysicsSample {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
  done: boolean;
}

interface TrajectoryFrame {
  t: number;
  px: number;
  py: number;
  pz: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  sy: number; // squash/stretch Y scale
}

export interface DiceRollSimulation {
  readonly durationSec: number;
  readonly windupSec: number;
  readonly finalPosition: THREE.Vector3;
  readonly finalQuaternion: THREE.Quaternion;
  readonly impacts: DiceImpactEvent[];
  sample: (elapsedSec: number, out: DicePhysicsSample) => void;
}

// Cube geometry constants matching createFantasyDice (1.18 x 1.18 x 1.18 RoundedBoxGeometry)
const CUBE_HALF_EXTENT = 0.59;
const DAIS_MAX_CENTER_RADIUS = 0.84; // keeps cube cleanly inside outerGoldRing (r=1.46) & pillars (r=1.62)
const GRAVITY = -30.5;
const SUBSTEP_DT = 1 / 240;

// Reusable scratch objects (module-scoped for zero per-frame GC)
const _m4 = new THREE.Matrix4();
const _axX = new THREE.Vector3();
const _axY = new THREE.Vector3();
const _axZ = new THREE.Vector3();
const _cornerWorld = new THREE.Vector3();
const _torque = new THREE.Vector3();
const _upWorld = new THREE.Vector3(0, 1, 0);
const _tmpQuatA = new THREE.Quaternion();
const _tmpQuatB = new THREE.Quaternion();
const _tmpQuatC = new THREE.Quaternion();
const _tmpAxis = new THREE.Vector3();

/**
 * Computes the exact vertical half-support of an oriented cube (distance from center
 * to lowest vertex along world Y) and writes the world-space vector from center to
 * that lowest corner into `outLowestCorner`.
 */
function computeCubeSupportY(
  q: THREE.Quaternion,
  outLowestCorner: THREE.Vector3,
): number {
  _m4.makeRotationFromQuaternion(q);
  const e = _m4.elements;
  // Columns of rotation matrix (world images of local X, Y, Z)
  _axX.set(e[0], e[1], e[2]);
  _axY.set(e[4], e[5], e[6]);
  _axZ.set(e[8], e[9], e[10]);

  const sx = _axX.y >= 0 ? -1 : 1;
  const sy = _axY.y >= 0 ? -1 : 1;
  const sz = _axZ.y >= 0 ? -1 : 1;

  outLowestCorner
    .set(0, 0, 0)
    .addScaledVector(_axX, sx * CUBE_HALF_EXTENT)
    .addScaledVector(_axY, sy * CUBE_HALF_EXTENT)
    .addScaledVector(_axZ, sz * CUBE_HALF_EXTENT);

  return -outLowestCorner.y;
}

/**
 * Given a resting cube quaternion `qRest`, snaps its nearest cube face strictly upright (+Y)
 * and computes the exact octahedral cube symmetry body-offset quaternion `qBodyOffset` such that:
 *   q_vis(t) = q_sim(t) * qBodyOffset
 * preserves the cube's exact 3D volume/corners at every timestamp while guaranteeing that
 * at t = T the exact `targetFace` (1..6) faces strictly upward (+Y) with natural yaw.
 */
function computeExactFaceAlignmentOffset(
  qRest: THREE.Quaternion,
  targetFace: number,
  outBodyOffset: THREE.Quaternion,
  outExactFinalQuat: THREE.Quaternion,
): void {
  _m4.makeRotationFromQuaternion(qRest);
  const e = _m4.elements;
  _axX.set(e[0], e[1], e[2]);
  _axY.set(e[4], e[5], e[6]);
  _axZ.set(e[8], e[9], e[10]);

  // 1. Identify which of the 6 local axes is closest to world +Y
  const candidates = [
    { vec: _axX, sign: _axX.y >= 0 ? 1 : -1, absY: Math.abs(_axX.y), id: 0 },
    { vec: _axY, sign: _axY.y >= 0 ? 1 : -1, absY: Math.abs(_axY.y), id: 1 },
    { vec: _axZ, sign: _axZ.y >= 0 ? 1 : -1, absY: Math.abs(_axZ.y), id: 2 },
  ];
  candidates.sort((a, b) => b.absY - a.absY);
  const bestUp = candidates[0];

  // Minimal rotation aligning that face normal strictly to +Y -> qFlat
  _tmpAxis.copy(bestUp.vec).multiplyScalar(bestUp.sign).normalize();
  _tmpQuatA.setFromUnitVectors(_tmpAxis, _upWorld);
  const qFlat = _tmpQuatB.copy(_tmpQuatA).multiply(qRest).normalize();

  // 2. Measure the natural horizontal yaw of one perpendicular axis in qFlat
  _m4.makeRotationFromQuaternion(qFlat);
  const fe = _m4.elements;
  const horizIdx = bestUp.id === 0 ? 1 : 0; // pick a local axis guaranteed perpendicular to up
  const hx = horizIdx === 0 ? fe[0] : fe[4];
  const hz = horizIdx === 0 ? fe[2] : fe[6];
  const naturalYaw = Math.atan2(hx, hz);

  // 3. Remove world yaw to isolate the pure 90-degree cube symmetry quaternion qCubeSim
  _tmpQuatA.setFromAxisAngle(_upWorld, -naturalYaw);
  const qCubeSim = _tmpQuatC.copy(_tmpQuatA).multiply(qFlat).normalize();

  // 4. Compute exact body-space symmetry offset: qCubeSim^-1 * targetFaceQuat
  const faceQuat = getDiceTargetQuaternion(targetFace);
  outBodyOffset.copy(qCubeSim).invert().multiply(faceQuat).normalize();

  // 5. Compute exact settled orientation: R_y(naturalYaw) * targetFaceQuat
  _tmpQuatA.setFromAxisAngle(_upWorld, naturalYaw);
  outExactFinalQuat.copy(_tmpQuatA).multiply(faceQuat).normalize();
}

/**
 * Generates a realistic, physics-based 3D dice throw simulation on the Dice Dais
 * with gravity, corner-impact torque, surface friction, octagonal golden-rim ricochets,
 * velocity-scaled impact events, squash/stretch elasticity, and guaranteed targetFace landing.
 */
export function createDicePhysicsRoll(
  startPos: THREE.Vector3,
  startQuat: THREE.Quaternion,
  daisCenterPos: THREE.Vector3,
  targetFace: number,
  reducedEffects: boolean,
): DiceRollSimulation {
  const floorY = daisCenterPos.y - CUBE_HALF_EXTENT;
  const windupSec = reducedEffects ? 0.05 : 0.085;

  // Initial kinematic state starting from current position on dais
  const pos = new THREE.Vector3(startPos.x, Math.max(daisCenterPos.y, startPos.y), startPos.z);

  // Choose an energetic, randomized launch vector that arcs across the dais and often kisses the rim
  const launchAngle = Math.random() * Math.PI * 2;
  const speedHoriz = reducedEffects ? 1.8 + Math.random() * 1.0 : 3.2 + Math.random() * 2.1;
  const vel = new THREE.Vector3(
    Math.cos(launchAngle) * speedHoriz - (pos.x - daisCenterPos.x) * 1.4,
    reducedEffects ? 7.2 + Math.random() * 1.2 : 9.4 + Math.random() * 2.0,
    Math.sin(launchAngle) * speedHoriz - (pos.z - daisCenterPos.z) * 1.4,
  );

  // Dynamic 3-axis angular velocity (rad/s) for authentic mid-air tumble
  const spinScale = reducedEffects ? 0.72 : 1.0;
  const randomSign = () => (Math.random() < 0.5 ? -1 : 1);
  const angVel = new THREE.Vector3(
    randomSign() * (11.5 + Math.random() * 8.5) * spinScale,
    randomSign() * (6.0 + Math.random() * 7.5) * spinScale,
    randomSign() * (11.0 + Math.random() * 8.5) * spinScale,
  );

  const qSim = new THREE.Quaternion(); // starts at identity in sim space; offset applied cleanly afterward
  const impacts: DiceImpactEvent[] = [];
  const frames: TrajectoryFrame[] = [];

  let squashY = 1.0;
  let squashVel = 0.0;
  let simTime = 0;
  let bounceCount = 0;
  let lastImpactTime = -1;
  let settledFrames = 0;

  const maxSimTime = reducedEffects ? 1.05 : 1.38;
  const recordInterval = 1 / 90;
  let nextRecordAt = 0;

  // Record launch frame (t = 0 of ballistic phase)
  frames.push({
    t: 0,
    px: pos.x,
    py: pos.y,
    pz: pos.z,
    qx: qSim.x,
    qy: qSim.y,
    qz: qSim.z,
    qw: qSim.w,
    sy: 1,
  });

  // Pre-simulate full rigid-body physics at 240 Hz
  while (simTime < maxSimTime) {
    simTime += SUBSTEP_DT;

    // 1. Gravity & subtle air drag
    vel.y += GRAVITY * SUBSTEP_DT;
    vel.x *= 1 - 0.16 * SUBSTEP_DT;
    vel.z *= 1 - 0.16 * SUBSTEP_DT;

    // Very gentle centering attraction while airborne/bouncing so cube settles aesthetically on the dais
    const dxCenter = pos.x - daisCenterPos.x;
    const dzCenter = pos.z - daisCenterPos.z;
    const radialDist = Math.hypot(dxCenter, dzCenter);
    if (radialDist > 0.22) {
      const pull = (bounceCount >= 1 ? 2.4 : 1.1) * SUBSTEP_DT;
      vel.x -= (dxCenter / radialDist) * pull;
      vel.z -= (dzCenter / radialDist) * pull;
    }

    // Integrate linear position
    pos.addScaledVector(vel, SUBSTEP_DT);

    // Integrate quaternion from angular velocity: dq = 0.5 * (0, ω) * q * dt
    const wx = angVel.x;
    const wy = angVel.y;
    const wz = angVel.z;
    const omegaMag = Math.hypot(wx, wy, wz);
    if (omegaMag > 1e-4) {
      _tmpAxis.set(wx / omegaMag, wy / omegaMag, wz / omegaMag);
      _tmpQuatA.setFromAxisAngle(_tmpAxis, omegaMag * SUBSTEP_DT);
      qSim.premultiply(_tmpQuatA).normalize();
    }

    // 2. Dais octagonal golden rim collision (keeps dice on the altar & adds crisp ricochet spin!)
    const curDx = pos.x - daisCenterPos.x;
    const curDz = pos.z - daisCenterPos.z;
    const curRad = Math.hypot(curDx, curDz);
    if (curRad > DAIS_MAX_CENTER_RADIUS) {
      const nx = curDx / curRad;
      const nz = curDz / curRad;
      pos.x = daisCenterPos.x + nx * DAIS_MAX_CENTER_RADIUS;
      pos.z = daisCenterPos.z + nz * DAIS_MAX_CENTER_RADIUS;

      const vn = vel.x * nx + vel.z * nz;
      if (vn > 0) {
        const rimRestitution = 0.58;
        vel.x -= (1 + rimRestitution) * vn * nx;
        vel.z -= (1 + rimRestitution) * vn * nz;
        // Rim impact imparts tangential spin around Y and roll axis
        angVel.y += (Math.random() - 0.5) * vn * 2.2;
        angVel.x += nz * vn * 1.4;
        angVel.z -= nx * vn * 1.4;

        if (vn > 1.0 && simTime - lastImpactTime > 0.045) {
          lastImpactTime = simTime;
          impacts.push({
            timeSec: windupSec + simTime,
            intensity: Math.min(1, vn / 5.2),
            x: pos.x + nx * 0.45,
            y: Math.max(daisCenterPos.y - 0.2, pos.y),
            z: pos.z + nz * 0.45,
            isRimHit: true,
          });
        }
      }
    }

    // 3. Floor collision with exact oriented-cube lowest-corner contact & tipping torque
    const supportY = computeCubeSupportY(qSim, _cornerWorld);
    const minCenterY = floorY + supportY;

    if (pos.y <= minCenterY) {
      pos.y = minCenterY;
      const impactSpeed = -vel.y;

      if (impactSpeed > 0.45) {
        bounceCount++;
        const restitution = bounceCount === 1 ? 0.52 : bounceCount === 2 ? 0.42 : 0.28;
        vel.y = impactSpeed * restitution;

        // Horizontal surface friction & rolling torque
        vel.x *= 0.72;
        vel.z *= 0.72;

        // Corner-impact tipping torque: r × (0, impulse, 0)
        // Gives authentic tumble kick when hitting on a corner/edge!
        const impulseGain = Math.min(2.6, impactSpeed * 0.42);
        _torque.set(
          _cornerWorld.z * impulseGain,
          (Math.random() - 0.5) * impulseGain * 0.65,
          -_cornerWorld.x * impulseGain,
        );
        angVel.multiplyScalar(0.76).add(_torque);
        // Add rolling coupling from linear horizontal velocity
        angVel.x += vel.z * 0.85;
        angVel.z -= vel.x * 0.85;

        // Subtle elastic squash impulse on strong bounces
        const normImpact = Math.min(1, impactSpeed / 12.5);
        squashVel -= normImpact * 3.8;

        if (simTime - lastImpactTime > 0.042) {
          lastImpactTime = simTime;
          impacts.push({
            timeSec: windupSec + simTime,
            intensity: normImpact,
            x: pos.x + _cornerWorld.x * 0.55,
            y: floorY + 0.03,
            z: pos.z + _cornerWorld.z * 0.55,
            isRimHit: false,
          });
        }
      } else {
        // Resting / rolling / wobbling contact with dais top
        if (vel.y < 0) vel.y = 0;
        vel.x *= 1 - 7.5 * SUBSTEP_DT;
        vel.z *= 1 - 7.5 * SUBSTEP_DT;

        // Gravitational restoring torque pulls tilted cube cleanly onto its flattest face!
        // Since lowest corner is offset horizontally from center of mass, gravity creates torque:
        // r_contact × (0, +mg, 0) -> tips cube naturally onto the supporting face.
        const gravityTip = 18.5 * SUBSTEP_DT;
        angVel.x -= _cornerWorld.z * gravityTip;
        angVel.z += _cornerWorld.x * gravityTip;

        // Contact angular damping
        const angDamp = Math.exp(-6.8 * SUBSTEP_DT);
        angVel.multiplyScalar(angDamp);
      }
    } else {
      // Gentle airborne angular drag
      angVel.multiplyScalar(1 - 0.14 * SUBSTEP_DT);
    }

    // 4. Spring-damped elastic squash/stretch recovery (keeps cube feeling tactile & weighty)
    const springF = -260 * (squashY - 1.0) - 22 * squashVel;
    squashVel += springF * SUBSTEP_DT;
    squashY = THREE.MathUtils.clamp(squashY + squashVel * SUBSTEP_DT, 0.86, 1.12);

    // Record compact playback keyframe
    if (simTime >= nextRecordAt) {
      nextRecordAt = simTime + recordInterval;
      frames.push({
        t: simTime,
        px: pos.x,
        py: pos.y,
        pz: pos.z,
        qx: qSim.x,
        qy: qSim.y,
        qz: qSim.z,
        qw: qSim.w,
        sy: squashY,
      });
    }

    // Check early settle: low linear speed, low angular speed, flat on dais
    const isNearFlat = Math.abs(supportY - CUBE_HALF_EXTENT) < 0.018;
    const linSpeedSq = vel.lengthSq();
    const angSpeedSq = angVel.lengthSq();
    if (bounceCount >= 2 && pos.y <= minCenterY + 0.015 && isNearFlat && linSpeedSq < 0.05 && angSpeedSq < 0.25) {
      settledFrames++;
      if (settledFrames >= 16) {
        break;
      }
    } else {
      settledFrames = 0;
    }
  }

  // Compute exact body-space cube symmetry offset so the ENTIRE trajectory uses unaltered
  // physics while landing strictly flat on `targetFace`!
  const bodyOffset = new THREE.Quaternion();
  const exactFinalQuat = new THREE.Quaternion();
  computeExactFaceAlignmentOffset(qSim, targetFace, bodyOffset, exactFinalQuat);

  // Bake bodyOffset into every recorded frame's quaternion (zero runtime multiply per frame!)
  const settleBlendWindow = 0.12;
  const totalPhysicsTime = Math.max(0.45, simTime);
  const finalPos = new THREE.Vector3(pos.x, daisCenterPos.y, pos.z);

  // Clamp final resting position nicely inside the dais slate surface
  const finalDx = finalPos.x - daisCenterPos.x;
  const finalDz = finalPos.z - daisCenterPos.z;
  const finalRad = Math.hypot(finalDx, finalDz);
  if (finalRad > 0.72) {
    finalPos.x = daisCenterPos.x + (finalDx / finalRad) * 0.72;
    finalPos.z = daisCenterPos.z + (finalDz / finalRad) * 0.72;
  }

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    _tmpQuatA.set(f.qx, f.qy, f.qz, f.qw).multiply(bodyOffset).normalize();

    // During the final 120ms micro-wobble, ease out any tiny residual sub-degree tilt into exact flat rest
    if (f.t > totalPhysicsTime - settleBlendWindow) {
      const u = THREE.MathUtils.clamp(
        (f.t - (totalPhysicsTime - settleBlendWindow)) / settleBlendWindow,
        0,
        1,
      );
      const smoothU = u * u * (3 - 2 * u);
      _tmpQuatA.slerp(exactFinalQuat, smoothU);
      f.py = THREE.MathUtils.lerp(f.py, daisCenterPos.y, smoothU * 0.65);
    }

    f.qx = _tmpQuatA.x;
    f.qy = _tmpQuatA.y;
    f.qz = _tmpQuatA.z;
    f.qw = _tmpQuatA.w;
  }

  // Append crisp final resting frame
  frames.push({
    t: totalPhysicsTime + 0.04,
    px: finalPos.x,
    py: daisCenterPos.y,
    pz: finalPos.z,
    qx: exactFinalQuat.x,
    qy: exactFinalQuat.y,
    qz: exactFinalQuat.z,
    qw: exactFinalQuat.w,
    sy: 1.0,
  });

  // Initial pose references for smooth wind-up anticipation scoop
  const initPos = startPos.clone();
  const initQuat = startQuat.clone().normalize();
  const launchFrameQuat = new THREE.Quaternion(
    frames[0].qx,
    frames[0].qy,
    frames[0].qz,
    frames[0].qw,
  );
  const durationSec = windupSec + frames[frames.length - 1].t;

  const sample = (elapsedSec: number, out: DicePhysicsSample) => {
    // Phase 1: Tactile anticipation crouch & coil before launch
    if (elapsedSec < windupSec) {
      const u = THREE.MathUtils.clamp(elapsedSec / windupSec, 0, 1);
      const crouch = Math.sin(u * Math.PI);
      out.position.set(
        initPos.x,
        initPos.y - crouch * 0.055 + u * u * 0.09,
        initPos.z,
      );
      out.quaternion.copy(initQuat).slerp(launchFrameQuat, u * u);
      const sy = 1 - crouch * 0.09;
      const sxz = 1 / Math.sqrt(sy);
      out.scale.set(sxz, sy, sxz);
      out.done = false;
      return;
    }

    const physT = elapsedSec - windupSec;
    const lastFrame = frames[frames.length - 1];
    if (physT >= lastFrame.t) {
      out.position.set(lastFrame.px, lastFrame.py, lastFrame.pz);
      out.quaternion.set(lastFrame.qx, lastFrame.qy, lastFrame.qz, lastFrame.qw);
      out.scale.set(1, 1, 1);
      out.done = true;
      return;
    }

    // Binary search for bracketing frames
    let lo = 0;
    let hi = frames.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t <= physT) lo = mid;
      else hi = mid;
    }

    const f0 = frames[lo];
    const f1 = frames[hi];
    const span = Math.max(1e-5, f1.t - f0.t);
    const alpha = THREE.MathUtils.clamp((physT - f0.t) / span, 0, 1);

    out.position.set(
      f0.px + (f1.px - f0.px) * alpha,
      f0.py + (f1.py - f0.py) * alpha,
      f0.pz + (f1.pz - f0.pz) * alpha,
    );
    _tmpQuatA.set(f0.qx, f0.qy, f0.qz, f0.qw);
    _tmpQuatB.set(f1.qx, f1.qy, f1.qz, f1.qw);
    out.quaternion.copy(_tmpQuatA).slerp(_tmpQuatB, alpha);

    // Volume-preserving subtle elastic squash/stretch
    const sy = f0.sy + (f1.sy - f0.sy) * alpha;
    const sxz = 1 / Math.sqrt(Math.max(0.82, sy));
    out.scale.set(sxz, sy, sxz);
    out.done = false;
  };

  return {
    durationSec,
    windupSec,
    finalPosition: finalPos,
    finalQuaternion: exactFinalQuat,
    impacts,
    sample,
  };
}
