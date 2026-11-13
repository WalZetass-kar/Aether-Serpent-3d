import * as THREE from 'three';

export interface PbrTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

// Fast deterministic 2D hash & value noise (tileable via period wrapping)
function hash2(ix: number, iy: number, seed: number): number {
  const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function tileNoise(x: number, y: number, period: number, seed: number): number {
  const px = ((x % period) + period) % period;
  const py = ((y % period) + period) % period;
  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = (x0 + 1) % period;
  const y1 = (y0 + 1) % period;
  const fx = px - x0;
  const fy = py - y0;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

export function tileFbm(u: number, v: number, baseFreq: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let freq = baseFreq;
  for (let o = 0; o < octaves; o++) {
    sum += amp * tileNoise(u * freq, v * freq, freq, seed + o * 17.3);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/**
 * Converts a scalar heightfield [0..1] (row-major size*size) into a tileable tangent-space normal map.
 */
export function buildNormalDataTexture(
  height: Float32Array,
  size: number,
  strength: number,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      // Sobel filter for crisp normal gradients
      const tl = height[ym * size + xm];
      const t = height[ym * size + x];
      const tr = height[ym * size + xp];
      const l = height[y * size + xm];
      const r = height[y * size + xp];
      const bl = height[yp * size + xm];
      const b = height[yp * size + x];
      const br = height[yp * size + xp];

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const invLen = 1 / Math.sqrt(dX * dX + dY * dY + 1);

      const idx = (y * size + x) * 4;
      data[idx] = clampByte((-dX * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = clampByte((-dY * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = clampByte((invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function buildGrayscaleDataTexture(
  values: Float32Array,
  size: number,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const byte = clampByte(values[i] * 255);
    const idx = i * 4;
    data[idx] = byte;
    data[idx + 1] = byte;
    data[idx + 2] = byte;
    data[idx + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function buildAlbedoDataTexture(
  rgba: Uint8Array,
  size: number,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
): THREE.DataTexture {
  const tex = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * High-detail Oriental Dragon Scale PBR Set (512x512):
 * Overlapping scalloped reptile scales on dorsal/flank, ridged golden-jade plates on belly.
 */
export function createOrientalDragonPbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const cols = 16;
  const rows = 20;

  for (let y = 0; y < size; y++) {
    const v = y / size; // v around circumference: 0.5 is dorsal ridge, 0/1 is ventral belly
    // Ventral zone around v < 0.16 or v > 0.84
    const bellyDist = Math.min(v, 1 - v);
    const isBelly = bellyDist < 0.16;
    const bellyBlend = Math.max(0, Math.min(1, (0.2 - bellyDist) / 0.08));

    for (let x = 0; x < size; x++) {
      const u = x / size; // u along spine
      const idx = y * size + x;
      const pIdx = idx * 4;

      const micro = tileFbm(u, v, 16, 3, 11.4);

      let h = 0.5;
      let rVal = 0.34;
      let aoVal = 0.92;
      let cr = 18;
      let cg = 112;
      let cb = 78;

      if (isBelly) {
        // Broad transverse ventral scutes
        const platePhase = (u * 38) % 1;
        const bevel = Math.sin(platePhase * Math.PI);
        const seam = platePhase < 0.1 ? platePhase / 0.1 : 1;
        h = 0.38 + bevel * 0.42 + micro * 0.08;
        rVal = 0.38 + (1 - bevel) * 0.18;
        aoVal = 0.45 + 0.55 * seam;
        cr = 212 + micro * 28;
        cg = 188 + micro * 25;
        cb = 118 + micro * 20;
      } else {
        // Overlapping scalloped diamond/round scales
        const rowF = v * rows;
        const rowI = Math.floor(rowF);
        const colF = u * cols + (rowI % 2 === 0 ? 0 : 0.5);
        const fx = colF - Math.floor(colF) - 0.5;
        const fy = rowF - rowI - 0.5;
        const radial = Math.sqrt(fx * fx * 1.15 + fy * fy * 1.35);
        const scaleBody = Math.max(0, 1 - radial * 1.75);
        const ridge = Math.max(0, 1 - Math.abs(fx) * 3.8) * 0.25;
        const crevice = Math.max(0.25, Math.min(1, (0.68 - radial) / 0.25));

        h = 0.22 + Math.pow(scaleBody, 0.72) * 0.65 + ridge + micro * 0.1;
        rVal = 0.22 + (1 - scaleBody) * 0.32 + micro * 0.1;
        aoVal = 0.38 + 0.62 * crevice;

        // Emerald-jade scales with gold dorsal shimmer & dark crevices
        const dorsalMask = Math.exp(-Math.pow((v - 0.5) / 0.14, 2));
        const baseR = 14 + dorsalMask * 95 + micro * 18;
        const baseG = 94 + dorsalMask * 44 + scaleBody * 42 + micro * 22;
        const baseB = 64 + (1 - dorsalMask) * 26 + micro * 16;

        // Blend softly near belly edge
        cr = baseR * (1 - bellyBlend) + 195 * bellyBlend;
        cg = baseG * (1 - bellyBlend) + 175 * bellyBlend;
        cb = baseB * (1 - bellyBlend) + 105 * bellyBlend;
      }

      height[idx] = h;
      rough[idx] = Math.max(0.15, Math.min(0.85, rVal));
      ao[idx] = Math.max(0.25, Math.min(1, aoVal));
      albedo[pIdx] = clampByte(cr * (0.65 + 0.35 * ao[idx]));
      albedo[pIdx + 1] = clampByte(cg * (0.65 + 0.35 * ao[idx]));
      albedo[pIdx + 2] = clampByte(cb * (0.65 + 0.35 * ao[idx]));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 7, 1, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 2.8, 7, 1, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 7, 1, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 7, 1, maxAnisotropy),
  };
}

/**
 * High-Detail Cracked & Mossy Granite Cliff PBR Set (512x512).
 */
export function createRockPbrMaps(
  maxAnisotropy: number,
  repeat = 2,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const f1 = tileFbm(u, v, 6, 4, 3.1);
      const f2 = tileFbm(u + 0.37, v + 0.19, 12, 3, 19.7);
      // Sharp fracture cracks via folded ridged noise
      const ridgeA = 1 - Math.abs(tileFbm(u, v, 5, 3, 41.2) * 2 - 1);
      const ridgeB = 1 - Math.abs(tileFbm(u + 0.25, v + 0.6, 8, 3, 63.5) * 2 - 1);
      const crack = Math.pow(Math.max(ridgeA, ridgeB), 5.0);
      const strata = Math.sin(v * Math.PI * 10 + f1 * 3.5) * 0.5 + 0.5;

      const hVal = Math.max(0, Math.min(1, f1 * 0.55 + strata * 0.25 + f2 * 0.2 - crack * 0.48));
      const aoVal = Math.max(0.22, Math.min(1, 0.96 - crack * 0.68 - (1 - f1) * 0.2));
      const rVal = Math.max(0.35, Math.min(0.95, 0.72 + (1 - hVal) * 0.22 - strata * 0.08));

      // Mineral granite tones + subtle lichen patches
      const lichen = Math.max(0, f2 - 0.64) * 2.2;
      const baseR = 54 + hVal * 48 - lichen * 18;
      const baseG = 63 + hVal * 50 + lichen * 28;
      const baseB = 76 + hVal * 52 - lichen * 24;

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      albedo[pIdx] = clampByte(baseR * (0.62 + 0.38 * aoVal));
      albedo[pIdx + 1] = clampByte(baseG * (0.62 + 0.38 * aoVal));
      albedo[pIdx + 2] = clampByte(baseB * (0.62 + 0.38 * aoVal));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, repeat, repeat, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 3.6, repeat, repeat, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, repeat, repeat, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, repeat, repeat, maxAnisotropy),
  };
}

/**
 * Furrowed Ancient Tree Bark PBR Set (512x512).
 */
export function createBarkPbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const warp = tileFbm(u, v, 6, 3, 8.8) * 0.14;
      const furrow = Math.sin((u + warp) * Math.PI * 24) * 0.5 + 0.5;
      const fine = tileFbm(u, v, 16, 3, 27.1);
      const moss = Math.max(0, tileFbm(u, v, 5, 3, 53.2) - 0.6) * 2.1;

      const hVal = Math.max(0, Math.min(1, furrow * 0.65 + fine * 0.35));
      const aoVal = 0.35 + 0.65 * Math.pow(furrow, 0.6);
      const rVal = 0.8 + (1 - hVal) * 0.16;

      const cr = 58 + hVal * 34 - moss * 22;
      const cg = 42 + hVal * 26 + moss * 34;
      const cb = 30 + hVal * 18 - moss * 14;

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      albedo[pIdx] = clampByte(cr * (0.65 + 0.35 * aoVal));
      albedo[pIdx + 1] = clampByte(cg * (0.65 + 0.35 * aoVal));
      albedo[pIdx + 2] = clampByte(cb * (0.65 + 0.35 * aoVal));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 2, 4, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 3.4, 2, 4, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 2, 4, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 2, 4, maxAnisotropy),
  };
}

/**
 * Carved Ashlar Castle Masonry PBR Set (512x512).
 */
export function createCastleStonePbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const blockRows = 8;
  const blockCols = 4;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const rowF = v * blockRows;
    const rowI = Math.floor(rowF);
    const fy = rowF - rowI;

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const colF = u * blockCols + (rowI % 2 === 0 ? 0 : 0.5);
      const colI = Math.floor(colF);
      const fx = colF - colI;

      const mortar = fx < 0.055 || fx > 0.945 || fy < 0.08 || fy > 0.92;
      const edgeDist = Math.min(fx, 1 - fx, fy * 0.7, (1 - fy) * 0.7);
      const bevel = Math.min(1, edgeDist / 0.11);

      const blockTint = hash2(colI % blockCols, rowI, 91.5) * 26 - 13;
      const grain = tileFbm(u, v, 14, 3, 71.3);

      const hVal = mortar ? 0.12 + grain * 0.08 : 0.35 + bevel * 0.45 + grain * 0.2;
      const aoVal = mortar ? 0.34 : 0.52 + bevel * 0.48;
      const rVal = mortar ? 0.95 : 0.68 + grain * 0.22;

      const base = (mortar ? 68 : 112 + blockTint) + grain * 26;
      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      albedo[pIdx] = clampByte((base - 4) * (0.7 + 0.3 * aoVal));
      albedo[pIdx + 1] = clampByte((base + 1) * (0.7 + 0.3 * aoVal));
      albedo[pIdx + 2] = clampByte((base + 11) * (0.7 + 0.3 * aoVal));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 2, 2, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 3.2, 2, 2, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 2, 2, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 2, 2, maxAnisotropy),
  };
}

/**
 * Overlapping Slate Roof Shingles PBR Set (512x512).
 */
export function createCastleSlateRoofPbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const rows = 12;
  const cols = 10;

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const rowF = v * rows;
    const rowI = Math.floor(rowF);
    const fy = rowF - rowI;

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const colF = u * cols + (rowI % 2 === 0 ? 0 : 0.5);
      const colI = Math.floor(colF);
      const fx = colF - colI;

      const seamX = fx < 0.06 || fx > 0.94;
      const seamY = fy < 0.08;
      const slateVar = hash2(colI % cols, rowI, 33.7) * 20 - 10;
      const grain = tileFbm(u, v, 16, 2, 5.2);

      const hVal = seamX || seamY ? 0.15 : 0.35 + fy * 0.55 + grain * 0.1;
      const aoVal = seamY ? 0.35 : 0.55 + fy * 0.45;
      const rVal = 0.42 + grain * 0.24;

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      albedo[pIdx] = clampByte((36 + slateVar + grain * 14) * (0.72 + 0.28 * aoVal));
      albedo[pIdx + 1] = clampByte((54 + slateVar + grain * 18) * (0.72 + 0.28 * aoVal));
      albedo[pIdx + 2] = clampByte((94 + slateVar + grain * 24) * (0.72 + 0.28 * aoVal));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 3, 3, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 2.8, 3, 3, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 3, 3, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 3, 3, maxAnisotropy),
  };
}

/**
 * Aged Castle Oak Timber PBR Set (256x256).
 */
export function createTimberPbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 256,
): PbrTextureSet {
  const size = texSize >= 512 ? 512 : 256;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const plank = Math.floor(v * 4);
    const plankEdge = (v * 4) % 1;
    const seam = plankEdge < 0.06 || plankEdge > 0.94;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const grain = Math.sin((v * 28 + tileFbm(u, v, 8, 2, 12) * 2.5) * Math.PI) * 0.5 + 0.5;
      const hVal = seam ? 0.15 : 0.45 + grain * 0.4;
      const aoVal = seam ? 0.35 : 0.72 + grain * 0.28;
      const rVal = 0.65 + (1 - grain) * 0.22;

      const tint = (plank % 2) * 8;
      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      albedo[pIdx] = clampByte((86 + tint + grain * 24) * aoVal);
      albedo[pIdx + 1] = clampByte((56 + tint * 0.6 + grain * 18) * aoVal);
      albedo[pIdx + 2] = clampByte((34 + grain * 10) * aoVal);
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 2, 2, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 2.4, 2, 2, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 2, 2, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 2, 2, maxAnisotropy),
  };
}

