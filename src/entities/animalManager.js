import * as THREE from "three";
import {
  ANIMAL_ATTACK_RANGE,
  ANIMAL_HP,
  ANIMAL_MAX_COUNT,
  ANIMAL_SPAWN_INTERVAL,
  ANIMAL_SPAWN_RADIUS,
} from "../utils/constants.js";
import { BLOCK, isBlockSolid } from "../world/blockTypes.js";
import { ANIMAL_TYPES } from "./animalTypes.js";

const HIT_FLASH_DURATION = 0.12;
const HIT_COLOR = new THREE.Color(0xff3333);

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export class AnimalManager {
  constructor(scene, world, particlesManager) {
    this.scene = scene;
    this.world = world;
    this.particlesManager = particlesManager;
    this.animals = [];
    this.spawnTimer = 0;

    this.ray = new THREE.Ray();
    this.tempBox = new THREE.Box3();
    this.tempVec = new THREE.Vector3();
    this.tempHitPoint = new THREE.Vector3();
  }

  update(delta, playerPosition) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= ANIMAL_SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.spawnAround(playerPosition, 4);
    }

    for (let i = this.animals.length - 1; i >= 0; i -= 1) {
      const animal = this.animals[i];
      const dx = animal.mesh.position.x - playerPosition.x;
      const dz = animal.mesh.position.z - playerPosition.z;
      const farDistance = ANIMAL_SPAWN_RADIUS * 1.8;
      if (dx * dx + dz * dz > farDistance * farDistance) {
        this.removeAnimalAt(i, false);
        continue;
      }

      this.updateAnimal(animal, delta);
      if (animal.hp <= 0) {
        this.removeAnimalAt(i, true);
      }
    }
  }

  spawnAround(playerPosition, attempts) {
    if (this.animals.length >= ANIMAL_MAX_COUNT) {
      return;
    }

    for (let i = 0; i < attempts && this.animals.length < ANIMAL_MAX_COUNT; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 14 + Math.random() * ANIMAL_SPAWN_RADIUS;
      const x = Math.floor(playerPosition.x + Math.cos(angle) * radius);
      const z = Math.floor(playerPosition.z + Math.sin(angle) * radius);

      const surfaceY = this.world.getSurfaceHeight(x, z);
      const groundBlock = this.world.getBlock(x, surfaceY, z);
      const blockAtFeet = this.world.getBlock(x, surfaceY + 1, z);
      const blockAtHead = this.world.getBlock(x, surfaceY + 2, z);

      if (groundBlock === BLOCK.WATER || blockAtFeet !== BLOCK.AIR || blockAtHead !== BLOCK.AIR) {
        continue;
      }
      if (!this.isChunkLoadedAt(x, z)) {
        continue;
      }
      if (this.hasAnimalNearby(x + 0.5, z + 0.5, 3.5)) {
        continue;
      }

      const def = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const animal = this.createAnimal(def, x + 0.5, surfaceY + 1, z + 0.5);
      this.animals.push(animal);
    }
  }

  createAnimal(def, x, y, z) {
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

    const body = makePart(def.body, def.bodyColor);
    const head = makePart(def.head, def.headColor);
    const leg1 = makePart(def.leg, def.legColor);
    const leg2 = makePart(def.leg, def.legColor);
    const leg3 = makePart(def.leg, def.legColor);
    const leg4 = makePart(def.leg, def.legColor);

    const legH = def.leg[1];
    const bodyH = def.body[1];
    const bodyZ = def.body[2];
    const bodyX = def.body[0];

    body.position.set(0, legH + bodyH * 0.5, 0);
    head.position.set(0, legH + bodyH * 0.62, bodyZ * 0.52);

    const legX = bodyX * 0.34;
    const legZ = bodyZ * 0.28;
    leg1.position.set(-legX, legH * 0.5, -legZ);
    leg2.position.set(legX, legH * 0.5, -legZ);
    leg3.position.set(-legX, legH * 0.5, legZ);
    leg4.position.set(legX, legH * 0.5, legZ);

    this.addEyes(def, makePart, head, parts);
    this.addSpeciesDetails(def, makePart, root, body, head, legH, bodyH, bodyZ);

    root.add(body, head, leg1, leg2, leg3, leg4);
    root.position.set(x, y, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(root);

    return {
      id: `${def.id}_${Math.floor(Math.random() * 1e8)}`,
      type: def.id,
      def,
      mesh: root,
      parts,
      hp: ANIMAL_HP,
      yaw: Math.random() * Math.PI * 2,
      targetYaw: Math.random() * Math.PI * 2,
      wanderTimer: 0.6 + Math.random() * 2.4,
      hitFlash: 0,
      speedScale: 1,
      hitKnockback: new THREE.Vector2(0, 0),
      fleeTimer: 0,
      velocityY: 0,
      isGrounded: true,
      collisionRadius: Math.max(def.body[0], def.body[2]) * 0.38,
      collisionHeight: def.leg[1] + def.body[1] + 0.32,
    };
  }

  addEyes(def, makePart, head) {
    const eye = [0.08, 0.08, 0.04];
    const eyeLeft = makePart(eye, def.eyeColor || "#111111");
    const eyeRight = makePart(eye, def.eyeColor || "#111111");
    const halfHeadX = def.head[0] * 0.24;
    const headTop = def.head[1] * 0.12;
    const headFront = def.head[2] * 0.52;
    eyeLeft.position.set(-halfHeadX, headTop, headFront);
    eyeRight.position.set(halfHeadX, headTop, headFront);
    head.add(eyeLeft, eyeRight);
  }

  addSpeciesDetails(def, makePart, root, body, head, legH, bodyH, bodyZ) {
    if (def.id === "chicken") {
      const beak = makePart(def.beak, def.beakColor);
      beak.position.set(0, -0.02, def.head[2] * 0.56);
      head.add(beak);

      const crest = makePart(def.crest, def.crestColor);
      crest.position.set(0, def.head[1] * 0.55, def.head[2] * 0.08);
      head.add(crest);
      return;
    }

    if (def.id === "pig") {
      const snout = makePart(def.snout, def.snoutColor);
      snout.position.set(0, -0.06, def.head[2] * 0.58);
      head.add(snout);
      return;
    }

    if (def.id === "cow") {
      const patch1 = makePart([def.body[0] * 0.4, def.body[1] * 0.34, 0.06], def.patchColor);
      patch1.position.set(-def.body[0] * 0.12, legH + bodyH * 0.64, -bodyZ * 0.25);
      const patch2 = makePart([def.body[0] * 0.28, def.body[1] * 0.32, 0.06], def.patchColor);
      patch2.position.set(def.body[0] * 0.18, legH + bodyH * 0.46, bodyZ * 0.21);
      root.add(patch1, patch2);

      const hornL = makePart(def.horns, def.hornColor);
      const hornR = makePart(def.horns, def.hornColor);
      hornL.position.set(-def.head[0] * 0.27, def.head[1] * 0.48, def.head[2] * 0.02);
      hornR.position.set(def.head[0] * 0.27, def.head[1] * 0.48, def.head[2] * 0.02);
      head.add(hornL, hornR);
      return;
    }

    if (def.id === "sheep") {
      const wool = makePart(def.wool, def.woolColor);
      wool.position.set(0, legH + bodyH * 0.52, 0);
      root.add(wool);
    }
  }

  updateAnimal(animal, delta) {
    // Flee after being hit
    if (animal.fleeTimer > 0) {
      animal.fleeTimer -= delta;
      // Flee away from the direction they were hit
      animal.wanderTimer = 0.5;
    }

    animal.wanderTimer -= delta;
    if (animal.wanderTimer <= 0) {
      animal.wanderTimer = 1.1 + Math.random() * 3.2;
      animal.targetYaw += (Math.random() - 0.5) * 1.45;
    }

    if (animal.hitFlash > 0) {
      animal.hitFlash -= delta;
    }

    const flashFactor = Math.max(0, animal.hitFlash / HIT_FLASH_DURATION);
    for (let i = 0; i < animal.parts.length; i += 1) {
      const part = animal.parts[i];
      part.material.color.copy(part.userData.baseColor).lerp(HIT_COLOR, flashFactor);
    }

    const turnSpeed = 3.4;
    const yawStep = angleDelta(animal.targetYaw, animal.mesh.rotation.y);
    const maxStep = turnSpeed * delta;
    animal.mesh.rotation.y += Math.max(-maxStep, Math.min(maxStep, yawStep));
    animal.yaw = animal.mesh.rotation.y;

    const turnPenalty = Math.max(0.18, 1 - Math.min(1, Math.abs(yawStep) / 1.2));
    const fleeSpeedMult = animal.fleeTimer > 0 ? 2.5 : 1;
    const baseSpeed = animal.def.speed * (animal.hitFlash > 0 ? 0.8 : 1) * turnPenalty * fleeSpeedMult;
    // Animal models are authored facing +Z, so forward movement must match that local forward.
    let moveX = Math.sin(animal.mesh.rotation.y) * baseSpeed * delta + animal.hitKnockback.x * delta;
    let moveZ = Math.cos(animal.mesh.rotation.y) * baseSpeed * delta + animal.hitKnockback.y * delta;
    animal.hitKnockback.multiplyScalar(Math.max(0, 1 - delta * 5));

    const nextX = animal.mesh.position.x + moveX;
    const nextZ = animal.mesh.position.z + moveZ;
    const walkResult = this.canMoveTo(animal, nextX, nextZ);
    if (!walkResult.ok) {
      animal.targetYaw += (Math.random() - 0.5) * (Math.PI * 0.8);
      animal.wanderTimer = 0.35 + Math.random() * 0.5;
      moveX = 0;
      moveZ = 0;
    }

    animal.mesh.position.x += moveX;
    animal.mesh.position.z += moveZ;

    const groundY = this.world.getSurfaceHeight(animal.mesh.position.x, animal.mesh.position.z);
    const targetY = groundY + 1;
    if (!animal.isGrounded) {
      animal.velocityY -= 24.0 * delta;
      animal.mesh.position.y += animal.velocityY * delta;
      if (animal.mesh.position.y <= targetY) {
        animal.mesh.position.y = targetY;
        animal.velocityY = 0;
        animal.isGrounded = true;
      }
    } else {
      animal.mesh.position.y += (targetY - animal.mesh.position.y) * Math.min(1, delta * 12);
    }
  }

  canMoveTo(animal, nextX, nextZ) {
    if (!this.isChunkLoadedAt(nextX, nextZ)) {
      return { ok: false };
    }

    const currentSurface = this.world.getSurfaceHeight(animal.mesh.position.x, animal.mesh.position.z);
    const nextSurface = this.world.getSurfaceHeight(nextX, nextZ);
    const heightDelta = nextSurface - currentSurface;

    if (heightDelta > 1 || heightDelta < -1) {
      return { ok: false };
    }
    if (this.world.getBlock(nextX, nextSurface + 1, nextZ) === BLOCK.WATER) {
      return { ok: false };
    }
    if (this.collidesAt(nextX, nextSurface + 1, nextZ, animal.collisionRadius, animal.collisionHeight)) {
      return { ok: false };
    }
    return { ok: true };
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

  tryHitFromRay(
    origin,
    direction,
    maxDistance = ANIMAL_ATTACK_RANGE,
    damage = 1,
    blockDistanceLimit = Infinity
  ) {
    if (this.animals.length === 0) {
      return false;
    }

    this.ray.set(origin, direction);

    let nearestAnimal = null;
    let nearestDist = maxDistance;

    for (let i = 0; i < this.animals.length; i += 1) {
      const animal = this.animals[i];
      const halfW = Math.max(animal.def.body[0], animal.def.body[2]) * 0.48;
      const height = animal.def.leg[1] + animal.def.body[1] + 0.4;

      this.tempBox.min.set(
        animal.mesh.position.x - halfW,
        animal.mesh.position.y,
        animal.mesh.position.z - halfW
      );
      this.tempBox.max.set(
        animal.mesh.position.x + halfW,
        animal.mesh.position.y + height,
        animal.mesh.position.z + halfW
      );

      const hit = this.ray.intersectBox(this.tempBox, this.tempHitPoint);
      if (!hit) {
        continue;
      }

      const dist = origin.distanceTo(hit);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestAnimal = animal;
      }
    }

    if (!nearestAnimal || nearestDist > blockDistanceLimit) {
      return false;
    }

    nearestAnimal.hp -= damage;
    nearestAnimal.hitFlash = HIT_FLASH_DURATION;
    nearestAnimal.hitKnockback.set(direction.x * 3.5, direction.z * 3.5);
    // Hop + flee on hit
    nearestAnimal.velocityY = Math.max(nearestAnimal.velocityY || 0, 5.0);
    nearestAnimal.isGrounded = false;
    nearestAnimal.fleeTimer = 3.0;
    nearestAnimal.targetYaw = Math.atan2(-direction.x, -direction.z);
    nearestAnimal.wanderTimer = 3.0;
    return true;
  }

  removeAnimalAt(index, withEffect) {
    const animal = this.animals[index];
    if (withEffect) {
      this.particlesManager.spawnDeathPuff(
        animal.mesh.position.x,
        animal.mesh.position.y + 0.55,
        animal.mesh.position.z
      );
    }
    this.scene.remove(animal.mesh);
    for (let i = 0; i < animal.parts.length; i += 1) {
      animal.parts[i].geometry.dispose();
      animal.parts[i].material.dispose();
    }
    this.animals.splice(index, 1);
  }

  hasAnimalNearby(x, z, radius) {
    const radiusSq = radius * radius;
    for (let i = 0; i < this.animals.length; i += 1) {
      const animal = this.animals[i];
      const dx = animal.mesh.position.x - x;
      const dz = animal.mesh.position.z - z;
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

  getCount() {
    return this.animals.length;
  }

  destroy() {
    for (let i = this.animals.length - 1; i >= 0; i -= 1) {
      const animal = this.animals[i];
      this.scene.remove(animal.mesh);
      for (let j = 0; j < animal.parts.length; j += 1) {
        animal.parts[j].geometry.dispose();
        animal.parts[j].material.dispose();
      }
    }
    this.animals.length = 0;
  }
}
