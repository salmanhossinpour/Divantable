import * as THREE from 'three';
import type { ProceduralTextureSet } from './materials.ts';
import type { ChessPieceKind, PlayerColor } from '../game/types.ts';
import { LADDERS, SNAKES, getSnakeBoardCoords } from '../game/snakesEngine.ts';
import { MORRIS_NODE_COORDS } from '../game/morrisEngine.ts';
import { MASTERMIND_COLORS } from '../game/mastermindEngine.ts';

export const COLOR_PALETTE: Record<PlayerColor, number> = {
  red: 0xc93b31,
  blue: 0x266d94,
  yellow: 0xdca028,
  green: 0x2c7d50,
  ivory: 0xf1e5cf,
  ebony: 0x241d18,
};

export function createColorMaterial(color: PlayerColor): THREE.MeshStandardMaterial {
  const isIvory = color === 'ivory';
  const isEbony = color === 'ebony';
  return new THREE.MeshStandardMaterial({
    color: COLOR_PALETTE[color],
    roughness: isIvory ? 0.24 : isEbony ? 0.34 : 0.28,
    metalness: isEbony ? 0.08 : 0.05,
  });
}

// Composite 4-part turned pawn (Lathe body + brass collar + crown sphere + contact shadow)
export function createTurnedPawn(
  color: PlayerColor,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial,
  scale = 1
): { group: THREE.Group; highlightRing: THREE.Mesh } {
  const group = new THREE.Group();
  const bodyMat = createColorMaterial(color);

  // 1. Primary silhouette: turned LatheGeometry body (bottom-center pivot at y=0)
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.29, 0.06),
    new THREE.Vector2(0.22, 0.12),
    new THREE.Vector2(0.14, 0.28),
    new THREE.Vector2(0.11, 0.48),
    new THREE.Vector2(0.17, 0.56),
    new THREE.Vector2(0.0, 0.58),
  ];
  const latheGeo = new THREE.LatheGeometry(profile, 22);
  const bodyMesh = new THREE.Mesh(latheGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // 2. Secondary detail: brushed brass collar ring
  const collarGeo = new THREE.TorusGeometry(0.155, 0.025, 10, 22);
  const collar = new THREE.Mesh(collarGeo, brassMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.53;
  collar.castShadow = true;
  group.add(collar);

  // 3. Accent detail: glossy crown finial
  const headGeo = new THREE.SphereGeometry(0.14, 18, 14);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.y = 0.68;
  head.castShadow = true;
  group.add(head);

  // 4. Radial contact shadow disc
  const shadowGeo = new THREE.CircleGeometry(0.35, 18);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.012;
  group.add(shadowDisc);

  // Interactive highlight ring (visible when pawn is a legal move)
  const ringGeo = new THREE.RingGeometry(0.32, 0.43, 28);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf4c556,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92,
  });
  const highlightRing = new THREE.Mesh(ringGeo, ringMat);
  highlightRing.rotation.x = -Math.PI / 2;
  highlightRing.position.y = 0.025;
  highlightRing.visible = false;
  group.add(highlightRing);

  group.scale.setScalar(scale);
  return { group, highlightRing };
}

// Composite 3-part turned Backgammon checker
export function createBackgammonChecker(
  owner: 0 | 1,
  brassMat: THREE.MeshStandardMaterial,
  textures: ProceduralTextureSet
): THREE.Group {
  const group = new THREE.Group();
  const mat = createColorMaterial(owner === 0 ? 'ivory' : 'ebony');

  // 1. Turned wooden disc with beveled rim
  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.35, 0.0),
    new THREE.Vector2(0.37, 0.03),
    new THREE.Vector2(0.37, 0.12),
    new THREE.Vector2(0.33, 0.15),
    new THREE.Vector2(0.24, 0.15),
    new THREE.Vector2(0.21, 0.12),
    new THREE.Vector2(0.11, 0.12),
    new THREE.Vector2(0.09, 0.15),
    new THREE.Vector2(0.0, 0.15),
  ];
  const geo = new THREE.LatheGeometry(profile, 24);
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 2. Center brass inlay button
  const inlayGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16);
  const inlay = new THREE.Mesh(inlayGeo, brassMat);
  inlay.position.y = 0.15;
  group.add(inlay);

  // 3. Radial contact shadow
  const shadowGeo = new THREE.CircleGeometry(0.41, 16);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  group.add(shadow);

  return group;
}

// 3D Dice with bevel collar & accurate face rotations
export function createDiceGroup(textures: ProceduralTextureSet): THREE.Group {
  const wrapper = new THREE.Group();
  const size = 0.72;
  const cubeGeo = new THREE.BoxGeometry(size, size, size);
  const cube = new THREE.Mesh(cubeGeo, textures.diceFaceMaterials);
  cube.castShadow = true;
  cube.receiveShadow = true;
  wrapper.add(cube);

  // Subtle brass corner accent frame on edges for tactile silhouette
  const edgeGeo = new THREE.BoxGeometry(size * 1.01, size * 0.88, size * 0.88);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xd4a84f,
    roughness: 0.25,
    metalness: 0.85,
    wireframe: false,
    transparent: true,
    opacity: 0.0,
  });
  edgeGeo.dispose();
  edgeMat.dispose();

  return wrapper;
}

export function getDiceTargetEuler(value: number): THREE.Euler {
  // Face order on BoxGeometry: +X=3, -X=4, +Y=1, -Y=6, +Z=2, -Z=5
  switch (value) {
    case 1:
      return new THREE.Euler(0, 0, 0);
    case 6:
      return new THREE.Euler(Math.PI, 0, 0);
    case 2:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    case 5:
      return new THREE.Euler(Math.PI / 2, 0, 0);
    case 3:
      return new THREE.Euler(0, 0, Math.PI / 2);
    case 4:
      return new THREE.Euler(0, 0, -Math.PI / 2);
    default:
      return new THREE.Euler(0, 0, 0);
  }
}

