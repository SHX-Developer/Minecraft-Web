import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';

// --------------------------
// Константы мира и игрока
// --------------------------
const WORLD_SIZE = 36;
const BLOCK_SIZE = 1;
const PLAYER_HEIGHT = 1.7;
const EYE_HEIGHT = 1.62;

const MOVE_SPEED = 6;
const JUMP_SPEED = 6.5;
const GRAVITY = 18;

const ATLAS_GRID = 4; // 4x4 тайлов в одном атласе
const TILE_SIZE = 16;

// --------------------------
// Базовые Three.js объекты
// --------------------------
const canvas = document.getElementById('game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// Свет: мягкий ambient + directional как солнце
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
sunLight.position.set(8, 20, 6);
scene.add(sunLight);

// --------------------------
// Контейнеры для камеры
// yawObject вращается по Y, pitchObject по X
// Это классическая схема FPS-камеры
// --------------------------
const yawObject = new THREE.Object3D();
const pitchObject = new THREE.Object3D();

camera.position.y = EYE_HEIGHT;
pitchObject.add(camera);
yawObject.add(pitchObject);
scene.add(yawObject);

yawObject.position.set(WORLD_SIZE / 2, PLAYER_HEIGHT, WORLD_SIZE / 2);

// --------------------------
// Генерация texture atlas (pixel-art)
// --------------------------
function createTextureAtlas() {
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = TILE_SIZE * ATLAS_GRID;
  atlasCanvas.height = TILE_SIZE * ATLAS_GRID;

  const ctx = atlasCanvas.getContext('2d');

  const drawNoiseTile = (tileX, tileY, baseColor, noiseColor, density = 0.22) => {
    const x0 = tileX * TILE_SIZE;
    const y0 = tileY * TILE_SIZE;

    ctx.fillStyle = baseColor;
    ctx.fillRect(x0, y0, TILE_SIZE, TILE_SIZE);

    const dots = Math.floor(TILE_SIZE * TILE_SIZE * density);
    ctx.fillStyle = noiseColor;

    for (let i = 0; i < dots; i += 1) {
      const x = x0 + Math.floor(Math.random() * TILE_SIZE);
      const y = y0 + Math.floor(Math.random() * TILE_SIZE);
      ctx.fillRect(x, y, 1, 1);
    }
  };

  // (0,0) Grass Top
  drawNoiseTile(0, 0, '#5eb449', '#6fd15a', 0.28);
  // (1,0) Grass Side
  drawNoiseTile(1, 0, '#8a5a2b', '#9b6a3a', 0.24);
  ctx.fillStyle = '#4ea93d';
  ctx.fillRect(TILE_SIZE, 0, TILE_SIZE, 4); // зеленая полоса травы сверху
  // (2,0) Dirt
  drawNoiseTile(2, 0, '#7a4a24', '#91592f', 0.3);
  // (3,0) Stone
  drawNoiseTile(3, 0, '#7f7f7f', '#9a9a9a', 0.3);

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

const atlasTexture = createTextureAtlas();

// --------------------------
// Утилиты UV для граней куба
// --------------------------
function getTileUVRect(tileX, tileY) {
  const step = 1 / ATLAS_GRID;
  const u0 = tileX * step;
  const v0 = 1 - (tileY + 1) * step;
  const u1 = u0 + step;
  const v1 = v0 + step;
  return { u0, v0, u1, v1 };
}

function setFaceUV(uvAttr, faceIndex, rect) {
  // На одну грань BoxGeometry приходится 2 треугольника = 6 вершин
  const start = faceIndex * 6;
  const { u0, v0, u1, v1 } = rect;

  const values = [
    [u1, v1], [u0, v1], [u1, v0],
    [u0, v1], [u0, v0], [u1, v0],
  ];

  for (let i = 0; i < 6; i += 1) {
    uvAttr.setXY(start + i, values[i][0], values[i][1]);
  }
}

function buildBlockGeometry(topTile, sideTile, bottomTile) {
  const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  const uv = geometry.attributes.uv;

  // Порядок граней в BoxGeometry: right, left, top, bottom, front, back
  setFaceUV(uv, 0, getTileUVRect(sideTile.x, sideTile.y));
  setFaceUV(uv, 1, getTileUVRect(sideTile.x, sideTile.y));
  setFaceUV(uv, 2, getTileUVRect(topTile.x, topTile.y));
  setFaceUV(uv, 3, getTileUVRect(bottomTile.x, bottomTile.y));
  setFaceUV(uv, 4, getTileUVRect(sideTile.x, sideTile.y));
  setFaceUV(uv, 5, getTileUVRect(sideTile.x, sideTile.y));

  uv.needsUpdate = true;
  return geometry;
}

// --------------------------
// Создание мира из блоков
// --------------------------
function createWorld() {
  const worldGroup = new THREE.Group();

  const grassBlockGeometry = buildBlockGeometry(
    { x: 0, y: 0 }, // top
    { x: 1, y: 0 }, // side
    { x: 2, y: 0 }, // bottom
  );

  const grassMaterial = new THREE.MeshLambertMaterial({ map: atlasTexture });

  for (let x = 0; x < WORLD_SIZE; x += 1) {
    for (let z = 0; z < WORLD_SIZE; z += 1) {
      const block = new THREE.Mesh(grassBlockGeometry, grassMaterial);
      block.position.set(x + 0.5, 0.5, z + 0.5);
      worldGroup.add(block);
    }
  }

  scene.add(worldGroup);
}

createWorld();

// --------------------------
// Pointer Lock + инпут
// --------------------------
const keyState = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
};

let isPointerLocked = false;
let velocityY = 0;
let isOnGround = true;

const hint = document.getElementById('hint');

document.addEventListener('click', () => {
  if (!isPointerLocked) {
    document.body.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === document.body;
  document.body.classList.toggle('locked', isPointerLocked);
  hint.hidden = isPointerLocked;
});

document.addEventListener('mousemove', (event) => {
  if (!isPointerLocked) return;

  const sensitivity = 0.0022;
  yawObject.rotation.y -= event.movementX * sensitivity;
  pitchObject.rotation.x -= event.movementY * sensitivity;

  // Ограничиваем вертикальный взгляд чтобы камера не переворачивалась
  const maxPitch = Math.PI / 2 - 0.01;
  pitchObject.rotation.x = THREE.MathUtils.clamp(pitchObject.rotation.x, -maxPitch, maxPitch);
});

document.addEventListener('keydown', (event) => {
  if (event.code in keyState) {
    keyState[event.code] = true;
    event.preventDefault();
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code in keyState) {
    keyState[event.code] = false;
    event.preventDefault();
  }
});

// --------------------------
// Игровой цикл
// --------------------------
const clock = new THREE.Clock();

function updatePlayer(deltaTime) {
  const moveInputX = Number(keyState.KeyD) - Number(keyState.KeyA);
  const moveInputZ = Number(keyState.KeyW) - Number(keyState.KeyS);

  const moveVector = new THREE.Vector3(moveInputX, 0, -moveInputZ);

  if (moveVector.lengthSq() > 0) {
    moveVector.normalize();
    moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawObject.rotation.y);

    yawObject.position.x += moveVector.x * MOVE_SPEED * deltaTime;
    yawObject.position.z += moveVector.z * MOVE_SPEED * deltaTime;
  }

  // Прыжок только с земли
  if (keyState.Space && isOnGround) {
    velocityY = JUMP_SPEED;
    isOnGround = false;
  }

  // Гравитация и простая коллизия с плоской землей (y = 1.7 для игрока)
  velocityY -= GRAVITY * deltaTime;
  yawObject.position.y += velocityY * deltaTime;

  if (yawObject.position.y <= PLAYER_HEIGHT) {
    yawObject.position.y = PLAYER_HEIGHT;
    velocityY = 0;
    isOnGround = true;
  }
}

function keepPlayerInWorldBounds() {
  yawObject.position.x = THREE.MathUtils.clamp(yawObject.position.x, 0.2, WORLD_SIZE - 0.2);
  yawObject.position.z = THREE.MathUtils.clamp(yawObject.position.z, 0.2, WORLD_SIZE - 0.2);
}

function animate() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);

  updatePlayer(deltaTime);
  keepPlayerInWorldBounds();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
