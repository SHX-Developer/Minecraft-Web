import { ZOMBIE_CHASE_RADIUS, ZOMBIE_SPEED } from "../utils/constants.js";

function angleDelta(target, current) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export class ZombieAI {
  updateIntent(zombie, playerPosition, delta) {
    const dx = playerPosition.x - zombie.mesh.position.x;
    const dz = playerPosition.z - zombie.mesh.position.z;
    const distanceSq = dx * dx + dz * dz;
    const chaseRadiusSq = ZOMBIE_CHASE_RADIUS * ZOMBIE_CHASE_RADIUS;
    const isChasing = distanceSq <= chaseRadiusSq;

    if (isChasing && distanceSq > 0.0001) {
      zombie.targetYaw = Math.atan2(dx, dz);
    } else {
      zombie.idleTurnTimer -= delta;
      if (zombie.idleTurnTimer <= 0) {
        zombie.idleTurnTimer = 1.3 + Math.random() * 2.8;
        zombie.targetYaw += (Math.random() - 0.5) * 0.9;
      }
    }

    const turnSpeed = isChasing ? 4.4 : 2.1;
    const deltaYaw = angleDelta(zombie.targetYaw, zombie.mesh.rotation.y);
    const maxYawStep = turnSpeed * delta;
    const step = Math.max(-maxYawStep, Math.min(maxYawStep, deltaYaw));
    zombie.mesh.rotation.y += step;
    zombie.yaw = zombie.mesh.rotation.y;

    const turnPenalty = Math.max(0.22, 1 - Math.min(1, Math.abs(deltaYaw) / 1.1));
    const moveSpeed = isChasing ? ZOMBIE_SPEED * turnPenalty : 0;
    const moveX = Math.sin(zombie.mesh.rotation.y) * moveSpeed * delta + zombie.hitKnockback.x * delta;
    const moveZ = Math.cos(zombie.mesh.rotation.y) * moveSpeed * delta + zombie.hitKnockback.y * delta;

    zombie.hitKnockback.multiplyScalar(Math.max(0, 1 - delta * 5.5));

    return {
      isChasing,
      distanceSq,
      moveX,
      moveZ,
      speed: moveSpeed,
    };
  }
}
