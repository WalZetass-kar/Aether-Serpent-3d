import * as THREE from 'three';
import {
  BOARD_SIZE,
  JUMP_MAP,
  SPECIAL_TILE_MAP,
  type SpecialTileType,
} from '../../shared/gameConfig';

function getSpecialColor(type: SpecialTileType): { bg: string; ring: string; glyph: string } {
  switch (type) {
    case 'boost':
      return { bg: '#064e3b', ring: '#34d399', glyph: '▲+4' };
    case 'extra_roll':
      return { bg: '#78350f', ring: '#fbbf24', glyph: '★' };
    case 'shield':
      return { bg: '#1e3a8a', ring: '#60a5fa', glyph: '❖' };
    case 'curse':
      return { bg: '#4c1d95', ring: '#c084fc', glyph: '▼-3' };
  }
}

export function createBoardAtlasTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 2048;
  const cell = size / BOARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0c1322';
  ctx.fillRect(0, 0, size, size);

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

    let fill = isAlt ? '#1a2438' : '#28354e';
    if (tile === 1) fill = '#134e3a';
    else if (tile === 100) fill = '#5c3c0c';
    else if (special) fill = getSpecialColor(special.type).bg;

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, cell, cell);

    // Subtle stone grain & mineral veins
    for (let g = 0; g < 22; g++) {
      const gx = x + 6 + ((tile * 37 + g * 53) % (cell - 12));
      const gy = y + 6 + ((tile * 71 + g * 29) % (cell - 12));
      ctx.fillStyle = g % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(gx, gy, 5, 4);
    }

    // Inner ambient occlusion vignette border
    const grad = ctx.createRadialGradient(
      x + cell / 2,
      y + cell / 2,
      cell * 0.25,
      x + cell / 2,
      y + cell / 2,
      cell * 0.72,
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.03)');
    grad.addColorStop(1, 'rgba(2,6,23,0.32)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, cell, cell);

    // Chiseled gold/slate inlay frame
    ctx.strokeStyle = tile === 100 ? '#fbbf24' : 'rgba(226, 232, 240, 0.22)';
    ctx.lineWidth = tile === 100 ? 7 : 3;
    ctx.strokeRect(x + 8, y + 8, cell - 16, cell - 16);

    if (special) {
      const specStyle = getSpecialColor(special.type);
      ctx.strokeStyle = specStyle.ring;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + cell * 0.5, y + cell * 0.63, cell * 0.23, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = specStyle.ring;
      ctx.font = 'bold 34px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(specStyle.glyph, x + cell * 0.5, y + cell * 0.64);
    } else if (jump) {
      const isLadder = jump.type === 'ladder';
      ctx.fillStyle = isLadder ? 'rgba(251, 191, 36, 0.22)' : 'rgba(16, 185, 129, 0.2)';
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

    // Crisp engraved numeral with subtle drop shadow
    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.font = 'bold 42px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(tile), x + 18, y + 16);

    ctx.fillStyle = tile === 100 ? '#fef08a' : 'rgba(248, 250, 252, 0.96)';
    ctx.fillText(String(tile), x + 16, y + 14);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBoardBumpTexture(): THREE.CanvasTexture {
  const size = 1024;
  const cell = size / BOARD_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#555555';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const x = c * cell;
      const y = r * cell;
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#b2b2b2' : '#dedede';
        const rx = x + 8 + ((r * 31 + c * 17 + i * 23) % (cell - 18));
        const ry = y + 8 + ((r * 19 + c * 43 + i * 11) % (cell - 18));
        ctx.fillRect(rx, ry, 4, 4);
      }
      ctx.strokeStyle = '#7c7c7c';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createSerpentScaleTexture(
  primaryHex: string,
  stripeHex: string,
  bellyHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Gradient around circumference: dorsal dark/primary -> belly lighter tone
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, primaryHex);
  grad.addColorStop(0.35, primaryHex);
  grad.addColorStop(0.5, bellyHex);
  grad.addColorStop(0.65, primaryHex);
  grad.addColorStop(1, primaryHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Overlapping organic diamond scales
  const stepX = 32;
  const stepY = 32;
  for (let y = 0; y < 512; y += stepY) {
    for (let x = 0; x < 512; x += stepX) {
      const offset = (y / stepY) % 2 === 0 ? 0 : stepX / 2;
      ctx.fillStyle = stripeHex;
      ctx.globalAlpha = ((x / stepX) % 3 === 0) ? 0.42 : 0.2;
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      ctx.lineTo(x + offset + stepX * 0.55, y + stepY * 0.5);
      ctx.lineTo(x + offset, y + stepY);
      ctx.lineTo(x + offset - stepX * 0.45, y + stepY * 0.5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(2, 6, 23, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 1);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createSerpentScaleBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#505050';
  ctx.fillRect(0, 0, 256, 256);

  const step = 24;
  for (let y = 0; y < 256; y += step) {
    for (let x = 0; x < 256; x += step) {
      const offset = (y / step) % 2 === 0 ? 0 : step / 2;
      ctx.fillStyle = '#dcdcdc';
      ctx.beginPath();
      ctx.moveTo(x + offset, y + 2);
      ctx.lineTo(x + offset + step * 0.5, y + step * 0.5);
      ctx.lineTo(x + offset, y + step - 2);
      ctx.lineTo(x + offset - step * 0.5, y + step * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(9, 1);
  tex.needsUpdate = true;
  return tex;
}

export function createWoodGrainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7c4a1d';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 48; i++) {
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(253, 230, 138, 0.24)' : 'rgba(46, 16, 4, 0.4)';
    ctx.lineWidth = 2 + (i % 3);
    ctx.beginPath();
    const y = (i / 48) * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + Math.sin(i) * 8, 170, y - Math.cos(i) * 8, 256, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4a3222';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * 256;
    ctx.strokeStyle = i % 2 === 0 ? '#2b1b10' : '#63432d';
    ctx.lineWidth = 2 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + Math.sin(i) * 6, 85, x - Math.cos(i) * 6, 170, x, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createBarkBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#707070';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) {
    const x = (i / 60) * 256;
    ctx.strokeStyle = i % 2 === 0 ? '#2a2a2a' : '#d2d2d2';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(i) * 4, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.needsUpdate = true;
  return tex;
}

export function createStoneCliffTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1f2b3d';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 45; i++) {
    const y = (i / 45) * 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(51, 65, 85, 0.45)' : 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(0, y, 256, 4);
  }
  for (let i = 0; i < 90; i++) {
    const rx = (i * 47) % 240;
    const ry = (i * 83) % 240;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(34, 197, 94, 0.14)' : 'rgba(148, 163, 184, 0.12)';
    ctx.fillRect(rx, ry, 14, 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 2);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createDiceFaceTexture(pips: number, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, size - 20, size - 20);

  const c = size / 2;
  const d = 56;
  const coords: Record<number, Array<[number, number]>> = {
    1: [[c, c]],
    2: [
      [c - d, c - d],
      [c + d, c + d],
    ],
    3: [
      [c - d, c - d],
      [c, c],
      [c + d, c + d],
    ],
    4: [
      [c - d, c - d],
      [c + d, c - d],
      [c - d, c + d],
      [c + d, c + d],
    ],
    5: [
      [c - d, c - d],
      [c + d, c - d],
      [c, c],
      [c - d, c + d],
      [c + d, c + d],
    ],
    6: [
      [c - d, c - d],
      [c + d, c - d],
      [c - d, c],
      [c + d, c],
      [c - d, c + d],
      [c + d, c + d],
    ],
  };

  for (const [px, py] of coords[pips] || coords[1]) {
    ctx.fillStyle = pips === 1 ? '#b45309' : '#0f172a';
    ctx.beginPath();
    ctx.arc(px, py, pips === 1 ? 26 : 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.72)');
  grad.addColorStop(0.55, 'rgba(2, 6, 23, 0.3)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createRunicMoatTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size / 2);
  grad.addColorStop(0, '#0c4a6e');
  grad.addColorStop(0.5, '#0369a1');
  grad.addColorStop(0.8, '#0284c7');
  grad.addColorStop(1, '#082f49');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(186, 230, 253, 0.35)';
  ctx.lineWidth = 3;
  [120, 165, 210, 240].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}
