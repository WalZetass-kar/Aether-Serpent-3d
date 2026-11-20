import * as THREE from 'three';

interface SparkleParticle {
  active: boolean;
  delay: number;
  age: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  anchorX: number;
  anchorZ: number;
  vx: number;
  vy: number;
  vz: number;
  drag: number;
  gravity: number;
  swirlSpeed: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  baseSize: number;
  twinkleFreq: number;
  twinklePhase: number;
  r: number;
  g: number;
  b: number;
}

const MAX_SPARKLES = 240;

// Curated golden Aether palette (champagne core, bright gold, warm amber)
const GOLD_PALETTE_HEX = [0xfffbeb, 0xfef3c7, 0xfde68a, 0xfbbf24, 0xf59e0b, 0xfcd34d];

// Critical Roll 6 'Magic Dust' palette (celestial gold, champagne, arcane violet, cyan, rose spark)
const MAGIC_DUST_PALETTE_HEX = [
  0xfffbeb,
  0xfde047,
  0xfbbf24,
  0xc084fc,
  0x67e8f9,
  0xf59e0b,
  0xf9a8d4,
  0xe0f2fe,
];

const _tmpColor = new THREE.Color();

function createSparkleStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const c = size * 0.5;
    ctx.clearRect(0, 0, size, size);

    // 1. Soft radial golden aura
    const aura = ctx.createRadialGradient(c, c, 1, c, c, c);
    aura.addColorStop(0, 'rgba(255, 253, 240, 1)');
    aura.addColorStop(0.24, 'rgba(253, 224, 71, 0.85)');
    aura.addColorStop(0.55, 'rgba(245, 158, 11, 0.28)');
    aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, size, size);

    // 2. Crisp 4-point star glint rays
    ctx.save();
    ctx.translate(c, c);
    ctx.fillStyle = 'rgba(255, 255, 245, 0.96)';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -c * 0.88);
      ctx.quadraticCurveTo(c * 0.08, -c * 0.08, c * 0.88, 0);
      ctx.quadraticCurveTo(c * 0.08, c * 0.08, 0, c * 0.88);
      ctx.quadraticCurveTo(-c * 0.08, c * 0.08, -c * 0.88, 0);
      ctx.quadraticCurveTo(-c * 0.08, -c * 0.08, 0, -c * 0.88);
      ctx.closePath();
      ctx.fill();
      ctx.rotate(Math.PI / 4);
      ctx.scale(0.52, 0.52);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.72)';
    }
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const VERTEX_SHADER = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;

  uniform float uPixelRatio;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float dist = max(1.0, -mvPosition.z);
    gl_PointSize = clamp((aSize * uPixelRatio * 240.0) / dist, 0.0, 74.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uSprite;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    if (vAlpha <= 0.005) discard;
    vec4 tex = texture2D(uSprite, gl_PointCoord);
    float alpha = tex.a * vAlpha;
    if (alpha <= 0.005) discard;
    gl_FragColor = vec4(tex.rgb * vColor * 1.32, alpha);
  }