export function buildParlorEnvironment(
  scene: THREE.Scene,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
) {
  const envGroup = new THREE.Group();

  // Grand circular walnut parlor table top underneath boards
  const tableMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.015,
    color: 0x9b806c,
    roughness: 0.55,
    metalness: 0.05,
  });

  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(12.2, 12.6, 0.55, 64), tableMat);
  tableTop.position.y = -0.28;
  tableTop.receiveShadow = true;
  envGroup.add(tableTop);

  // Brass inlay ring around parlor table rim
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(12.15, 0.07, 12, 72), brassMat);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 0.0;
  envGroup.add(rimRing);

  // Sculpted table pedestal below
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.6, 4.5, 24), tableMat);
  pedestal.position.y = -2.8;
  envGroup.add(pedestal);

  // Floor plane far below for seamless warm studio fade
  const floorGeo = new THREE.PlaneGeometry(80, 80);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x161210,
    roughness: 0.9,
    metalness: 0.0,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.0;
  envGroup.add(floor);

  scene.add(envGroup);
  return envGroup;
}

export function gridCellToWorld(row: number, col: number, gridSize: number, boardSpan = 11.2): [number, number] {
  const cell = boardSpan / gridSize;
  const x = (col + 0.5) * cell - boardSpan / 2;
  const z = (row + 0.5) * cell - boardSpan / 2;
  return [x, z];
}

export function buildFramedSquareBoard(
  boardTexture: THREE.CanvasTexture,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const span = 11.2;

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.06,
  });

  // Base solid walnut slab
  const base = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.24, 12.2), woodMat);
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // 4 Beveled border rails + brass corner brackets
  const railH = 0.34;
  const railT = 0.45;
  const railLen = 12.2;
  const railOffsets: [number, number, number, number][] = [
    [0, -5.88, railLen, railT],
    [0, 5.88, railLen, railT],
    [-5.88, 0, railT, railLen - railT * 2],
    [5.88, 0, railT, railLen - railT * 2],
  ];
  for (const [rx, rz, rw, rd] of railOffsets) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, railH, rd), woodMat);
    rail.position.set(rx, railH / 2, rz);
    rail.castShadow = true;
    rail.receiveShadow = true;
    group.add(rail);
  }

  // Brass corner plaques
  const cornerCoords: [number, number][] = [
    [-5.9, -5.9],
    [5.9, -5.9],
    [-5.9, 5.9],
    [5.9, 5.9],
  ];
  for (const [cx, cz] of cornerCoords) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.37, 0.55), brassMat);
    cap.position.set(cx, 0.19, cz);
    cap.castShadow = true;
    group.add(cap);
  }

  // Playing surface plane offset >= 0.02 above base (y = 0.255)
  const surfaceGeo = new THREE.PlaneGeometry(span, span);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: boardTexture,
    color: 0xffffff,
    roughness: 0.38,
    metalness: 0.02,
  });
  const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.26;
  surface.receiveShadow = true;
  group.add(surface);

  return group;
}

export function buildSnakesAndLaddersProps(group: THREE.Group, brassMat: THREE.MeshStandardMaterial) {
  const ladderWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd9a75c,
    roughness: 0.35,
    metalness: 0.08,
  });

  // Build 3D Ladders
  for (const [fromStr, toNum] of Object.entries(LADDERS)) {
    const fromNum = Number(fromStr);
    const [r1, c1] = getSnakeBoardCoords(fromNum);
    const [r2, c2] = getSnakeBoardCoords(toNum);
    const [x1, z1] = gridCellToWorld(r1, c1, 10);
    const [x2, z2] = gridCellToWorld(r2, c2, 10);

    const start = new THREE.Vector3(x1, 0.3, z1);
    const end = new THREE.Vector3(x2, 0.3, z2);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.18);

    const ladderGroup = new THREE.Group();
    const railGeo = new THREE.CylinderGeometry(0.036, 0.036, length, 10);

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const upVec = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(upVec, dir.clone().normalize());

    for (const sign of [-1, 1]) {
      const rail = new THREE.Mesh(railGeo, ladderWoodMat);
      rail.position.copy(mid).addScaledVector(perp, sign);
      rail.quaternion.copy(quat);
      rail.castShadow = true;
      ladderGroup.add(rail);
    }

    const rungCount = Math.max(4, Math.floor(length / 0.45));
    const rungWidth = 0.36;
    const rungGeo = new THREE.CylinderGeometry(0.024, 0.024, rungWidth, 8);
    const perpDir = perp.clone().normalize();
    const rungQuat = new THREE.Quaternion().setFromUnitVectors(upVec, perpDir);

    for (let i = 1; i < rungCount; i++) {
      const t = i / rungCount;
      const rung = new THREE.Mesh(rungGeo, brassMat);
      rung.position.lerpVectors(start, end, t);
      rung.quaternion.copy(rungQuat);
      rung.castShadow = true;
      ladderGroup.add(rung);
    }

    group.add(ladderGroup);
  }

  // Build 3D Undulating Snakes
  const snakePalettes = [
    { body: 0x2a7f62, belly: 0x87d4b3 },
    { body: 0xb84336, belly: 0xf2a080 },
    { body: 0x3b6796, belly: 0x99c4eb },
    { body: 0x7c4f8f, belly: 0xd4a8e8 },
  ];

  let snakeIdx = 0;
  for (const [headStr, tailNum] of Object.entries(SNAKES)) {
    const headNum = Number(headStr);
    const [r1, c1] = getSnakeBoardCoords(headNum);
    const [r2, c2] = getSnakeBoardCoords(tailNum);
    const [x1, z1] = gridCellToWorld(r1, c1, 10);
    const [x2, z2] = gridCellToWorld(r2, c2, 10);

    const pal = snakePalettes[snakeIdx % snakePalettes.length];
    snakeIdx++;

    const headPos = new THREE.Vector3(x1, 0.42, z1);
    const tailPos = new THREE.Vector3(x2, 0.31, z2);
    const diff = new THREE.Vector3().subVectors(tailPos, headPos);
    const perp = new THREE.Vector3(-diff.z, 0, diff.x).normalize();

    const pts: THREE.Vector3[] = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = new THREE.Vector3().lerpVectors(headPos, tailPos, t);
      const env = Math.sin(t * Math.PI);
      const wave = Math.sin(t * Math.PI * 3.5) * 0.36 * env;
      p.addScaledVector(perp, wave);
      p.y += env * 0.14;
      pts.push(p);
    }

    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.085, 10, false);
    const snakeMat = new THREE.MeshStandardMaterial({
      color: pal.body,
      roughness: 0.28,
      metalness: 0.12,
    });
    const bodyMesh = new THREE.Mesh(tubeGeo, snakeMat);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Sculpted snake head + 2 golden eyes
    const snakeHeadGroup = new THREE.Group();
    snakeHeadGroup.position.copy(headPos);
    snakeHeadGroup.lookAt(pts[1]);

    const headGeo = new THREE.SphereGeometry(0.14, 14, 12);
    headGeo.scale(1.0, 0.72, 1.35);
    const headMesh = new THREE.Mesh(headGeo, snakeMat);
    headMesh.castShadow = true;
    snakeHeadGroup.add(headMesh);

    const eyeGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf9d65c, roughness: 0.2, metalness: 0.4 });
    for (const ex of [-0.07, 0.07]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.065, -0.06);
      snakeHeadGroup.add(eye);
    }

    group.add(snakeHeadGroup);
  }
}

