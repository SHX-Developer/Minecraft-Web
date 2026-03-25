import * as THREE from "three";
import { CLOUD_COUNT, CLOUD_HEIGHT } from "../utils/constants.js";

const CLOUD_FIELD_SIZE = 420;

export class CloudSystem {
  constructor(scene, dayNightCycle) {
    this.scene = scene;
    this.dayNightCycle = dayNightCycle;
    this.clouds = [];

    this.geometry = new THREE.BoxGeometry(6, 1.1, 4);
    this.material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, CLOUD_COUNT);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.scene.add(this.mesh);

    this.dummy = new THREE.Object3D();

    for (let i = 0; i < CLOUD_COUNT; i += 1) {
      this.clouds.push({
        x: (Math.random() - 0.5) * CLOUD_FIELD_SIZE,
        z: (Math.random() - 0.5) * CLOUD_FIELD_SIZE,
        y: CLOUD_HEIGHT + (Math.random() - 0.5) * 4,
        sx: 1.5 + Math.random() * 4.8,
        sz: 1.2 + Math.random() * 5.2,
        speed: 1.1 + Math.random() * 1.35,
      });
    }
  }

  update(delta, centerPosition) {
    const halfField = CLOUD_FIELD_SIZE * 0.5;

    for (let i = 0; i < this.clouds.length; i += 1) {
      const cloud = this.clouds[i];
      cloud.x += cloud.speed * delta;

      if (cloud.x - centerPosition.x > halfField) {
        cloud.x -= CLOUD_FIELD_SIZE;
      } else if (cloud.x - centerPosition.x < -halfField) {
        cloud.x += CLOUD_FIELD_SIZE;
      }

      if (cloud.z - centerPosition.z > halfField) {
        cloud.z -= CLOUD_FIELD_SIZE;
      } else if (cloud.z - centerPosition.z < -halfField) {
        cloud.z += CLOUD_FIELD_SIZE;
      }

      this.dummy.position.set(cloud.x, cloud.y, cloud.z);
      this.dummy.scale.set(cloud.sx, 1, cloud.sz);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;

    const brightness = 0.82 + this.dayNightCycle.sunFactor * 0.18;
    this.material.color.setRGB(brightness, brightness, brightness + 0.03);
    this.material.opacity = 0.6 + this.dayNightCycle.sunFactor * 0.3;
  }
}