`;

/**
 * Dedicated zero-GC GPU particle system for golden 'Aether Sparkle' motes
 * and critical-roll 'Magic Dust' explosions around the settled 3D dice.
 */
export class AetherSparkleSystem {
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private spriteTex: THREE.CanvasTexture;

  private positions = new Float32Array(MAX_SPARKLES * 3);
  private colors = new Float32Array(MAX_SPARKLES * 3);
  private sizes = new Float32Array(MAX_SPARKLES);
  private alphas = new Float32Array(MAX_SPARKLES);

  private pool: SparkleParticle[] = [];
  private cursor = 0;
  private activeCount = 0;

  constructor(scene: THREE.Scene, pixelRatio = 1) {
    this.spriteTex = createSparkleStarTexture();

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    for (let i = 0; i < MAX_SPARKLES; i++) {
      this.positions[i * 3 + 1] = -100;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
      this.pool.push({
        active: false,
        delay: 0,
        age: 0,
        maxLife: 1.5,
        x: 0,
        y: -100,
        z: 0,
        anchorX: 0,
        anchorZ: 0,
        vx: 0,
        vy: 1,
        vz: 0,
        drag: 1.15,
        gravity: 0,
        swirlSpeed: 0,
        swayAmp: 0.25,
        swayFreq: 3.2,
        swayPhase: 0,
        baseSize: 1.0,
        twinkleFreq: 8,
        twinklePhase: 0,
        r: 1,
        g: 0.85,
        b: 0.35,
      });
    }

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSprite: { value: this.spriteTex },
        uPixelRatio: { value: Math.min(2, Math.max(1, pixelRatio)) },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.name = 'DiceAetherSparkles';
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  public setPixelRatio(pr: number) {
    this.material.uniforms.uPixelRatio.value = Math.min(2, Math.max(1, pr));
  }

  /**
   * Emits golden 'Aether Sparkle' motes rising gracefully from the revealed dice face.
   */
  public emitFromDice(origin: THREE.Vector3, faceValue: number, reduced = false) {
    const isHighRoll = faceValue >= 6;
    const count = reduced
      ? isHighRoll
        ? 18
        : 12
      : isHighRoll
        ? 36
        : 28;

    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      const p = this.pool[idx];
      this.cursor = (this.cursor + 1) % MAX_SPARKLES;
      if (!p.active) {
        this.activeCount++;
      }

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const radial = Math.sqrt(Math.random()) * (isHighRoll ? 0.86 : 0.72);
      const waveDelay = i < count * 0.58 ? Math.random() * 0.08 : 0.09 + Math.random() * 0.28;

      const hex = GOLD_PALETTE_HEX[i % GOLD_PALETTE_HEX.length];
      _tmpColor.setHex(hex);

      p.active = true;
      p.delay = waveDelay;
      p.age = 0;
      p.maxLife = (isHighRoll ? 1.55 : 1.35) + Math.random() * 0.75;

      p.anchorX = origin.x;
      p.anchorZ = origin.z;
      p.x = origin.x + Math.cos(angle) * radial;
      p.y = origin.y + 0.42 + Math.random() * 0.28;
      p.z = origin.z + Math.sin(angle) * radial;

      const drift = 0.14 + Math.random() * 0.34;
      p.vx = Math.cos(angle) * drift;
      p.vy = (isHighRoll ? 1.15 : 0.92) + Math.random() * 0.88;
      p.vz = Math.sin(angle) * drift;
      p.drag = 1.15;
      p.gravity = 0;
      p.swirlSpeed = 0;

      p.swayAmp = 0.18 + Math.random() * 0.34;
      p.swayFreq = 2.2 + Math.random() * 2.6;
      p.swayPhase = Math.random() * Math.PI * 2;

      p.baseSize = (isHighRoll ? 1.15 : 0.92) + Math.random() * 0.95;
      p.twinkleFreq = 6.5 + Math.random() * 7.5;
      p.twinklePhase = Math.random() * Math.PI * 2;

      p.r = _tmpColor.r;
      p.g = _tmpColor.g;
      p.b = _tmpColor.b;

      const i3 = idx * 3;
      this.colors[i3] = p.r;
      this.colors[i3 + 1] = p.g;
      this.colors[i3 + 2] = p.b;
    }

    (this.geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
  }

  /**
   * Emits a multi-wave 3D 'Magic Dust' explosion around the dice on a critical roll of 6:
   * fast spherical burst -> aerodynamic slowdown -> swirling enchanted embers.
   */
  public explodeMagicDust(origin: THREE.Vector3, reduced = false) {
    const count = reduced ? 48 : 108;

    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      const p = this.pool[idx];
      this.cursor = (this.cursor + 1) % MAX_SPARKLES;
      if (!p.active) {
        this.activeCount++;
      }

      const layer = i < count * 0.45 ? 0 : i < count * 0.8 ? 1 : 2;
      const azimuth = (Math.PI * 2 * i) / Math.max(1, count * 0.35) + (Math.random() - 0.5) * 0.65;
      const elev =
        layer === 0
          ? -0.15 + Math.random() * 1.15
          : layer === 1
            ? 0.05 + Math.random() * 0.65
            : 0.35 + Math.random() * 0.95;

      const cosE = Math.cos(elev);
      const dirX = Math.cos(azimuth) * cosE;
      const dirY = Math.sin(elev);
      const dirZ = Math.sin(azimuth) * cosE;

      const speed =
        layer === 0
          ? 3.8 + Math.random() * 3.1
          : layer === 1
            ? 2.1 + Math.random() * 2.2
            : 1.2 + Math.random() * 1.5;

      const hex = MAGIC_DUST_PALETTE_HEX[i % MAGIC_DUST_PALETTE_HEX.length];
      _tmpColor.setHex(hex);

      p.active = true;
      p.delay = layer === 0 ? 0 : layer === 1 ? Math.random() * 0.06 : 0.07 + Math.random() * 0.22;
      p.age = 0;
      p.maxLife =
        layer === 0
          ? 1.05 + Math.random() * 0.5
          : layer === 1
            ? 1.45 + Math.random() * 0.65
            : 1.7 + Math.random() * 0.7;

      const startRad = 0.18 + Math.random() * 0.34;
      p.anchorX = origin.x;
      p.anchorZ = origin.z;
      p.x = origin.x + dirX * startRad;
      p.y = origin.y + 0.35 + Math.random() * 0.25;
      p.z = origin.z + dirZ * startRad;

      p.vx = dirX * speed;
      p.vy = Math.max(0.45, dirY * speed) + (layer === 2 ? 0.9 : 0.4);
      p.vz = dirZ * speed;

      // Strong aerodynamic drag stops radial burst in mid-air so motes hang like magic dust
      p.drag = layer === 0 ? 3.2 : layer === 1 ? 2.5 : 1.7;
      p.gravity = layer === 0 ? 0.45 : -0.45; // slight buoyancy on vortex/ember layers
      p.swirlSpeed = layer === 1 ? (i % 2 === 0 ? 1 : -1) * (1.8 + Math.random() * 1.8) : (Math.random() - 0.5) * 1.4;

      p.swayAmp = 0.26 + Math.random() * 0.42;
      p.swayFreq = 2.8 + Math.random() * 3.2;
      p.swayPhase = Math.random() * Math.PI * 2;

      p.baseSize =
        layer === 0
          ? 1.25 + Math.random() * 0.9
          : layer === 1
            ? 1.45 + Math.random() * 1.05
            : 0.95 + Math.random() * 0.9;
      p.twinkleFreq = 9.0 + Math.random() * 9.0;
      p.twinklePhase = Math.random() * Math.PI * 2;

      p.r = _tmpColor.r;
      p.g = _tmpColor.g;
      p.b = _tmpColor.b;

      const i3 = idx * 3;
      this.colors[i3] = p.r;
      this.colors[i3 + 1] = p.g;
      this.colors[i3 + 2] = p.b;
    }

    (this.geometry.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
  }

  public update(dt: number, elapsed: number) {
    if (this.activeCount <= 0) return;

    let anyDirty = false;
    for (let i = 0; i < MAX_SPARKLES; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      anyDirty = true;

      if (p.delay > 0) {
        p.delay = Math.max(0, p.delay - dt);
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }

      p.age += dt;
      if (p.age >= p.maxLife) {
        p.active = false;
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        this.positions[i * 3 + 1] = -100;
        continue;
      }

      const t = p.age / p.maxLife;

      // Aerodynamic damping + subtle gravity/buoyancy
      const damp = Math.max(0, 1 - p.drag * dt);
      p.vx *= damp;
      p.vz *= damp;
      p.vy = (p.vy - p.gravity * dt) * Math.max(0, 1 - 0.55 * dt);

      // Tangential magic vortex swirl around the explosion anchor
      let swirlX = 0;
      let swirlZ = 0;
      if (p.swirlSpeed !== 0) {
        const rx = p.x - p.anchorX;
        const rz = p.z - p.anchorZ;
        const swirlRamp = Math.min(1, p.age / 0.25) * (1 - t * 0.45);
        swirlX = -rz * p.swirlSpeed * swirlRamp * dt;
        swirlZ = rx * p.swirlSpeed * swirlRamp * dt;
      }

      const swayX = Math.cos(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp * dt;
      const swayZ = Math.sin(elapsed * p.swayFreq + p.swayPhase) * p.swayAmp * dt;

      p.x += p.vx * dt + swayX + swirlX;
      p.y += p.vy * dt;
      p.z += p.vz * dt + swayZ + swirlZ;

      const i3 = i * 3;
      this.positions[i3] = p.x;
      this.positions[i3 + 1] = p.y;
      this.positions[i3 + 2] = p.z;

      // Fast punchy flash-in (first 8%), then sparkling dust fade-out
      const fadeIn = Math.min(1, t / 0.08);
      const fadeOut = Math.pow(Math.max(0, 1 - Math.max(0, (t - 0.14) / 0.86)), 1.45);
      const twinkle = 0.68 + 0.32 * Math.sin(elapsed * p.twinkleFreq + p.twinklePhase);

      this.alphas[i] = fadeIn * fadeOut * twinkle;
      this.sizes[i] = p.baseSize * (0.7 + 0.55 * fadeIn) * (0.5 + 0.5 * (1 - t * 0.5));
    }

    if (anyDirty) {
      (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.getAttribute('aSize') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  public dispose() {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
    this.spriteTex.dispose();
  }
}