export interface BackgammonGeometryMap {
  boardGroup: THREE.Group;
  hitTargets: THREE.Mesh[];
  highlightRings: Map<number, THREE.Mesh>;
  getCheckerPosition: (pointIdx: number, stackIndex: number, owner: 0 | 1) => THREE.Vector3;
}

export function buildBackgammonBoard(
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): BackgammonGeometryMap {
  const boardGroup = new THREE.Group();
  const hitTargets: THREE.Mesh[] = [];
  const highlightRings = new Map<number, THREE.Mesh>();

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.06,
  });

  const feltMat = new THREE.MeshStandardMaterial({
    color: 0x22362b, // Rich Persian emerald-pine baize bed
    roughness: 0.85,
    metalness: 0.02,
  });

  // Main wooden base
  const base = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.24, 10.8), woodMat);
  base.position.y = 0.12;
  base.castShadow = true;
  base.receiveShadow = true;
  boardGroup.add(base);

  // Felt playing surface (left and right wells + bearoff well)
  const bedLeft = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 9.6), feltMat);
  bedLeft.position.set(-3.45, 0.25, 0);
  bedLeft.receiveShadow = true;
  boardGroup.add(bedLeft);

  const bedRight = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.04, 9.6), feltMat);
  bedRight.position.set(2.85, 0.25, 0);
  bedRight.receiveShadow = true;
  boardGroup.add(bedRight);

  const bearOffBed = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.04, 9.6), feltMat);
  bearOffBed.position.set(6.55, 0.25, 0);
  bearOffBed.receiveShadow = true;
  boardGroup.add(bearOffBed);

  // Outer raised wooden frame + central dividing bar + bearoff divider
  const wallH = 0.56;
  const walls: [number, number, number, number][] = [
    [0, -5.1, 14.8, 0.6],
    [0, 5.1, 14.8, 0.6],
    [-6.9, 0, 0.6, 9.6],
    [7.25, 0, 0.35, 9.6],
    [-0.3, 0, 0.7, 9.6], // Central bar
    [5.85, 0, 0.38, 9.6], // Divider before bearoff tray
  ];
  for (const [wx, wz, ww, wd] of walls) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(ww, wallH, wd), woodMat);
    w.position.set(wx, wallH / 2, wz);
    w.castShadow = true;
    w.receiveShadow = true;
    boardGroup.add(w);
  }

  // Brass hinges on central bar
  for (const hz of [-3.4, 3.4]) {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.45), brassMat);
    hinge.position.set(-0.3, 0.56, hz);
    boardGroup.add(hinge);
  }

  // 24 Inlaid Triangular Points
  const ptWidth = 0.84;
  const ptLen = 3.95;
  const lightTriMat = new THREE.MeshStandardMaterial({ color: 0xdecbb0, roughness: 0.45, metalness: 0.04 });
  const darkTriMat = new THREE.MeshStandardMaterial({ color: 0x8a2c24, roughness: 0.45, metalness: 0.05 });

  const triShape = new THREE.Shape();
  triShape.moveTo(-ptWidth / 2, 0);
  triShape.lineTo(ptWidth / 2, 0);
  triShape.lineTo(0, ptLen);
  triShape.closePath();
  const triGeo = new THREE.ExtrudeGeometry(triShape, { depth: 0.025, bevelEnabled: false });
  triGeo.rotateX(-Math.PI / 2);

  const getPointXZ = (pt: number): { x: number; zBase: number; zDir: number } => {
    // 1..6: bottom right (6 near bar, 1 near right divider)
    if (pt >= 1 && pt <= 6) {
      const col = 6 - pt; // 0..5
      return { x: 0.52 + col * 0.93, zBase: 4.75, zDir: -1 };
    }
    // 7..12: bottom left (7 near bar, 12 at far left)
    if (pt >= 7 && pt <= 12) {
      const col = 12 - pt; // 0..5
      return { x: -5.78 + col * 0.93, zBase: 4.75, zDir: -1 };
    }
    // 13..18: top left (13 at far left, 18 near bar)
    if (pt >= 13 && pt <= 18) {
      const col = pt - 13; // 0..5
      return { x: -5.78 + col * 0.93, zBase: -4.75, zDir: 1 };
    }
    // 19..24: top right (19 near bar, 24 near right divider)
    const col = pt - 19; // 0..5
    return { x: 0.52 + col * 0.93, zBase: -4.75, zDir: 1 };
  };

  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const ringGeo = new THREE.RingGeometry(0.32, 0.44, 24);

  for (let pt = 1; pt <= 24; pt++) {
    const { x, zBase, zDir } = getPointXZ(pt);
    const tri = new THREE.Mesh(triGeo, pt % 2 === 1 ? darkTriMat : lightTriMat);
    tri.position.set(x, 0.275, zBase);
    if (zDir > 0) {
      tri.rotation.y = Math.PI;
    }
    tri.receiveShadow = true;
    boardGroup.add(tri);

    // Raycast hitbox covering entire point lane
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.45, 4.3), hitMat);
    hit.position.set(x, 0.45, zBase + zDir * 2.15);
    hit.userData = { kind: 'bg_point', pointIndex: pt };
    boardGroup.add(hit);
    hitTargets.push(hit);

    // Highlight ring near point tip/base
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf4c556,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.305, zBase + zDir * 0.45);
    ring.visible = false;
    boardGroup.add(ring);
    highlightRings.set(pt, ring);
  }

  // Bar hitboxes & rings (25 = P0 bar, 0 = P1 bar? Wait: keep 25 = P0 bar / P1 bearoff, 0 = P1 bar / P0 bearoff!)
  // Wait: let's keep separate visual/click markers for Bar vs Bearoff by tagging pointIndex carefully:
  // In engine: P0 moves 25 -> 1..24 -> 0. P1 moves 0 -> 1..24 -> 25.
  // So we register hitbox for Bar (both 25 and 0 click targets depending on turn) and Bear-off tray!
  const barHitP0 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 4.0), hitMat);
  barHitP0.position.set(-0.3, 0.7, -2.0);
  barHitP0.userData = { kind: 'bg_bar', owner: 0, pointIndex: 25 };
  boardGroup.add(barHitP0);
  hitTargets.push(barHitP0);

  const barHitP1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 4.0), hitMat);
  barHitP1.position.set(-0.3, 0.7, 2.0);
  barHitP1.userData = { kind: 'bg_bar', owner: 1, pointIndex: 0 };
  boardGroup.add(barHitP1);
  hitTargets.push(barHitP1);

  const bearOffHitP0 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 4.4), hitMat);
  bearOffHitP0.position.set(6.55, 0.45, 2.4);
  bearOffHitP0.userData = { kind: 'bg_bearoff', owner: 0, pointIndex: 0 };
  boardGroup.add(bearOffHitP0);
  hitTargets.push(bearOffHitP0);

  const bearOffHitP1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 4.4), hitMat);
  bearOffHitP1.position.set(6.55, 0.45, -2.4);
  bearOffHitP1.userData = { kind: 'bg_bearoff', owner: 1, pointIndex: 25 };
  boardGroup.add(bearOffHitP1);
  hitTargets.push(bearOffHitP1);

  // Highlight rings for Bear-Off trays (keyed as 100 for P0 bearoff, 101 for P1 bearoff, 102 for bar)
  const makeExtraRing = (key: number, x: number, y: number, z: number) => {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(0.36, 0.49, 24),
      new THREE.MeshBasicMaterial({ color: 0xf4c556, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, y, z);
    r.visible = false;
    boardGroup.add(r);
    highlightRings.set(key, r);
  };
  makeExtraRing(100, 6.55, 0.31, 2.4); // P0 bearoff
  makeExtraRing(101, 6.55, 0.31, -2.4); // P1 bearoff
  makeExtraRing(102, -0.3, 0.62, 0.0); // Bar highlight

  const getCheckerPosition = (pointIdx: number, stackIndex: number, owner: 0 | 1): THREE.Vector3 => {
    // Bar checkers sit on central bar
    if (pointIdx === 25 && owner === 0) {
      return new THREE.Vector3(-0.3, 0.57 + Math.floor(stackIndex / 2) * 0.16, -1.1 - (stackIndex % 2) * 0.8);
    }
    if (pointIdx === 0 && owner === 1) {
      return new THREE.Vector3(-0.3, 0.57 + Math.floor(stackIndex / 2) * 0.16, 1.1 + (stackIndex % 2) * 0.8);
    }
    // Borne-off checkers stack neatly in side tray
    if (pointIdx === 0 && owner === 0) {
      const col = stackIndex % 2;
      const tier = Math.floor(stackIndex / 2);
      return new THREE.Vector3(6.32 + col * 0.46, 0.28 + tier * 0.155, 1.2 + (tier % 3) * 0.78);
    }
    if (pointIdx === 25 && owner === 1) {
      const col = stackIndex % 2;
      const tier = Math.floor(stackIndex / 2);
      return new THREE.Vector3(6.32 + col * 0.46, 0.28 + tier * 0.155, -1.2 - (tier % 3) * 0.78);
    }

    const { x, zBase, zDir } = getPointXZ(pointIdx);
    const slot = stackIndex % 5;
    const tier = Math.floor(stackIndex / 5);
    const z = zBase + zDir * (0.45 + slot * 0.76);
    const y = 0.295 + tier * 0.16;
    return new THREE.Vector3(x, y, z);
  };

  return { boardGroup, hitTargets, highlightRings, getCheckerPosition };
}

