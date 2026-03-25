import * as THREE from "three";
import { CHUNK_SIZE_Y, ZOMBIE_DESPAWN_RADIUS } from "../utils/constants.js";
import { BLOCK, isBlockSolid } from "../world/blockTypes.js";

const ENEMY_SPAWN_INTERVAL = 12.0;
const ENEMY_SPAWN_RADIUS_MIN = 14;
const ENEMY_SPAWN_RADIUS_MAX = 48;
const ENEMY_MAX_COUNT = 6;
const STEP_JUMP_SPEED = 5.2;

const HIT_FLASH_DURATION = 0.14;
const HIT_COLOR = new THREE.Color(0xff3333);
const BURN_COLOR = new THREE.Color(0xffb165);
const FUSE_FLASH_COLOR = new THREE.Color(0xffffff);

const MOB_CONFIG = {
  skeleton: {
    hp: 10,
    speed: 2.4,
    chaseRadius: 32,
    shootRange: 16,
    attackCooldown: 2.0,
    attackDamage: 1,
    collisionRadius: 0.3,
    collisionHeight: 1.9,
    burnInDay: true,
    neededClearBlocks: 2,
  },
  creeper: {
    hp: 12,
    speed: 2.8,
    chaseRadius: 28,
    fuseRange: 3.2,
    maxAttackDamage: 20,
    collisionRadius: 0.32,
    collisionHeight: 1.65,
    burnInDay: false,
    fuseTime: 1.8,
    explosionRadius: 5.5,
    neededClearBlocks: 2,
  },
  spider: {
    hp: 8,
    speed: 4.2,
    chaseRadius: 24,
    attackRange: 1.5,
    attackCooldown: 1.4,
    attackDamage: 1,
    collisionRadius: 0.42,
    collisionHeight: 1.0,
    burnInDay: false,
    jumpInterval: 3.5,
    jumpSpeed: 7.0,
    neededClearBlocks: 1,
    retreatDuration: 0.7,
    retreatSpeed: 3.5,
  },
};

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export class EnemyManager {
  constructor(scene, world, particlesManager, daylightSystem, onAttackPlayer) {
    this.scene = scene;
    this.world = world;
    this.particlesManager = particlesManager;
    this.daylightSystem = daylightSystem;
    this.onAttackPlayer = onAttackPlayer;

    this.enemies = [];
    this.arrows = [];
    this.spawnTimer = 0;

    this.ray = new THREE.Ray();
    this.tempBox = new THREE.Box3();
    this.tempHitPoint = new THREE.Vector3();
  }

  update(delta, playerPosition) {
    this.updateSpawning(delta, playerPosition);
    this.updateArrows(delta, playerPosition);

    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      const dx = enemy.mesh.position.x - playerPosition.x;
      const dz = enemy.mesh.position.z - playerPosition.z;
      if (dx * dx + dz * dz > ZOMBIE_DESPAWN_RADIUS * ZOMBIE_DESPAWN_RADIUS) {
        this.removeEnemyAt(i, false);
        continue;
      }

      this.updateEnemy(enemy, delta, playerPosition);
      if (enemy.hp <= 0) {
        this.removeEnemyAt(i, true);
      }
    }
  }

  updateSpawning(delta, playerPosition) {
    if (!this.daylightSystem.isNight()) {
      this.spawnTimer = 0;
      return;
    }
    if (this.enemies.length >= ENEMY_MAX_COUNT) {
      return;
    }
    this.spawnTimer += delta;
    if (this.spawnTimer < ENEMY_SPAWN_INTERVAL) {
      return;
    }
    this.spawnTimer = 0;
    this.spawnAround(playerPosition, 6);
  }

  spawnAround(playerPosition, attempts) {
    const types = ["skeleton", "creeper", "spider"];
    for (let i = 0; i < attempts && this.enemies.length < ENEMY_MAX_COUNT; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius =
        ENEMY_SPAWN_RADIUS_MIN + Math.random() * (ENEMY_SPAWN_RADIUS_MAX - ENEMY_SPAWN_RADIUS_MIN);
      const x = Math.floor(playerPosition.x + Math.cos(angle) * radius);
      const z = Math.floor(playerPosition.z + Math.sin(angle) * radius);

      const distSq = (x + 0.5 - playerPosition.x) ** 2 + (z + 0.5 - playerPosition.z) ** 2;
      if (distSq < ENEMY_SPAWN_RADIUS_MIN * ENEMY_SPAWN_RADIUS_MIN) {
        continue;
      }
      if (!this.isChunkLoadedAt(x, z)) {
        continue;
      }

      const type = types[Math.floor(Math.random() * types.length)];
      const cfg = MOB_CONFIG[type];
      const spawnY = this.findSafeSpawnY(x, z, cfg.neededClearBlocks);
      if (spawnY === null) {
        continue;
      }

      const enemy = this.createEnemy(type, x + 0.5, spawnY, z + 0.5);
      this.enemies.push(enemy);
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
        if (this.world.getBlock(worldX, groundY + h, worldZ) !== BLOCK.AIR) {
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

  createEnemy(type, x, y, z) {
    const cfg = MOB_CONFIG[type];
    const root = new THREE.Group();
    const parts = [];

    const makePart = (size, color) => {
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.userData.baseColor = new THREE.Color(color);
      parts.push(mesh);
      return mesh;
    };

    let typeData = {};

    if (type === "skeleton") {
      const legL = makePart([0.2, 0.7, 0.2], "#d8d8d8");
      const legR = makePart([0.2, 0.7, 0.2], "#d8d8d8");
      const body = makePart([0.6, 0.78, 0.22], "#d8d8d8");
      const armL = makePart([0.18, 0.82, 0.18], "#d8d8d8");
      const armR = makePart([0.18, 0.82, 0.18], "#d8d8d8");
      const head = makePart([0.58, 0.58, 0.58], "#e8e8e8");

      legL.position.set(-0.13, 0.35, 0);
      legR.position.set(0.13, 0.35, 0);
      body.position.set(0, 0.7 + 0.39, 0);
      armL.position.set(-(0.3 + 0.09 + 0.02), 0.7 + 0.78 * 0.68, 0);
      armR.position.set(0.3 + 0.09 + 0.02, 0.7 + 0.78 * 0.68, 0);
      head.position.set(0, 0.7 + 0.78 + 0.29, 0);

      const eyeL = makePart([0.1, 0.1, 0.04], "#080808");
      const eyeR = makePart([0.1, 0.1, 0.04], "#080808");
      eyeL.position.set(-0.12, 0.06, 0.3);
      eyeR.position.set(0.12, 0.06, 0.3);
      head.add(eyeL, eyeR);

      root.add(legL, legR, body, armL, armR, head);
      typeData = { legL, legR, armL, armR, walkPhase: Math.random() * Math.PI * 2, velocityY: 0, isGrounded: true };

    } else if (type === "creeper") {
      const legFrontL = makePart([0.22, 0.52, 0.22], "#3d8a3d");
      const legFrontR = makePart([0.22, 0.52, 0.22], "#3d8a3d");
      const legBackL = makePart([0.22, 0.52, 0.22], "#3d8a3d");
      const legBackR = makePart([0.22, 0.52, 0.22], "#3d8a3d");
      legFrontL.position.set(-0.22, 0.26, -0.18);
      legFrontR.position.set(0.22, 0.26, -0.18);
      legBackL.position.set(-0.22, 0.26, 0.18);
      legBackR.position.set(0.22, 0.26, 0.18);
      const body = makePart([0.62, 0.72, 0.4], "#3d8a3d");
      body.position.set(0, 0.52 + 0.36, 0);
      const head = makePart([0.6, 0.6, 0.6], "#4aa84a");
      head.position.set(0, 0.52 + 0.72 + 0.3, 0);

      const eyeL = makePart([0.15, 0.15, 0.04], "#0a0a0a");
      const eyeR = makePart([0.15, 0.15, 0.04], "#0a0a0a");
      const mouthL = makePart([0.1, 0.12, 0.04], "#0a0a0a");
      const mouthR = makePart([0.1, 0.12, 0.04], "#0a0a0a");
      const mouthM = makePart([0.06, 0.16, 0.04], "#0a0a0a");
      eyeL.position.set(-0.14, 0.06, 0.31);
      eyeR.position.set(0.14, 0.06, 0.31);
      mouthL.position.set(-0.12, -0.1, 0.31);
      mouthR.position.set(0.12, -0.1, 0.31);
      mouthM.position.set(0, -0.18, 0.31);
      head.add(eyeL, eyeR, mouthL, mouthR, mouthM);

      root.add(legFrontL, legFrontR, legBackL, legBackR, body, head);
      typeData = {
        legs: [legFrontL, legFrontR, legBackL, legBackR],
        head,
        walkPhase: Math.random() * Math.PI * 2,
        fuseTimer: 0,
        isFusing: false,
        fuseResetCooldown: 0,
        velocityY: 0,
        isGrounded: true,
      };

    } else if (type === "spider") {
      const torso = makePart([0.82, 0.42, 0.54], "#2a2a2a");
      torso.position.set(0, 0.42 * 0.5 + 0.14, 0);
      const head = makePart([0.44, 0.34, 0.42], "#1e1e1e");
      head.position.set(0, 0.42 * 0.5 + 0.14 + 0.02, 0.46);

      const spiderLegs = [];
      for (let li = 0; li < 8; li += 1) {
        const side = li < 4 ? -1 : 1;
        const idx = li % 4;
        const leg = makePart([0.44, 0.08, 0.08], "#242424");
        leg.position.set(side * 0.58, 0.22, (idx - 1.5) * 0.16);
        leg.rotation.z = side * 0.55;
        root.add(leg);
        spiderLegs.push(leg);
      }

      for (let ei = 0; ei < 4; ei += 1) {
        const eye = makePart([0.08, 0.08, 0.04], "#cc2222");
        eye.position.set((ei % 2 === 0 ? -1 : 1) * (0.08 + (ei < 2 ? 0 : 0.18)), 0.04, 0.22);
        head.add(eye);
      }

      root.add(torso, head);
      typeData = {
        spiderLegs,
        walkPhase: Math.random() * Math.PI * 2,
        velocityY: 0,
        isGrounded: true,
        jumpTimer: 1.0 + Math.random() * 2.5,
        isAggro: false,
        retreatTimer: 0,
      };
    }

    root.position.set(x, y, z);
    root.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(root);

    return {
      type,
      mesh: root,
      parts,
      hp: cfg.hp,
      yaw: root.rotation.y,
      targetYaw: root.rotation.y,
      idleTurnTimer: 0.8 + Math.random() * 2.0,
      attackCooldown: 0.5 + Math.random(),
      burnTimer: 0,
      isBurning: false,
      hitFlash: 0,
      hitKnockback: new THREE.Vector2(0, 0),
      stuckTimer: 0,
      lastX: root.position.x,
      lastZ: root.position.z,
      jumpCooldown: 0,
      collisionRadius: cfg.collisionRadius,
      collisionHeight: cfg.collisionHeight,
      ...typeData,
    };
  }

  updateEnemy(enemy, delta, playerPosition) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
    enemy.jumpCooldown = Math.max(0, enemy.jumpCooldown - delta);

    const cfg = MOB_CONFIG[enemy.type];
    const dx = playerPosition.x - enemy.mesh.position.x;
    const dz = playerPosition.z - enemy.mesh.position.z;
    const distanceSq = dx * dx + dz * dz;
    const isChasing = distanceSq <= cfg.chaseRadius * cfg.chaseRadius;
    const dist = Math.sqrt(distanceSq);

    // Rotation AI
    if (isChasing && distanceSq > 0.0001) {
      enemy.targetYaw = Math.atan2(dx, dz);
    } else {
      enemy.idleTurnTimer -= delta;
      if (enemy.idleTurnTimer <= 0) {
        enemy.idleTurnTimer = 1.3 + Math.random() * 2.8;
        enemy.targetYaw += (Math.random() - 0.5) * 0.9;
      }
    }

    const turnSpeed = isChasing ? 4.4 : 2.1;
    const deltaYaw = angleDelta(enemy.targetYaw, enemy.mesh.rotation.y);
    const maxYawStep = turnSpeed * delta;
    const step = Math.max(-maxYawStep, Math.min(maxYawStep, deltaYaw));
    enemy.mesh.rotation.y += step;

    const turnPenalty = Math.max(0.35, 1 - Math.min(1, Math.abs(deltaYaw) / 1.4));

    // Stuck detection: if chasing but barely moved in 0.6s, nudge direction
    if (isChasing) {
      enemy.stuckTimer += delta;
      if (enemy.stuckTimer >= 0.6) {
        const movedSq = (enemy.mesh.position.x - enemy.lastX) ** 2 + (enemy.mesh.position.z - enemy.lastZ) ** 2;
        if (movedSq < 0.04) {
          enemy.targetYaw += (Math.random() - 0.5) * 1.2;
        }
        enemy.lastX = enemy.mesh.position.x;
        enemy.lastZ = enemy.mesh.position.z;
        enemy.stuckTimer = 0;
      }
    } else {
      enemy.stuckTimer = 0;
      enemy.lastX = enemy.mesh.position.x;
      enemy.lastZ = enemy.mesh.position.z;
    }

    if (enemy.type === "skeleton") {
      this.updateSkeleton(enemy, delta, playerPosition, dist, isChasing, turnPenalty, cfg);
    } else if (enemy.type === "creeper") {
      this.updateCreeper(enemy, delta, playerPosition, dist, distanceSq, isChasing, turnPenalty, cfg);
    } else if (enemy.type === "spider") {
      this.updateSpider(enemy, delta, playerPosition, dist, distanceSq, isChasing, turnPenalty, cfg);
    }

    if (enemy.hp <= 0) {
      return;
    }

    this.updateSunBurn(enemy, delta, cfg);
    this.updateColors(enemy);
  }

  updateSkeleton(enemy, delta, playerPosition, dist, isChasing, turnPenalty, cfg) {
    const inShootRange = isChasing && dist < cfg.shootRange && dist > 1.5;
    const moveSpeed = isChasing && !inShootRange ? cfg.speed * turnPenalty : 0;
    const moveX = Math.sin(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.x * delta;
    const moveZ = Math.cos(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.y * delta;
    enemy.hitKnockback.multiplyScalar(Math.max(0, 1 - delta * 5.5));

    this.moveEnemyWithCollisions(enemy, moveX, moveZ);
    this.updateYPhysics(enemy, delta);

    // Walk animation
    const walkFactor = Math.min(1, moveSpeed / 2.2 + 0.05);
    enemy.walkPhase += delta * (3 + walkFactor * 6);
    const swing = Math.sin(enemy.walkPhase) * 0.42 * walkFactor;
    if (enemy.legL) { enemy.legL.rotation.x = swing; }
    if (enemy.legR) { enemy.legR.rotation.x = -swing; }
    if (enemy.armL) { enemy.armL.rotation.x = -swing; }
    if (enemy.armR) { enemy.armR.rotation.x = swing; }

    if (inShootRange && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = cfg.attackCooldown;
      this.shootArrow(enemy, playerPosition, cfg.attackDamage);
    }
  }

  updateCreeper(enemy, delta, playerPosition, dist, distanceSq, isChasing, turnPenalty, cfg) {
    if (enemy.isFusing) {
      enemy.fuseTimer -= delta;
      if (enemy.fuseTimer <= 0) {
        this.explodeCreeper(enemy, playerPosition, cfg);
        return;
      }
      const flashRate = Math.max(3, 14 - enemy.fuseTimer * 5);
      enemy.hitFlash = Math.sin(performance.now() * 0.001 * flashRate * Math.PI) > 0 ? 0.08 : 0;
      return;
    }

    if (enemy.fuseResetCooldown > 0) {
      enemy.fuseResetCooldown -= delta;
    }

    const moveSpeed = isChasing ? cfg.speed * turnPenalty : 0;
    const moveX = Math.sin(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.x * delta;
    const moveZ = Math.cos(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.y * delta;
    enemy.hitKnockback.multiplyScalar(Math.max(0, 1 - delta * 5.5));

    this.moveEnemyWithCollisions(enemy, moveX, moveZ);
    this.updateYPhysics(enemy, delta);

    enemy.walkPhase += delta * (3 + Math.min(1, moveSpeed / 2.8) * 5);
    if (enemy.legs) {
      for (let li = 0; li < enemy.legs.length; li += 1) {
        enemy.legs[li].rotation.x = Math.sin(enemy.walkPhase + li * Math.PI * 0.5) * 0.3;
      }
    }

    if (isChasing && distanceSq < cfg.fuseRange * cfg.fuseRange && enemy.fuseResetCooldown <= 0) {
      enemy.isFusing = true;
      enemy.fuseTimer = cfg.fuseTime;
    }
  }

  explodeCreeper(enemy, playerPosition, cfg) {
    const dx = enemy.mesh.position.x - playerPosition.x;
    const dy = enemy.mesh.position.y - playerPosition.y;
    const dz = enemy.mesh.position.z - playerPosition.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist <= cfg.explosionRadius) {
      // Quadratic falloff — lethal at close range
      const t = Math.max(0, 1 - dist / cfg.explosionRadius);
      const damage = Math.max(1, Math.ceil(t * t * cfg.maxAttackDamage));
      if (this.onAttackPlayer) {
        this.onAttackPlayer(damage, enemy.mesh.position);
      }
    }

    this.particlesManager.spawnDeathPuff(
      enemy.mesh.position.x,
      enemy.mesh.position.y + enemy.collisionHeight * 0.5,
      enemy.mesh.position.z
    );
    enemy.hp = 0;
  }

  updateSpider(enemy, delta, playerPosition, dist, distanceSq, isChasing, turnPenalty, cfg) {
    const isDay = this.daylightSystem.isDaylight();

    // Daytime: passive unless aggro
    const shouldChase = isChasing && (!isDay || enemy.isAggro);

    // Retreat after attack
    if (enemy.retreatTimer > 0) {
      enemy.retreatTimer -= delta;
      const awayX = -Math.sin(enemy.mesh.rotation.y) * cfg.retreatSpeed * delta;
      const awayZ = -Math.cos(enemy.mesh.rotation.y) * cfg.retreatSpeed * delta;
      this.moveEnemyWithCollisions(enemy, awayX, awayZ);
      this.updateYPhysics(enemy, delta);
      this.animateSpiderLegs(enemy, delta);
      return;
    }

    // Y physics
    if (!enemy.isGrounded) {
      enemy.velocityY -= 24.0 * delta;
      enemy.mesh.position.y += enemy.velocityY * delta;
      const groundY = this.world.getSurfaceHeight(enemy.mesh.position.x, enemy.mesh.position.z);
      const targetY = groundY + 1;
      if (enemy.mesh.position.y <= targetY) {
        enemy.mesh.position.y = targetY;
        enemy.velocityY = 0;
        enemy.isGrounded = true;
      }
    } else {
      const groundY = this.world.getSurfaceHeight(enemy.mesh.position.x, enemy.mesh.position.z);
      const targetY = groundY + 1;
      enemy.mesh.position.y += (targetY - enemy.mesh.position.y) * Math.min(1, delta * 10);
    }

    // Jump toward player
    if (shouldChase && enemy.isGrounded) {
      enemy.jumpTimer -= delta;
      if (enemy.jumpTimer <= 0 && dist > 2.0) {
        enemy.velocityY = cfg.jumpSpeed;
        enemy.isGrounded = false;
        enemy.jumpTimer = cfg.jumpInterval + Math.random() * 1.5;
      }
    }

    // Update facing direction toward/away
    if (shouldChase && distanceSq > 0.0001) {
      enemy.targetYaw = Math.atan2(
        playerPosition.x - enemy.mesh.position.x,
        playerPosition.z - enemy.mesh.position.z
      );
    }

    const moveSpeed = shouldChase ? cfg.speed * turnPenalty : 0;
    const moveX = Math.sin(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.x * delta;
    const moveZ = Math.cos(enemy.mesh.rotation.y) * moveSpeed * delta + enemy.hitKnockback.y * delta;
    enemy.hitKnockback.multiplyScalar(Math.max(0, 1 - delta * 5.5));

    this.moveEnemyWithCollisions(enemy, moveX, moveZ);
    this.animateSpiderLegs(enemy, delta);

    // Melee attack
    if (shouldChase && distanceSq < cfg.attackRange * cfg.attackRange && enemy.attackCooldown <= 0) {
      enemy.attackCooldown = cfg.attackCooldown;
      enemy.retreatTimer = cfg.retreatDuration;
      if (this.onAttackPlayer) {
        this.onAttackPlayer(cfg.attackDamage, enemy.mesh.position);
      }
    }
  }

  animateSpiderLegs(enemy, delta) {
    enemy.walkPhase += delta * 8;
    if (enemy.spiderLegs) {
      for (let li = 0; li < enemy.spiderLegs.length; li += 1) {
        const side = li < 4 ? -1 : 1;
        enemy.spiderLegs[li].rotation.z = side * 0.55 + Math.sin(enemy.walkPhase + li * 0.8) * 0.35;
      }
    }
  }

  updateYPhysics(enemy, delta) {
    const groundY = this.world.getSurfaceHeight(enemy.mesh.position.x, enemy.mesh.position.z);
    const targetY = groundY + 1;

    if (!enemy.isGrounded) {
      enemy.velocityY -= 24.0 * delta;
      enemy.mesh.position.y += enemy.velocityY * delta;
      if (enemy.mesh.position.y <= targetY) {
        enemy.mesh.position.y = targetY;
        enemy.velocityY = 0;
        enemy.isGrounded = true;
      }
    } else {
      enemy.mesh.position.y += (targetY - enemy.mesh.position.y) * Math.min(1, delta * 10);
      if (enemy.mesh.position.y > targetY + 0.5) {
        enemy.isGrounded = false;
      }
    }
  }

  snapToGround(enemy, delta) {
    const groundY = this.world.getSurfaceHeight(enemy.mesh.position.x, enemy.mesh.position.z);
    const targetY = groundY + 1;
    enemy.mesh.position.y += (targetY - enemy.mesh.position.y) * Math.min(1, delta * 10);
  }

  shootArrow(skeleton, playerPosition, damage) {
    const startY = skeleton.mesh.position.y + skeleton.collisionHeight * 0.72;
    // Aim at player head/chest
    const aimTargetY = playerPosition.y + 1.65;
    const dir = new THREE.Vector3(
      playerPosition.x - skeleton.mesh.position.x,
      aimTargetY - startY,
      playerPosition.z - skeleton.mesh.position.z
    ).normalize();

    const geo = new THREE.BoxGeometry(0.06, 0.06, 0.52);
    const mat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
    const arrowMesh = new THREE.Mesh(geo, mat);
    const startPos = new THREE.Vector3(skeleton.mesh.position.x, startY, skeleton.mesh.position.z);
    arrowMesh.position.copy(startPos);
    arrowMesh.lookAt(startPos.clone().add(dir));
    this.scene.add(arrowMesh);

    this.arrows.push({
      mesh: arrowMesh,
      velocity: dir.clone().multiplyScalar(18),
      damage,
      life: 4.0,
    });
  }

  updateArrows(delta, playerPosition) {
    for (let i = this.arrows.length - 1; i >= 0; i -= 1) {
      const arrow = this.arrows[i];
      arrow.life -= delta;
      if (arrow.life <= 0) {
        this.removeArrow(i);
        continue;
      }

      arrow.velocity.y -= 8.0 * delta;
      arrow.mesh.position.addScaledVector(arrow.velocity, delta);

      if (arrow.velocity.lengthSq() > 0.001) {
        arrow.mesh.lookAt(arrow.mesh.position.clone().add(arrow.velocity));
      }

      const pdx = arrow.mesh.position.x - playerPosition.x;
      const pdy = arrow.mesh.position.y - playerPosition.y - 0.9;
      const pdz = arrow.mesh.position.z - playerPosition.z;
      if (pdx * pdx + pdy * pdy + pdz * pdz < 0.9) {
        if (this.onAttackPlayer) {
          this.onAttackPlayer(arrow.damage, null);
        }
        this.removeArrow(i);
        continue;
      }

      const bx = Math.floor(arrow.mesh.position.x);
      const by = Math.floor(arrow.mesh.position.y);
      const bz = Math.floor(arrow.mesh.position.z);
      if (isBlockSolid(this.world.getBlock(bx, by, bz))) {
        this.removeArrow(i);
      }
    }
  }

  removeArrow(index) {
    const arrow = this.arrows[index];
    this.scene.remove(arrow.mesh);
    arrow.mesh.geometry.dispose();
    arrow.mesh.material.dispose();
    this.arrows.splice(index, 1);
  }

  updateSunBurn(enemy, delta, cfg) {
    if (!cfg.burnInDay) {
      enemy.isBurning = false;
      return;
    }

    if (this.daylightSystem.isDaylight() && this.isExposedToSky(enemy)) {
      enemy.isBurning = true;
      enemy.burnTimer += delta;
      if (enemy.burnTimer >= 1.0) {
        enemy.burnTimer -= 1.0;
        enemy.hp -= 1;
        enemy.hitFlash = Math.max(enemy.hitFlash, HIT_FLASH_DURATION * 0.7);
      }
      return;
    }

    enemy.isBurning = false;
    enemy.burnTimer = 0;
  }

  updateColors(enemy) {
    const hitFactor = Math.max(0, enemy.hitFlash / HIT_FLASH_DURATION);
    const burnPulse =
      enemy.isBurning
        ? 0.18 + Math.sin(performance.now() * 0.01 + (enemy.walkPhase || 0)) * 0.12
        : 0;
    const burnFactor = Math.max(0, burnPulse);

    const isFuseFlash =
      enemy.type === "creeper" && enemy.isFusing && enemy.hitFlash > 0.04;

    for (let i = 0; i < enemy.parts.length; i += 1) {
      const part = enemy.parts[i];
      if (isFuseFlash) {
        part.material.color.copy(part.userData.baseColor).lerp(FUSE_FLASH_COLOR, 0.6);
      } else {
        part.material.color
          .copy(part.userData.baseColor)
          .lerp(BURN_COLOR, burnFactor)
          .lerp(HIT_COLOR, hitFactor);
      }
    }
  }

  moveEnemyWithCollisions(enemy, moveX, moveZ) {
    const startX = enemy.mesh.position.x;
    const startZ = enemy.mesh.position.z;

    const tryMove = (nx, nz) => {
      const result = this.canMoveTo(enemy, nx, nz);
      if (result.ok) {
        return true;
      }
      if (result.needJump && enemy.isGrounded && enemy.jumpCooldown <= 0) {
        enemy.velocityY = STEP_JUMP_SPEED;
        enemy.isGrounded = false;
        enemy.jumpCooldown = 0.65;
        return true;
      }
      return false;
    };

    if (tryMove(startX + moveX, startZ + moveZ)) {
      enemy.mesh.position.x += moveX;
      enemy.mesh.position.z += moveZ;
    } else if (tryMove(startX + moveX, startZ)) {
      enemy.mesh.position.x += moveX;
    } else if (tryMove(startX, startZ + moveZ)) {
      enemy.mesh.position.z += moveZ;
    }
  }

  canMoveTo(enemy, nextX, nextZ) {
    if (!this.isChunkLoadedAt(nextX, nextZ)) {
      return { ok: false, needJump: false };
    }
    const currentSurface = this.world.getSurfaceHeight(
      enemy.mesh.position.x,
      enemy.mesh.position.z
    );
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
    if (this.collidesAt(nextX, nextSurface + 1, nextZ, enemy.collisionRadius, enemy.collisionHeight)) {
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

  tryHitFromRay(origin, direction, maxDistance, damage, blockDistanceLimit = Infinity) {
    if (this.enemies.length === 0) {
      return false;
    }

    this.ray.set(origin, direction);

    let nearestEnemy = null;
    let nearestDist = maxDistance;

    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemy = this.enemies[i];
      const halfW = enemy.collisionRadius;
      const height = enemy.collisionHeight;

      this.tempBox.min.set(
        enemy.mesh.position.x - halfW,
        enemy.mesh.position.y,
        enemy.mesh.position.z - halfW
      );
      this.tempBox.max.set(
        enemy.mesh.position.x + halfW,
        enemy.mesh.position.y + height,
        enemy.mesh.position.z + halfW
      );

      const hit = this.ray.intersectBox(this.tempBox, this.tempHitPoint);
      if (!hit) {
        continue;
      }

      const dist = origin.distanceTo(hit);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy || nearestDist > blockDistanceLimit) {
      return false;
    }

    nearestEnemy.hp -= damage;
    nearestEnemy.hitFlash = HIT_FLASH_DURATION;
    nearestEnemy.hitKnockback.set(direction.x * 3.8, direction.z * 3.8);
    // Visible hit reaction hop
    nearestEnemy.velocityY = Math.max(nearestEnemy.velocityY, 5.0);
    nearestEnemy.isGrounded = false;

    // Spider: aggro on hit
    if (nearestEnemy.type === "spider") {
      nearestEnemy.isAggro = true;
    }

    // Cancel creeper fuse when hit
    if (nearestEnemy.type === "creeper" && nearestEnemy.isFusing) {
      nearestEnemy.isFusing = false;
      nearestEnemy.fuseTimer = 0;
      nearestEnemy.fuseResetCooldown = 3.0;
    }

    return true;
  }

  isExposedToSky(enemy) {
    const x = Math.floor(enemy.mesh.position.x);
    const z = Math.floor(enemy.mesh.position.z);

    if (this.world.getBlock(x, Math.floor(enemy.mesh.position.y + 0.2), z) === BLOCK.WATER) {
      return false;
    }

    const startY = Math.floor(enemy.mesh.position.y + enemy.collisionHeight + 0.05);
    for (let y = startY; y < CHUNK_SIZE_Y; y += 1) {
      if (isBlockSolid(this.world.getBlock(x, y, z))) {
        return false;
      }
    }
    return true;
  }

  isChunkLoadedAt(worldX, worldZ) {
    const chunk = this.world.getCurrentChunkCoords(worldX, worldZ);
    return !!this.world.getChunkEntry(chunk.cx, chunk.cz);
  }

  removeEnemyAt(index, withEffect) {
    const enemy = this.enemies[index];
    if (withEffect) {
      this.particlesManager.spawnDeathPuff(
        enemy.mesh.position.x,
        enemy.mesh.position.y + enemy.collisionHeight * 0.5,
        enemy.mesh.position.z
      );
    }
    this.scene.remove(enemy.mesh);
    for (let i = 0; i < enemy.parts.length; i += 1) {
      enemy.parts[i].geometry.dispose();
      enemy.parts[i].material.dispose();
    }
    this.enemies.splice(index, 1);
  }

  getCount() {
    return this.enemies.length;
  }

  clear() {
    while (this.enemies.length > 0) {
      this.removeEnemyAt(this.enemies.length - 1, false);
    }
    while (this.arrows.length > 0) {
      this.removeArrow(this.arrows.length - 1);
    }
  }

  destroy() {
    this.clear();
  }
}