/**
 * Forest Terrain Detail PBR Set (512x512).
 */
export function createTerrainPbrMaps(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const f1 = tileFbm(u, v, 8, 4, 15.1);
      const f2 = tileFbm(u, v, 24, 2, 44.8);
      const hVal = f1 * 0.65 + f2 * 0.35;
      const aoVal = 0.62 + 0.38 * hVal;
      const rVal = 0.78 + (1 - hVal) * 0.18;

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      // Neutral light earthy modulation so vertex colors provide rich biome blending
      const lum = clampByte(192 + hVal * 58);
      albedo[pIdx] = lum;
      albedo[pIdx + 1] = clampByte(lum * 1.03);
      albedo[pIdx + 2] = clampByte(lum * 0.96);
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 14, 14, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 2.5, 14, 14, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 14, 14, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 14, 14, maxAnisotropy),
  };
}

/**
 * 2x2 Foliage Texture Atlas (512x512 RGBA):
 * - Top-Left  (0,0): Oak / Banyan leafy spray
 * - Top-Right (1,0): Highland Pine needle bough
 * - Bot-Left  (0,1): Woodland fern frond
 * - Bot-Right (1,1): Floating leaf / petal sprite
 */
export function createFoliageAtlasTextures(
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = texSize >= 512 ? 512 : 256;
  const half = size / 2;
  const scaleRatio = size / 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const normCanvas = document.createElement('canvas');
  normCanvas.width = size;
  normCanvas.height = size;
  const nCtx = normCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128,128,255)';
  nCtx.fillRect(0, 0, size, size);

  const drawLeaf = (
    cx: number,
    cy: number,
    len: number,
    wid: number,
    angle: number,
    colorA: string,
    colorB: string,
  ) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, colorA);
    grad.addColorStop(1, colorB);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.45, wid, 0, 0);
    ctx.fill();
    // Central midrib vein
    ctx.strokeStyle = 'rgba(220, 252, 231, 0.25)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(len * 0.88, 0);
    ctx.stroke();
    ctx.restore();

    // Subtle normal tilt on leaf surface
    nCtx.save();
    nCtx.translate(cx, cy);
    nCtx.rotate(angle);
    nCtx.fillStyle = 'rgb(142, 118, 250)';
    nCtx.beginPath();
    nCtx.moveTo(0, 0);
    nCtx.quadraticCurveTo(len * 0.45, -wid, len, 0);
    nCtx.lineTo(0, 0);
    nCtx.fill();
    nCtx.fillStyle = 'rgb(114, 140, 250)';
    nCtx.beginPath();
    nCtx.moveTo(0, 0);
    nCtx.quadraticCurveTo(len * 0.45, wid, len, 0);
    nCtx.lineTo(0, 0);
    nCtx.fill();
    nCtx.restore();
  };

  // Q1 (0,0): Oak Leaf Spray
  ctx.save();
  ctx.scale(scaleRatio, scaleRatio);
  nCtx.save();
  nCtx.scale(scaleRatio, scaleRatio);
  const baseHalf = 256;
  const baseSize = 512;

  ctx.strokeStyle = '#3f2e1d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(baseHalf * 0.5, baseHalf * 0.94);
  ctx.quadraticCurveTo(baseHalf * 0.52, baseHalf * 0.5, baseHalf * 0.48, baseHalf * 0.18);
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const stemY = baseHalf * (0.86 - t * 0.68);
    const stemX = baseHalf * 0.5 + Math.sin(i * 1.4) * 14;
    const side = i % 2 === 0 ? -1 : 1;
    const ang = -Math.PI / 2 + side * (0.55 + (i % 3) * 0.24);
    const colA = i % 3 === 0 ? '#166534' : i % 3 === 1 ? '#15803d' : '#14532d';
    const colB = i % 2 === 0 ? '#4ade80' : '#22c55e';
    drawLeaf(stemX, stemY, 44 + (i % 4) * 8, 17 + (i % 3) * 3, ang, colA, colB);
  }

  // Q2 (1,0): Highland Pine Needle Bough
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(baseHalf + baseHalf * 0.5, baseHalf * 0.95);
  ctx.lineTo(baseHalf + baseHalf * 0.5, baseHalf * 0.15);
  ctx.stroke();
  for (let i = 0; i < 56; i++) {
    const t = i / 55;
    const y = baseHalf * (0.9 - t * 0.72);
    const x = baseHalf + baseHalf * 0.5 + ((i % 3) - 1) * 8;
    const side = i % 2 === 0 ? -1 : 1;
    const ang = -Math.PI / 2 + side * (0.45 + (i % 5) * 0.14);
    const len = 38 + (1 - t) * 28;
    drawLeaf(x, y, len, 4.5, ang, '#064e3b', '#10b981');
  }

  // Q3 (0,1): Woodland Fern Frond
  ctx.strokeStyle = '#365314';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(baseHalf * 0.5, baseSize - 12);
  ctx.quadraticCurveTo(baseHalf * 0.56, baseHalf + baseHalf * 0.5, baseHalf * 0.5, baseHalf + 16);
  ctx.stroke();
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    const y = baseSize - 22 - t * (baseHalf - 44);
    const x = baseHalf * 0.5 + Math.sin(t * Math.PI) * 8;
    const side = i % 2 === 0 ? -1 : 1;
    const span = Math.sin(Math.pow(t, 0.7) * Math.PI) * 68 + 14;
    drawLeaf(x, y, span, 8.5, -Math.PI / 2 + side * 1.15, '#15803d', '#84cc16');
  }

  // Q4 (1,1): Single Floating Leaf Sprite
  drawLeaf(baseHalf + 40, baseHalf + baseHalf * 0.5, baseHalf - 75, 48, 0, '#92400e', '#f59e0b');
  ctx.restore();
  nCtx.restore();

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const normalMap = new THREE.CanvasTexture(normCanvas);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.generateMipmaps = true;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.anisotropy = maxAnisotropy;
  normalMap.needsUpdate = true;

  return { map, normalMap };
}

/**
 * Soft radial mist/spray billboard texture (256x256 RGBA).
 */
export function createMistSpriteTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(224, 242, 254, 0.72)');
  grad.addColorStop(0.45, 'rgba(186, 230, 253, 0.35)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Dragon Slit-Pupil Iris Texture (256x256).
 */
export function createDragonEyeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  const grad = ctx.createRadialGradient(c, c, 12, c, c, c);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.35, '#f59e0b');
  grad.addColorStop(0.75, '#b45309');
  grad.addColorStop(1, '#451a03');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Fine radial iris fibers
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.35)' : 'rgba(69, 26, 3, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 28, c + Math.sin(a) * 28);
    ctx.lineTo(c + Math.cos(a) * 116, c + Math.sin(a) * 116);
    ctx.stroke();
  }

  // Sharp vertical reptile slit pupil
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(c, c, 16, 78, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function disposePbrTextureSet(set: PbrTextureSet): void {
  set.map.dispose();
  set.normalMap.dispose();
  set.roughnessMap.dispose();
  set.aoMap.dispose();
}