export interface Grid8x8Interaction {
  hitTargets: THREE.Mesh[];
  highlightRings: THREE.Mesh[][]; // [row][col]
}

export function buildGrid8x8Interaction(boardGroup: THREE.Group): Grid8x8Interaction {
  const hitTargets: THREE.Mesh[] = [];
  const highlightRings: THREE.Mesh[][] = Array.from({ length: 8 }, () => []);
  const cellSpan = 11.2 / 8;

  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeo = new THREE.BoxGeometry(cellSpan * 0.96, 0.45, cellSpan * 0.96);
  const ringGeo = new THREE.RingGeometry(0.42, 0.56, 28);

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const [wx, wz] = gridCellToWorld(r, c, 8);
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.set(wx, 0.45, wz);
      hit.userData = { kind: 'grid_cell', row: r, col: c };
      boardGroup.add(hit);
      hitTargets.push(hit);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf4c556,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(wx, 0.285, wz);
      ring.visible = false;
      boardGroup.add(ring);
      highlightRings[r][c] = ring;
    }
  }

  return { hitTargets, highlightRings };
}

export function createChessPieceMesh(
  kind: ChessPieceKind,
  owner: 0 | 1,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const mat = createColorMaterial(owner === 0 ? 'ivory' : 'ebony');

  // Shared turned Staunton pedestal profile
  const scaleH =
    kind === 'p' ? 0.72 : kind === 'r' ? 0.88 : kind === 'n' ? 0.92 : kind === 'b' ? 1.0 : kind === 'q' ? 1.15 : 1.24;

  const profile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.44, 0.09),
    new THREE.Vector2(0.35, 0.18),
    new THREE.Vector2(0.24, 0.34),
    new THREE.Vector2(0.16, 0.65 * scaleH),
    new THREE.Vector2(0.25, 0.78 * scaleH),
    new THREE.Vector2(0.0, 0.82 * scaleH),
  ];
  const baseGeo = new THREE.LatheGeometry(profile, 20);
  const baseMesh = new THREE.Mesh(baseGeo, mat);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Brass collar accent
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.026, 8, 20), brassMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.76 * scaleH;
  group.add(collar);

  // Piece-specific distinctive silhouette finial
  if (kind === 'p') {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), mat);
    head.position.y = 0.78;
    head.castShadow = true;
    group.add(head);
  } else if (kind === 'r') {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.32, 16), mat);
    turret.position.y = 0.86;
    turret.castShadow = true;
    group.add(turret);
    // 4 battlements
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.11), mat);
      merlon.position.set(Math.cos(ang) * 0.19, 1.07, Math.sin(ang) * 0.19);
      merlon.castShadow = true;
      group.add(merlon);
    }
  } else if (kind === 'n') {
    // Sculpted horse neck & snout facing opponent
    const facing = owner === 0 ? -1 : 1;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.3), mat);
    neck.position.set(0, 0.9, 0.03 * facing);
    neck.rotation.x = -0.25 * facing;
    neck.castShadow = true;
    group.add(neck);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.36), mat);
    snout.position.set(0, 1.06, 0.17 * facing);
    snout.rotation.x = 0.32 * facing;
    snout.castShadow = true;
    group.add(snout);

    for (const ex of [-0.07, 0.07]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 6), mat);
      ear.position.set(ex, 1.22, -0.02 * facing);
      group.add(ear);
    }
  } else if (kind === 'b') {
    const mitre = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), mat);
    mitre.scale.set(0.9, 1.38, 0.9);
    mitre.position.y = 1.02;
    mitre.castShadow = true;
    group.add(mitre);

    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), brassMat);
    tip.position.y = 1.32;
    group.add(tip);
  } else if (kind === 'q') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.19, 0.24, 16), mat);
    crown.position.y = 1.05;
    crown.castShadow = true;
    group.add(crown);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), mat);
    dome.position.y = 1.19;
    group.add(dome);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), brassMat);
    orb.position.y = 1.39;
    group.add(orb);
  } else if (kind === 'k') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.26, 16), mat);
    crown.position.y = 1.12;
    crown.castShadow = true;
    group.add(crown);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.09), brassMat);
    crossV.position.y = 1.4;
    group.add(crossV);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.085, 0.085), brassMat);
    crossH.position.y = 1.44;
    group.add(crossH);
  }

  // Radial contact shadow
  const shadowGeo = new THREE.CircleGeometry(0.48, 18);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

