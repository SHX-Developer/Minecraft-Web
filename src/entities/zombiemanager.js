import * as THREE from "three";
import {
  CHUNK_SIZE_Y,
  ZOMBIE_ATTACK_COOLDOWN,
  ZOMBIE_ATTACK_DAMAGE,
  ZOMBIE_ATTACK_RANGE,
  ZOMBIE_DESPAWN_RADIUS,
  ZOMBIE_HP,
  ZOMBIE_HIT_RANGE,
  ZOMBIE_MAX_COUNT,
  ZOMBIE_SPAWN_INTERVAL,
  ZOMBIE_SPAWN_RADIUS_MAX,
  ZOMBIE_SPAWN_RADIUS_MIN,
  ZOMBIE_SUN_BURN_DAMAGE,
  ZOMBIE_SUN_BURN_INTERVAL,
} from "../utils/constants.js";
import { BLOCK, isBlockSolid } from "../world/blockTypes.js";
import { ZombieAI } from "./zombieAI.js";

const HIT_FLASH_DURATION = 0.14;
const HIT_COLOR = new THREE.Color(0xff3333);
const BURN_COLOR = new THREE.Color(0xffb165);

export class ZombieManager {
  constructor(scene, world, particlesManager, daylightSystem, onAttackPlayer) {
    this.scene = scene;
    this.world = world;
    this.particlesManager = particlesManager;
    this.daylightSystem = daylightSystem;
    this.onAttackPlayer = onAttackPlayer;

    this.zombies = [];
    this.spawnTimer = 0;
    this.ai = new ZombieAI();

    this.ray = new THREE.Ray();
    this.tempBox = new THREE.Box3();
    this.tempHitPoint = new THREE.Vector3();
  }

  update(delta, playerPosition) {
    this.updateSpawning(delta, playerPosition);

    for (let i = this.zombies.length - 1; i >= 0; i -= 1) {
      const zombie = this.zombies[i];
      const dx = zombie.mesh.position.x - playerPosition.x;
      const dz = zombie.mesh.position.z - playerPosition.z;
      if (dx * dx + dz * dz > ZOMBIE_DESPAWN_RADIUS * ZOMBIE_DESPAWN_RADIUS) {
        this.removeZombieAt(i, false);
        continue;
      }

      this.updateZombie(zombie, delta, playerPosition);
      if (zombie.hp <= 0) {
        this.removeZombieAt(i, true);
      }
    }
  }

  updateSpawning(delta, playerPosition) {
    if (!this.daylightSystem.isNight()) {
      this.spawnTimer = 0;
      return;
    }

    this.spawnTimer += delta;
    if (this.spawnTimer < ZOMBIE_SPAWN_INTERVAL) {
      return;
    }

    this.spawnTimer = 0;
    this.spawnAround(playerPosition, 8);
  }

  spawnAround(playerPosition, attempts) {
    if (this.zombies.length >= ZOMBIE_MAX_COUNT) {
      return;
    }

    for (let i = 0; i < attempts && this.zombies.length < ZOMBIE_MAX_COUNT; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        ZOMBIE_SPAWN_RADIUS_MIN +
        Math.random() * (ZOMBIE_SPAWN_RADIUS_MAX - ZOMBIE_SPAWN_RADIUS_MIN);
      const x = Math.floor(playerPosition.x + Math.cos(angle) * radius);
      const z = Math.floor(playerPosition.z + Math.sin(angle) * radius);
      const distanceSq = (x + 0.5 - playerPosition.x) ** 2 + (z + 0.5 - playerPosition.z) ** 2;
      if (distanceSq < ZOMBIE_SPAWN_RADIUS_MIN * ZOMBIE_SPAWN_RADIUS_MIN) {
        continue;
      }
      if (!this.isChunkLoadedAt(x, z)) {
        continue;
      }
      if (this.hasZombieNearby(x + 0.5, z + 0.5, 2.8)) {
        continue;
      }

      const spawnY = this.findSafeSpawnY(x, z, 2);
      if (spawnY === null) {
        continue;
      }

      const zombie = this.createZombie(x + 0.5, spawnY, z + 0.5);
      this.zombies.push(zombie);
    }
  }

