import * as THREE from 'three';

type PoolEffectKind = 'dome' | 'ring' | 'projectile' | 'beam' | 'pillar';

interface PooledEffect {
  kind: PoolEffectKind;
  mesh: THREE.Object3D;
  mat: THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
  active: boolean;
  elapsed: number;
  duration: number;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  arcHeight: number;
  startScale: number;
  endScale: number;
  baseOpacity: number;
}

const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpMid = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);

/**
 * Pre-allocated GPU-friendly VFX Pool (zero runtime geometry/material allocations).
 * Supports shield domes, expanding shock/wind rings, homing Battle projectiles,
 * Team Synergy energy beams, and blessing pillars.
 */
export class VfxPool {
  private group = new THREE.Group();
  private effects: PooledEffect[] = [];

  constructor(scene: THREE.Scene) {
    this.group.name = 'CinematicVfxPool';
    scene.add(this.group);

    // 1. Defensive / Arcane Shield Domes (x4)
    const domeGeo = new THREE.IcosahedronGeometry(0.88, 1);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(domeGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.effects.push({
        kind: 'dome',
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.8,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        arcHeight: 0,
        startScale: 0.35,
        endScale: 1.45,
        baseOpacity: 0.85,
      });
    }

    // 2. Expanding Shockwave / Wind / Curse Rings (x8)
    const ringGeo = new THREE.TorusGeometry(0.82, 0.065, 8, 28);
    ringGeo.rotateX(Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.effects.push({
        kind: 'ring',
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.65,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        arcHeight: 0,
        startScale: 0.35,
        endScale: 2.5,
        baseOpacity: 0.9,
      });
    }

    // 3. Battle Mode Energy Projectiles (x3)
    const projGeo = new THREE.OctahedronGeometry(0.26, 0);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.effects.push({
        kind: 'projectile',
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.45,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        arcHeight: 1.35,
        startScale: 0.9,
        endScale: 1.15,
        baseOpacity: 0.95,
      });
    }

