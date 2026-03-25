import * as THREE from "three";
import { createItemDisplayMesh } from "../items/itemMeshFactory.js";
import { isBlockSolid } from "../world/blockTypes.js";

const PICKUP_RADIUS = 1.8;
const GRAVITY = 18.0;
const MAX_FALL_SPEED = 20.0;
const BLOCK_DROP_BOUNCE_VELOCITY = 3.5;
const SPIN_SPEED = 2.0;
const HOVER_SPEED = 2.5;
const HOVER_AMPLITUDE = 0.08;
const DESPAWN_TIME = 300;
const ITEM_SCALE = 0.35;
const ITEM_RADIUS = 0.18;
const ITEM_HEIGHT = 0.28;
const RESTITUTION = 0.28;
const WALL_BOUNCE = 0.25;
const GROUND_DRAG = 8.5;
const MIN_BOUNCE_SPEED = 1.25;
const GROUND_PROBE = 0.04;

export class DroppedItemManager {
  constructor(scene, world, atlasTexture) {
    this.scene = scene;
    this.world = world;
    this.atlasTexture = atlasTexture;
    this.items = [];
  }

  spawnItem(blockId, worldX, worldY, worldZ) {
    const spread = 0.15;
    this.spawnItemEntity({
      blockId,
      x: worldX + 0.5,
      y: worldY + 0.5,
      z: worldZ + 0.5,
      velocityX: (Math.random() - 0.5) * 3 * spread,
      velocityY: BLOCK_DROP_BOUNCE_VELOCITY,
      velocityZ: (Math.random() - 0.5) * 3 * spread,
    });
  }

  spawnItemEntity({
    blockId,
    x,
    y,
    z,
    velocityX = 0,
    velocityY = 0,
    velocityZ = 0,
    pickupDelay = 0,
  }) {
    const mesh = createItemDisplayMesh(blockId, this.atlasTexture);
    mesh.scale.setScalar(ITEM_SCALE);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.add(mesh);
    this.scene.add(group);

    this.items.push({
      blockId,
      group,
      mesh,
      velocityX,
      velocityY,
      velocityZ,
      onGround: false,
      age: 0,
      pickupDelay,
      spinAngle: Math.random() * Math.PI * 2,
      hoverSeed: Math.random() * Math.PI * 2,
    });
  }

  update(delta, playerPosition, onPickup) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      item.age += delta;
      item.pickupDelay = Math.max(0, item.pickupDelay - delta);

      if (item.age > DESPAWN_TIME) {
        this.removeItem(i);
        continue;
      }

      this.updatePhysics(item, delta);
      this.updateVisual(item, delta);

      if (item.pickupDelay > 0) {
        continue;
      }

      const dx = playerPosition.x - item.group.position.x;
      const dy = playerPosition.y + 0.9 - item.group.position.y;
      const dz = playerPosition.z - item.group.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < PICKUP_RADIUS * PICKUP_RADIUS) {
        const picked = onPickup(item.blockId);
        if (picked) {
          this.removeItem(i);
        }
      }
    }
  }

  updatePhysics(item, delta) {
    item.velocityY -= GRAVITY * delta;
    item.velocityY = Math.max(item.velocityY, -MAX_FALL_SPEED);

    const nextX = item.group.position.x + item.velocityX * delta;
    if (this.collidesAt(nextX, item.group.position.y, item.group.position.z, ITEM_RADIUS, ITEM_HEIGHT)) {
      item.velocityX *= -WALL_BOUNCE;
    } else {
      item.group.position.x = nextX;
    }

    const nextZ = item.group.position.z + item.velocityZ * delta;
    if (this.collidesAt(item.group.position.x, item.group.position.y, nextZ, ITEM_RADIUS, ITEM_HEIGHT)) {
      item.velocityZ *= -WALL_BOUNCE;
    } else {
      item.group.position.z = nextZ;
    }

    const nextY = item.group.position.y + item.velocityY * delta;
    if (this.collidesAt(item.group.position.x, nextY, item.group.position.z, ITEM_RADIUS, ITEM_HEIGHT)) {
      if (item.velocityY < 0) {
        const floorY = Math.floor(nextY - ITEM_HEIGHT * 0.5);
        item.group.position.y = floorY + 1 + ITEM_HEIGHT * 0.5;
        if (Math.abs(item.velocityY) > MIN_BOUNCE_SPEED) {
          item.velocityY = -item.velocityY * RESTITUTION;
          item.velocityX *= 0.72;
          item.velocityZ *= 0.72;
          item.onGround = false;
        } else {
          item.velocityY = 0;
          item.onGround = true;
        }
      } else {
        item.velocityY = 0;
      }
    } else {
      item.group.position.y = nextY;
      item.onGround = false;
    }

    if (item.onGround) {
      const drag = Math.max(0, 1 - GROUND_DRAG * delta);
      item.velocityX *= drag;
      item.velocityZ *= drag;
      if (Math.abs(item.velocityX) < 0.03) {
        item.velocityX = 0;
      }
      if (Math.abs(item.velocityZ) < 0.03) {
        item.velocityZ = 0;
      }
      if (!this.hasGroundSupport(item.group.position.x, item.group.position.y, item.group.position.z)) {
        item.onGround = false;
      }
    }
  }

  updateVisual(item, delta) {
    item.spinAngle += SPIN_SPEED * delta;
    item.mesh.rotation.y = item.spinAngle;

    if (item.onGround && item.velocityX === 0 && item.velocityZ === 0 && item.velocityY === 0) {
      const hover = Math.sin(item.age * HOVER_SPEED + item.hoverSeed) * HOVER_AMPLITUDE;
      item.mesh.position.y = hover;
      return;
    }

    item.mesh.position.y = 0;
  }

  hasGroundSupport(x, y, z) {
    const groundY = Math.floor(y - ITEM_HEIGHT * 0.5 - GROUND_PROBE);
    return isBlockSolid(this.world.getBlock(x, groundY, z));
  }

  collidesAt(px, py, pz, radius, height) {
    const minX = Math.floor(px - radius);
    const maxX = Math.floor(px + radius);
    const minY = Math.floor(py - height * 0.5 + 0.001);
    const maxY = Math.floor(py + height * 0.5 - 0.001);
    const minZ = Math.floor(pz - radius);
    const maxZ = Math.floor(pz + radius);

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          if (isBlockSolid(this.world.getBlock(x, y, z))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  removeItem(index) {
    const item = this.items[index];
    this.scene.remove(item.group);
    item.group.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.items.splice(index, 1);
  }

  clear() {
    while (this.items.length > 0) {
      this.removeItem(this.items.length - 1);
    }
  }

  getCount() {
    return this.items.length;
  }

  destroy() {
    this.clear();
  }
}