  findSafeSpawnY(worldX, worldZ, neededClearBlocks) {
    const baseY = this.world.getSurfaceHeight(worldX, worldZ);
    for (let dy = 2; dy >= -2; dy -= 1) {
      const groundY = baseY + dy;
      const ground = this.world.getBlock(worldX, groundY, worldZ);
      if (!isBlockSolid(ground) || ground === BLOCK.WATER) {
        continue;
      }
      let clear = true;
      for (let h = 1; h <= neededClearBlocks; h += 1) {
        const above = this.world.getBlock(worldX, groundY + h, worldZ);
        if (above !== BLOCK.AIR) {
          clear = false;
          break;
        }
      }
      if (clear) {
        return groundY + 1;
      }
    }
    return null;
  }

  createZombie(x, y, z) {
    const root = new THREE.Group();
    const parts = [];

    const makePart = (size, color) => {
      const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.baseColor = new THREE.Color(color);
      parts.push(mesh);
      return mesh;
    };

    const legSize = [0.24, 0.74, 0.24];
    const bodySize = [0.76, 0.9, 0.38];
    const armSize = [0.22, 0.86, 0.22];
    const headSize = [0.62, 0.62, 0.62];

    const legL = makePart(legSize, "#2d5f91");
    const legR = makePart(legSize, "#2d5f91");
    const body = makePart(bodySize, "#4f8f55");
    const armL = makePart(armSize, "#4f8f55");
    const armR = makePart(armSize, "#4f8f55");
    const head = makePart(headSize, "#7dbb72");

    const legH = legSize[1];
    const bodyH = bodySize[1];
    const bodyX = bodySize[0];
    const headH = headSize[1];

    legL.position.set(-0.17, legH * 0.5, 0);
    legR.position.set(0.17, legH * 0.5, 0);
    body.position.set(0, legH + bodyH * 0.5, 0);
    armL.position.set(-(bodyX * 0.5 + armSize[0] * 0.5 + 0.02), legH + bodyH * 0.68, 0);
    armR.position.set(bodyX * 0.5 + armSize[0] * 0.5 + 0.02, legH + bodyH * 0.68, 0);
    head.position.set(0, legH + bodyH + headH * 0.5, 0);

    const eyeLeft = makePart([0.08, 0.08, 0.04], "#101010");
    const eyeRight = makePart([0.08, 0.08, 0.04], "#101010");
    eyeLeft.position.set(-0.14, 0.06, headSize[2] * 0.52);
    eyeRight.position.set(0.14, 0.06, headSize[2] * 0.52);
    head.add(eyeLeft, eyeRight);

    root.add(legL, legR, body, armL, armR, head);
    root.position.set(x, y, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(root);

    return {
      id: `zombie_${Math.floor(Math.random() * 1e8)}`,
      mesh: root,
      parts,
      head,
      armL,
      armR,
      legL,
      legR,
      hp: ZOMBIE_HP,
      yaw: root.rotation.y,
      targetYaw: root.rotation.y,
      idleTurnTimer: 0.8 + Math.random() * 1.8,
      attackCooldown: 0,
      burnTimer: 0,
      isBurning: false,
      hitFlash: 0,
      hitKnockback: new THREE.Vector2(0, 0),
      collisionRadius: 0.33,
      collisionHeight: 1.98,
      walkPhase: Math.random() * Math.PI * 2,
      velocityY: 0,
      isGrounded: true,
    };
  }

  updateZombie(zombie, delta, playerPosition) {
    zombie.hitFlash = Math.max(0, zombie.hitFlash - delta);
    zombie.attackCooldown = Math.max(0, zombie.attackCooldown - delta);
    zombie.jumpCooldown = Math.max(0, (zombie.jumpCooldown || 0) - delta);

    const intent = this.ai.updateIntent(zombie, playerPosition, delta);
    this.moveZombieWithCollisions(zombie, intent.moveX, intent.moveZ, delta);

    // Y physics: gravity when airborne, snap when grounded
    const groundY = this.world.getSurfaceHeight(zombie.mesh.position.x, zombie.mesh.position.z);
    const targetY = groundY + 1;

    if (!zombie.isGrounded) {
      zombie.velocityY -= 24.0 * delta;
      zombie.mesh.position.y += zombie.velocityY * delta;
      if (zombie.mesh.position.y <= targetY) {
        zombie.mesh.position.y = targetY;
        zombie.velocityY = 0;
        zombie.isGrounded = true;
      }
    } else {
      zombie.mesh.position.y += (targetY - zombie.mesh.position.y) * Math.min(1, delta * 10);
      if (zombie.mesh.position.y > targetY + 0.5) {
        zombie.isGrounded = false;
      }
    }

    this.updateAttack(zombie, intent.distanceSq, playerPosition);
    this.updateSunBurn(zombie, delta);
    this.updateAnimation(zombie, delta, intent.speed);
    this.updateColors(zombie);
  }

  updateAttack(zombie, distanceSq, playerPosition) {
    if (distanceSq > ZOMBIE_ATTACK_RANGE * ZOMBIE_ATTACK_RANGE) {
      return;
    }
    if (Math.abs(playerPosition.y - zombie.mesh.position.y) > 1.5) {
      return;
    }
    if (zombie.attackCooldown > 0) {
      return;
    }

    zombie.attackCooldown = ZOMBIE_ATTACK_COOLDOWN;
    if (this.onAttackPlayer) {
      this.onAttackPlayer(ZOMBIE_ATTACK_DAMAGE, zombie.mesh.position);
    }
  }

  updateSunBurn(zombie, delta) {
    if (this.daylightSystem.isDaylight() && this.isExposedToSky(zombie)) {
      zombie.isBurning = true;
      zombie.burnTimer += delta;
      if (zombie.burnTimer >= ZOMBIE_SUN_BURN_INTERVAL) {
        zombie.burnTimer -= ZOMBIE_SUN_BURN_INTERVAL;
        zombie.hp -= ZOMBIE_SUN_BURN_DAMAGE;
        zombie.hitFlash = Math.max(zombie.hitFlash, HIT_FLASH_DURATION * 0.7);
      }
      return;
    }

    zombie.isBurning = false;
    zombie.burnTimer = 0;
  }

  updateAnimation(zombie, delta, speed) {
    const walkFactor = Math.min(1, speed / 2.2);
    zombie.walkPhase += delta * (3 + walkFactor * 6);
    const swing = Math.sin(zombie.walkPhase) * 0.45 * walkFactor;

    zombie.legL.rotation.x = swing;
    zombie.legR.rotation.x = -swing;
    zombie.armL.rotation.x = -swing * 0.8 + 0.12;
    zombie.armR.rotation.x = swing * 0.8 + 0.12;
  }

  updateColors(zombie) {
    const hitFactor = Math.max(0, zombie.hitFlash / HIT_FLASH_DURATION);
    const burnPulse =
      zombie.isBurning ? 0.18 + Math.sin(performance.now() * 0.01 + zombie.walkPhase) * 0.12 : 0;
    const burnFactor = Math.max(0, burnPulse);

    for (let i = 0; i < zombie.parts.length; i += 1) {
      const part = zombie.parts[i];
      part.material.color
        .copy(part.userData.baseColor)
        .lerp(BURN_COLOR, burnFactor)
        .lerp(HIT_COLOR, hitFactor);
    }
  }

  moveZombieWithCollisions(zombie, moveX, moveZ, delta) {
    const startX = zombie.mesh.position.x;
    const startZ = zombie.mesh.position.z;

    const tryMove = (nx, nz) => {
      const result = this.canMoveTo(zombie, nx, nz);
      if (result.ok) {
        return true;
      }
      if (result.needJump && zombie.isGrounded && (zombie.jumpCooldown || 0) <= 0) {
        zombie.velocityY = 5.2;
        zombie.isGrounded = false;
        zombie.jumpCooldown = 0.65;
        return true;
      }
      return false;
    };

    if (tryMove(startX + moveX, startZ + moveZ)) {
      zombie.mesh.position.x += moveX;
      zombie.mesh.position.z += moveZ;
    } else if (tryMove(startX + moveX, startZ)) {
      zombie.mesh.position.x += moveX;
    } else if (tryMove(startX, startZ + moveZ)) {
      zombie.mesh.position.z += moveZ;
    }
  }

  canMoveTo(zombie, nextX, nextZ) {
    if (!this.isChunkLoadedAt(nextX, nextZ)) {
      return { ok: false, needJump: false };
    }

    const currentSurface = this.world.getSurfaceHeight(zombie.mesh.position.x, zombie.mesh.position.z);
    const nextSurface = this.world.getSurfaceHeight(nextX, nextZ);
    const heightDelta = nextSurface - currentSurface;

    if (heightDelta > 2 || heightDelta < -5) {
      return { ok: false, needJump: false };
    }
    if (heightDelta === 2) {
      return { ok: false, needJump: true };
    }
    if (this.world.getBlock(nextX, nextSurface + 1, nextZ) === BLOCK.WATER) {
      return { ok: false, needJump: false };
    }
    if (
      this.collidesAt(nextX, nextSurface + 1, nextZ, zombie.collisionRadius, zombie.collisionHeight)
    ) {
      return { ok: false, needJump: false };
    }

    return { ok: true, needJump: false };
  }

  collidesAt(px, py, pz, radius, height) {
    const minX = Math.floor(px - radius);
    const maxX = Math.floor(px + radius);
    const minY = Math.floor(py);
    const maxY = Math.floor(py + height - 0.001);
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

  tryHitFromRay(origin, direction, maxDistance = ZOMBIE_HIT_RANGE, damage = 1, blockDistanceLimit = Infinity) {
    if (this.zombies.length === 0) {
      return false;
    }

    this.ray.set(origin, direction);

    let nearestZombie = null;
    let nearestDist = maxDistance;
    for (let i = 0; i < this.zombies.length; i += 1) {
      const zombie = this.zombies[i];
      const halfW = zombie.collisionRadius;
      const height = zombie.collisionHeight;

      this.tempBox.min.set(zombie.mesh.position.x - halfW, zombie.mesh.position.y, zombie.mesh.position.z - halfW);
      this.tempBox.max.set(
        zombie.mesh.position.x + halfW,
        zombie.mesh.position.y + height,
        zombie.mesh.position.z + halfW
      );

      const hit = this.ray.intersectBox(this.tempBox, this.tempHitPoint);
      if (!hit) {
        continue;
      }

      const dist = origin.distanceTo(hit);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestZombie = zombie;
      }
    }

    if (!nearestZombie || nearestDist > blockDistanceLimit) {
      return false;
    }

    nearestZombie.hp -= damage;
    nearestZombie.hitFlash = HIT_FLASH_DURATION;
    nearestZombie.hitKnockback.set(direction.x * 3.8, direction.z * 3.8);
    nearestZombie.velocityY = Math.max(nearestZombie.velocityY, 5.0);
    nearestZombie.isGrounded = false;
    return true;
  }

  isExposedToSky(zombie) {
    const x = Math.floor(zombie.mesh.position.x);
    const z = Math.floor(zombie.mesh.position.z);
    const footY = Math.floor(zombie.mesh.position.y + 0.2);

    if (this.world.getBlock(x, footY, z) === BLOCK.WATER) {
      return false;
    }

    const startY = Math.floor(zombie.mesh.position.y + zombie.collisionHeight + 0.05);
    for (let y = startY; y < CHUNK_SIZE_Y; y += 1) {
      if (isBlockSolid(this.world.getBlock(x, y, z))) {
        return false;
      }
    }
    return true;
  }

  hasZombieNearby(x, z, radius) {
    const radiusSq = radius * radius;
    for (let i = 0; i < this.zombies.length; i += 1) {
      const zombie = this.zombies[i];
      const dx = zombie.mesh.position.x - x;
      const dz = zombie.mesh.position.z - z;
      if (dx * dx + dz * dz <= radiusSq) {
        return true;
      }
    }
    return false;
  }

  isChunkLoadedAt(worldX, worldZ) {
    const chunk = this.world.getCurrentChunkCoords(worldX, worldZ);
    return !!this.world.getChunkEntry(chunk.cx, chunk.cz);
  }

  removeZombieAt(index, withEffect) {
    const zombie = this.zombies[index];
    if (withEffect) {
      this.particlesManager.spawnDeathPuff(
        zombie.mesh.position.x,
        zombie.mesh.position.y + zombie.collisionHeight * 0.5,
        zombie.mesh.position.z
      );
    }

    this.scene.remove(zombie.mesh);
    for (let i = 0; i < zombie.parts.length; i += 1) {
      zombie.parts[i].geometry.dispose();
      zombie.parts[i].material.dispose();
    }
    this.zombies.splice(index, 1);
  }

  clear() {
    while (this.zombies.length > 0) {
      this.removeZombieAt(this.zombies.length - 1, false);
    }
  }

  getCount() {
    return this.zombies.length;
  }

  destroy() {
    this.clear();
  }
}
