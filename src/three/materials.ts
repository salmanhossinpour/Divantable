import * as THREE from 'three';

export interface ProceduralTextureSet {
  walnutMap: THREE.CanvasTexture;
  walnutBump: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  ludoBoardMap: THREE.CanvasTexture;
  snakesBoardMap: THREE.CanvasTexture;
  chessBoardMap: THREE.CanvasTexture;
  othelloBoardMap: THREE.CanvasTexture;
  morrisBoardMap: THREE.CanvasTexture;
  diceFaceMaterials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

function createWoodTextures(maxAnisotropy: number) {
  const size = 512;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#3b2416';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const wave = Math.sin(y * 0.045) * 14 + Math.cos(y * 0.11) * 6;
    const tone = Math.sin((y + wave) * 0.18) * 0.5 + 0.5;
    const r = Math.round(48 + tone * 26);
    const g = Math.round(28 + tone * 15);
    const b = Math.round(16 + tone * 8);
    cCtx.fillStyle = `rgb(${r},${g},${b})`;
    cCtx.fillRect(0, y, size, 1);

    const gVal = Math.round(105 + tone * 55);
    bCtx.fillStyle = `rgb(${gVal},${gVal},${gVal})`;
    bCtx.fillRect(0, y, size, 1);
  }

  // Subtle fine wood pores
  for (let i = 0; i < 420; i++) {
    const x = (i * 97) % size;
    const y = (i * 53) % size;
    const w = 24 + (i % 55);
    cCtx.fillStyle = 'rgba(20, 10, 5, 0.18)';
    cCtx.fillRect(x, y, w, 1.5);
    bCtx.fillStyle = 'rgba(40, 40, 40, 0.28)';
    bCtx.fillRect(x, y, w, 1.5);
  }

  const walnutMap = new THREE.CanvasTexture(colorCanvas);
  walnutMap.colorSpace = THREE.SRGBColorSpace;
  walnutMap.wrapS = THREE.RepeatWrapping;
  walnutMap.wrapT = THREE.RepeatWrapping;
  walnutMap.anisotropy = maxAnisotropy;

  const walnutBump = new THREE.CanvasTexture(bumpCanvas);
  walnutBump.wrapS = THREE.RepeatWrapping;
  walnutBump.wrapT = THREE.RepeatWrapping;
  walnutBump.anisotropy = maxAnisotropy;