export function createOthelloDisc(
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const wrapper = new THREE.Group();

  // Inner pivoting disc: rotX = 0 => ivory (+Y) up, rotX = Math.PI => ebony (-Y) up
  const discPivot = new THREE.Group();
  discPivot.position.y = 0.11;
  discPivot.name = 'discPivot';

  const ivoryMat = createColorMaterial('ivory');
  const ebonyMat = createColorMaterial('ebony');

  const topHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.08, 24), ivoryMat);
  topHalf.position.y = 0.04;
  topHalf.castShadow = true;
  topHalf.receiveShadow = true;
  discPivot.add(topHalf);

  const botHalf = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.46, 0.08, 24), ebonyMat);
  botHalf.position.y = -0.04;
  botHalf.castShadow = true;
  botHalf.receiveShadow = true;
  discPivot.add(botHalf);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.475, 0.028, 10, 28), brassMat);
  rim.rotation.x = Math.PI / 2;
  discPivot.add(rim);

  wrapper.add(discPivot);

  // Contact shadow fixed underneath on board plane
  const shadowGeo = new THREE.CircleGeometry(0.54, 18);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  wrapper.add(shadow);

  return wrapper;
}

export interface Connect4SceneMap {
  boardGroup: THREE.Group;
  tokensLayer: THREE.Group;
  hitTargets: THREE.Mesh[];
  colIndicators: THREE.Mesh[];
  getCellPosition: (row: number, col: number) => THREE.Vector3;
}

