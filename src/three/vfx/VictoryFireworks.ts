import * as THREE from 'three';

const MAX_ROCKETS = 12;
const MAX_SPARKS = 640;

interface FireworkRocket {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  targetY: number;
  trailTimer: number;
  primaryColor: THREE.Color;
  secondaryColor: THREE.Color;
  ringStyle: boolean;
}

interface FireworkSpark {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  age: number;
  maxLife: number;
  size: number;
  drag: number;
  gravity: number;
  twinklePhase: number;
}

const FIREWORK_PALETTES: Array<[number, number]> = [
  [0xfde047, 0xf59e0b], // Royal Gold & Amber
  [0x34d399, 0xfef08a], // Emerald & Gold
  [0x38bdf8, 0xc084fc], // Aether Sky & Violet
  [0xfb7185, 0xfde047], // Crimson Rose & Star Gold
  [0xc084fc, 0x38bdf8], // Imperial Amethyst & Cyan
  [0xfbbf24, 0xffffff], // Solar Crown & Starlight
];

/**
 * Celebratory 3D Fireworks System orbiting and bursting around the winning player's avatar
 * when the VictoryModal opens. Uses a pre-allocated zero-GC particle pool and custom
 * additive glowing starburst shader.
 */
export class VictoryFireworksSystem {
  private readonly points: THREE.Points;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly sizes: Float32Array;
  private readonly alphas: Float32Array;

  private readonly rockets: FireworkRocket[] = [];
  private readonly sparks: FireworkSpark[] = [];
  private sparkCursor = 0;

  private active = false;
  private anchor = new THREE.Vector3(0, 0, 0);
  private launchCooldown = 0;
  private emberCooldown = 0;
  private paletteCursor = 0;
  private reducedEffects = false;