  return { walnutMap, walnutBump };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, color: string) {
  const spikes = 5;
  const innerR = outerR * 0.45;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function createLudoBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / 15;

  // Cream ivory board background
  ctx.fillStyle = '#efe5d2';
  ctx.fillRect(0, 0, size, size);

  // Subtle khatam-style outer hairline
  ctx.strokeStyle = '#b9934c';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);

  // Draw 15x15 cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const x = c * cell;
      const y = r * cell;
      ctx.fillStyle = (r + c) % 2 === 0 ? '#f6efe2' : '#eadcc4';
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = 'rgba(85, 62, 42, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cell, cell);
    }
  }

  // Colored home stretches & start squares
  const colorHex = {
    red: '#c63d33',
    blue: '#27678a',
    yellow: '#d89b28',
    green: '#2d7a4f',
  };

  // Red (bottom-left yard, bottom home col)
  ctx.fillStyle = colorHex.red;
  ctx.fillRect(6 * cell, 13 * cell, cell, cell); // Start (13,6)
  for (let r = 9; r <= 13; r++) ctx.fillRect(7 * cell, r * cell, cell, cell);

  // Blue (top-left yard, left home row)
  ctx.fillStyle = colorHex.blue;
  ctx.fillRect(1 * cell, 6 * cell, cell, cell); // Start (6,1)
  for (let c = 1; c <= 5; c++) ctx.fillRect(c * cell, 7 * cell, cell, cell);

  // Yellow (top-right yard, top home col)
  ctx.fillStyle = colorHex.yellow;
  ctx.fillRect(8 * cell, 1 * cell, cell, cell); // Start (1,8)
  for (let r = 1; r <= 5; r++) ctx.fillRect(7 * cell, r * cell, cell, cell);

  // Green (bottom-right yard, right home row)
  ctx.fillStyle = colorHex.green;
  ctx.fillRect(13 * cell, 8 * cell, cell, cell); // Start (8,13)
  for (let c = 9; c <= 13; c++) ctx.fillRect(c * cell, 7 * cell, cell, cell);

  // Re-stroke track gridlines over colored cells
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if ((r >= 6 && r <= 8) || (c >= 6 && c <= 8)) {
        ctx.strokeRect(c * cell, r * cell, cell, cell);
      }
    }
  }

  // Draw 4 corner yards
  const yards = [
    { r: 9, c: 0, color: colorHex.red },
    { r: 0, c: 0, color: colorHex.blue },
    { r: 0, c: 9, color: colorHex.yellow },
    { r: 9, c: 9, color: colorHex.green },
  ];

  for (const yrd of yards) {
    const x0 = yrd.c * cell;
    const y0 = yrd.r * cell;
    const w = 6 * cell;

    ctx.fillStyle = yrd.color;
    ctx.fillRect(x0, y0, w, w);

    // Inner ivory inlaid panel
    ctx.fillStyle = '#f8f2e7';
    const pad = cell * 0.85;
    ctx.beginPath();
    ctx.roundRect(x0 + pad, y0 + pad, w - pad * 2, w - pad * 2, 22);
    ctx.fill();
    ctx.strokeStyle = '#c59d4b';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 4 circular pawn sockets
    const spots = [
      [1.5, 1.5],
      [1.5, 3.5],
      [3.5, 1.5],
      [3.5, 3.5],
    ];
    for (const [dr, dc] of spots) {
      const cx = (yrd.c + dc + 0.5) * cell;
      const cy = (yrd.r + dr + 0.5) * cell;
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = yrd.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, cell * 0.36, 0, Math.PI * 2);
      ctx.fillStyle = '#f8f2e7';
      ctx.fill();
    }
  }

  // Center 3x3 crown triangles
  const cx = 7.5 * cell;
  const cy = 7.5 * cell;
  const left = 6 * cell;
  const right = 9 * cell;
  const top = 6 * cell;
  const bottom = 9 * cell;

  const tris: { pts: [number, number][]; color: string }[] = [
    { pts: [[left, bottom], [right, bottom], [cx, cy]], color: colorHex.red },
    { pts: [[left, top], [left, bottom], [cx, cy]], color: colorHex.blue },
    { pts: [[left, top], [right, top], [cx, cy]], color: colorHex.yellow },
    { pts: [[right, top], [right, bottom], [cx, cy]], color: colorHex.green },
  ];
  for (const t of tris) {
    ctx.beginPath();
    ctx.moveTo(t.pts[0][0], t.pts[0][1]);
    ctx.lineTo(t.pts[1][0], t.pts[1][1]);
    ctx.lineTo(t.pts[2][0], t.pts[2][1]);
    ctx.closePath();
    ctx.fillStyle = t.color;
    ctx.fill();
    ctx.strokeStyle = '#d4a84f';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // Center brass medallion
  ctx.beginPath();
  ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = '#d4a84f';
  ctx.fill();
  drawStar(ctx, cx, cy, cell * 0.3, '#2d1c12');

  // Star safe squares: (8,2), (2,6), (6,12), (12,8) + start stars
  const stars: [number, number, string][] = [
    [8, 2, '#b9934c'],
    [2, 6, '#b9934c'],
    [6, 12, '#b9934c'],
    [12, 8, '#b9934c'],
    [13, 6, '#f8f2e7'],
    [6, 1, '#f8f2e7'],
    [1, 8, '#f8f2e7'],
    [8, 13, '#f8f2e7'],
  ];
  for (const [r, c, col] of stars) {
    drawStar(ctx, (c + 0.5) * cell, (r + 0.5) * cell, cell * 0.28, col);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createSnakesBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / 10;

  ctx.fillStyle = '#efe5d2';
  ctx.fillRect(0, 0, size, size);

  const palette = ['#f5ebd8', '#e2d2b5', '#d4e2dd', '#e7cfbe'];

  for (let sq = 1; sq <= 100; sq++) {
    const zero = sq - 1;
    const rowFromBottom = Math.floor(zero / 10);
    const colInRow = zero % 10;
    const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
    const row = 9 - rowFromBottom;

    const x = col * cell;
    const y = row * cell;

    let fill = palette[(row + col) % palette.length];
    if (sq === 1) fill = '#2d7a4f';
    if (sq === 100) fill = '#d4a84f';

    ctx.fillStyle = fill;
    ctx.fillRect(x, y, cell, cell);
    ctx.strokeStyle = 'rgba(72, 50, 32, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cell, cell);

    // Persian or bold numerals
    ctx.fillStyle = sq === 1 ? '#ffffff' : sq === 100 ? '#1b140f' : '#3a291d';
    ctx.font = 'bold 30px "JetBrains Mono", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(sq), x + cell * 0.5, y + cell * 0.52);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createChessBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / 8;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      ctx.fillStyle = isLight ? '#ebd9ba' : '#5e3c26';
      ctx.fillRect(c * cell, r * cell, cell, cell);
      ctx.strokeStyle = 'rgba(212, 168, 79, 0.25)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cell, r * cell, cell, cell);
    }
  }

  // Subtle brass outer border
  ctx.strokeStyle = '#c59b47';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // Subtle algebraic file/rank markings along edges
  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  ctx.font = 'bold 20px "JetBrains Mono", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let c = 0; c < 8; c++) {
    ctx.fillStyle = (7 + c) % 2 === 0 ? '#5e3c26' : '#ebd9ba';
    ctx.fillText(files[c], (c + 0.86) * cell, size - 18);
  }
  for (let r = 0; r < 8; r++) {
    ctx.fillStyle = r % 2 === 0 ? '#5e3c26' : '#ebd9ba';
    ctx.fillText(String(8 - r), 18, (r + 0.16) * cell);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createOthelloBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / 8;

  // Deep Persian emerald felt surface
  const grad = ctx.createRadialGradient(size / 2, size / 2, 60, size / 2, size / 2, size * 0.72);
  grad.addColorStop(0, '#27593e');
  grad.addColorStop(1, '#193b29');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Crisp gold-ochre grid lines
  ctx.strokeStyle = 'rgba(212, 168, 79, 0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 8; i++) {
    const p = i * cell;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Classic 4 corner dots
  for (const [dr, dc] of [[2, 2], [2, 6], [6, 2], [6, 6]]) {
    ctx.beginPath();
    ctx.arc(dc * cell, dr * cell, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#d4a84f';
    ctx.fill();
  }

  ctx.strokeStyle = '#c59b47';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createMorrisBoardTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cell = size / 7;
  const pt = (r: number, c: number): [number, number] => [(c + 0.5) * cell, (r + 0.5) * cell];

  // Warm parchment-ivory inlaid panel
  const grad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size * 0.72);
  grad.addColorStop(0, '#f4ead6');
  grad.addColorStop(1, '#dfd0b4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#c59b47';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, size - 8, size - 8);

  // 3 concentric walnut + brass inlaid squares
  const squares = [
    [0, 6],
    [1, 5],
    [2, 4],
  ];
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#3b2416';
  for (const [minI, maxI] of squares) {
    const [x0, y0] = pt(minI, minI);
    const [x1, y1] = pt(maxI, maxI);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  // 4 radial spokes
  const spokes: [[number, number], [number, number]][] = [
    [[0, 3], [2, 3]],
    [[4, 3], [6, 3]],
    [[3, 0], [3, 2]],
    [[3, 4], [3, 6]],
  ];
  for (const [[r1, c1], [r2, c2]] of spokes) {
    const [x1, y1] = pt(r1, c1);
    const [x2, y2] = pt(r2, c2);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // 24 brass-rimmed inlaid sockets
  const coords: [number, number][] = [
    [0, 0], [0, 3], [0, 6], [3, 6], [6, 6], [6, 3], [6, 0], [3, 0],
    [1, 1], [1, 3], [1, 5], [3, 5], [5, 5], [5, 3], [5, 1], [3, 1],
    [2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [3, 2],
  ];
  for (const [r, c] of coords) {
    const [x, y] = pt(r, c);
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#c59b47';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#3b2416';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createDiceFaceMaterial(value: number, maxAnisotropy: number): THREE.MeshStandardMaterial {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#fbf6ec';
  ctx.fillRect(0, 0, size, size);

  // Subtle inset border
  ctx.strokeStyle = '#d9cbb3';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, size - 16, size - 16);

  const pipPositions: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.26, 0.26], [0.5, 0.5], [0.74, 0.74]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.26, 0.26], [0.74, 0.26], [0.5, 0.5], [0.26, 0.74], [0.74, 0.74]],
    6: [[0.28, 0.24], [0.72, 0.24], [0.28, 0.5], [0.72, 0.5], [0.28, 0.76], [0.72, 0.76]],
  };

  for (const [px, py] of pipPositions[value]) {
    ctx.beginPath();
    ctx.arc(px * size, py * size, value === 1 ? 30 : 21, 0, Math.PI * 2);
    ctx.fillStyle = value === 1 ? '#b83228' : '#1f1814';
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.22,
    metalness: 0.04,
  });
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  const { walnutMap, walnutBump } = createWoodTextures(maxAnisotropy);
  const contactShadowMap = createContactShadowTexture();
  const ludoBoardMap = createLudoBoardTexture(maxAnisotropy);
  const snakesBoardMap = createSnakesBoardTexture(maxAnisotropy);
  const chessBoardMap = createChessBoardTexture(maxAnisotropy);
  const othelloBoardMap = createOthelloBoardTexture(maxAnisotropy);
  const morrisBoardMap = createMorrisBoardTexture(maxAnisotropy);

  // BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z]
  // Mapped to: +X=3, -X=4, +Y=1, -Y=6, +Z=2, -Z=5
  const diceFaceMaterials = [
    createDiceFaceMaterial(3, maxAnisotropy),
    createDiceFaceMaterial(4, maxAnisotropy),
    createDiceFaceMaterial(1, maxAnisotropy),
    createDiceFaceMaterial(6, maxAnisotropy),
    createDiceFaceMaterial(2, maxAnisotropy),
    createDiceFaceMaterial(5, maxAnisotropy),
  ];

  return {
    walnutMap,
    walnutBump,
    contactShadowMap,
    ludoBoardMap,
    snakesBoardMap,
    chessBoardMap,
    othelloBoardMap,
    morrisBoardMap,
    diceFaceMaterials,
    dispose() {
      walnutMap.dispose();
      walnutBump.dispose();
      contactShadowMap.dispose();
      ludoBoardMap.dispose();
      snakesBoardMap.dispose();
      chessBoardMap.dispose();
      othelloBoardMap.dispose();
      morrisBoardMap.dispose();
      diceFaceMaterials.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
  };
}
