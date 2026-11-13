import * as THREE from 'three';
import {
  createFoliageAtlasTextures,
  createMistSpriteTexture,
} from './pbrTextures';

export interface WaterEnvHandle {
  group: THREE.Group;
  update: (elapsed: number) => void;
  dispose: () => void;
}

const _vec3 = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

interface FireflySpec {
  bx: number;
  by: number;
  bz: number;
  phase: number;
  speed: number;
  scale: number;
}

interface DropletSpec {
  angle: number;
  radius: number;
  speed: number;
  phase: number;
  arcH: number;
}

interface MistSpec {
  angle: number;
  radius: number;
  speed: number;
  phase: number;
}

export function buildWaterAndEnvironment(maxAnisotropy: number): WaterEnvHandle {
  const group = new THREE.Group();
  group.name = 'water_and_environment';

  const uTime = { value: 0 };
  const mistTex = createMistSpriteTexture();
  const atlas = createFoliageAtlasTextures(maxAnisotropy);

  // 1. Twilight Gradient Sky Dome
  const skyGeo = new THREE.SphereGeometry(85, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color(0x030712) },
      uMidColor: { value: new THREE.Color(0x0f172a) },
      uHorizonColor: { value: new THREE.Color(0x164e63) },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uMidColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPos;
      void main() {
        float h = clamp(normalize(vWorldPos).y, 0.0, 1.0);
        vec3 col = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
        col = mix(col, uTopColor, smoothstep(0.28, 0.85, h));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyDome);

  // 2. Distant Starfield
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = ((i * 137.5) % 360) * (Math.PI / 180);
    const r = 46 + (i % 15) * 2.1;
    const y = 10 + ((i * 19) % 28);
    starPos[i * 3] = Math.cos(theta) * r;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = Math.sin(theta) * r - 10;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 0.24,
    transparent: true,
    opacity: 0.78,
  });
  group.add(new THREE.Points(starGeo, starMat));

  // 3. Realistic PBR Lagoon & Outflow Stream Surface
  // Custom onBeforeCompile shader: multi-directional ripple waves, Fresnel reflection,
  // depth absorption (teal shore -> deep sapphire center), and churn foam around waterfall plunge.
  const lakeGeo = new THREE.PlaneGeometry(24, 24, 96, 96);
  lakeGeo.rotateX(-Math.PI / 2);

  const lakeMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c4a6e,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.9,
  });

  lakeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vWaterWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vec4 wPos0 = modelMatrix * vec4(transformed, 1.0);
         float distPlunge = length(wPos0.xz - vec2(0.0, -9.2));
         float ripple1 = sin(wPos0.x * 2.1 + uTime * 2.2) * cos(wPos0.z * 1.9 - uTime * 1.8) * 0.025;
         float ripple2 = sin(distPlunge * 3.8 - uTime * 5.2) * exp(-distPlunge * 0.24) * 0.055;
         transformed.y += ripple1 + ripple2;
         vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec3 vWaterWorld;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         // Radial depth profile inside lagoon centered around (0, -4.4)
         float lx = vWaterWorld.x / 7.2;
         float lz = (vWaterWorld.z + 4.35) / 5.1;
         float basinR = sqrt(lx * lx + lz * lz);
         float depthFactor = clamp(1.0 - basinR, 0.0, 1.0);
         vec3 deepCol = vec3(0.03, 0.14, 0.28);
         vec3 shallowCol = vec3(0.06, 0.36, 0.42);
         diffuseColor.rgb = mix(shallowCol, deepCol, smoothstep(0.05, 0.72, depthFactor));

         // Multi-layered procedural wave sparkle + plunge foam
         float w1 = sin(vWaterWorld.x * 5.4 + uTime * 2.6 + sin(vWaterWorld.z * 3.2)) * 0.5 + 0.5;
         float w2 = cos(vWaterWorld.z * 6.8 - uTime * 3.1 + sin(vWaterWorld.x * 2.9)) * 0.5 + 0.5;
         float caustics = pow(w1 * w2, 2.5) * 0.22;
         diffuseColor.rgb += vec3(0.15, 0.45, 0.58) * caustics;

         // Frothy ring where waterfall hits lagoon at (0, -9.2)
         float dPlunge = length(vWaterWorld.xz - vec2(0.0, -9.2));
         float foamNoise = sin(dPlunge * 9.0 - uTime * 6.0 + vWaterWorld.x * 4.0) * 0.5 + 0.5;
         float plungeFoam = exp(-dPlunge * 0.68) * (0.55 + 0.45 * foamNoise);
         float shoreFoam = smoothstep(0.84, 0.98, basinR) * (0.4 + 0.35 * sin(vWaterWorld.x * 5.0 + uTime * 2.0));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.95, 1.0), clamp(plungeFoam + shoreFoam * 0.28, 0.0, 0.85));`,
      );
  };

  const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
  lakeMesh.position.set(0, -0.08, -2.6);
  lakeMesh.receiveShadow = true;
  group.add(lakeMesh);

  // 4. Multi-Layered Waterfall Cascade (x=0, plunging from cliff lip z=-10.8 into z=-9.2)
  const fallGeo = new THREE.PlaneGeometry(3.4, 6.2, 20, 28);
  const fPos = fallGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const y = fPos.getY(i);
    const x = fPos.getX(i);
    const t = Math.max(0, Math.min(1, 1 - (y + 3.1) / 6.2)); // 0 at top lip, 1 at splash basin
    // Parabolic water arc forward + subtle rocky channel bulge
    const arcZ = Math.pow(t, 1.35) * 1.45 + Math.sin(x * 2.2) * 0.06;
    fPos.setZ(i, arcZ);
  }
  fallGeo.computeVertexNormals();

  const waterfallMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.16,
    metalness: 0.06,
    transparent: true,
    opacity: 0.86,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.22,
  });

  waterfallMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vWfUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vWfUv = uv;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         varying vec2 vWfUv;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float flow = vWfUv.y * 4.5 + uTime * 3.4;
         float streakA = sin(vWfUv.x * 26.0 + sin(flow * 1.3) * 1.4) * 0.5 + 0.5;
         float streakB = cos(vWfUv.x * 42.0 - flow * 1.9) * 0.5 + 0.5;
         float foam = smoothstep(0.45, 0.92, streakA * 0.6 + streakB * 0.4);
         float bottomChurn = smoothstep(0.28, 0.0, vWfUv.y) * 0.7;
         float edgeFade = smoothstep(0.0, 0.14, vWfUv.x) * smoothstep(1.0, 0.86, vWfUv.x);
         diffuseColor.rgb = mix(vec3(0.08, 0.46, 0.72), vec3(0.88, 0.97, 1.0), clamp(foam * 0.72 + bottomChurn, 0.0, 1.0));
         diffuseColor.a *= edgeFade;`,
      );
  };

  const innerCascade = new THREE.Mesh(fallGeo, waterfallMat);
  innerCascade.position.set(0, 2.75, -10.8);
  group.add(innerCascade);

  // Outer frothy mist veil slightly ahead of main cascade
  const outerCascadeMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const outerCascade = new THREE.Mesh(fallGeo.clone(), outerCascadeMat);
  outerCascade.position.set(0, 2.72, -10.65);
  outerCascade.scale.set(1.08, 1.0, 1.05);
  group.add(outerCascade);

  // Churning Plunge Foam Ring at base of waterfall
  const foamRingGeo = new THREE.RingGeometry(0.45, 2.45, 32);
  foamRingGeo.rotateX(-Math.PI / 2);
  const foamRingMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const plungeFoam = new THREE.Mesh(foamRingGeo, foamRingMat);
  plungeFoam.position.set(0, -0.02, -9.2);
  group.add(plungeFoam);

  // 5. Instanced Waterfall Mist Billboards (28 rising billowing mist puffs -> 1 draw call!)
  const mistCount = 28;
  const mistGeo = new THREE.PlaneGeometry(1.9, 1.6);
  const mistMat = new THREE.MeshBasicMaterial({
    map: mistTex,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mistInst = new THREE.InstancedMesh(mistGeo, mistMat, mistCount);
  mistInst.frustumCulled = false;
  const mistSpecs: MistSpec[] = [];
  for (let i = 0; i < mistCount; i++) {
    mistSpecs.push({
      angle: ((i * 137.5) % 360) * (Math.PI / 180),
      radius: 0.35 + (i % 5) * 0.42,
      speed: 0.26 + (i % 4) * 0.08,
      phase: i / mistCount,
    });
  }
  group.add(mistInst);

  // 6. Instanced Waterfall Spray Droplets (90 splashing droplets -> 1 draw call!)
  const dropCount = 90;
  const dropGeo = new THREE.OctahedronGeometry(0.04, 0);
  const dropMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.85,
  });
  const dropInst = new THREE.InstancedMesh(dropGeo, dropMat, dropCount);
  dropInst.frustumCulled = false;
  const dropSpecs: DropletSpec[] = [];
  for (let i = 0; i < dropCount; i++) {
    dropSpecs.push({
      angle: ((i * 73.1) % 360) * (Math.PI / 180),
      radius: 0.5 + ((i * 19) % 10) * 0.24,
      speed: 0.75 + (i % 6) * 0.16,
      phase: i * 0.31,
      arcH: 0.45 + (i % 5) * 0.18,
    });
  }
  group.add(dropInst);

  // 7. Instanced Floating Autumn/Enchanted Leaves drifting gently on lagoon water
  const leafCount = 28;
  const leafGeo = new THREE.PlaneGeometry(0.28, 0.28);
  leafGeo.rotateX(-Math.PI / 2);
  // Map UVs cleanly to Q4 (1,1) of Foliage Atlas (bottom-right)
  const lUv = leafGeo.attributes.uv;
  for (let i = 0; i < lUv.count; i++) {
    lUv.setXY(i, 0.52 + lUv.getX(i) * 0.46, 0.02 + lUv.getY(i) * 0.46);
  }
  const leafMat = new THREE.MeshStandardMaterial({
    map: atlas.map,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.65,
  });
  const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, leafCount);
  leafInst.frustumCulled = false;
  group.add(leafInst);

  // 8. Instanced Forest Fireflies & Arcane Sanctuary Spores
  const fireflyCount = 96;
  const ffGeo = new THREE.OctahedronGeometry(0.055, 0);
  const ffMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ffInst = new THREE.InstancedMesh(ffGeo, ffMat, fireflyCount);
  ffInst.frustumCulled = false;
  const ffSpecs: FireflySpec[] = [];
  const palette = [0xfde047, 0x34d399, 0x7dd3fc, 0xfbbf24];
  for (let i = 0; i < fireflyCount; i++) {
    ffSpecs.push({
      bx: -11 + ((i * 37) % 220) * 0.1,
      by: 0.45 + ((i * 23) % 64) * 0.1,
      bz: -11 + ((i * 41) % 180) * 0.1,
      phase: i * 0.72,
      speed: 0.62 + (i % 5) * 0.2,
      scale: 0.6 + (i % 4) * 0.25,
    });
    _color.setHex(palette[i % palette.length]);
    ffInst.setColorAt(i, _color);
  }
  if (ffInst.instanceColor) ffInst.instanceColor.needsUpdate = true;
  group.add(ffInst);

  const update = (elapsed: number) => {
    uTime.value = elapsed;

    // Plunge ring pulse
    const foamScale = 1 + Math.sin(elapsed * 4.4) * 0.08;
    plungeFoam.scale.set(foamScale, 1, foamScale);

    // Rising billowing mist
    for (let i = 0; i < mistCount; i++) {
      const m = mistSpecs[i];
      const life = (elapsed * m.speed + m.phase) % 1;
      const spread = m.radius + life * 1.45;
      _vec3.set(
        Math.cos(m.angle) * spread,
        0.15 + life * 2.4,
        -9.15 + Math.sin(m.angle) * spread * 0.55,
      );
      const s = 0.65 + Math.sin(life * Math.PI) * 1.15;
      _scaleVec.set(s, s * 0.85, s);
      _quat.identity();
      _mat4.compose(_vec3, _quat, _scaleVec);
      mistInst.setMatrixAt(i, _mat4);
    }
    mistInst.instanceMatrix.needsUpdate = true;

    // Parabolic waterfall spray droplets
    for (let i = 0; i < dropCount; i++) {
      const d = dropSpecs[i];
      const life = (elapsed * d.speed + d.phase) % 1;
      const r = d.radius * life;
      const y = -0.05 + Math.sin(life * Math.PI) * d.arcH;
      _vec3.set(Math.cos(d.angle) * r, y, -9.2 + Math.sin(d.angle) * r * 0.6);
      const s = 1 - life * 0.6;
      _scaleVec.set(s, s * 1.2, s);
      _quat.identity();
      _mat4.compose(_vec3, _quat, _scaleVec);
      dropInst.setMatrixAt(i, _mat4);
    }
    dropInst.instanceMatrix.needsUpdate = true;

    // Gentle floating leaves circling lagoon currents
    for (let i = 0; i < leafCount; i++) {
      const a = i * 1.45 + elapsed * (0.08 + (i % 3) * 0.025);
      const rx = 2.0 + (i % 5) * 0.72;
      const rz = 1.4 + (i % 4) * 0.52;
      _vec3.set(Math.cos(a) * rx, -0.045, -4.35 + Math.sin(a) * rz);
      _euler.set(0, a + i, 0);
      _quat.setFromEuler(_euler);
      const s = 0.7 + (i % 3) * 0.25;
      _scaleVec.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scaleVec);
      leafInst.setMatrixAt(i, _mat4);
    }
    leafInst.instanceMatrix.needsUpdate = true;

    // Floating forest fireflies
    for (let i = 0; i < fireflyCount; i++) {
      const f = ffSpecs[i];
      _vec3.set(
        f.bx + Math.sin(elapsed * f.speed + f.phase) * 0.85,
        f.by + Math.sin(elapsed * f.speed * 1.3 + f.phase) * 0.45,
        f.bz + Math.cos(elapsed * f.speed + f.phase) * 0.85,
      );
      const pulse = f.scale * (0.62 + 0.45 * Math.sin(elapsed * 3.1 + f.phase));
      _scaleVec.set(pulse, pulse, pulse);
      _quat.identity();
      _mat4.compose(_vec3, _quat, _scaleVec);
      ffInst.setMatrixAt(i, _mat4);
    }
    ffInst.instanceMatrix.needsUpdate = true;
  };

  const dispose = () => {
    mistTex.dispose();
    atlas.map.dispose();
    atlas.normalMap.dispose();
    skyGeo.dispose();
    skyMat.dispose();
    starGeo.dispose();
    starMat.dispose();
    lakeGeo.dispose();
    lakeMat.dispose();
    fallGeo.dispose();
    waterfallMat.dispose();
    outerCascade.geometry.dispose();
    outerCascadeMat.dispose();
    foamRingGeo.dispose();
    foamRingMat.dispose();
    mistGeo.dispose();
    mistMat.dispose();
    dropGeo.dispose();
    dropMat.dispose();
    leafGeo.dispose();
    leafMat.dispose();
    ffGeo.dispose();
    ffMat.dispose();
  };

  return { group, update, dispose };
}
