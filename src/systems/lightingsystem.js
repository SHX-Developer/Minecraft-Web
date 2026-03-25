import * as THREE from "three";
import { SUN_SHADOW_MAP_SIZE, SUN_SHADOW_RANGE } from "../utils/constants.js";

export class LightingSystem {
  constructor(renderer, dayNightCycle) {
    this.renderer = renderer;
    this.dayNightCycle = dayNightCycle;
    this.shadowRange = SUN_SHADOW_RANGE;

    this.configureRenderer();
    this.configureSunLight();
  }

  configureRenderer() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  configureSunLight() {
    const sun = this.dayNightCycle.sunLight;
    sun.castShadow = true;
    sun.shadow.mapSize.set(SUN_SHADOW_MAP_SIZE, SUN_SHADOW_MAP_SIZE);
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.022;
    sun.shadow.camera.left = -this.shadowRange;
    sun.shadow.camera.right = this.shadowRange;
    sun.shadow.camera.top = this.shadowRange;
    sun.shadow.camera.bottom = -this.shadowRange;
    sun.shadow.camera.near = 8;
    sun.shadow.camera.far = 760;
    sun.shadow.radius = 3.5;
    sun.shadow.blurSamples = 12;
  }

  update(playerPosition) {
    const sun = this.dayNightCycle.sunLight;
    const shadowCam = sun.shadow.camera;

    this.dayNightCycle.lightTarget.position.set(playerPosition.x, playerPosition.y + 12, playerPosition.z);
    sun.castShadow = this.dayNightCycle.sunFactor > 0.02;

    shadowCam.left = -this.shadowRange;
    shadowCam.right = this.shadowRange;
    shadowCam.top = this.shadowRange;
    shadowCam.bottom = -this.shadowRange;
    shadowCam.updateProjectionMatrix();
  }
}