export function buildConnect4Scene(
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): Connect4SceneMap {
  const boardGroup = new THREE.Group();
  const tokensLayer = new THREE.Group();
  boardGroup.add(tokensLayer);

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.06,
  });

  const colSpacing = 1.25;
  const rowSpacing = 1.15;
  const rackWidth = 7 * colSpacing + 0.5; // 9.25
  const rackHeight = 6 * rowSpacing + 0.45; // 7.35

  // Heavy walnut base stand
  const stand = new THREE.Mesh(new THREE.BoxGeometry(rackWidth + 1.8, 0.34, 2.6), woodMat);
  stand.position.set(0, 0.17, 0);
  stand.castShadow = true;
  stand.receiveShadow = true;
  boardGroup.add(stand);

  // Side uprights + top header bar
  const pillarGeo = new THREE.BoxGeometry(0.45, rackHeight + 0.3, 0.92);
  for (const sx of [-(rackWidth / 2 + 0.1), rackWidth / 2 + 0.1]) {
    const pillar = new THREE.Mesh(pillarGeo, woodMat);
    pillar.position.set(sx, 0.34 + (rackHeight + 0.3) / 2, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    boardGroup.add(pillar);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), brassMat);
    cap.position.set(sx, 0.34 + rackHeight + 0.35, 0);
    boardGroup.add(cap);
  }

  // Bottom tray floor
  const trayFloor = new THREE.Mesh(new THREE.BoxGeometry(rackWidth, 0.24, 0.92), woodMat);
  trayFloor.position.set(0, 0.46, 0);
  trayFloor.receiveShadow = true;
  boardGroup.add(trayFloor);

  // Horizontal brass guide rails across rows (keeps rack open so tokens shine clearly)
  const railGeo = new THREE.CylinderGeometry(0.045, 0.045, rackWidth, 10);
  railGeo.rotateZ(Math.PI / 2);
  for (let r = 0; r <= 6; r++) {
    const ry = 0.62 + r * rowSpacing;
    for (const rz of [-0.36, 0.36]) {
      const rail = new THREE.Mesh(railGeo, brassMat);
      rail.position.set(0, ry, rz);
      boardGroup.add(rail);
    }
  }

  // Vertical walnut dividers between columns
  const divGeo = new THREE.BoxGeometry(0.11, rackHeight, 0.84);
  for (let c = 0; c <= 7; c++) {
    const cx = (c - 3.5) * colSpacing;
    const div = new THREE.Mesh(divGeo, woodMat);
    div.position.set(cx, 0.46 + rackHeight / 2, 0);
    div.castShadow = true;
    boardGroup.add(div);
  }

  // Column raycast hitboxes & top drop indicators
  const hitTargets: THREE.Mesh[] = [];
  const colIndicators: THREE.Mesh[] = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeo = new THREE.BoxGeometry(colSpacing * 0.94, rackHeight + 1.0, 1.4);
  const indGeo = new THREE.ConeGeometry(0.22, 0.38, 14);

  for (let c = 0; c < 7; c++) {
    const cx = (c - 3) * colSpacing;
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(cx, 0.46 + rackHeight / 2, 0);
    hit.userData = { kind: 'c4_col', col: c };
    boardGroup.add(hit);
    hitTargets.push(hit);

    const ind = new THREE.Mesh(
      indGeo,
      new THREE.MeshStandardMaterial({ color: 0xf4c556, roughness: 0.25, metalness: 0.7 })
    );
    ind.rotation.x = Math.PI;
    ind.position.set(cx, 0.65 + rackHeight + 0.32, 0);
    ind.visible = false;
    boardGroup.add(ind);
    colIndicators.push(ind);
  }

  const getCellPosition = (row: number, col: number): THREE.Vector3 => {
    const x = (col - 3) * colSpacing;
    // row 5 is bottom, row 0 is top
    const rowFromBottom = 5 - row;
    const y = 0.62 + (rowFromBottom + 0.5) * rowSpacing;
    return new THREE.Vector3(x, y, 0);
  };

  return { boardGroup, tokensLayer, hitTargets, colIndicators, getCellPosition };
}

export function createConnect4Token(
  owner: 0 | 1,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const mat = createColorMaterial(owner === 0 ? 'red' : 'yellow');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 24), mat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  for (const zSign of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 22), brassMat);
    ring.position.z = zSign * 0.172;
    group.add(ring);
  }

  return group;
}

export function createCheckersPiece(
  owner: 0 | 1,
  isKing: boolean,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const mat = createColorMaterial(owner === 0 ? 'ivory' : 'ebony');

  const discGeo = new THREE.CylinderGeometry(0.46, 0.49, 0.18, 24);
  const baseDisc = new THREE.Mesh(discGeo, mat);
  baseDisc.position.y = 0.09;
  baseDisc.castShadow = true;
  baseDisc.receiveShadow = true;
  group.add(baseDisc);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.024, 8, 24), brassMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.175;
  group.add(rim);

  if (isKing) {
    const topDisc = new THREE.Mesh(discGeo, mat);
    topDisc.position.y = 0.27;
    topDisc.castShadow = true;
    topDisc.receiveShadow = true;
    group.add(topDisc);

    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.032, 8, 24), brassMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 0.365;
    group.add(crownRing);

    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), brassMat);
    stud.position.y = 0.38;
    group.add(stud);
  }

  const shadowGeo = new THREE.CircleGeometry(0.54, 18);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowMap,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

export interface MorrisInteraction {
  hitTargets: THREE.Mesh[];
  highlightRings: THREE.Mesh[];
}

export function buildMorrisInteraction(boardGroup: THREE.Group): MorrisInteraction {
  const hitTargets: THREE.Mesh[] = [];
  const highlightRings: THREE.Mesh[] = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16);
  const ringGeo = new THREE.RingGeometry(0.46, 0.62, 24);

  MORRIS_NODE_COORDS.forEach(([r, c], idx) => {
    const [wx, wz] = gridCellToWorld(r, c, 7);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(wx, 0.48, wz);
    hit.userData = { kind: 'morris_node', nodeIndex: idx };
    boardGroup.add(hit);
    hitTargets.push(hit);

    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf4c556,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(wx, 0.285, wz);
    ring.visible = false;
    boardGroup.add(ring);
    highlightRings.push(ring);
  });

  return { hitTargets, highlightRings };
}

export function createMorrisStone(
  owner: 0 | 1,
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): THREE.Group {
  const group = new THREE.Group();
  const mat = createColorMaterial(owner === 0 ? 'ivory' : 'ebony');

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.24, 22), mat);
  body.position.y = 0.12;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), mat);
  dome.scale.set(1, 0.45, 1);
  dome.position.y = 0.23;
  dome.castShadow = true;
  group.add(dome);

  const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), brassMat);
  stud.position.y = 0.37;
  group.add(stud);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 16),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  return group;
}

