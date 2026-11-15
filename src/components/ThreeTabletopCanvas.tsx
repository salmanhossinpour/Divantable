import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createProceduralTextureSet } from '../three/materials.ts';
import {
  buildBackgammonBoard,
  buildConnect4Scene,
  buildFramedSquareBoard,
  buildGrid8x8Interaction,
  buildMancalaScene,
  buildMastermindScene,
  buildMorrisInteraction,
  buildParlorEnvironment,
  buildSnakesAndLaddersProps,
  createBackgammonChecker,
  createCheckersPiece,
  createChessPieceMesh,
  createConnect4Token,
  createDiceGroup,
  createMorrisStone,
  createOthelloDisc,
  createTurnedPawn,
  getDiceTargetEuler,
  gridCellToWorld,
} from '../three/tabletopBuilder.ts';
import type {
  BackgammonGeometryMap,
  Connect4SceneMap,
  Grid8x8Interaction,
  MancalaSceneMap,
  MastermindSceneMap,
  MorrisInteraction,
} from '../three/tabletopBuilder.ts';
import type { ChessPieceKind, GameType, UnifiedGameState } from '../game/types.ts';
import {
  getBoardSlotForSeat,
  getLudoTrackIndex,
  LUDO_HOME_COORDS,
  LUDO_TRACK_COORDS,
  LUDO_YARD_COORDS,
} from '../game/ludoEngine.ts';
import { getSnakeBoardCoords } from '../game/snakesEngine.ts';
import { getAvailableConnect4Row } from '../game/connect4Engine.ts';
import { MORRIS_NODE_COORDS } from '../game/morrisEngine.ts';
import { getLegalMancalaPits } from '../game/mancalaEngine.ts';

export type CameraPreset = 'iso' | 'top' | 'side';

interface ThreeTabletopCanvasProps {
  activeGameType: GameType;
  gameState: UnifiedGameState | null;
  appScreen: 'title' | 'playing' | 'paused' | 'gameover' | 'lobby';
  selectedBgPoint: number | null;
  selectedGridCell: [number, number] | null;
  selectedMorrisNode: number | null;
  draftMastermindGuess: (number | null)[];
  selectedMastermindSlot: number;
  cameraPreset: CameraPreset;
  diceRollSeq: number;
  onSelectLudoPawn: (pawnId: number) => void;
  onSelectBgPoint: (pointIndex: number, isBearOff?: boolean, isBar?: boolean, owner?: 0 | 1) => void;
  onSelectGridCell: (row: number, col: number) => void;
  onSelectConnect4Col: (col: number) => void;
  onSelectMorrisNode: (nodeIndex: number) => void;
  onSelectMancalaPit: (pitIndex: number) => void;
  onSelectMastermindSlot: (slotIndex: number) => void;
}

