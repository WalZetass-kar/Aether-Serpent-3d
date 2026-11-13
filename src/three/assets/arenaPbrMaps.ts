import * as THREE from 'three';
import {
  BOARD_SIZE,
  type SpecialTileType,
  SPECIAL_TILE_MAP,
  JUMP_MAP,
} from '../../../shared/gameConfig';
import {
  buildAlbedoDataTexture,
  buildGrayscaleDataTexture,
  buildNormalDataTexture,
  tileFbm,
  type PbrTextureSet,
} from './pbrTextures';

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Generates full 512x512 PBR Scale Maps (albedo, tangent-space normal, roughness, AO)
 * tailored to each in-game Serpent's exact identity palette (primary, stripe, belly).
 */
export function createSerpentIdentityPbrMaps(
  primaryHex: string,
  stripeHex: string,
  bellyHex: string,
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(stripeHex);
  const [br, bg, bb] = hexToRgb(bellyHex);

  const cols = 18;
  const rows = 20;

  for (let y = 0; y < size; y++) {
    // v wraps around circumference; v=0.5 is ventral belly bottom, v=0/1 is dorsal ridge
    const v = y / size;
    const bellyDist = Math.abs(v - 0.5);
    const isBelly = bellyDist < 0.14;
    const bellyBlend = Math.max(0, Math.min(1, (0.19 - bellyDist) / 0.08));

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      const micro = tileFbm(u, v, 18, 3, 14.7);
      const bandMask = Math.pow(Math.max(0, Math.sin(u * Math.PI * 12 + micro * 1.4)), 2.2);

      let hVal = 0.5;
      let rVal = 0.34;
      let aoVal = 0.9;
      let cr = pr;
      let cg = pg;
      let cb = pb;

      if (isBelly) {
        // Transverse ridged ventral scutes
        const scutePhase = (u * 36) % 1;
        const bevel = Math.sin(scutePhase * Math.PI);
        const seam = scutePhase < 0.12 ? scutePhase / 0.12 : 1;
        hVal = 0.34 + bevel * 0.44 + micro * 0.08;
        rVal = 0.42 + (1 - bevel) * 0.16;
        aoVal = 0.46 + 0.54 * seam;
        cr = br * (0.9 + micro * 0.18);
        cg = bg * (0.9 + micro * 0.18);
        cb = bb * (0.9 + micro * 0.18);
      } else {
        // Overlapping keeled diamond reptile scales
        const rowF = v * rows;
        const rowI = Math.floor(rowF);
        const colF = u * cols + (rowI % 2 === 0 ? 0 : 0.5);
        const fx = colF - Math.floor(colF) - 0.5;
        const fy = rowF - rowI - 0.5;
        const radial = Math.sqrt(fx * fx * 1.15 + fy * fy * 1.35);
        const scaleBody = Math.max(0, 1 - radial * 1.72);
        const keelRidge = Math.max(0, 1 - Math.abs(fy) * 4.2) * scaleBody * 0.28;
        const crevice = Math.max(0.24, Math.min(1, (0.68 - radial) / 0.25));

        hVal = 0.2 + Math.pow(scaleBody, 0.72) * 0.62 + keelRidge + micro * 0.1;
        rVal = 0.24 + (1 - scaleBody) * 0.34 + micro * 0.1;
        aoVal = 0.36 + 0.64 * crevice;

        const stripeMix = bandMask * 0.58 + keelRidge * 0.65;
        const dR = pr * (1 - stripeMix) + sr * stripeMix;
        const dG = pg * (1 - stripeMix) + sg * stripeMix;
        const dB = pb * (1 - stripeMix) + sb * stripeMix;

        cr = dR * (1 - bellyBlend) + br * bellyBlend;
        cg = dG * (1 - bellyBlend) + bg * bellyBlend;
        cb = dB * (1 - bellyBlend) + bb * bellyBlend;
      }

      height[idx] = hVal;
      rough[idx] = Math.max(0.16, Math.min(0.86, rVal));
      ao[idx] = Math.max(0.24, Math.min(1, aoVal));
      albedo[pIdx] = clampByte(cr * (0.62 + 0.38 * ao[idx]));
      albedo[pIdx + 1] = clampByte(cg * (0.62 + 0.38 * ao[idx]));
      albedo[pIdx + 2] = clampByte(cb * (0.62 + 0.38 * ao[idx]));
      albedo[pIdx + 3] = 255;
    }
  }

  return {
    map: buildAlbedoDataTexture(albedo, size, 9, 1, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 3.1, 9, 1, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 9, 1, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 9, 1, maxAnisotropy),
  };
}

