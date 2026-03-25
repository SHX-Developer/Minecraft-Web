import { BLOCK } from "../world/blockTypes.js";

function intBound(start, delta) {
  if (delta === 0) {
    return Infinity;
  }
  if (delta > 0) {
    return (Math.floor(start + 1) - start) / delta;
  }
  return (start - Math.floor(start)) / -delta;
}

export function raycastBlock(world, origin, direction, maxDistance) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(direction.x);
  const stepY = Math.sign(direction.y);
  const stepZ = Math.sign(direction.z);

  let tMaxX = intBound(origin.x, direction.x);
  let tMaxY = intBound(origin.y, direction.y);
  let tMaxZ = intBound(origin.z, direction.z);

  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / direction.x);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / direction.y);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / direction.z);

  let traveled = 0;
  let hitNormalX = 0;
  let hitNormalY = 0;
  let hitNormalZ = 0;

  while (traveled <= maxDistance) {
    const id = world.getBlock(x, y, z);
    if (id !== BLOCK.AIR && id !== BLOCK.WATER) {
      return {
        id,
        distance: traveled,
        position: { x, y, z },
        normal: { x: hitNormalX, y: hitNormalY, z: hitNormalZ },
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        traveled = tMaxX;
        tMaxX += tDeltaX;
        hitNormalX = -stepX;
        hitNormalY = 0;
        hitNormalZ = 0;
      } else {
        z += stepZ;
        traveled = tMaxZ;
        tMaxZ += tDeltaZ;
        hitNormalX = 0;
        hitNormalY = 0;
        hitNormalZ = -stepZ;
      }
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      traveled = tMaxY;
      tMaxY += tDeltaY;
      hitNormalX = 0;
      hitNormalY = -stepY;
      hitNormalZ = 0;
    } else {
      z += stepZ;
      traveled = tMaxZ;
      tMaxZ += tDeltaZ;
      hitNormalX = 0;
      hitNormalY = 0;
      hitNormalZ = -stepZ;
    }
  }

  return null;
}