// Module-scoped scratch objects to ensure zero GC inside the render loop
const _scratchVec3 = new THREE.Vector3();
const _scratchEuler = new THREE.Euler();
const _scratchQuat = new THREE.Quaternion();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export const ThreeTabletopCanvas: React.FC<ThreeTabletopCanvasProps> = ({
  activeGameType,
  gameState,
  appScreen,
  selectedBgPoint,
  selectedGridCell,
  selectedMorrisNode,
  draftMastermindGuess,
  selectedMastermindSlot,
  cameraPreset,
  diceRollSeq,
  onSelectLudoPawn,
  onSelectBgPoint,
  onSelectGridCell,
  onSelectConnect4Col,
  onSelectMorrisNode,
  onSelectMancalaPit,
  onSelectMastermindSlot,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    activeGameType,
    gameState,
    appScreen,
    selectedBgPoint,
    selectedGridCell,
    selectedMorrisNode,
    draftMastermindGuess,
    selectedMastermindSlot,
    cameraPreset,
    diceRollSeq,
    onSelectLudoPawn,
    onSelectBgPoint,
    onSelectGridCell,
    onSelectConnect4Col,
    onSelectMorrisNode,
    onSelectMancalaPit,
    onSelectMastermindSlot,
  });
  propsRef.current = {
    activeGameType,
    gameState,
    appScreen,
    selectedBgPoint,
    selectedGridCell,
    selectedMorrisNode,
    draftMastermindGuess,
    selectedMastermindSlot,
    cameraPreset,
    diceRollSeq,
    onSelectLudoPawn,
    onSelectBgPoint,
    onSelectGridCell,
    onSelectConnect4Col,
    onSelectMorrisNode,
    onSelectMancalaPit,
    onSelectMastermindSlot,
  };

  // Trigger flags read by the persistent WebGL engine
  const syncTriggerRef = useRef<() => void>(() => {});
  const cameraMoveTriggerRef = useRef<(preset: CameraPreset) => void>(() => {});
  const diceAnimTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    syncTriggerRef.current();
  }, [
    activeGameType,
    gameState,
    selectedBgPoint,
    selectedGridCell,
    selectedMorrisNode,
    draftMastermindGuess,
    selectedMastermindSlot,
  ]);

  useEffect(() => {
    cameraMoveTriggerRef.current(cameraPreset);
  }, [cameraPreset, activeGameType, appScreen]);

  useEffect(() => {
    if (diceRollSeq > 0) {
      diceAnimTriggerRef.current();
    }
  }, [diceRollSeq]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161210);
    scene.fog = new THREE.FogExp2(0x161210, 0.02);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 120);
    camera.position.set(0, 13.5, 11.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 6.5;
    controls.maxDistance = 52;
    controls.maxPolarAngle = Math.PI * 0.45;
    controls.minPolarAngle = 0.08;
    controls.enablePan = false;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // Studio warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0x9bb8e0, 0x3b2a1e, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.9);
    keyLight.position.set(7, 15, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 34;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7ca6d8, 0.65);
    rimLight.position.set(-9, 8, -9);
    scene.add(rimLight);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextureSet(maxAniso);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd4a84f,
      roughness: 0.22,
      metalness: 0.88,
    });

    buildParlorEnvironment(scene, textures, brassMat);

    // Root groups for each of the 9 games
    const ludoGroup = buildFramedSquareBoard(textures.ludoBoardMap, textures, brassMat);
    const snakesGroup = buildFramedSquareBoard(textures.snakesBoardMap, textures, brassMat);
    buildSnakesAndLaddersProps(snakesGroup, brassMat);
    const bgMap: BackgammonGeometryMap = buildBackgammonBoard(textures, brassMat);

    const chessGroup = buildFramedSquareBoard(textures.chessBoardMap, textures, brassMat);
    const chessInteraction: Grid8x8Interaction = buildGrid8x8Interaction(chessGroup);

    const othelloGroup = buildFramedSquareBoard(textures.othelloBoardMap, textures, brassMat);
    const othelloInteraction: Grid8x8Interaction = buildGrid8x8Interaction(othelloGroup);

    const connect4Map: Connect4SceneMap = buildConnect4Scene(textures, brassMat);

    const checkersGroup = buildFramedSquareBoard(textures.chessBoardMap, textures, brassMat);
    const checkersInteraction: Grid8x8Interaction = buildGrid8x8Interaction(checkersGroup);

    const morrisGroup = buildFramedSquareBoard(textures.morrisBoardMap, textures, brassMat);
    const morrisInteraction: MorrisInteraction = buildMorrisInteraction(morrisGroup);

    const mancalaMap: MancalaSceneMap = buildMancalaScene(textures, brassMat);
    const mancalaPebbleGeo = new THREE.SphereGeometry(0.165, 12, 10);

    const mastermindMap: MastermindSceneMap = buildMastermindScene(textures, brassMat);

    scene.add(ludoGroup);
    scene.add(snakesGroup);
    scene.add(bgMap.boardGroup);
    scene.add(chessGroup);
    scene.add(othelloGroup);
    scene.add(connect4Map.boardGroup);
    scene.add(checkersGroup);
    scene.add(morrisGroup);
    scene.add(mancalaMap.boardGroup);
    scene.add(mastermindMap.boardGroup);

    // Dynamic piece containers
    const ludoPawnsLayer = new THREE.Group();
    ludoGroup.add(ludoPawnsLayer);
    const snakesPawnsLayer = new THREE.Group();
    snakesGroup.add(snakesPawnsLayer);
    const bgCheckersLayer = new THREE.Group();
    bgMap.boardGroup.add(bgCheckersLayer);
    const chessPiecesLayer = new THREE.Group();
    chessGroup.add(chessPiecesLayer);
    const othelloDiscsLayer = new THREE.Group();
    othelloGroup.add(othelloDiscsLayer);
    const checkersPiecesLayer = new THREE.Group();
    checkersGroup.add(checkersPiecesLayer);
    const morrisStonesLayer = new THREE.Group();
    morrisGroup.add(morrisStonesLayer);

    // Two 3D Dice resting cleanly at board side
    const dice1 = createDiceGroup(textures);
    const dice2 = createDiceGroup(textures);
    dice1.position.set(7.1, 0.36, 0.8);
    dice2.position.set(7.1, 0.36, -0.8);
    scene.add(dice1);
    scene.add(dice2);

    // Piece cache maps for smooth animation across state updates
    const ludoPawnMeshes = new Map<string, { group: THREE.Group; highlightRing: THREE.Mesh; targetPos: THREE.Vector3; targetScale: number }>();
    const snakesPawnMeshes = new Map<string, { group: THREE.Group; targetPos: THREE.Vector3; targetScale: number }>();
    const bgCheckerMeshes: THREE.Group[] = [];
    let bgTargetPositions: THREE.Vector3[] = [];
    const chessPieceMeshes = new Map<string, { group: THREE.Group; kind: ChessPieceKind; targetPos: THREE.Vector3 }>();
    const othelloDiscMeshes = new Map<string, { wrapper: THREE.Group; pivot: THREE.Object3D; targetRotX: number }>();
    const connect4TokenMeshes = new Map<string, { group: THREE.Group; targetPos: THREE.Vector3 }>();
    const checkersPieceMeshes = new Map<string, { group: THREE.Group; isKing: boolean; targetPos: THREE.Vector3 }>();
    const morrisStoneMeshes = new Map<string, THREE.Group>();
    let lastPawnLayoutSignature = '';
    let lastOthelloSig = '';
    let lastConnect4Sig = '';
    let lastMancalaPitsSig = '';
    let lastMastermindSig = '';
    let mastermindShieldTargetRot = 0;

    // Active interactables list for raycasting
    let interactables: THREE.Object3D[] = [];

    // Camera transition state
    let camTransitionActive = false;
    let diceAnimElapsed = -1;
    let activeTitleAngle = 0;

    function getCameraCoords(preset: CameraPreset, game: GameType, screen: string): { pos: [number, number, number]; look: [number, number, number] } {
      const w = container?.clientWidth || window.innerWidth;
      const h = container?.clientHeight || window.innerHeight;
      const curAspect = w / Math.max(1, h);
      const distMult = curAspect < 0.95 ? Math.min(2.75, 1.38 / curAspect) : 1.0;

      if (screen === 'title') {
        if (game === 'connect4') {
          return { pos: [0, 8.2 * distMult, 16.5 * distMult], look: [0, 3.4, 0] };
        }
        return { pos: [0, 10.5 * distMult, 13.5 * distMult], look: [0, 0.2, 0] };
      }
      if (game === 'connect4') {
        if (preset === 'top') return { pos: [0, 13.4 * distMult, 11.4 * distMult], look: [0, 3.8, 0] };
        if (preset === 'side') return { pos: [10.4 * distMult, 6.4 * distMult, 13.2 * distMult], look: [0, 3.8, 0] };
        return { pos: [0, 6.8 * distMult, 15.8 * distMult], look: [0, 3.8, 0] };
      }
      if (game === 'mancala') {
        const mancalaMult = curAspect < 0.95 ? Math.min(3.55, 1.62 / curAspect) : 1.0;
        if (preset === 'top') return { pos: [0, 14.2 * mancalaMult, 0.4], look: [0, 0.3, 0] };
        if (preset === 'side') return { pos: [-7.5 * mancalaMult, 8.4 * mancalaMult, 9.6 * mancalaMult], look: [0, 0.3, 0] };
        return { pos: [0, 10.6 * mancalaMult, 9.2 * mancalaMult], look: [0, 0.3, 0] };
      }
      if (game === 'mastermind') {
        const mmMult = curAspect < 0.95 ? Math.min(2.35, 1.18 / curAspect) : 1.0;
        if (preset === 'top') return { pos: [0, 18.2 * mmMult, 1.2], look: [0, 0.3, 0.8] };
        if (preset === 'side') return { pos: [9.4 * mmMult, 10.4 * mmMult, 9.6 * mmMult], look: [0, 0.3, 0.8] };
        return { pos: [0, 14.4 * mmMult, 11.4 * mmMult], look: [0, 0.3, 1.2] };
      }
      if (game === 'backgammon') {
        if (preset === 'top') return { pos: [0, 16.5 * distMult, 0.4], look: [0.1, 0.2, 0] };
        if (preset === 'side') return { pos: [-9.5 * distMult, 9.0 * distMult, 10.5 * distMult], look: [0.1, 0.2, 0] };
        return { pos: [0.1, 13.2 * distMult, 10.6 * distMult], look: [0.1, 0.2, 0] };
      }
      // Ludo, Snakes, Chess, Othello, Checkers, Morris
      if (preset === 'top') return { pos: [0, 16.0 * distMult, 0.35], look: [0, 0.2, 0] };
      if (preset === 'side') return { pos: [9.2 * distMult, 9.4 * distMult, 9.8 * distMult], look: [0, 0.2, 0] };
      return { pos: [0, 12.6 * distMult, 10.2 * distMult], look: [0, 0.2, 0] };
    }

    // Snap camera immediately on mount to active game/viewport framing
    const initialCam = getCameraCoords(
      propsRef.current.cameraPreset,
      propsRef.current.activeGameType,
      propsRef.current.appScreen
    );
    camera.position.set(initialCam.pos[0], initialCam.pos[1], initialCam.pos[2]);
    controls.target.set(initialCam.look[0], initialCam.look[1], initialCam.look[2]);
    controls.update();

    let firstCamEffect = true;
    cameraMoveTriggerRef.current = (preset: CameraPreset) => {
      if (firstCamEffect) {
        firstCamEffect = false;
        return;
      }
      const { activeGameType: game, appScreen: scr } = propsRef.current;
      const { pos, look } = getCameraCoords(preset, game, scr);
      _camTargetPos.set(pos[0], pos[1], pos[2]);
      _camLookTarget.set(look[0], look[1], look[2]);
      camTransitionActive = true;
    };

    diceAnimTriggerRef.current = () => {
      diceAnimElapsed = 0;
    };

    function syncSceneToState() {
      const {
        activeGameType: game,
        gameState: state,
        selectedBgPoint: selPt,
        selectedGridCell: selGrid,
        selectedMorrisNode: selMorris,
        draftMastermindGuess: draftMm,
        selectedMastermindSlot: selMmSlot,
      } = propsRef.current;

      ludoGroup.visible = game === 'ludo';
      snakesGroup.visible = game === 'snakes';
      bgMap.boardGroup.visible = game === 'backgammon';
      chessGroup.visible = game === 'chess';
      othelloGroup.visible = game === 'othello';
      connect4Map.boardGroup.visible = game === 'connect4';
      checkersGroup.visible = game === 'checkers';
      morrisGroup.visible = game === 'morris';
      mancalaMap.boardGroup.visible = game === 'mancala';
      mastermindMap.boardGroup.visible = game === 'mastermind';
      interactables = [];

      // Position dice cleanly beside current board (hidden for diceless strategy games)
      const diceBaseX = game === 'backgammon' ? -8.4 : 7.05;
      dice1.position.x = diceBaseX;
      dice2.position.x = diceBaseX;

      if (game === 'ludo') {
        dice1.visible = true;
        dice2.visible = false;
        dice1.position.z = 0;
        const val = state?.gameType === 'ludo' && state.diceValue ? state.diceValue : 6;
        dice1.userData.targetValue = val;
      } else if (game === 'snakes') {
        dice1.visible = true;
        dice2.visible = false;
        dice1.position.z = 0;
        const val = state?.gameType === 'snakes' && state.diceValue ? state.diceValue : 6;
        dice1.userData.targetValue = val;
      } else if (game === 'backgammon') {
        dice1.visible = true;
        dice2.visible = true;
        dice1.position.z = 0.65;
        dice2.position.z = -0.65;
        const d1 = state?.gameType === 'backgammon' && state.dice[0] ? state.dice[0] : 5;
        const d2 = state?.gameType === 'backgammon' && state.dice[1] ? state.dice[1] : 3;
        dice1.userData.targetValue = d1;
        dice2.userData.targetValue = d2;
      } else {
        dice1.visible = false;
        dice2.visible = false;
      }

      if (!state) return;

      // 1. LUDO SYNC
      if (state.gameType === 'ludo') {
        const sig = `ludo:${state.players.map((p) => p.color).join(',')}`;
        const justSpawnedLudo = lastPawnLayoutSignature !== sig;
        if (justSpawnedLudo) {
          ludoPawnsLayer.clear();
          ludoPawnMeshes.clear();
          lastPawnLayoutSignature = sig;

          for (let s = 0; s < state.players.length; s++) {
            const seat = state.players[s];
            for (let p = 0; p < 4; p++) {
              const key = `${s}-${p}`;
              const { group, highlightRing } = createTurnedPawn(seat.color, textures, brassMat, 0.92);
              group.traverse((obj) => {
                obj.userData = { kind: 'ludo_pawn', seatIndex: s, pawnId: p };
              });
              group.userData = { kind: 'ludo_pawn', seatIndex: s, pawnId: p };
              ludoPawnsLayer.add(group);
              ludoPawnMeshes.set(key, {
                group,
                highlightRing,
                targetPos: new THREE.Vector3(0, 0.26, 0),
                targetScale: 0.92,
              });
            }
          }
        }

        // Group pawns sharing same world square for clean visual offset
        const cellBuckets = new Map<string, { seat: number; pawnId: number; row: number; col: number }[]>();
        const totalPlayers = state.players.length;

        for (let s = 0; s < totalPlayers; s++) {
          const slot = getBoardSlotForSeat(s, totalPlayers);
          for (const pawn of state.pawns[s]) {
            let row = 0;
            let col = 0;
            let bucketKey = '';

            if (pawn.progress === -1) {
              const yardSpot = LUDO_YARD_COORDS[slot][pawn.id];
              row = yardSpot[0];
              col = yardSpot[1];
              bucketKey = `yard-${s}-${pawn.id}`;
            } else if (pawn.progress <= 50) {
              const trackIdx = getLudoTrackIndex(slot, pawn.progress)!;
              [row, col] = LUDO_TRACK_COORDS[trackIdx];
              bucketKey = `track-${trackIdx}`;
            } else {
              const homeIdx = pawn.progress - 51;
              [row, col] = LUDO_HOME_COORDS[slot][homeIdx];
              bucketKey = `home-${slot}-${homeIdx}`;
            }

            if (!cellBuckets.has(bucketKey)) cellBuckets.set(bucketKey, []);
            cellBuckets.get(bucketKey)!.push({ seat: s, pawnId: pawn.id, row, col });
          }
        }

        const subOffsets: [number, number][] = [
          [-0.14, -0.14],
          [0.14, -0.14],
          [-0.14, 0.14],
          [0.14, 0.14],
        ];

        for (const items of cellBuckets.values()) {
          items.forEach((item, idx) => {
            const entry = ludoPawnMeshes.get(`${item.seat}-${item.pawnId}`);
            if (!entry) return;
            const [wx, wz] = gridCellToWorld(item.row, item.col, 15);
            const count = items.length;
            const ox = count > 1 ? subOffsets[idx % 4][0] : 0;
            const oz = count > 1 ? subOffsets[idx % 4][1] : 0;
            entry.targetPos.set(wx + ox, 0.26, wz + oz);
            entry.targetScale = count > 1 ? 0.72 : 0.92;
            if (justSpawnedLudo) {
              entry.group.position.copy(entry.targetPos);
              entry.group.scale.setScalar(entry.targetScale);
            }

            const isValidTurnPawn =
              state.phase === 'move' &&
              item.seat === state.turnIndex &&
              !state.players[state.turnIndex].isAI &&
              state.validPawnIds.includes(item.pawnId);

            entry.highlightRing.visible = isValidTurnPawn;
            if (isValidTurnPawn) {
              interactables.push(entry.group);
            }
          });
        }
      }

      // 2. SNAKES & LADDERS SYNC
      if (state.gameType === 'snakes') {
        const sig = `snakes:${state.players.map((p) => p.color).join(',')}`;
        const justSpawnedSnakes = lastPawnLayoutSignature !== sig;
        if (justSpawnedSnakes) {
          snakesPawnsLayer.clear();
          snakesPawnMeshes.clear();
          lastPawnLayoutSignature = sig;

          for (let s = 0; s < state.players.length; s++) {
            const { group } = createTurnedPawn(state.players[s].color, textures, brassMat, 0.95);
            snakesPawnsLayer.add(group);
            snakesPawnMeshes.set(`${s}`, {
              group,
              targetPos: new THREE.Vector3(-6.2, 0.26, 5.2),
              targetScale: 0.95,
            });
          }
        }

        const squareBuckets = new Map<number, number[]>();
        state.positions.forEach((sq, seat) => {
          if (!squareBuckets.has(sq)) squareBuckets.set(sq, []);
          squareBuckets.get(sq)!.push(seat);
        });

        const subOffsets: [number, number][] = [
          [-0.2, -0.2],
          [0.2, -0.2],
          [-0.2, 0.2],
          [0.2, 0.2],
        ];

        for (const [sq, seats] of squareBuckets.entries()) {
          const [r, c] = getSnakeBoardCoords(sq);
          const [wx, wz] = gridCellToWorld(r, c, 10);
          seats.forEach((seat, idx) => {
            const entry = snakesPawnMeshes.get(`${seat}`);
            if (!entry) return;
            const ox = seats.length > 1 ? subOffsets[idx % 4][0] : 0;
            const oz = seats.length > 1 ? subOffsets[idx % 4][1] : 0;
            entry.targetPos.set(sq === 0 ? -6.35 : wx + ox, sq === 0 ? 0.02 : 0.26, sq === 0 ? 4.4 - seat * 0.8 : wz + oz);
            entry.targetScale = seats.length > 1 ? 0.78 : 0.95;
            if (justSpawnedSnakes) {
              entry.group.position.copy(entry.targetPos);
              entry.group.scale.setScalar(entry.targetScale);
            }
          });
        }
      }

      // 3. BACKGAMMON SYNC
      if (state.gameType === 'backgammon') {
        const justSpawnedBg = bgCheckerMeshes.length === 0;
        if (justSpawnedBg) {
          // Spawn 15 ivory (0..14) + 15 ebony (15..29) checkers once
          for (let i = 0; i < 15; i++) {
            const c0 = createBackgammonChecker(0, brassMat, textures);
            bgCheckersLayer.add(c0);
            bgCheckerMeshes.push(c0);
          }
          for (let i = 0; i < 15; i++) {
            const c1 = createBackgammonChecker(1, brassMat, textures);
            bgCheckersLayer.add(c1);
            bgCheckerMeshes.push(c1);
          }
          bgTargetPositions = bgCheckerMeshes.map(() => new THREE.Vector3());
        }

        let p0Idx = 0;
        let p1Idx = 15;

        for (let pt = 1; pt <= 24; pt++) {
          const cell = state.points[pt];
          if (cell.owner === null) continue;
          for (let k = 0; k < cell.count; k++) {
            const pos = bgMap.getCheckerPosition(pt, k, cell.owner);
            if (cell.owner === 0 && p0Idx < 15) {
              bgTargetPositions[p0Idx++].copy(pos);
            } else if (cell.owner === 1 && p1Idx < 30) {
              bgTargetPositions[p1Idx++].copy(pos);
            }
          }
        }
        for (let k = 0; k < state.bar[0]; k++) {
          if (p0Idx < 15) bgTargetPositions[p0Idx++].copy(bgMap.getCheckerPosition(25, k, 0));
        }
        for (let k = 0; k < state.bar[1]; k++) {
          if (p1Idx < 30) bgTargetPositions[p1Idx++].copy(bgMap.getCheckerPosition(0, k, 1));
        }
        for (let k = 0; k < state.borneOff[0]; k++) {
          if (p0Idx < 15) bgTargetPositions[p0Idx++].copy(bgMap.getCheckerPosition(0, k, 0));
        }
        for (let k = 0; k < state.borneOff[1]; k++) {
          if (p1Idx < 30) bgTargetPositions[p1Idx++].copy(bgMap.getCheckerPosition(25, k, 1));
        }
        if (justSpawnedBg) {
          for (let i = 0; i < bgCheckerMeshes.length; i++) {
            bgCheckerMeshes[i].position.copy(bgTargetPositions[i]);
          }
        }

        // Update highlight rings
        bgMap.highlightRings.forEach((ring) => {
          ring.visible = false;
        });

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...bgMap.hitTargets];
          if (selPt === null) {
            // Highlight all legal source points
            const legalSources = new Set(state.legalMoves.map((m) => m.from));
            legalSources.forEach((src) => {
              if (src === 25 || src === 0) {
                const r = bgMap.highlightRings.get(102);
                if (r) {
                  (r.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
                  r.visible = true;
                }
              } else {
                const r = bgMap.highlightRings.get(src);
                if (r) {
                  (r.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
                  r.visible = true;
                }
              }
            });
          } else {
            // Highlight selected source in warm cyan and destinations in emerald gold
            const selRing = bgMap.highlightRings.get(selPt === 25 || selPt === 0 ? 102 : selPt);
            if (selRing) {
              (selRing.material as THREE.MeshBasicMaterial).color.setHex(0x47d1b6);
              selRing.visible = true;
            }
            const dests = state.legalMoves.filter((m) => m.from === selPt).map((m) => m.to);
            dests.forEach((dst) => {
              if (dst === 0) {
                const r = bgMap.highlightRings.get(100);
                if (r) {
                  (r.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
                  r.visible = true;
                }
              } else if (dst === 25) {
                const r = bgMap.highlightRings.get(101);
                if (r) {
                  (r.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
                  r.visible = true;
                }
              } else {
                const r = bgMap.highlightRings.get(dst);
                if (r) {
                  (r.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
                  r.visible = true;
                }
              }
            });
          }
        }
      }

      // 4. CHESS SYNC
      if (state.gameType === 'chess') {
        const isFreshMatch = state.turnCount === 1 && !state.lastMove && chessPieceMeshes.size !== 32;
        if (isFreshMatch) {
          chessPiecesLayer.clear();
          chessPieceMeshes.clear();
        }

        const activeIds = new Set<string>();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (!piece) continue;
            activeIds.add(piece.id);
            const [wx, wz] = gridCellToWorld(r, c, 8);
            const existing = chessPieceMeshes.get(piece.id);

            if (!existing || existing.kind !== piece.kind) {
              if (existing) chessPiecesLayer.remove(existing.group);
              const mesh = createChessPieceMesh(piece.kind, piece.owner, textures, brassMat);
              mesh.position.set(wx, 0.265, wz);
              chessPiecesLayer.add(mesh);
              chessPieceMeshes.set(piece.id, {
                group: mesh,
                kind: piece.kind,
                targetPos: new THREE.Vector3(wx, 0.265, wz),
              });
            } else {
              existing.targetPos.set(wx, 0.265, wz);
            }
          }
        }

        for (const [id, entry] of chessPieceMeshes.entries()) {
          if (!activeIds.has(id)) {
            chessPiecesLayer.remove(entry.group);
            chessPieceMeshes.delete(id);
          }
        }

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            chessInteraction.highlightRings[r][c].visible = false;
          }
        }

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...chessInteraction.hitTargets];

          if (selGrid) {
            const [sr, sc] = selGrid;
            const selRing = chessInteraction.highlightRings[sr]?.[sc];
            if (selRing) {
              (selRing.material as THREE.MeshBasicMaterial).color.setHex(0x47d1b6);
              selRing.visible = true;
            }
            state.legalMoves
              .filter((m) => m.fromRow === sr && m.fromCol === sc)
              .forEach((m) => {
                const dstRing = chessInteraction.highlightRings[m.toRow][m.toCol];
                const isCap = Boolean(state.board[m.toRow][m.toCol]) || Boolean(m.isEnPassant);
                (dstRing.material as THREE.MeshBasicMaterial).color.setHex(isCap ? 0xe05d4e : 0x63e28a);
                dstRing.visible = true;
              });
          } else {
            const sources = new Set(state.legalMoves.map((m) => `${m.fromRow}-${m.fromCol}`));
            sources.forEach((key) => {
              const [rStr, cStr] = key.split('-');
              const ring = chessInteraction.highlightRings[Number(rStr)][Number(cStr)];
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
              ring.visible = true;
            });
          }
        }
      }

      // 5. OTHELLO SYNC
      if (state.gameType === 'othello') {
        const sig = `othello:${state.players.map((p) => p.id).join(',')}`;
        const isFresh = lastOthelloSig !== sig || (state.turnCount === 1 && !state.lastMove && othelloDiscMeshes.size > 4);
        if (isFresh) {
          othelloDiscsLayer.clear();
          othelloDiscMeshes.clear();
          lastOthelloSig = sig;
        }

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const cell = state.board[r][c];
            const key = `${r}-${c}`;
            if (cell === null) {
              const old = othelloDiscMeshes.get(key);
              if (old) {
                othelloDiscsLayer.remove(old.wrapper);
                othelloDiscMeshes.delete(key);
              }
              continue;
            }
            const targetRotX = cell === 0 ? 0 : Math.PI;
            const existing = othelloDiscMeshes.get(key);
            if (!existing) {
              const wrapper = createOthelloDisc(textures, brassMat);
              const [wx, wz] = gridCellToWorld(r, c, 8);
              wrapper.position.set(wx, 0.265, wz);
              const pivot = wrapper.getObjectByName('discPivot')!;
              pivot.rotation.x = targetRotX;
              othelloDiscsLayer.add(wrapper);
              othelloDiscMeshes.set(key, { wrapper, pivot, targetRotX });
            } else {
              existing.targetRotX = targetRotX;
            }
          }
        }

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            othelloInteraction.highlightRings[r][c].visible = false;
          }
        }

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...othelloInteraction.hitTargets];
          for (const [lr, lc] of state.legalMoves) {
            const ring = othelloInteraction.highlightRings[lr][lc];
            (ring.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
            ring.visible = true;
          }
        }
      }

      // 6. CONNECT4 SYNC
      if (state.gameType === 'connect4') {
        const sig = `c4:${state.players.map((p) => p.id).join(',')}`;
        const isFresh = lastConnect4Sig !== sig || (state.turnCount === 1 && !state.lastMove && connect4TokenMeshes.size > 0);
        if (isFresh) {
          connect4Map.tokensLayer.clear();
          connect4TokenMeshes.clear();
          lastConnect4Sig = sig;
        }

        const presentKeys = new Set<string>();
        for (let r = 0; r < 6; r++) {
          for (let c = 0; c < 7; c++) {
            const cell = state.board[r][c];
            if (cell === null) continue;
            const key = `${r}-${c}-${cell}`;
            presentKeys.add(key);
            const targetPos = connect4Map.getCellPosition(r, c);
            const existing = connect4TokenMeshes.get(key);
            if (!existing) {
              const token = createConnect4Token(cell, brassMat);
              // Drop from top of rack on live moves, or snap immediately on fresh start
              const startY = state.turnCount > 1 ? 8.8 : targetPos.y;
              token.position.set(targetPos.x, startY, targetPos.z);
              connect4Map.tokensLayer.add(token);
              connect4TokenMeshes.set(key, { group: token, targetPos });
            } else {
              existing.targetPos.copy(targetPos);
            }
          }
        }

        for (const [key, entry] of connect4TokenMeshes.entries()) {
          if (!presentKeys.has(key)) {
            connect4Map.tokensLayer.remove(entry.group);
            connect4TokenMeshes.delete(key);
          }
        }

        const canAct = state.phase === 'move' && !state.players[state.turnIndex].isAI;
        if (canAct) {
          interactables = [...connect4Map.hitTargets];
        }
        connect4Map.colIndicators.forEach((ind, col) => {
          ind.visible = canAct && getAvailableConnect4Row(state.board, col) !== -1;
        });
      }

      // 7. CHECKERS SYNC
      if (state.gameType === 'checkers') {
        const isFresh = state.turnCount === 1 && !state.mustJumpFrom && checkersPieceMeshes.size !== 24;
        if (isFresh) {
          checkersPiecesLayer.clear();
          checkersPieceMeshes.clear();
        }

        const activeIds = new Set<string>();
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = state.board[r][c];
            if (!piece) continue;
            activeIds.add(piece.id);
            const [wx, wz] = gridCellToWorld(r, c, 8);
            const existing = checkersPieceMeshes.get(piece.id);
            if (!existing || existing.isKing !== piece.isKing) {
              if (existing) checkersPiecesLayer.remove(existing.group);
              const mesh = createCheckersPiece(piece.owner, piece.isKing, textures, brassMat);
              mesh.position.set(wx, 0.265, wz);
              checkersPiecesLayer.add(mesh);
              checkersPieceMeshes.set(piece.id, {
                group: mesh,
                isKing: piece.isKing,
                targetPos: new THREE.Vector3(wx, 0.265, wz),
              });
            } else {
              existing.targetPos.set(wx, 0.265, wz);
            }
          }
        }

        for (const [id, entry] of checkersPieceMeshes.entries()) {
          if (!activeIds.has(id)) {
            checkersPiecesLayer.remove(entry.group);
            checkersPieceMeshes.delete(id);
          }
        }

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            checkersInteraction.highlightRings[r][c].visible = false;
          }
        }

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...checkersInteraction.hitTargets];
          const activeSel = selGrid ?? state.mustJumpFrom;
          if (activeSel) {
            const [sr, sc] = activeSel;
            const selRing = checkersInteraction.highlightRings[sr]?.[sc];
            if (selRing) {
              (selRing.material as THREE.MeshBasicMaterial).color.setHex(0x47d1b6);
              selRing.visible = true;
            }
            state.legalMoves
              .filter((m) => m.fromRow === sr && m.fromCol === sc)
              .forEach((m) => {
                const dstRing = checkersInteraction.highlightRings[m.toRow][m.toCol];
                (dstRing.material as THREE.MeshBasicMaterial).color.setHex(m.captured ? 0xe05d4e : 0x63e28a);
                dstRing.visible = true;
              });
          } else {
            const sources = new Set(state.legalMoves.map((m) => `${m.fromRow}-${m.fromCol}`));
            sources.forEach((key) => {
              const [rStr, cStr] = key.split('-');
              const ring = checkersInteraction.highlightRings[Number(rStr)][Number(cStr)];
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
              ring.visible = true;
            });
          }
        }
      }

      // 8. NINE MEN'S MORRIS SYNC
      if (state.gameType === 'morris') {
        const activeKeys = new Set<string>();
        state.nodes.forEach((owner, idx) => {
          if (owner === null) return;
          const key = `${idx}-${owner}`;
          activeKeys.add(key);
          if (!morrisStoneMeshes.has(key)) {
            const [r, c] = MORRIS_NODE_COORDS[idx];
            const [wx, wz] = gridCellToWorld(r, c, 7);
            const stone = createMorrisStone(owner, textures, brassMat);
            stone.position.set(wx, 0.265, wz);
            morrisStonesLayer.add(stone);
            morrisStoneMeshes.set(key, stone);
          }
        });

        for (const [key, mesh] of morrisStoneMeshes.entries()) {
          if (!activeKeys.has(key)) {
            morrisStonesLayer.remove(mesh);
            morrisStoneMeshes.delete(key);
          }
        }

        morrisInteraction.highlightRings.forEach((r) => {
          r.visible = false;
        });

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...morrisInteraction.hitTargets];
          if (state.subPhase === 'place') {
            state.legalMoves.forEach((m) => {
              const ring = morrisInteraction.highlightRings[m.to];
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
              ring.visible = true;
            });
          } else if (state.subPhase === 'remove') {
            state.legalMoves.forEach((m) => {
              const ring = morrisInteraction.highlightRings[m.to];
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0xe05d4e);
              ring.visible = true;
            });
          } else if (selMorris !== null) {
            const selRing = morrisInteraction.highlightRings[selMorris];
            if (selRing) {
              (selRing.material as THREE.MeshBasicMaterial).color.setHex(0x47d1b6);
              selRing.visible = true;
            }
            state.legalMoves
              .filter((m) => m.from === selMorris)
              .forEach((m) => {
                const ring = morrisInteraction.highlightRings[m.to];
                (ring.material as THREE.MeshBasicMaterial).color.setHex(0x63e28a);
                ring.visible = true;
              });
          } else {
            const sources = new Set(state.legalMoves.map((m) => m.from).filter((x): x is number => x !== undefined));
            sources.forEach((src) => {
              const ring = morrisInteraction.highlightRings[src];
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
              ring.visible = true;
            });
          }
        }
      }

      // 9. MANCALA SYNC
      if (state.gameType === 'mancala') {
        const pitsSig = state.pits.join(',');
        if (lastMancalaPitsSig !== pitsSig) {
          lastMancalaPitsSig = pitsSig;
          mancalaMap.pebblesLayer.clear();

          state.pits.forEach((count, pitIdx) => {
            const center = mancalaMap.getPitCenter(pitIdx);
            const isStore = pitIdx === 6 || pitIdx === 13;
            for (let k = 0; k < count; k++) {
              const mat = mancalaMap.pebbleMaterials[(pitIdx * 3 + k) % mancalaMap.pebbleMaterials.length];
              const pebble = new THREE.Mesh(mancalaPebbleGeo, mat);
              pebble.castShadow = true;

              if (isStore) {
                const col = k % 3;
                const row = Math.floor(k / 3) % 5;
                const tier = Math.floor(k / 15);
                pebble.position.set(
                  center.x + (col - 1) * 0.34,
                  center.y + tier * 0.24,
                  center.z + (row - 2) * 0.56
                );
              } else {
                const tier = Math.floor(k / 6);
                const idxInRing = k % 6;
                const ang = (idxInRing / 6) * Math.PI * 2 + tier * 0.4;
                const rad = k === 0 && count <= 5 ? 0.12 : 0.28;
                pebble.position.set(
                  center.x + Math.cos(ang) * rad,
                  center.y + tier * 0.23,
                  center.z + Math.sin(ang) * rad
                );
              }
              mancalaMap.pebblesLayer.add(pebble);
            }
          });
        }

        mancalaMap.highlightRings.forEach((r) => {
          r.visible = false;
        });

        if (state.phase === 'move' && !state.players[state.turnIndex].isAI) {
          interactables = [...mancalaMap.hitTargets];
          const legal = getLegalMancalaPits(state);
          legal.forEach((pitIdx) => {
            const ring = mancalaMap.highlightRings[pitIdx];
            if (ring) {
              (ring.material as THREE.MeshBasicMaterial).color.setHex(0xf4c556);
              ring.visible = true;
            }
          });
        }
      }

      // 10. MASTERMIND (FEKR-O-BEKR) SYNC
      if (state.gameType === 'mastermind') {
        const revealed = state.phase === 'finished';
        mastermindShieldTargetRot = revealed ? -Math.PI * 0.65 : 0;

        const sig = `${state.attempts.length}:${state.phase}:${state.subPhase}:${draftMm.join(',')}:${revealed ? state.secret.join(',') : 'hidden'}`;
        if (lastMastermindSig !== sig) {
          lastMastermindSig = sig;
          mastermindMap.pegsLayer.clear();

          // Render submitted attempts + black/white feedback key-pegs
          state.attempts.forEach((att, rowIdx) => {
            att.guess.forEach((colorId, colIdx) => {
              const mat = mastermindMap.pegMaterials[colorId];
              if (!mat) return;
              const peg = new THREE.Mesh(mastermindMap.pegGeo, mat);
              peg.position.copy(mastermindMap.getGuessPegPos(rowIdx, colIdx));
              peg.castShadow = true;
              mastermindMap.pegsLayer.add(peg);
            });

            let keyIdx = 0;
            for (let e = 0; e < att.exact; e++) {
              const keyPeg = new THREE.Mesh(mastermindMap.keyGeo, mastermindMap.exactKeyMat);
              keyPeg.position.copy(mastermindMap.getFeedbackPegPos(rowIdx, keyIdx++));
              mastermindMap.pegsLayer.add(keyPeg);
            }
            for (let m = 0; m < att.misplaced; m++) {
              const keyPeg = new THREE.Mesh(mastermindMap.keyGeo, mastermindMap.misplacedKeyMat);
              keyPeg.position.copy(mastermindMap.getFeedbackPegPos(rowIdx, keyIdx++));
              mastermindMap.pegsLayer.add(keyPeg);
            }
          });

          // Render live draft guess pegs on the active row during guess phase
          if (state.phase === 'move' && state.subPhase === 'guess' && state.attempts.length < state.maxAttempts) {
            const activeRow = state.attempts.length;
            draftMm.forEach((colorId, colIdx) => {
              if (colorId === null) return;
              const mat = mastermindMap.pegMaterials[colorId];
              if (!mat) return;
              const peg = new THREE.Mesh(mastermindMap.pegGeo, mat);
              peg.position.copy(mastermindMap.getGuessPegPos(activeRow, colIdx));
              peg.castShadow = true;
              mastermindMap.pegsLayer.add(peg);
            });
          }

          // Render secret code pegs behind shield when revealed
          if (revealed && state.secret.every((c) => c >= 0 && c < 6)) {
            state.secret.forEach((colorId, colIdx) => {
              const mat = mastermindMap.pegMaterials[colorId];
              if (!mat) return;
              const peg = new THREE.Mesh(mastermindMap.pegGeo, mat);
              peg.position.copy(mastermindMap.getSecretPegPos(colIdx));
              peg.castShadow = true;
              mastermindMap.pegsLayer.add(peg);
            });
          }
        }

        for (let r = 0; r < 10; r++) {
          for (let c = 0; c < 4; c++) {
            mastermindMap.highlightRings[r][c].visible = false;
          }
        }

        if (state.phase === 'move' && state.subPhase === 'guess' && state.attempts.length < state.maxAttempts) {
          const activeRow = state.attempts.length;
          for (let c = 0; c < 4; c++) {
            const hit = mastermindMap.hitTargets[activeRow * 4 + c];
            if (hit) interactables.push(hit);
            const ring = mastermindMap.highlightRings[activeRow]?.[c];
            if (ring) {
              (ring.material as THREE.MeshBasicMaterial).color.setHex(
                selMmSlot === c ? 0x47d1b6 : 0xf4c556
              );
              ring.visible = true;
            }
          }
        }
      }
    }

    syncSceneToState();
    syncTriggerRef.current = syncSceneToState;

    // Cancel camera tween if user manually interacts with OrbitControls
    const onControlStart = () => {
      camTransitionActive = false;
    };
    controls.addEventListener('start', onControlStart);

    // Tap / Click Raycasting (distinguish clean taps from camera drag)
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 12) return; // User was orbiting camera

      if (propsRef.current.appScreen !== 'playing') return;
      if (interactables.length === 0) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(interactables, true);
      if (hits.length === 0) return;

      const hitData = hits[0].object.userData;
      if (hitData.kind === 'ludo_pawn') {
        propsRef.current.onSelectLudoPawn(hitData.pawnId as number);
      } else if (hitData.kind === 'bg_point') {
        propsRef.current.onSelectBgPoint(hitData.pointIndex as number, false, false);
      } else if (hitData.kind === 'bg_bearoff') {
        propsRef.current.onSelectBgPoint(hitData.pointIndex as number, true, false, hitData.owner as 0 | 1);
      } else if (hitData.kind === 'bg_bar') {
        propsRef.current.onSelectBgPoint(hitData.pointIndex as number, false, true, hitData.owner as 0 | 1);
      } else if (hitData.kind === 'grid_cell') {
        propsRef.current.onSelectGridCell(hitData.row as number, hitData.col as number);
      } else if (hitData.kind === 'c4_col') {
        propsRef.current.onSelectConnect4Col(hitData.col as number);
      } else if (hitData.kind === 'morris_node') {
        propsRef.current.onSelectMorrisNode(hitData.nodeIndex as number);
      } else if (hitData.kind === 'mancala_pit') {
        propsRef.current.onSelectMancalaPit(hitData.pitIndex as number);
      } else if (hitData.kind === 'mm_slot') {
        propsRef.current.onSelectMastermindSlot(hitData.col as number);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      const { pos, look } = getCameraCoords(
        propsRef.current.cameraPreset,
        propsRef.current.activeGameType,
        propsRef.current.appScreen
      );
      camera.position.set(pos[0], pos[1], pos[2]);
      controls.target.set(look[0], look[1], look[2]);
      camTransitionActive = false;
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', onResize);

    // Animation loop with Software WebGL pacing (afterDraw)
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      gl.flush();
      const poll = () => {
        if (disposed) {
          gl.deleteSync(sync);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick(now = performance.now()) {
      if (disposed) return;
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const { appScreen: scr } = propsRef.current;

      // Gentle scenic camera turntable on Title Screen
      if (scr === 'title') {
        activeTitleAngle += dt * 0.24;
        const radius = (container?.clientWidth || window.innerWidth) < 640 ? 16.5 : 13.8;
        const desiredX = Math.sin(activeTitleAngle) * radius;
        const desiredZ = Math.cos(activeTitleAngle) * radius;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 3, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 3, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 10.6, 3, dt);
        controls.target.set(0, 0.2, 0);
      } else if (camTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camTargetPos.x, 7, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camTargetPos.y, 7, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camTargetPos.z, 7, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, _camLookTarget.x, 7, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _camLookTarget.y, 7, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _camLookTarget.z, 7, dt);
        if (camera.position.distanceTo(_camTargetPos) < 0.06) {
          camTransitionActive = false;
        }
      }

      controls.update();

      // Smooth damped piece movement + parabolic hop arc
      const alpha = 1 - Math.exp(-14 * dt);

      ludoPawnMeshes.forEach((entry) => {
        const cur = entry.group.position;
        const dist = _scratchVec3.subVectors(entry.targetPos, cur).length();
        cur.lerp(entry.targetPos, alpha);
        if (dist > 0.04) {
          cur.y = entry.targetPos.y + Math.min(dist * 0.45, 0.85);
        } else {
          cur.y = entry.targetPos.y;
        }
        const s = THREE.MathUtils.damp(entry.group.scale.x, entry.targetScale, 12, dt);
        entry.group.scale.setScalar(s);

        if (entry.highlightRing.visible) {
          const pulse = 1 + Math.sin(now * 0.006) * 0.08;
          entry.highlightRing.scale.setScalar(pulse);
        }
      });

      snakesPawnMeshes.forEach((entry) => {
        const cur = entry.group.position;
        const dist = _scratchVec3.subVectors(entry.targetPos, cur).length();
        cur.lerp(entry.targetPos, alpha);
        if (dist > 0.04) {
          cur.y = entry.targetPos.y + Math.min(dist * 0.35, 0.9);
        } else {
          cur.y = entry.targetPos.y;
        }
        const s = THREE.MathUtils.damp(entry.group.scale.x, entry.targetScale, 12, dt);
        entry.group.scale.setScalar(s);
      });

      for (let i = 0; i < bgCheckerMeshes.length; i++) {
        const mesh = bgCheckerMeshes[i];
        const tgt = bgTargetPositions[i];
        if (!tgt) continue;
        const dist = _scratchVec3.subVectors(tgt, mesh.position).length();
        mesh.position.lerp(tgt, alpha);
        if (dist > 0.05) {
          mesh.position.y = tgt.y + Math.min(dist * 0.25, 0.75);
        } else {
          mesh.position.y = tgt.y;
        }
      }

      chessPieceMeshes.forEach((entry) => {
        const cur = entry.group.position;
        const dist = _scratchVec3.subVectors(entry.targetPos, cur).length();
        cur.lerp(entry.targetPos, alpha);
        if (dist > 0.04) {
          cur.y = entry.targetPos.y + Math.min(dist * 0.28, 0.7);
        } else {
          cur.y = entry.targetPos.y;
        }
      });

      othelloDiscMeshes.forEach((entry) => {
        const diff = Math.abs(entry.pivot.rotation.x - entry.targetRotX);
        entry.pivot.rotation.x = THREE.MathUtils.damp(entry.pivot.rotation.x, entry.targetRotX, 11, dt);
        if (diff > 0.04) {
          const arc = Math.sin((diff / Math.PI) * Math.PI) * 0.45;
          entry.pivot.position.y = 0.11 + arc;
        } else {
          entry.pivot.position.y = 0.11;
        }
      });

      connect4TokenMeshes.forEach((entry) => {
        entry.group.position.x = entry.targetPos.x;
        entry.group.position.z = entry.targetPos.z;
        entry.group.position.y = THREE.MathUtils.damp(entry.group.position.y, entry.targetPos.y, 13, dt);
      });

      checkersPieceMeshes.forEach((entry) => {
        const cur = entry.group.position;
        const dist = _scratchVec3.subVectors(entry.targetPos, cur).length();
        cur.lerp(entry.targetPos, alpha);
        if (dist > 0.04) {
          cur.y = entry.targetPos.y + Math.min(dist * 0.34, 0.85);
        } else {
          cur.y = entry.targetPos.y;
        }
      });

      mastermindMap.shieldPivot.rotation.x = THREE.MathUtils.damp(
        mastermindMap.shieldPivot.rotation.x,
        mastermindShieldTargetRot,
        8,
        dt
      );

      // 3D Dice tumble & settle animation
      const settleDice = (dice: THREE.Group, phaseOffset: number) => {
        const targetVal = (dice.userData.targetValue as number) || 1;
        const targetEuler = getDiceTargetEuler(targetVal);

        if (diceAnimElapsed >= 0 && diceAnimElapsed < 0.48) {
          const p = diceAnimElapsed / 0.48;
          const bounce = Math.abs(Math.sin(p * Math.PI * 2.5)) * (1 - p) * 1.4;
          dice.position.y = 0.36 + bounce;
          dice.rotation.x += dt * (18 + phaseOffset * 4);
          dice.rotation.y += dt * (14 - phaseOffset * 3);
          dice.rotation.z += dt * 11;
        } else {
          dice.position.y = THREE.MathUtils.damp(dice.position.y, 0.36, 16, dt);
          _scratchEuler.copy(targetEuler);
          _scratchQuat.setFromEuler(_scratchEuler);
          dice.quaternion.slerp(_scratchQuat, 1 - Math.exp(-18 * dt));
        }
      };

      if (diceAnimElapsed >= 0) {
        diceAnimElapsed += dt;
        if (diceAnimElapsed >= 0.6) diceAnimElapsed = -1;
      }

      settleDice(dice1, 0);
      if (dice2.visible) settleDice(dice2, 1);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => tick(performance.now()));
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    if (isSoftwareGl) {
      tick(performance.now());
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      textures.dispose();
      brassMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="three-canvas-container"
      className="fixed inset-0 w-full h-full z-0"
    />
  );
};