    // 4. Team Synergy Energy Beams (x3)
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8, 1, true);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(beamGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.effects.push({
        kind: 'beam',
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.85,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        arcHeight: 0,
        startScale: 1,
        endScale: 1.8,
        baseOpacity: 0.85,
      });
    }

    // 5. Blessing / Portal Pillars (x4)
    const pillarGeo = new THREE.CylinderGeometry(0.62, 0.72, 2.8, 16, 1, true);
    pillarGeo.translate(0, 1.4, 0);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(pillarGeo, mat);
      mesh.visible = false;
      this.group.add(mesh);
      this.effects.push({
        kind: 'pillar',
        mesh,
        mat,
        active: false,
        elapsed: 0,
        duration: 0.78,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
        arcHeight: 0,
        startScale: 0.65,
        endScale: 1.25,
        baseOpacity: 0.42,
      });
    }
  }

  private acquire(kind: PoolEffectKind): PooledEffect | null {
    for (let i = 0; i < this.effects.length; i++) {
      if (this.effects[i].kind === kind && !this.effects[i].active) {
        return this.effects[i];
      }
    }
    return null;
  }

  public playShieldEffect(origin: THREE.Vector3, colorHex: number, blocked: boolean, reduced: boolean) {
    const dome = this.acquire('dome');
    if (dome) {
      dome.active = true;
      dome.elapsed = 0;
      dome.duration = blocked ? 0.72 : 0.85;
      dome.startPos.set(origin.x, 0.68, origin.z);
      dome.endPos.copy(dome.startPos);
      dome.startScale = blocked ? 1.15 : 0.45;
      dome.endScale = blocked ? 1.55 : 1.25;
      dome.baseOpacity = reduced ? 0.45 : 0.88;
      dome.mat.color.setHex(colorHex);
      dome.mesh.position.copy(dome.startPos);
      dome.mesh.visible = true;
    }

    const ring = this.acquire('ring');
    if (ring) {
      ring.active = true;
      ring.elapsed = 0;
      ring.duration = 0.62;
      ring.startPos.set(origin.x, 0.16, origin.z);
      ring.endPos.copy(ring.startPos);
      ring.startScale = 0.45;
      ring.endScale = reduced ? 1.65 : 2.35;
      ring.baseOpacity = reduced ? 0.5 : 0.9;
      ring.mat.color.setHex(colorHex);
      ring.mesh.position.copy(ring.startPos);
      ring.mesh.visible = true;
    }
  }

  public playMovementBurst(origin: THREE.Vector3, colorHex: number, isCurse: boolean, reduced: boolean) {
    const ring = this.acquire('ring');
    if (ring) {
      ring.active = true;
      ring.elapsed = 0;
      ring.duration = 0.68;
      ring.startPos.set(origin.x, 0.25, origin.z);
      ring.endPos.set(origin.x, isCurse ? 0.12 : 1.05, origin.z);
      ring.startScale = isCurse ? 2.1 : 0.35;
      ring.endScale = isCurse ? 0.45 : 2.45;
      ring.baseOpacity = reduced ? 0.45 : 0.88;
      ring.mat.color.setHex(colorHex);
      ring.mesh.position.copy(ring.startPos);
      ring.mesh.visible = true;
    }

    if (!reduced) {
      const pillar = this.acquire('pillar');
      if (pillar) {
        pillar.active = true;
        pillar.elapsed = 0;
        pillar.duration = 0.7;
        pillar.startPos.set(origin.x, 0.04, origin.z);
        pillar.endPos.copy(pillar.startPos);
        pillar.startScale = 0.55;
        pillar.endScale = 1.25;
        pillar.baseOpacity = 0.4;
        pillar.mat.color.setHex(colorHex);
        pillar.mesh.position.copy(pillar.startPos);
        pillar.mesh.visible = true;
      }
    }
  }

  public playProjectileAttack(
    from: THREE.Vector3,
    to: THREE.Vector3,
    blocked: boolean,
    reduced: boolean,
  ) {
    const proj = this.acquire('projectile');
    if (proj) {
      proj.active = true;
      proj.elapsed = 0;
      proj.duration = 0.38;
      proj.startPos.set(from.x, 0.85, from.z);
      proj.endPos.set(to.x, 0.72, to.z);
      proj.arcHeight = 1.4;
      proj.startScale = 0.85;
      proj.endScale = 1.3;
      proj.baseOpacity = 0.96;
      proj.mat.color.setHex(0xf43f5e);
      proj.mesh.position.copy(proj.startPos);
      proj.mesh.visible = true;
    }

    const impactRing = this.acquire('ring');
    if (impactRing) {
      impactRing.active = true;
      impactRing.elapsed = -0.32; // slight delay until projectile lands
      impactRing.duration = 0.58;
      impactRing.startPos.set(to.x, 0.22, to.z);
      impactRing.endPos.copy(impactRing.startPos);
      impactRing.startScale = 0.4;
      impactRing.endScale = reduced ? 1.8 : 2.7;
      impactRing.baseOpacity = reduced ? 0.5 : 0.95;
      impactRing.mat.color.setHex(blocked ? 0x60a5fa : 0xf43f5e);
      impactRing.mesh.visible = false;
    }
  }

  public playSupportAura(
    origin: THREE.Vector3,
    allyPos: THREE.Vector3 | null,
    colorHex: number,
    reduced: boolean,
  ) {
    const pillar = this.acquire('pillar');
    if (pillar) {
      pillar.active = true;
      pillar.elapsed = 0;
      pillar.duration = 0.82;
      pillar.startPos.set(origin.x, 0.04, origin.z);
      pillar.endPos.copy(pillar.startPos);
      pillar.startScale = 0.65;
      pillar.endScale = 1.35;
      pillar.baseOpacity = reduced ? 0.24 : 0.44;
      pillar.mat.color.setHex(colorHex);
      pillar.mesh.position.copy(pillar.startPos);
      pillar.mesh.visible = true;
    }

    const ring = this.acquire('ring');
    if (ring) {
      ring.active = true;
      ring.elapsed = 0;
      ring.duration = 0.72;
      ring.startPos.set(origin.x, 0.15, origin.z);
      ring.endPos.set(origin.x, 0.85, origin.z);
      ring.startScale = 0.45;
      ring.endScale = reduced ? 1.7 : 2.4;
      ring.baseOpacity = reduced ? 0.48 : 0.9;
      ring.mat.color.setHex(colorHex);
      ring.mesh.position.copy(ring.startPos);
      ring.mesh.visible = true;
    }

    if (allyPos && !reduced) {
      const beam = this.acquire('beam');
      if (beam) {
        beam.active = true;
        beam.elapsed = 0;
        beam.duration = 0.8;
        beam.startPos.set(origin.x, 0.78, origin.z);
        beam.endPos.set(allyPos.x, 0.78, allyPos.z);
        beam.startScale = 1.0;
        beam.endScale = 1.8;
        beam.baseOpacity = 0.86;
        beam.mat.color.setHex(colorHex);
        beam.mesh.visible = true;
      }
    }
  }

  public update(dt: number) {
    for (let i = 0; i < this.effects.length; i++) {
      const e = this.effects[i];
      if (!e.active) continue;

      e.elapsed += dt;
      if (e.elapsed < 0) {
        e.mesh.visible = false;
        continue;
      }

      const t = Math.min(1, e.elapsed / e.duration);
      if (t >= 1) {
        e.active = false;
        e.mesh.visible = false;
        continue;
      }

      e.mesh.visible = true;
      const easeOut = 1 - Math.pow(1 - t, 3);
      const fade = Math.sin(t * Math.PI);

      if (e.kind === 'dome') {
        const s = THREE.MathUtils.lerp(e.startScale, e.endScale, easeOut);
        e.mesh.scale.setScalar(s);
        e.mesh.rotation.y += dt * 2.4;
        e.mat.opacity = e.baseOpacity * (1 - t);
      } else if (e.kind === 'ring') {
        const s = THREE.MathUtils.lerp(e.startScale, e.endScale, easeOut);
        e.mesh.scale.setScalar(s);
        e.mesh.position.lerpVectors(e.startPos, e.endPos, easeOut);
        e.mat.opacity = e.baseOpacity * (1 - t);
      } else if (e.kind === 'projectile') {
        e.mesh.position.lerpVectors(e.startPos, e.endPos, t);
        e.mesh.position.y += Math.sin(t * Math.PI) * e.arcHeight;
        e.mesh.rotation.x += dt * 9;
        e.mesh.rotation.y += dt * 11;
        const s = THREE.MathUtils.lerp(e.startScale, e.endScale, fade);
        e.mesh.scale.setScalar(s);
        e.mat.opacity = e.baseOpacity;
      } else if (e.kind === 'beam') {
        _tmpVecA.copy(e.startPos);
        _tmpVecB.copy(e.endPos);
        const dist = Math.max(0.25, _tmpVecA.distanceTo(_tmpVecB));
        _tmpMid.addVectors(_tmpVecA, _tmpVecB).multiplyScalar(0.5);
        e.mesh.position.copy(_tmpMid);
        _tmpVecB.sub(_tmpVecA).normalize();
        e.mesh.quaternion.setFromUnitVectors(_upVec, _tmpVecB);
        const radiusScale = THREE.MathUtils.lerp(e.startScale, e.endScale, fade);
        e.mesh.scale.set(radiusScale, dist, radiusScale);
        e.mat.opacity = e.baseOpacity * fade;
      } else if (e.kind === 'pillar') {
        const rad = THREE.MathUtils.lerp(e.startScale, e.endScale, easeOut);
        e.mesh.scale.set(rad, 0.8 + fade * 0.45, rad);
        e.mesh.rotation.y += dt * 1.8;
        e.mat.opacity = e.baseOpacity * fade;
      }
    }
  }

  public dispose() {
    for (let i = 0; i < this.effects.length; i++) {
      const m = this.effects[i].mesh as THREE.Mesh;
      m.geometry?.dispose();
      this.effects[i].mat.dispose();
    }
    this.effects = [];
  }
}