function getSpecialTint(type: SpecialTileType): { bg: string; ring: string; glyph: string } {
  switch (type) {
    case 'boost':
      return { bg: '#0c3b2e', ring: '#34d399', glyph: '▲+4' };
    case 'extra_roll':
      return { bg: '#4e2a0c', ring: '#fbbf24', glyph: '★' };
    case 'shield':
      return { bg: '#172e5c', ring: '#60a5fa', glyph: '❖' };
    case 'curse':
      return { bg: '#35175d', ring: '#c084fc', glyph: '▼-3' };
  }
}

/**
 * Generates High-Craft Stone Masonry Board Atlas PBR Set:
 * - Albedo (2048x2048 CanvasTexture): natural chiseling grain, hairline cracks, selective edge moss,
 *   engraved inlays, and razor-sharp legible tile numbers 1..100.
 * - Normal, Roughness, and AO maps (512x512 tiled per 10x10 board) for realistic masonry relief.
 */
export function createBoardStonePbrSet(
  maxAnisotropy: number,
  atlasSize: 1024 | 2048 = 2048,
  reliefSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  // 1. Resolution-adaptive Albedo Atlas preserving crisp numerals & exact tile layout
  const size = atlasSize;
  const baseSize = 2048;
  const cell = baseSize / BOARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.scale(size / baseSize, size / baseSize);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, baseSize, baseSize);

  for (let tile = 1; tile <= 100; tile++) {
    const zeroBased = tile - 1;
    const rowFromBottom = Math.floor(zeroBased / BOARD_SIZE);
    const rawCol = zeroBased % BOARD_SIZE;
    const col = rowFromBottom % 2 === 0 ? rawCol : BOARD_SIZE - 1 - rawCol;
    const canvasRow = BOARD_SIZE - 1 - rowFromBottom;
    const x = col * cell;
    const y = canvasRow * cell;

    const special = SPECIAL_TILE_MAP.get(tile);
    const jump = JUMP_MAP.get(tile);
    const isAlt = (rowFromBottom + col) % 2 === 0;

    let baseColor = isAlt ? '#263142' : '#364357';
    if (tile === 1) baseColor = '#1a4236';
    else if (tile === 100) baseColor = '#5b4016';
    else if (special) baseColor = getSpecialTint(special.type).bg;

    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, cell, cell);

    // Natural stone mineral speckles & weathering variation
    for (let g = 0; g < 36; g++) {
      const gx = x + 6 + ((tile * 41 + g * 59) % (cell - 16));
      const gy = y + 6 + ((tile * 73 + g * 31) % (cell - 16));
      const w = 4 + (g % 5) * 3;
      const h = 3 + ((g * 2) % 4) * 2;
      ctx.fillStyle =
        g % 3 === 0
          ? 'rgba(255,255,255,0.045)'
          : g % 3 === 1
            ? 'rgba(15,23,42,0.16)'
            : 'rgba(148,163,184,0.05)';
      ctx.fillRect(gx, gy, w, h);
    }

    // Fine carved stone hairline cracks (deterministic per tile)
    if (tile % 2 === 0 || tile % 5 === 0) {
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.34)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const cx0 = x + 16 + ((tile * 29) % 45);
      const cy0 = y + cell - 18 - ((tile * 17) % 35);
      ctx.moveTo(cx0, cy0);
      ctx.lineTo(cx0 + 26 + (tile % 18), cy0 - 22);
      ctx.lineTo(cx0 + 48 + (tile % 15), cy0 - 14 - (tile % 20));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.08)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx0 + 1, cy0 + 1.5);
      ctx.lineTo(cx0 + 27 + (tile % 18), cy0 - 20.5);
      ctx.stroke();
    }

    // Selective organic moss tucked into corner crevices on weathered tiles
    if ((tile * 13) % 7 <= 2 && tile !== 100) {
      const mx = tile % 2 === 0 ? x + cell - 24 : x + 20;
      const my = tile % 3 === 0 ? y + 20 : y + cell - 20;
      const mossGrad = ctx.createRadialGradient(mx, my, 2, mx, my, 34);
      mossGrad.addColorStop(0, 'rgba(34, 139, 78, 0.42)');
      mossGrad.addColorStop(0.55, 'rgba(22, 101, 52, 0.24)');
      mossGrad.addColorStop(1, 'rgba(22, 101, 52, 0)');
      ctx.fillStyle = mossGrad;
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
    }

    // Inner ambient occlusion vignette
    const grad = ctx.createRadialGradient(
      x + cell / 2,
      y + cell / 2,
      cell * 0.24,
      x + cell / 2,
      y + cell / 2,
      cell * 0.74,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.035)');
    grad.addColorStop(1, 'rgba(2,6,23,0.38)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cell, cell);

    // Chiseled slate / bronze inlay frame
    ctx.strokeStyle = tile === 100 ? '#f59e0b' : 'rgba(226, 232, 240, 0.24)';
    ctx.lineWidth = tile === 100 ? 7 : 3;
    ctx.strokeRect(x + 9, y + 9, cell - 18, cell - 18);

    if (special) {
      const specStyle = getSpecialTint(special.type);
      ctx.strokeStyle = specStyle.ring;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(x + cell * 0.5, y + cell * 0.63, cell * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = specStyle.ring;
      ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(specStyle.glyph, x + cell * 0.5, y + cell * 0.64);
    } else if (jump) {
      const isLadder = jump.type === 'ladder';
      ctx.fillStyle = isLadder ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.18)';
      ctx.beginPath();
      ctx.arc(x + cell * 0.5, y + cell * 0.65, cell * 0.21, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isLadder ? '#fde68a' : '#6ee7b7';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isLadder ? `↑${jump.to}` : `↓${jump.to}`, x + cell * 0.5, y + cell * 0.66);
    }

    if (tile === 1) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 26px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MULAI', x + cell * 0.5, y + cell * 0.66);
    } else if (tile === 100) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 42px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♛', x + cell * 0.5, y + cell * 0.66);
    }

    // Crisp engraved numeral with stone drop shadow for instant readability
    ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(tile), x + 18, y + 16);

    ctx.fillStyle = tile === 100 ? '#fef08a' : 'rgba(248, 250, 252, 0.96)';
    ctx.fillText(String(tile), x + 16, y + 14);
  }

  ctx.restore();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  // 2. Per-cell Stone Surface Relief Maps (Normal + Roughness + AO) tiled 1x1 across board UVs
  // Since mergedCaps uses UV coordinates [col/10..(col+1)/10], repeating 10x10 aligns each stone tile edge!
  const pbrSize = reliefSize >= 512 ? 512 : 256;
  const height = new Float32Array(pbrSize * pbrSize);
  const rough = new Float32Array(pbrSize * pbrSize);
  const ao = new Float32Array(pbrSize * pbrSize);

  for (let y = 0; y < pbrSize; y++) {
    const v = y / pbrSize;
    for (let x = 0; x < pbrSize; x++) {
      const u = x / pbrSize;
      const idx = y * pbrSize + x;

      const stoneGrain = tileFbm(u, v, 10, 3, 21.4);
      const ridgeCrack = 1 - Math.abs(tileFbm(u + 0.13, v + 0.27, 6, 3, 47.9) * 2 - 1);
      const crack = Math.pow(ridgeCrack, 6.5);

      // Chiseled bevel border around each 0..1 stone face
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const bevel = Math.min(1, edge / 0.08);

      const hVal = Math.max(0, Math.min(1, 0.35 + bevel * 0.42 + stoneGrain * 0.23 - crack * 0.45));
      const aoVal = Math.max(0.28, Math.min(1, 0.5 + bevel * 0.5 - crack * 0.52));
      const rVal = Math.max(0.45, Math.min(0.94, 0.62 + (1 - hVal) * 0.26));

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
    }
  }

  return {
    map,
    normalMap: buildNormalDataTexture(height, pbrSize, 2.8, BOARD_SIZE, BOARD_SIZE, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, pbrSize, BOARD_SIZE, BOARD_SIZE, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, pbrSize, BOARD_SIZE, BOARD_SIZE, maxAnisotropy),
  };
}

/**
 * Generates Brushed / Hammered Fantasy Metal PBR Maps (256x256)
 * for Pawn armor, ladder iron/brass brackets, and stone board clasps.
 */
export function createHammeredBronzePbrMaps(
  maxAnisotropy: number,
  texSize = 256,
): Omit<PbrTextureSet, 'map'> {
  const size = texSize >= 256 ? 256 : 128;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const dent = tileFbm(u, v, 12, 3, 55.2);
      const brush = tileFbm(u * 3.5, v * 0.5, 16, 2, 19.1);
      height[idx] = dent * 0.6 + brush * 0.4;
      rough[idx] = 0.2 + (1 - brush) * 0.24;
      ao[idx] = 0.72 + dent * 0.28;
    }
  }

  return {
    normalMap: buildNormalDataTexture(height, size, 1.8, 2, 2, maxAnisotropy),
    roughnessMap: buildGrayscaleDataTexture(rough, size, 2, 2, maxAnisotropy),
    aoMap: buildGrayscaleDataTexture(ao, size, 2, 2, maxAnisotropy),
  };
}
