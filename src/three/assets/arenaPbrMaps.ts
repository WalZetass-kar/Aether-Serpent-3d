import * as THREE from 'three';
import {
  BOARD_SIZE,
  type SpecialTileType,
  SPECIAL_TILE_MAP,
  buildJumpMap,
} from '../../../shared/gameConfig';
import type { BoardConfig } from '../../../shared/boardThemes';
import {
  buildAlbedoDataTexture,
  buildNormalDataTexture,
  buildPackedOrmDataTexture,
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
 * Generates full PBR Scale Maps (albedo, tangent-space normal, and packed ORM: R=AO, G=Roughness, B=Metalness)
 * tailored to each in-game Serpent's exact identity palette (primary, stripe, belly) and scale pattern.
 */
export function createSerpentIdentityPbrMaps(
  primaryHex: string,
  stripeHex: string,
  bellyHex: string,
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
  scalePattern: 'diamond_keel' | 'royal_hex' | 'draconic_plate' | 'frost_shard' = 'diamond_keel',
): PbrTextureSet {
  const size = texSize;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const metal = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [sr, sg, sb] = hexToRgb(stripeHex);
  const [br, bg, bb] = hexToRgb(bellyHex);

  const cols = scalePattern === 'draconic_plate' ? 12 : scalePattern === 'royal_hex' ? 16 : 18;
  const rows = scalePattern === 'draconic_plate' ? 14 : scalePattern === 'frost_shard' ? 24 : 20;

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
      const bandFreq = scalePattern === 'frost_shard' ? 16 : scalePattern === 'draconic_plate' ? 9 : 12;
      const bandMask = Math.pow(Math.max(0, Math.sin(u * Math.PI * bandFreq + micro * 1.4)), 2.2);

      let hVal = 0.5;
      let rVal = 0.34;
      let aoVal = 0.9;
      let mVal = 0.18;
      let cr = pr;
      let cg = pg;
      let cb = pb;

      if (isBelly) {
        // Transverse ridged ventral scutes with pearlescent sheen on raised bevels
        const scutePhase = (u * 36) % 1;
        const bevel = Math.sin(scutePhase * Math.PI);
        const seam = scutePhase < 0.12 ? scutePhase / 0.12 : 1;
        hVal = 0.34 + bevel * 0.44 + micro * 0.08;
        rVal = 0.36 + (1 - bevel) * 0.22;
        aoVal = 0.42 + 0.58 * seam;
        mVal = 0.12 + bevel * 0.28;
        cr = br * (0.9 + micro * 0.18);
        cg = bg * (0.9 + micro * 0.18);
        cb = bb * (0.9 + micro * 0.18);
      } else {
        // Overlapping keeled reptile scales with metallic/iridescent rims & deep crevices
        const rowF = v * rows;
        const rowI = Math.floor(rowF);
        const colF = u * cols + (rowI % 2 === 0 ? 0 : 0.5);
        const fx = colF - Math.floor(colF) - 0.5;
        const fy = rowF - rowI - 0.5;
        const radial =
          scalePattern === 'frost_shard'
            ? Math.abs(fx) * 1.35 + Math.abs(fy) * 1.25
            : Math.sqrt(fx * fx * 1.15 + fy * fy * 1.35);
        const scaleBody = Math.max(0, 1 - radial * 1.68);
        const scaleRim = Math.max(0, 1 - Math.abs(radial - 0.46) * 9.5) * 0.24;
        const keelRidge = Math.max(0, 1 - Math.abs(fy) * 4.0) * scaleBody * 0.38;
        const crevice = Math.max(0.16, Math.min(1, (0.64 - radial) / 0.22));

        hVal = 0.16 + Math.pow(scaleBody, 0.68) * 0.68 + keelRidge + scaleRim + micro * 0.1;
        rVal = 0.18 + (1 - scaleBody) * 0.42 - keelRidge * 0.12 + micro * 0.08;
        aoVal = 0.24 + 0.76 * crevice;
        mVal = Math.min(0.95, 0.12 + keelRidge * 1.35 + scaleRim * 1.45 + bandMask * 0.32) * crevice;

        const stripeMix = Math.min(1, bandMask * 0.64 + keelRidge * 0.72 + scaleRim * 0.45);
        const dR = pr * (1 - stripeMix) + sr * stripeMix;
        const dG = pg * (1 - stripeMix) + sg * stripeMix;
        const dB = pb * (1 - stripeMix) + sb * stripeMix;

        cr = dR * (1 - bellyBlend) + br * bellyBlend;
        cg = dG * (1 - bellyBlend) + bg * bellyBlend;
        cb = dB * (1 - bellyBlend) + bb * bellyBlend;
      }

      height[idx] = hVal;
      rough[idx] = Math.max(0.12, Math.min(0.88, rVal));
      ao[idx] = Math.max(0.18, Math.min(1, aoVal));
      metal[idx] = Math.max(0.04, Math.min(0.96, mVal));
      albedo[pIdx] = clampByte(cr * (0.52 + 0.48 * ao[idx]));
      albedo[pIdx + 1] = clampByte(cg * (0.52 + 0.48 * ao[idx]));
      albedo[pIdx + 2] = clampByte(cb * (0.52 + 0.48 * ao[idx]));
      albedo[pIdx + 3] = 255;
    }
  }

  const ormTex = buildPackedOrmDataTexture(ao, rough, metal, size, 9, 1, maxAnisotropy);
  return {
    map: buildAlbedoDataTexture(albedo, size, 9, 1, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 4.6, 9, 1, maxAnisotropy),
    roughnessMap: ormTex,
    aoMap: ormTex,
    metalnessMap: ormTex,
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
 * - Albedo (2048x2048 CanvasTexture): natural chiseling grain, hairline cracks, theme-specific surface detail,
 *   engraved inlays, 3D beveled borders, and razor-sharp legible tile numbers 1..100.
 * - Normal + Packed ORM (R=AO, G=Roughness, B=Metalness) maps tiled per 10x10 board for realistic masonry & gilded inlay relief.
 */
export function createBoardStonePbrSet(
  maxAnisotropy: number,
  atlasSize: 1024 | 2048 = 2048,
  reliefSize: 256 | 512 | 1024 = 512,
  boardConfig?: BoardConfig,
): PbrTextureSet {
  // 1. Resolution-adaptive Albedo Atlas preserving crisp numerals & exact tile layout
  const size = atlasSize;
  const baseSize = 2048;
  const cell = baseSize / BOARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const tileCfg = boardConfig?.tileConfig;
  const primaryTileHex = tileCfg?.primaryColor ?? '#263142';
  const alternateTileHex = tileCfg?.alternateColor ?? '#364357';
  const texStyle = tileCfg?.textureStyle ?? 'mossy_stone';
  const numeralStyle = tileCfg?.numeralStyle ?? 'mono_bold';
  const numeralFontFamily =
    numeralStyle === 'cinzel_royal'
      ? '"Cinzel", serif'
      : numeralStyle === 'serif_antique'
        ? 'Georgia, serif'
        : '"JetBrains Mono", monospace';

  ctx.save();
  ctx.scale(size / baseSize, size / baseSize);
  ctx.fillStyle = boardConfig?.boardSettings.primaryColor ?? '#0f172a';
  ctx.fillRect(0, 0, baseSize, baseSize);

  const boardJumpMap = buildJumpMap(boardConfig?.ladders, boardConfig?.snakes);

  for (let tile = 1; tile <= 100; tile++) {
    const zeroBased = tile - 1;
    const rowFromBottom = Math.floor(zeroBased / BOARD_SIZE);
    const rawCol = zeroBased % BOARD_SIZE;
    const col = rowFromBottom % 2 === 0 ? rawCol : BOARD_SIZE - 1 - rawCol;
    const canvasRow = BOARD_SIZE - 1 - rowFromBottom;
    const x = col * cell;
    const y = canvasRow * cell;

    const special = SPECIAL_TILE_MAP.get(tile);
    const jump = boardJumpMap.get(tile);
    const isAlt = (rowFromBottom + col) % 2 === 0;

    let baseColor = isAlt ? primaryTileHex : alternateTileHex;
    if (tile === 1) baseColor = '#1a4236';
    else if (tile === 100) baseColor = '#5b4016';
    else if (special) baseColor = getSpecialTint(special.type).bg;

    ctx.fillStyle = baseColor;
    ctx.fillRect(x, y, cell, cell);

    // Subtle directional stone chiseling striations & mineral speckles for crisp surface definition
    for (let g = 0; g < 48; g++) {
      const gx = x + 6 + ((tile * 41 + g * 59) % (cell - 16));
      const gy = y + 6 + ((tile * 73 + g * 31) % (cell - 16));
      const w = 5 + (g % 6) * 3;
      const h = 2 + ((g * 2) % 4) * 2;
      ctx.fillStyle =
        g % 3 === 0
          ? 'rgba(255,255,255,0.075)'
          : g % 3 === 1
            ? 'rgba(2,6,23,0.22)'
            : 'rgba(148,163,184,0.085)';
      ctx.fillRect(gx, gy, w, h);
    }

    // Fine carved stone hairline cracks (deterministic per tile)
    if (tile % 2 === 0 || tile % 5 === 0) {
      ctx.strokeStyle =
        texStyle === 'basalt_lava'
          ? 'rgba(249, 115, 22, 0.62)'
          : texStyle === 'frosted_ice'
            ? 'rgba(186, 230, 253, 0.5)'
            : texStyle === 'obsidian_runes'
              ? 'rgba(192, 132, 252, 0.55)'
              : 'rgba(2, 6, 23, 0.42)';
      ctx.lineWidth = texStyle === 'basalt_lava' ? 3.0 : 2.4;
      ctx.beginPath();
      const cx0 = x + 16 + ((tile * 29) % 45);
      const cy0 = y + cell - 18 - ((tile * 17) % 35);
      ctx.moveTo(cx0, cy0);
      ctx.lineTo(cx0 + 26 + (tile % 18), cy0 - 22);
      ctx.lineTo(cx0 + 48 + (tile % 15), cy0 - 14 - (tile % 20));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx0 + 1.2, cy0 + 1.5);
      ctx.lineTo(cx0 + 27.2 + (tile % 18), cy0 - 20.5);
      ctx.stroke();
    }

    // Theme-specific corner detail (moss, lava glow, frost rim, gold filigree, etc.)
    if ((tile * 13) % 7 <= 3 && tile !== 100) {
      const mx = tile % 2 === 0 ? x + cell - 24 : x + 20;
      const my = tile % 3 === 0 ? y + 20 : y + cell - 20;
      const cornerGrad = ctx.createRadialGradient(mx, my, 2, mx, my, 44);
      if (texStyle === 'basalt_lava') {
        cornerGrad.addColorStop(0, 'rgba(249, 115, 22, 0.52)');
        cornerGrad.addColorStop(0.55, 'rgba(185, 28, 28, 0.26)');
        cornerGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
      } else if (texStyle === 'frosted_ice') {
        cornerGrad.addColorStop(0, 'rgba(224, 242, 254, 0.5)');
        cornerGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.24)');
        cornerGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else if (texStyle === 'sandstone_carved' || texStyle === 'temple_gold_inlay') {
        cornerGrad.addColorStop(0, 'rgba(251, 191, 36, 0.42)');
        cornerGrad.addColorStop(0.55, 'rgba(180, 83, 9, 0.2)');
        cornerGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
      } else if (texStyle === 'coral_mosaic') {
        cornerGrad.addColorStop(0, 'rgba(34, 211, 238, 0.45)');
        cornerGrad.addColorStop(0.55, 'rgba(13, 148, 136, 0.24)');
        cornerGrad.addColorStop(1, 'rgba(13, 148, 136, 0)');
      } else if (texStyle === 'obsidian_runes') {
        cornerGrad.addColorStop(0, 'rgba(168, 85, 247, 0.46)');
        cornerGrad.addColorStop(0.55, 'rgba(88, 28, 135, 0.24)');
        cornerGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
      } else if (texStyle === 'celestial_marble') {
        cornerGrad.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
        cornerGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.2)');
        cornerGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else {
        cornerGrad.addColorStop(0, 'rgba(34, 139, 78, 0.46)');
        cornerGrad.addColorStop(0.55, 'rgba(22, 101, 52, 0.26)');
        cornerGrad.addColorStop(1, 'rgba(22, 101, 52, 0)');
      }
      ctx.fillStyle = cornerGrad;
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
    }

    // Inner ambient occlusion vignette
    const grad = ctx.createRadialGradient(
      x + cell / 2,
      y + cell / 2,
      cell * 0.22,
      x + cell / 2,
      y + cell / 2,
      cell * 0.74,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(2,6,23,0.42)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cell, cell);

    // High-contrast 3D Chiseled Stone Bevel Outer Rim (Top-Left Lit + Bottom-Right Shadowed)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + cell - 2);
    ctx.lineTo(x + 2, y + 2);
    ctx.lineTo(x + cell - 2, y + 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(2, 6, 23, 0.55)';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(x + cell - 2, y + 2);
    ctx.lineTo(x + cell - 2, y + cell - 2);
    ctx.lineTo(x + 2, y + cell - 2);
    ctx.stroke();

    // Chiseled slate / bronze / theme inlay frame + corner studs
    const frameStroke =
      tile === 100
        ? '#f59e0b'
        : texStyle === 'temple_gold_inlay' || texStyle === 'celestial_marble'
          ? 'rgba(251, 191, 36, 0.56)'
          : texStyle === 'frosted_ice'
            ? 'rgba(186, 230, 253, 0.52)'
            : texStyle === 'basalt_lava'
              ? 'rgba(249, 115, 22, 0.52)'
              : 'rgba(226, 232, 240, 0.4)';
    ctx.strokeStyle = frameStroke;
    ctx.lineWidth = tile === 100 ? 7.5 : 3.5;
    ctx.strokeRect(x + 9, y + 9, cell - 18, cell - 18);

    // Ornamental corner inlay studs at bottom-right & top-right
    ctx.fillStyle = frameStroke;
    ctx.fillRect(x + cell - 15, y + 7, 5, 5);
    ctx.fillRect(x + cell - 15, y + cell - 12, 5, 5);
    ctx.fillRect(x + 7, y + cell - 12, 5, 5);

    if (special) {
      const specStyle = getSpecialTint(special.type);
      ctx.strokeStyle = specStyle.ring;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.arc(x + cell * 0.5, y + cell * 0.63, cell * 0.22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = specStyle.ring;
      ctx.font = 'bold 35px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(specStyle.glyph, x + cell * 0.5, y + cell * 0.64);
    } else if (jump) {
      const isLadder = jump.type === 'ladder';
      ctx.fillStyle = isLadder ? 'rgba(245, 158, 11, 0.28)' : 'rgba(16, 185, 129, 0.26)';
      ctx.beginPath();
      ctx.arc(x + cell * 0.5, y + cell * 0.65, cell * 0.215, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isLadder ? 'rgba(253, 230, 138, 0.68)' : 'rgba(110, 231, 183, 0.62)';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      ctx.fillStyle = isLadder ? '#fef08a' : '#6ee7b7';
      ctx.font = `bold 30px ${numeralFontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isLadder ? `↑${jump.to}` : `↓${jump.to}`, x + cell * 0.5, y + cell * 0.66);
    }

    if (tile === 1) {
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 27px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MULAI', x + cell * 0.5, y + cell * 0.66);
    } else if (tile === 100) {
      ctx.fillStyle = '#fde68a';
      ctx.font = 'bold 46px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♛', x + cell * 0.5, y + cell * 0.66);
    }

    // Crisp engraved numeral with high-contrast dark stroke & drop shadow for instant readability
    ctx.font = `bold 46px ${numeralFontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.lineWidth = 7;
    ctx.strokeText(String(tile), x + 16, y + 14);

    ctx.fillStyle = tile === 100 ? '#fef08a' : '#ffffff';
    ctx.fillText(String(tile), x + 16, y + 14);
  }

  ctx.restore();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  // 2. Per-cell Stone Surface Relief Maps (Normal + Packed ORM: AO, Roughness, Metalness) tiled 10x10 across board UVs
  const pbrSize = reliefSize >= 512 ? 512 : 256;
  const height = new Float32Array(pbrSize * pbrSize);
  const rough = new Float32Array(pbrSize * pbrSize);
  const ao = new Float32Array(pbrSize * pbrSize);
  const metal = new Float32Array(pbrSize * pbrSize);

  for (let y = 0; y < pbrSize; y++) {
    const v = y / pbrSize;
    for (let x = 0; x < pbrSize; x++) {
      const u = x / pbrSize;
      const idx = y * pbrSize + x;

      const stoneGrain = tileFbm(u, v, 14, 4, 21.4);
      const finePores = tileFbm(u, v, 28, 2, 63.1);
      const ridgeCrack = 1 - Math.abs(tileFbm(u + 0.13, v + 0.27, 6, 3, 47.9) * 2 - 1);
      const crack = Math.pow(ridgeCrack, 6.0);

      // Chiseled bevel border & engraved inner metallic inlay frame around each 0..1 stone face
      const edge = Math.min(u, 1 - u, v, 1 - v);
      const bevel = Math.min(1, edge / 0.09);
      const inlayBand = Math.exp(-Math.pow((edge - 0.046) / 0.011, 2));
      const innerGroove = Math.exp(-Math.pow((edge - 0.062) / 0.01, 2)) * 0.24;

      const hVal = Math.max(
        0,
        Math.min(
          1,
          0.3 + bevel * 0.48 + inlayBand * 0.14 - innerGroove + stoneGrain * 0.22 + finePores * 0.08 - crack * 0.52,
        ),
      );
      const aoVal = Math.max(0.2, Math.min(1, 0.42 + bevel * 0.58 - innerGroove * 0.85 - crack * 0.6));
      const rVal = Math.max(
        0.22,
        Math.min(0.92, (0.56 + (1 - hVal) * 0.32) * (1 - inlayBand * 0.55)),
      );
      const mVal = Math.max(0.04, Math.min(0.95, 0.08 + inlayBand * 0.78 + Math.max(0, finePores - 0.65) * 0.4));

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      metal[idx] = mVal;
    }
  }

  const ormTex = buildPackedOrmDataTexture(ao, rough, metal, pbrSize, BOARD_SIZE, BOARD_SIZE, maxAnisotropy);
  return {
    map,
    normalMap: buildNormalDataTexture(height, pbrSize, 4.6, BOARD_SIZE, BOARD_SIZE, maxAnisotropy),
    roughnessMap: ormTex,
    aoMap: ormTex,
    metalnessMap: ormTex,
  };
}

/**
 * Generates Multi-Style Ladder Surface PBR Maps (Albedo + Normal + Packed ORM)
 * tailored to all 8 Board Theme Ladder Material Styles:
 * - Timber/Gilded Wood ('ancient_oak', 'sandstone_gold')
 * - Crystalline/Marble/Pearl ('glacier_crystal', 'celestial_marble', 'coral_pearl')
 * - Forged Metal ('obsidian_iron', 'shadow_wrought', 'temple_bronze')
 */
export function createLadderMaterialPbrMaps(
  materialStyle: BoardConfig['ladderConfig']['materialStyle'],
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number,
  texSize: 256 | 512 | 1024 = 512,
): PbrTextureSet {
  const size = texSize >= 512 ? 512 : 256;
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size);
  const ao = new Float32Array(size * size);
  const metal = new Float32Array(size * size);
  const albedo = new Uint8Array(size * size * 4);

  const [pr, pg, pb] = hexToRgb(primaryHex);
  const [ar, ag, ab] = hexToRgb(accentHex);

  const isCrystal =
    materialStyle === 'glacier_crystal' ||
    materialStyle === 'celestial_marble' ||
    materialStyle === 'coral_pearl';
  const isMetal =
    materialStyle === 'obsidian_iron' ||
    materialStyle === 'shadow_wrought' ||
    materialStyle === 'temple_bronze';

  for (let y = 0; y < size; y++) {
    const v = y / size;
    const bandEdge = (v * 4) % 1;
    const seam = bandEdge < 0.055 || bandEdge > 0.945;
    const inlay = Math.exp(-Math.pow((bandEdge - 0.5) / 0.045, 2));

    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const pIdx = idx * 4;

      let hVal = 0.5;
      let rVal = 0.5;
      let aoVal = 0.85;
      let mVal = 0.1;
      let cr = pr;
      let cg = pg;
      let cb = pb;

      if (isCrystal) {
        // Faceted crystalline / marble veins with pearlescent gold/cyan seams
        const facetA = 1 - Math.abs(tileFbm(u, v, 8, 3, 31.4) * 2 - 1);
        const facetB = 1 - Math.abs(tileFbm(u + 0.4, v + 0.2, 14, 2, 73.8) * 2 - 1);
        const vein = Math.pow(Math.max(facetA, facetB * 0.85), 4.2);
        const shimmer = tileFbm(u, v, 20, 2, 18.2);

        hVal = seam ? 0.16 : Math.max(0.1, Math.min(1, 0.48 + shimmer * 0.34 - vein * 0.32 + inlay * 0.18));
        aoVal = seam ? 0.42 : Math.max(0.38, 0.78 - vein * 0.35 + shimmer * 0.22);
        rVal = Math.max(0.08, Math.min(0.55, 0.16 + (1 - shimmer) * 0.22 - inlay * 0.08));
        mVal = Math.min(0.92, 0.22 + vein * 0.58 + inlay * 0.65);

        const mixAcc = Math.min(1, vein * 0.72 + inlay * 0.65);
        cr = pr * (1 - mixAcc) + ar * mixAcc + shimmer * 22;
        cg = pg * (1 - mixAcc) + ag * mixAcc + shimmer * 22;
        cb = pb * (1 - mixAcc) + ab * mixAcc + shimmer * 26;
      } else if (isMetal) {
        // Forged hammered metal plates with riveted edge bevels & brushed anisotropy
        const hammer = tileFbm(u, v, 14, 3, 52.6);
        const brush = tileFbm(u * 4, v * 0.5, 18, 2, 19.4);
        const rivetMask =
          (bandEdge < 0.16 || bandEdge > 0.84) &&
          Math.hypot(((u * 16) % 1) - 0.5, (bandEdge < 0.5 ? bandEdge * 6 : (1 - bandEdge) * 6) - 0.5) < 0.28
            ? 1
            : 0;

        hVal = seam ? 0.1 : Math.min(1, 0.38 + hammer * 0.36 + brush * 0.16 + rivetMask * 0.28 + inlay * 0.14);
        aoVal = seam ? 0.26 : Math.min(1, 0.58 + hammer * 0.34 + rivetMask * 0.15);
        rVal = Math.max(0.16, Math.min(0.76, 0.24 + (1 - hammer) * 0.32 - inlay * 0.1 - rivetMask * 0.08));
        mVal = seam ? 0.35 : Math.min(0.98, 0.74 + hammer * 0.18 + inlay * 0.2 + rivetMask * 0.2);

        const mixAcc = Math.min(1, inlay * 0.78 + rivetMask * 0.85);
        cr = (pr * (1 - mixAcc) + ar * mixAcc) * (0.78 + hammer * 0.32);
        cg = (pg * (1 - mixAcc) + ag * mixAcc) * (0.78 + hammer * 0.32);
        cb = (pb * (1 - mixAcc) + ab * mixAcc) * (0.78 + hammer * 0.32);
      } else {
        // Hand-hewn Ancient Oak / Carved Sandstone Timber with gilded center filigree
        const fine = tileFbm(u, v, 24, 3, 39.2);
        const grain = Math.sin((v * 38 + tileFbm(u, v, 10, 3, 12) * 3.1) * Math.PI) * 0.5 + 0.5;
        hVal = seam ? 0.08 : Math.min(1, 0.32 + grain * 0.48 + fine * 0.16 + inlay * 0.15);
        aoVal = seam ? 0.26 : Math.min(1, 0.58 + grain * 0.38);
        rVal = Math.max(0.24, Math.min(0.88, (0.52 + (1 - grain) * 0.3) * (1 - inlay * 0.45)));
        mVal = Math.min(0.88, 0.05 + inlay * 0.72);

        const mixAcc = inlay * 0.65;
        cr = (pr * (1 - mixAcc) + ar * mixAcc) * (0.76 + grain * 0.32 + fine * 0.1);
        cg = (pg * (1 - mixAcc) + ag * mixAcc) * (0.76 + grain * 0.32 + fine * 0.1);
        cb = (pb * (1 - mixAcc) + ab * mixAcc) * (0.76 + grain * 0.32 + fine * 0.1);
      }

      height[idx] = hVal;
      ao[idx] = aoVal;
      rough[idx] = rVal;
      metal[idx] = mVal;
      albedo[pIdx] = clampByte(cr * (0.56 + 0.44 * aoVal));
      albedo[pIdx + 1] = clampByte(cg * (0.56 + 0.44 * aoVal));
      albedo[pIdx + 2] = clampByte(cb * (0.56 + 0.44 * aoVal));
      albedo[pIdx + 3] = 255;
    }
  }

  const ormTex = buildPackedOrmDataTexture(ao, rough, metal, size, 2, 2, maxAnisotropy);
  return {
    map: buildAlbedoDataTexture(albedo, size, 2, 2, maxAnisotropy),
    normalMap: buildNormalDataTexture(height, size, 4.4, 2, 2, maxAnisotropy),
    roughnessMap: ormTex,
    aoMap: ormTex,
    metalnessMap: ormTex,
  };
}

/**
 * Generates Brushed / Hammered Fantasy Metal PBR Maps (256x256) with Packed ORM
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
  const metal = new Float32Array(size * size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const dent = tileFbm(u, v, 12, 3, 55.2);
      const brush = tileFbm(u * 3.5, v * 0.5, 16, 2, 19.1);
      height[idx] = dent * 0.6 + brush * 0.4;
      rough[idx] = 0.16 + (1 - brush) * 0.26;
      ao[idx] = 0.68 + dent * 0.32;
      metal[idx] = 0.8 + dent * 0.18;
    }
  }

  const ormTex = buildPackedOrmDataTexture(ao, rough, metal, size, 2, 2, maxAnisotropy);
  return {
    normalMap: buildNormalDataTexture(height, size, 2.4, 2, 2, maxAnisotropy),
    roughnessMap: ormTex,
    aoMap: ormTex,
    metalnessMap: ormTex,
  };
}