export interface MancalaSceneMap {
  boardGroup: THREE.Group;
  pebblesLayer: THREE.Group;
  hitTargets: THREE.Mesh[];
  highlightRings: THREE.Mesh[];
  pebbleMaterials: THREE.MeshStandardMaterial[];
  getPitCenter: (pitIndex: number) => THREE.Vector3;
}

export function buildMancalaScene(
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): MancalaSceneMap {
  const boardGroup = new THREE.Group();
  const pebblesLayer = new THREE.Group();
  boardGroup.add(pebblesLayer);

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.06,
  });

  const basinMat = new THREE.MeshStandardMaterial({
    color: 0x26170e,
    roughness: 0.65,
    metalness: 0.04,
  });

  // Solid carved walnut plank
  const plank = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.56, 5.6), woodMat);
  plank.position.y = 0.28;
  plank.castShadow = true;
  plank.receiveShadow = true;
  boardGroup.add(plank);

  // Brass inlay perimeter border
  const border = new THREE.Mesh(new THREE.BoxGeometry(14.72, 0.08, 5.72), brassMat);
  border.position.y = 0.14;
  boardGroup.add(border);

  // Pit world coordinates:
  // 0..5: bottom row left-to-right (x = -4.15 .. +4.15, z = +1.35)
  // 6: right store (x = +5.85, z = 0)
  // 7..12: top row right-to-left (x = +4.15 .. -4.15, z = -1.35)
  // 13: left store (x = -5.85, z = 0)
  const pitCoords: [number, number][] = [];
  for (let i = 0; i < 6; i++) pitCoords.push([-4.15 + i * 1.66, 1.35]);
  pitCoords.push([5.85, 0]);
  for (let i = 0; i < 6; i++) pitCoords.push([4.15 - i * 1.66, -1.35]);
  pitCoords.push([-5.85, 0]);

  const hitTargets: THREE.Mesh[] = [];
  const highlightRings: THREE.Mesh[] = [];
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const pitHitGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.5, 16);
  const pitRingGeo = new THREE.RingGeometry(0.68, 0.8, 28);
  const storeRingGeo = new THREE.RingGeometry(0.84, 0.96, 28);

  pitCoords.forEach(([px, pz], idx) => {
    const isStore = idx === 6 || idx === 13;
    if (isStore) {
      const storeWell = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.16, 3.8), basinMat);
      storeWell.position.set(px, 0.5, pz);
      storeWell.receiveShadow = true;
      boardGroup.add(storeWell);

      const storeRim = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.04, 3.94), brassMat);
      storeRim.position.set(px, 0.56, pz);
      boardGroup.add(storeRim);

      const innerCover = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.06, 3.76), basinMat);
      innerCover.position.set(px, 0.562, pz);
      boardGroup.add(innerCover);
    } else {
      const well = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.58, 0.16, 24), basinMat);
      well.position.set(px, 0.5, pz);
      well.receiveShadow = true;
      boardGroup.add(well);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.038, 10, 28), brassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(px, 0.565, pz);
      boardGroup.add(rim);

      const hit = new THREE.Mesh(pitHitGeo, hitMat);
      hit.position.set(px, 0.72, pz);
      hit.userData = { kind: 'mancala_pit', pitIndex: idx };
      boardGroup.add(hit);
      hitTargets.push(hit);
    }

    const ring = new THREE.Mesh(
      isStore ? storeRingGeo : pitRingGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf4c556,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(px, 0.585, pz);
    ring.visible = false;
    boardGroup.add(ring);
    highlightRings.push(ring);
  });

  const pebbleMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x2ea89c, roughness: 0.2, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0xe09b2d, roughness: 0.2, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0xc93b31, roughness: 0.2, metalness: 0.12 }),
    new THREE.MeshStandardMaterial({ color: 0x3f8f5c, roughness: 0.2, metalness: 0.12 }),
  ];

  const getPitCenter = (pitIndex: number): THREE.Vector3 => {
    const [px, pz] = pitCoords[pitIndex] ?? [0, 0];
    return new THREE.Vector3(px, 0.62, pz);
  };

  return { boardGroup, pebblesLayer, hitTargets, highlightRings, pebbleMaterials, getPitCenter };
}

export interface MastermindSceneMap {
  boardGroup: THREE.Group;
  pegsLayer: THREE.Group;
  shieldPivot: THREE.Group;
  hitTargets: THREE.Mesh[]; // [row * 4 + col] for 10x4 grid
  highlightRings: THREE.Mesh[][]; // [10][4]
  pegMaterials: THREE.MeshStandardMaterial[];
  exactKeyMat: THREE.MeshStandardMaterial;
  misplacedKeyMat: THREE.MeshStandardMaterial;
  pegGeo: THREE.BufferGeometry;
  keyGeo: THREE.BufferGeometry;
  getGuessPegPos: (row: number, col: number) => THREE.Vector3;
  getFeedbackPegPos: (row: number, idx: number) => THREE.Vector3;
  getSecretPegPos: (col: number) => THREE.Vector3;
}

