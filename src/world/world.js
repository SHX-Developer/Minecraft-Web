import * as THREE from "three";
import {
  CHUNK_LOADS_PER_FRAME,
  CHUNK_REBUILDS_PER_FRAME,
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  WATER_LEVEL,
  WORLD_RENDER_RADIUS,
  WORLD_UNLOAD_RADIUS,
} from "../utils/constants.js";
import { chunkKey, worldToChunkCoords } from "../utils/helpers.js";
import { BLOCK, isBlockReplaceable } from "./blockTypes.js";
import { Chunk } from "./chunk.js";
import { buildChunkMeshes } from "./chunkMesh.js";
import { WorldGenerator } from "./worldGenerator.js";

export class World {
  constructor(scene, atlasTexture) {
    this.scene = scene;
    this.generator = new WorldGenerator();
    this.chunks = new Map();

    this.lastCenterChunkKey = null;
    this.centerCx = 0;
    this.centerCz = 0;

    this.loadQueue = [];
    this.loadQueued = new Set();
    this.rebuildQueue = [];
    this.rebuildQueued = new Set();

    this.opaqueMaterial = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      alphaTest: 0.05,
    });
    this.transparentMaterial = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
    });
    this.emissiveMaterial = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    });

    this.chunkHalfExtents = new THREE.Vector3(CHUNK_SIZE_X * 0.5, CHUNK_SIZE_Y * 0.5, CHUNK_SIZE_Z * 0.5);
    this.chunkBoundingRadius = this.chunkHalfExtents.length();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.tempSphere = new THREE.Sphere(new THREE.Vector3(), this.chunkBoundingRadius);
  }

  update(playerPosition) {
    const center = worldToChunkCoords(playerPosition.x, playerPosition.z);
    const centerKey = chunkKey(center.cx, center.cz);

    if (centerKey !== this.lastCenterChunkKey) {
      this.lastCenterChunkKey = centerKey;
      this.centerCx = center.cx;
      this.centerCz = center.cz;
      this.enqueueChunksAround(center.cx, center.cz);
      this.pruneLoadQueue(center.cx, center.cz);
      this.unloadFarChunks(center.cx, center.cz);
    }

    this.processLoadQueue(CHUNK_LOADS_PER_FRAME);
    this.processRebuildQueue(CHUNK_REBUILDS_PER_FRAME);
  }

  enqueueChunksAround(centerCx, centerCz) {
    for (let dz = -WORLD_RENDER_RADIUS; dz <= WORLD_RENDER_RADIUS; dz += 1) {
      for (let dx = -WORLD_RENDER_RADIUS; dx <= WORLD_RENDER_RADIUS; dx += 1) {
        const cx = centerCx + dx;
        const cz = centerCz + dz;
        const key = chunkKey(cx, cz);
        if (this.chunks.has(key) || this.loadQueued.has(key)) {
          continue;
        }
        const distSq = dx * dx + dz * dz;
        this.loadQueue.push({ cx, cz, distSq });
        this.loadQueued.add(key);
      }
    }

    this.loadQueue.sort((a, b) => a.distSq - b.distSq);
  }

  pruneLoadQueue(centerCx, centerCz) {
    const nextQueue = [];
    this.loadQueued.clear();

    for (let i = 0; i < this.loadQueue.length; i += 1) {
      const item = this.loadQueue[i];
      if (
        Math.abs(item.cx - centerCx) <= WORLD_RENDER_RADIUS &&
        Math.abs(item.cz - centerCz) <= WORLD_RENDER_RADIUS
      ) {
        item.distSq = (item.cx - centerCx) ** 2 + (item.cz - centerCz) ** 2;
        nextQueue.push(item);
        this.loadQueued.add(chunkKey(item.cx, item.cz));
      }
    }

    nextQueue.sort((a, b) => a.distSq - b.distSq);
    this.loadQueue = nextQueue;
  }

  processLoadQueue(maxLoads) {
    let loaded = 0;
    while (loaded < maxLoads && this.loadQueue.length > 0) {
      const item = this.loadQueue.shift();
      const key = chunkKey(item.cx, item.cz);
      this.loadQueued.delete(key);

      if (this.chunks.has(key)) {
        continue;
      }

      this.ensureChunk(item.cx, item.cz);
      loaded += 1;
    }
  }

  processRebuildQueue(maxRebuilds) {
    let rebuilt = 0;
    while (rebuilt < maxRebuilds && this.rebuildQueue.length > 0) {
      const key = this.rebuildQueue.shift();
      this.rebuildQueued.delete(key);
      const [cxStr, czStr] = key.split(",");
      this.rebuildChunkNow(Number(cxStr), Number(czStr));
      rebuilt += 1;
    }
  }

  ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    const existing = this.chunks.get(key);
    if (existing) {
      return existing;
    }

    const chunk = new Chunk(cx, cz);
    this.generator.generateChunk(chunk);

    const group = new THREE.Group();
    group.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);
    this.scene.add(group);

    const entry = {
      cx,
      cz,
      chunk,
      group,
      opaqueMesh: null,
      transparentMesh: null,
      emissiveMesh: null,
    };
    this.chunks.set(key, entry);

    this.enqueueRebuild(cx, cz);
    this.enqueueRebuild(cx - 1, cz);
    this.enqueueRebuild(cx + 1, cz);
    this.enqueueRebuild(cx, cz - 1);
    this.enqueueRebuild(cx, cz + 1);
    return entry;
  }

  enqueueRebuild(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!this.chunks.has(key) || this.rebuildQueued.has(key)) {
      return;
    }
    this.rebuildQueued.add(key);
    this.rebuildQueue.push(key);
  }

  getChunkEntry(cx, cz) {
    return this.chunks.get(chunkKey(cx, cz)) || null;
  }

  getBlock(worldX, y, worldZ) {
    const yi = Math.floor(y);
    if (yi < 0 || yi >= CHUNK_SIZE_Y) {
      return BLOCK.AIR;
    }
    const { cx, cz, lx, lz } = worldToChunkCoords(worldX, worldZ);
    const entry = this.getChunkEntry(cx, cz);
    if (!entry) {
      return BLOCK.AIR;
    }
    return entry.chunk.get(lx, yi, lz);
  }

  setBlock(worldX, y, worldZ, id) {
    const yi = Math.floor(y);
    if (yi < 0 || yi >= CHUNK_SIZE_Y) {
      return false;
    }

    const { cx, cz, lx, lz } = worldToChunkCoords(worldX, worldZ);
    let entry = this.getChunkEntry(cx, cz);

    if (!entry && id !== BLOCK.AIR) {
      entry = this.ensureChunk(cx, cz);
      this.rebuildChunkNow(cx, cz);
    }
    if (!entry) {
      return false;
    }

    const current = entry.chunk.get(lx, yi, lz);
    if (current === id) {
      return false;
    }

    entry.chunk.set(lx, yi, lz, id);
    this.rebuildChunkNow(cx, cz);
    this.rebuildChunkBordersNow(cx, cz, lx, lz);
    return true;
  }

  isReplaceable(worldX, y, worldZ) {
    return isBlockReplaceable(this.getBlock(worldX, y, worldZ));
  }

  rebuildChunkBordersNow(cx, cz, lx, lz) {
    if (lx === 0) {
      this.rebuildChunkNow(cx - 1, cz);
    } else if (lx === CHUNK_SIZE_X - 1) {
      this.rebuildChunkNow(cx + 1, cz);
    }

    if (lz === 0) {
      this.rebuildChunkNow(cx, cz - 1);
    } else if (lz === CHUNK_SIZE_Z - 1) {
      this.rebuildChunkNow(cx, cz + 1);
    }
  }

  rebuildChunkNow(cx, cz) {
    const entry = this.getChunkEntry(cx, cz);
    if (!entry) {
      return;
    }

    if (entry.opaqueMesh) {
      entry.group.remove(entry.opaqueMesh);
      entry.opaqueMesh.geometry.dispose();
      entry.opaqueMesh = null;
    }
    if (entry.transparentMesh) {
      entry.group.remove(entry.transparentMesh);
      entry.transparentMesh.geometry.dispose();
      entry.transparentMesh = null;
    }
    if (entry.emissiveMesh) {
      entry.group.remove(entry.emissiveMesh);
      entry.emissiveMesh.geometry.dispose();
      entry.emissiveMesh = null;
    }

    const meshes = buildChunkMeshes(entry.chunk, this);
    if (meshes.opaqueGeometry) {
      const opaqueMesh = new THREE.Mesh(meshes.opaqueGeometry, this.opaqueMaterial);
      opaqueMesh.frustumCulled = true;
      opaqueMesh.renderOrder = 0;
      opaqueMesh.castShadow = true;
      opaqueMesh.receiveShadow = true;
      entry.group.add(opaqueMesh);
      entry.opaqueMesh = opaqueMesh;
    }

    if (meshes.transparentGeometry) {
      const transparentMesh = new THREE.Mesh(meshes.transparentGeometry, this.transparentMaterial);
      transparentMesh.frustumCulled = true;
      transparentMesh.renderOrder = 1;
      transparentMesh.castShadow = false;
      transparentMesh.receiveShadow = true;
      entry.group.add(transparentMesh);
      entry.transparentMesh = transparentMesh;
    }

    if (meshes.emissiveGeometry) {
      const emissiveMesh = new THREE.Mesh(meshes.emissiveGeometry, this.emissiveMaterial);
      emissiveMesh.frustumCulled = true;
      emissiveMesh.renderOrder = 2;
      emissiveMesh.castShadow = false;
      emissiveMesh.receiveShadow = false;
      entry.group.add(emissiveMesh);
      entry.emissiveMesh = emissiveMesh;
    }
  }

  unloadFarChunks(centerCx, centerCz) {
    for (const [key, entry] of this.chunks.entries()) {
      const outOfRangeX = Math.abs(entry.cx - centerCx) > WORLD_UNLOAD_RADIUS;
      const outOfRangeZ = Math.abs(entry.cz - centerCz) > WORLD_UNLOAD_RADIUS;
      if (!outOfRangeX && !outOfRangeZ) {
        continue;
      }
      this.disposeChunkEntry(entry);
      this.chunks.delete(key);
      this.rebuildQueued.delete(key);
    }
  }

  disposeChunkEntry(entry) {
    if (entry.opaqueMesh) {
      entry.opaqueMesh.geometry.dispose();
    }
    if (entry.transparentMesh) {
      entry.transparentMesh.geometry.dispose();
    }
    if (entry.emissiveMesh) {
      entry.emissiveMesh.geometry.dispose();
    }
    this.scene.remove(entry.group);
  }

  getSpawnPoint() {
    const worldX = 8;
    const worldZ = 8;
    const groundY = this.generator.getSurfaceHeight(worldX, worldZ);
    const spawnY = Math.max(groundY + 1, WATER_LEVEL + 2);
    return new THREE.Vector3(worldX + 0.5, spawnY, worldZ + 0.5);
  }

  forceLoadSyncAround(worldX, worldZ, radius = 2) {
    const center = worldToChunkCoords(worldX, worldZ);
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        this.ensureChunk(center.cx + dx, center.cz + dz);
      }
    }
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        this.rebuildChunkNow(center.cx + dx, center.cz + dz);
      }
    }
  }

  getSurfaceHeight(worldX, worldZ) {
    return this.generator.getSurfaceHeight(worldX, worldZ);
  }

  getCurrentChunkCoords(worldX, worldZ) {
    const { cx, cz } = worldToChunkCoords(worldX, worldZ);
    return { cx, cz };
  }

  getActiveChunkCount() {
    return this.chunks.size;
  }

  getVisibleChunkCount(camera) {
    camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    let visible = 0;
    for (const entry of this.chunks.values()) {
      this.tempSphere.center.set(
        entry.group.position.x + this.chunkHalfExtents.x,
        this.chunkHalfExtents.y,
        entry.group.position.z + this.chunkHalfExtents.z
      );
      if (this.frustum.intersectsSphere(this.tempSphere)) {
        visible += 1;
      }
    }
    return visible;
  }

  getQueueSizes() {
    return {
      loadQueue: this.loadQueue.length,
      rebuildQueue: this.rebuildQueue.length,
    };
  }
}