  constructor(parent: THREE.Object3D) {
    this.positions = new Float32Array(MAX_SPARKS * 3);
    this.colors = new Float32Array(MAX_SPARKS * 3);
    this.sizes = new Float32Array(MAX_SPARKS);
    this.alphas = new Float32Array(MAX_SPARKS);

    for (let i = 0; i < MAX_ROCKETS; i++) {
      this.rockets.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        targetY: 4,
        trailTimer: 0,
        primaryColor: new THREE.Color(0xfde047),
        secondaryColor: new THREE.Color(0xf59e0b),
        ringStyle: false,
      });
    }

    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 0.9,
        b: 0.4,
        age: 0,
        maxLife: 1,
        size: 1,
        drag: 0.96,
        gravity: 3.2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
      this.positions[i * 3 + 1] = -100;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = max(1.0, -mvPosition.z);
          gl_PointSize = clamp((aSize * 210.0 * uPixelRatio) / dist, 0.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          if (vAlpha <= 0.01) discard;
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;

          // Radiant 4-point star flare + soft glowing core
          float core = exp(-d * d * 24.0);
          float halo = smoothstep(0.5, 0.0, d) * 0.55;
          float crossRay = exp(-abs(uv.x) * 26.0) * exp(-abs(uv.y) * 5.0)
                         + exp(-abs(uv.y) * 26.0) * exp(-abs(uv.x) * 5.0);
          float glow = clamp(core * 1.35 + halo + crossRay * 0.45, 0.0, 1.8);

          vec3 col = mix(vColor, vec3(1.0, 0.99, 0.92), clamp(core * 0.72, 0.0, 0.8));
          gl_FragColor = vec4(col * glow, vAlpha * smoothstep(0.5, 0.05, d));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 22;
    this.points.visible = false;
    parent.add(this.points);
  }

  public start(anchorWorldPos: THREE.Vector3, reducedEffects = false) {
    this.anchor.copy(anchorWorldPos);
    this.reducedEffects = reducedEffects;
    const wasActive = this.active;
    this.active = true;
    this.points.visible = true;

    if (!wasActive) {
      // Opening celebratory salvo right around the winner's avatar!
      this.launchRocket(0, 1.55);
      this.launchRocket((Math.PI * 2) / 3, 2.35);
      if (!reducedEffects) {
        this.launchRocket((Math.PI * 4) / 3, 2.9);
      }
      this.launchCooldown = reducedEffects ? 0.65 : 0.36;
      this.emberCooldown = 0.06;
    }
  }

  public updateAnchor(anchorWorldPos: THREE.Vector3) {
    this.anchor.copy(anchorWorldPos);
  }

  public stop(immediate = false) {
    this.active = false;
    if (immediate) {
      for (let i = 0; i < MAX_ROCKETS; i++) {
        this.rockets[i].active = false;
      }
      for (let i = 0; i < MAX_SPARKS; i++) {
        this.sparks[i].active = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        this.positions[i * 3 + 1] = -100;
      }
      this.points.visible = false;
      this.markAttributesDirty();
    }
  }

  private allocSpark(): FireworkSpark {
    const s = this.sparks[this.sparkCursor];
    this.sparkCursor = (this.sparkCursor + 1) % MAX_SPARKS;
    return s;
  }

  private launchRocket(forcedAngle?: number, forcedRadius?: number) {
    let slot: FireworkRocket | null = null;
    for (let i = 0; i < MAX_ROCKETS; i++) {
      if (!this.rockets[i].active) {
        slot = this.rockets[i];
        break;
      }
    }
    if (!slot) return;

    const angle = forcedAngle ?? Math.random() * Math.PI * 2;
    const radius = forcedRadius ?? 1.25 + Math.random() * 2.45;
    const startX = this.anchor.x + Math.cos(angle) * radius;
    const startZ = this.anchor.z + Math.sin(angle) * radius;

    const palette = FIREWORK_PALETTES[this.paletteCursor % FIREWORK_PALETTES.length];
    this.paletteCursor++;

    slot.active = true;
    slot.pos.set(startX, Math.max(0.25, this.anchor.y + 0.25), startZ);
    slot.vel.set(
      (Math.random() - 0.5) * 0.65,
      6.4 + Math.random() * 2.4,
      (Math.random() - 0.5) * 0.65,
    );
    slot.targetY = this.anchor.y + 3.0 + Math.random() * 2.4;
    slot.trailTimer = 0;
    slot.primaryColor.setHex(palette[0]);
    slot.secondaryColor.setHex(palette[1]);
    slot.ringStyle = Math.random() < 0.36;
  }

  private detonateRocket(r: FireworkRocket) {
    r.active = false;
    const count = this.reducedEffects ? 34 : 62;
    const baseSpeed = 2.4 + Math.random() * 1.4;

    // Bright central flash spark
    const flash = this.allocSpark();
    flash.active = true;
    flash.x = r.pos.x;
    flash.y = r.pos.y;
    flash.z = r.pos.z;
    flash.vx = 0;
    flash.vy = 0.2;
    flash.vz = 0;
    flash.r = 1;
    flash.g = 0.98;
    flash.b = 0.88;
    flash.age = 0;
    flash.maxLife = 0.28;
    flash.size = 3.2;
    flash.drag = 0.92;
    flash.gravity = 0.2;
    flash.twinklePhase = 0;

    for (let i = 0; i < count; i++) {
      const s = this.allocSpark();
      s.active = true;
      s.x = r.pos.x;
      s.y = r.pos.y;
      s.z = r.pos.z;

      let dx = 0;
      let dy = 0;
      let dz = 0;

      if (r.ringStyle && i < count * 0.65) {
        // Horizontal celebratory crown ring
        const theta = (i / (count * 0.65)) * Math.PI * 2 + Math.random() * 0.14;
        dx = Math.cos(theta);
        dy = (Math.random() - 0.5) * 0.28;
        dz = Math.sin(theta);
      } else {
        // Full 3D spherical chrysanthemum shell
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.max(0, 1 - u * u));
        dx = rad * Math.cos(theta);
        dy = u;
        dz = rad * Math.sin(theta);
      }

      const speedJitter = 0.55 + Math.random() * 0.72;
      const speed = baseSpeed * speedJitter;
      s.vx = dx * speed;
      s.vy = dy * speed + 0.55;
      s.vz = dz * speed;

      const useSecondary = i % 3 === 0;
      const c = useSecondary ? r.secondaryColor : r.primaryColor;
      s.r = c.r;
      s.g = c.g;
      s.b = c.b;
      s.age = 0;
      s.maxLife = 0.85 + Math.random() * 0.75;
      s.size = useSecondary ? 0.95 + Math.random() * 0.45 : 1.15 + Math.random() * 0.6;
      s.drag = 0.962;
      s.gravity = 2.6 + Math.random() * 0.9;
      s.twinklePhase = Math.random() * Math.PI * 2;
    }
  }

  private spawnTrailSpark(r: FireworkRocket) {
    const s = this.allocSpark();
    s.active = true;
    s.x = r.pos.x + (Math.random() - 0.5) * 0.08;
    s.y = r.pos.y;
    s.z = r.pos.z + (Math.random() - 0.5) * 0.08;
    s.vx = (Math.random() - 0.5) * 0.45;
    s.vy = -0.7 - Math.random() * 0.5;
    s.vz = (Math.random() - 0.5) * 0.45;
    s.r = 1.0;
    s.g = 0.88;
    s.b = 0.45;
    s.age = 0;
    s.maxLife = 0.28 + Math.random() * 0.18;
    s.size = 0.78;
    s.drag = 0.94;
    s.gravity = 1.4;
    s.twinklePhase = Math.random() * Math.PI * 2;
  }

  private spawnAvatarAuraSpark() {
    const angle = Math.random() * Math.PI * 2;
    const rad = 0.55 + Math.random() * 0.65;
    const s = this.allocSpark();
    s.active = true;
    s.x = this.anchor.x + Math.cos(angle) * rad;
    s.y = this.anchor.y + 0.15 + Math.random() * 0.45;
    s.z = this.anchor.z + Math.sin(angle) * rad;
    s.vx = -Math.sin(angle) * 0.55;
    s.vy = 1.35 + Math.random() * 0.85;
    s.vz = Math.cos(angle) * 0.55;
    s.r = 1.0;
    s.g = 0.86;
    s.b = 0.34;
    s.age = 0;
    s.maxLife = 0.85 + Math.random() * 0.45;
    s.size = 0.85 + Math.random() * 0.35;
    s.drag = 0.985;
    s.gravity = -0.15;
    s.twinklePhase = Math.random() * Math.PI * 2;
  }

  public update(dt: number, elapsed: number) {
    if (!this.points.visible) return;
    const safeDt = Math.min(dt, 0.05);

    if (this.active) {
      this.launchCooldown -= safeDt;
      if (this.launchCooldown <= 0) {
        this.launchRocket();
        if (!this.reducedEffects && Math.random() < 0.32) {
          this.launchRocket();
        }
        this.launchCooldown = this.reducedEffects
          ? 0.72 + Math.random() * 0.45
          : 0.38 + Math.random() * 0.36;
      }

      this.emberCooldown -= safeDt;
      if (this.emberCooldown <= 0) {
        this.spawnAvatarAuraSpark();
        this.emberCooldown = this.reducedEffects ? 0.14 : 0.065;
      }
    }

    let anyAlive = this.active;

    // Update climbing rockets
    for (let i = 0; i < MAX_ROCKETS; i++) {
      const r = this.rockets[i];
      if (!r.active) continue;
      anyAlive = true;

      r.vel.y -= 2.4 * safeDt;
      r.pos.addScaledVector(r.vel, safeDt);
      r.trailTimer -= safeDt;
      if (r.trailTimer <= 0) {
        this.spawnTrailSpark(r);
        r.trailTimer = 0.025;
      }

      if (r.pos.y >= r.targetY || r.vel.y <= 0.45) {
        this.detonateRocket(r);
      }
    }

    // Update burst sparks
    const dragPow = safeDt * 60;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        if (this.alphas[i] !== 0) {
          this.alphas[i] = 0;
          this.sizes[i] = 0;
          this.positions[i * 3 + 1] = -100;
        }
        continue;
      }

      s.age += safeDt;
      if (s.age >= s.maxLife) {
        s.active = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        this.positions[i * 3 + 1] = -100;
        continue;
      }

      anyAlive = true;
      const damp = Math.pow(s.drag, dragPow);
      s.vx *= damp;
      s.vy = s.vy * damp - s.gravity * safeDt;
      s.vz *= damp;

      s.x += s.vx * safeDt;
      s.y += s.vy * safeDt;
      s.z += s.vz * safeDt;

      const t = s.age / s.maxLife;
      const fade = Math.pow(Math.max(0, 1 - t), 1.45);
      const twinkle = 0.72 + 0.28 * Math.sin(elapsed * 22 + s.twinklePhase);

      this.positions[i * 3] = s.x;
      this.positions[i * 3 + 1] = s.y;
      this.positions[i * 3 + 2] = s.z;
      this.colors[i * 3] = s.r;
      this.colors[i * 3 + 1] = s.g;
      this.colors[i * 3 + 2] = s.b;
      this.sizes[i] = s.size * (0.45 + 0.55 * fade);
      this.alphas[i] = fade * twinkle;
    }

    this.markAttributesDirty();

    if (!anyAlive) {
      this.points.visible = false;
    }
  }

  private markAttributesDirty() {
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose() {
    this.points.parent?.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
