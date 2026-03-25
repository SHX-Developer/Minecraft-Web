import * as THREE from "three";

const PLAYER_DROP_SPEED = 6.2;
const PLAYER_DROP_UPWARD = 1.5;
const PLAYER_DROP_PICKUP_DELAY = 0.32;

export class ItemDropSystem {
  constructor(droppedItemManager, onPickup) {
    this.droppedItemManager = droppedItemManager;
    this.onPickup = onPickup;
    this.tmpVelocity = new THREE.Vector3();
  }

  update(delta, playerPosition) {
    this.droppedItemManager.update(delta, playerPosition, this.onPickup);
  }

  dropFromBlock(blockId, worldX, worldY, worldZ) {
    this.droppedItemManager.spawnItem(blockId, worldX, worldY, worldZ);
  }

  dropFromPlayer(blockId, spawnPosition, throwDirection, playerVelocity = null) {
    this.tmpVelocity.copy(throwDirection).multiplyScalar(PLAYER_DROP_SPEED);
    this.tmpVelocity.y += PLAYER_DROP_UPWARD;

    if (playerVelocity) {
      this.tmpVelocity.x += playerVelocity.x * 0.25;
      this.tmpVelocity.z += playerVelocity.z * 0.25;
    }

    this.droppedItemManager.spawnItemEntity({
      blockId,
      x: spawnPosition.x,
      y: spawnPosition.y,
      z: spawnPosition.z,
      velocityX: this.tmpVelocity.x,
      velocityY: this.tmpVelocity.y,
      velocityZ: this.tmpVelocity.z,
      pickupDelay: PLAYER_DROP_PICKUP_DELAY,
    });
  }

  dropForDeath(blockId, position) {
    const angle = Math.random() * Math.PI * 2;
    const hSpeed = 1.5 + Math.random() * 2.0;
    this.droppedItemManager.spawnItemEntity({
      blockId,
      x: position.x,
      y: position.y,
      z: position.z,
      velocityX: Math.cos(angle) * hSpeed,
      velocityY: 1.5 + Math.random() * 2.0,
      velocityZ: Math.sin(angle) * hSpeed,
      pickupDelay: 1.0,
    });
  }

  clear() {
    this.droppedItemManager.clear();
  }

  getCount() {
    return this.droppedItemManager.getCount();
  }

  destroy() {
    this.droppedItemManager.destroy();
  }
}