export function buildMastermindScene(
  textures: ProceduralTextureSet,
  brassMat: THREE.MeshStandardMaterial
): MastermindSceneMap {
  const boardGroup = new THREE.Group();
  const pegsLayer = new THREE.Group();
  boardGroup.add(pegsLayer);

  const woodMat = new THREE.MeshStandardMaterial({
    map: textures.walnutMap,
    bumpMap: textures.walnutBump,
    bumpScale: 0.02,
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.06,
  });

  const wellMat = new THREE.MeshStandardMaterial({
    color: 0x1e1510,
    roughness: 0.72,
    metalness: 0.04,
  });

  // Classic vertical Mastermind walnut board
  const plank = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.54, 13.6), woodMat);
  plank.position.y = 0.27;
  plank.castShadow = true;
  plank.receiveShadow = true;
  boardGroup.add(plank);

  const brassBorder = new THREE.Mesh(new THREE.BoxGeometry(6.52, 0.08, 13.72), brassMat);
  brassBorder.position.y = 0.14;
  boardGroup.add(brassBorder);

  // Brass divider between secret vault and 10 attempt rows
  const divider = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.05, 0.12), brassMat);
  divider.position.set(0, 0.555, -4.55);
  boardGroup.add(divider);

  // Brass divider between guess holes and feedback pin cluster
  const colDivider = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 9.6), brassMat);
  colDivider.position.set(1.58, 0.555, 0.42);
  boardGroup.add(colDivider);

  const colXs = [-1.62, -0.74, 0.14, 1.02];
  const rowZ0 = 4.72;
  const rowStep = -0.94;

  const hitTargets: THREE.Mesh[] = [];
  const highlightRings: THREE.Mesh[][] = Array.from({ length: 10 }, () => []);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.4, 14);
  const socketWellGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.06, 18);
  const socketRimGeo = new THREE.TorusGeometry(0.25, 0.025, 8, 20);
  const ringGeo = new THREE.RingGeometry(0.29, 0.37, 22);
  const keyWellGeo = new THREE.CylinderGeometry(0.095, 0.09, 0.05, 12);

  // Build 10 guess rows + 2x2 feedback sockets
  for (let r = 0; r < 10; r++) {
    const rz = rowZ0 + r * rowStep;
    for (let c = 0; c < 4; c++) {
      const cx = colXs[c];
      const well = new THREE.Mesh(socketWellGeo, wellMat);
      well.position.set(cx, 0.525, rz);
      boardGroup.add(well);

      const rim = new THREE.Mesh(socketRimGeo, brassMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(cx, 0.55, rz);
      boardGroup.add(rim);

      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.set(cx, 0.72, rz);
      hit.userData = { kind: 'mm_slot', row: r, col: c };
      boardGroup.add(hit);
      hitTargets.push(hit);

      const ring = new THREE.Mesh(
        ringGeo,
        new THREE.MeshBasicMaterial({
          color: 0xf4c556,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.94,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cx, 0.562, rz);
      ring.visible = false;
      boardGroup.add(ring);
      highlightRings[r][c] = ring;
    }

    // 2x2 key-peg feedback cluster
    const keyCoords: [number, number][] = [
      [2.05, rz - 0.19],
      [2.47, rz - 0.19],
      [2.05, rz + 0.19],
      [2.47, rz + 0.19],
    ];
    keyCoords.forEach(([kx, kz]) => {
      const kWell = new THREE.Mesh(keyWellGeo, wellMat);
      kWell.position.set(kx, 0.525, kz);
      boardGroup.add(kWell);
    });
  }

  // Secret code vault sockets (top row behind divider)
  const secretZ = -5.58;
  colXs.forEach((cx) => {
    const well = new THREE.Mesh(socketWellGeo, wellMat);
    well.position.set(cx, 0.525, secretZ);
    boardGroup.add(well);

    const rim = new THREE.Mesh(socketRimGeo, brassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, 0.55, secretZ);
    boardGroup.add(rim);
  });

  // Hinged wooden shield hood covering the secret code
  const shieldPivot = new THREE.Group();
  shieldPivot.position.set(-0.3, 0.56, -6.28);
  boardGroup.add(shieldPivot);

  const hoodWallBack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.74, 0.14), woodMat);
  hoodWallBack.position.set(0, 0.37, 0.08);
  hoodWallBack.castShadow = true;
  shieldPivot.add(hoodWallBack);

  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 1.46), woodMat);
  hoodTop.position.set(0, 0.72, 0.74);
  hoodTop.castShadow = true;
  shieldPivot.add(hoodTop);

  const hoodFrontLip = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.62, 0.12), woodMat);
  hoodFrontLip.position.set(0, 0.36, 1.42);
  hoodFrontLip.castShadow = true;
  shieldPivot.add(hoodFrontLip);

  const hoodKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.16, 16), brassMat);
  hoodKnob.position.set(0, 0.84, 0.78);
  shieldPivot.add(hoodKnob);

  // Turned Mastermind peg geometry & feedback key-peg geometry
  const pegProfile: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.15, 0.0),
    new THREE.Vector2(0.15, 0.16),
    new THREE.Vector2(0.27, 0.24),
    new THREE.Vector2(0.28, 0.48),
    new THREE.Vector2(0.22, 0.62),
    new THREE.Vector2(0.0, 0.67),
  ];
  const pegGeo = new THREE.LatheGeometry(pegProfile, 20);
  const keyGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.34, 14);

  const pegMaterials = MASTERMIND_COLORS.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c.hex,
        roughness: 0.2,
        metalness: 0.08,
      })
  );
  const exactKeyMat = new THREE.MeshStandardMaterial({
    color: 0x161311,
    roughness: 0.28,
    metalness: 0.1,
  });
  const misplacedKeyMat = new THREE.MeshStandardMaterial({
    color: 0xf6efe2,
    roughness: 0.22,
    metalness: 0.05,
  });

  const getGuessPegPos = (row: number, col: number) =>
    new THREE.Vector3(colXs[col], 0.54, rowZ0 + row * rowStep);

  const getFeedbackPegPos = (row: number, idx: number) => {
    const rz = rowZ0 + row * rowStep;
    const offsets: [number, number][] = [
      [2.05, rz - 0.19],
      [2.47, rz - 0.19],
      [2.05, rz + 0.19],
      [2.47, rz + 0.19],
    ];
    const [kx, kz] = offsets[idx] ?? [2.05, rz];
    return new THREE.Vector3(kx, 0.66, kz);
  };

  const getSecretPegPos = (col: number) => new THREE.Vector3(colXs[col], 0.54, secretZ);

  return {
    boardGroup,
    pegsLayer,
    shieldPivot,
    hitTargets,
    highlightRings,
    pegMaterials,
    exactKeyMat,
    misplacedKeyMat,
    pegGeo,
    keyGeo,
    getGuessPegPos,
    getFeedbackPegPos,
    getSecretPegPos,
  };
}
