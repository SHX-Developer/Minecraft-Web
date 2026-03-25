import * as THREE from "three";
import {
  DAY_DURATION_SECONDS,
  FOG_FAR,
  FOG_NEAR,
  NIGHT_DURATION_SECONDS,
  SKY_COLOR,
  STAR_COUNT,
} from "../utils/constants.js";
import { clamp } from "../utils/helpers.js";

const DAY_SKY = new THREE.Color(SKY_COLOR);
const SUNSET_SKY = new THREE.Color(0xff9352);
const NIGHT_SKY = new THREE.Color(0x01040b);

const DAY_FOG = new THREE.Color(0x95caff);
const SUNSET_FOG = new THREE.Color(0xb66f4c);
const NIGHT_FOG = new THREE.Color(0x0c1830);

export class DayNightCycle {
  constructor(scene) {
    this.scene = scene;
    this.cycleDuration = DAY_DURATION_SECONDS + NIGHT_DURATION_SECONDS;
    this.time = this.cycleDuration * 0.28;
    this.orbitRadius = 180;
    this.skyElevation = 88;
    this.worldAzimuth = 0.42;

    this.skyAnchor = new THREE.Group();
    this.scene.add(this.skyAnchor);

    this.sunLight = new THREE.DirectionalLight(0xffefcb, 1.0);
    this.moonLight = new THREE.DirectionalLight(0x94b4ff, 0.0);
    this.ambientLight = new THREE.HemisphereLight(0xb4d1ff, 0x33432f, 0.68);
    this.lightTarget = new THREE.Object3D();
    this.scene.add(this.ambientLight, this.sunLight, this.moonLight, this.lightTarget);
    this.sunLight.target = this.lightTarget;
    this.moonLight.target = this.lightTarget;

    const sunMat = new THREE.SpriteMaterial({
      color: 0xffc66f,
      fog: false,
      depthTest: true,
      depthWrite: false,
    });
    this.sunMesh = new THREE.Sprite(sunMat);
    this.sunMesh.scale.set(42, 42, 1);
    this.sunMesh.frustumCulled = false;
    this.sunMesh.renderOrder = 0;

    const moonMat = new THREE.SpriteMaterial({
      color: 0xd6e6ff,
      fog: false,
      depthTest: true,
      depthWrite: false,
    });
    this.moonMesh = new THREE.Sprite(moonMat);
    this.moonMesh.scale.set(36, 36, 1);
    this.moonMesh.frustumCulled = false;
    this.moonMesh.renderOrder = 0;

    this.skyAnchor.add(this.sunMesh, this.moonMesh);

    this.starField = this.createStarField();
    this.skyAnchor.add(this.starField);

    this.currentSkyColor = DAY_SKY.clone();
    this.currentFogColor = DAY_FOG.clone();
    this.currentFogNear = FOG_NEAR;
    this.currentFogFar = FOG_FAR;
    this.sunFactor = 1;
    this.moonFactor = 0;

    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.azimuthQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.worldAzimuth
    );
    this.centerAtEye = new THREE.Vector3();
    this.sunLookTarget = new THREE.Vector3();
    this.lightTargetPos = new THREE.Vector3();
  }

  createStarField() {
    const positions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const phi = Math.acos(1 - Math.random() * 0.9);
      const theta = Math.random() * Math.PI * 2;
      const radius = this.orbitRadius * (1.02 + Math.random() * 0.22);
      const x = Math.sin(phi) * Math.cos(theta) * radius;
      const y = Math.abs(Math.cos(phi)) * radius + 45;
      const z = Math.sin(phi) * Math.sin(theta) * radius;
      const idx = i * 3;
      positions[idx] = x;
      positions[idx + 1] = y;
      positions[idx + 2] = z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xeef5ff,
      size: 1.45,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthTest: true,
      depthWrite: false,
      fog: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.renderOrder = -2;
    return points;
  }

  update(delta, playerPosition) {
    this.time = (this.time + delta) % this.cycleDuration;
    const phase = this.time / this.cycleDuration;
    const angle = phase * Math.PI * 2 - Math.PI * 0.5;
    const sunElevation = Math.sin(angle);

    // Keep celestial bodies visually distant while preserving stable world-space motion.
    this.skyAnchor.position.set(playerPosition.x, this.skyElevation, playerPosition.z);

    this.sunDir.set(Math.cos(angle), Math.sin(angle), 0).applyQuaternion(this.azimuthQuat).normalize();
    this.moonDir.copy(this.sunDir).multiplyScalar(-1);

    this.sunMesh.position.copy(this.sunDir).multiplyScalar(this.orbitRadius);
    this.moonMesh.position.copy(this.moonDir).multiplyScalar(this.orbitRadius);

    const sunWorldPos = this.sunMesh.getWorldPosition(this.lightTargetPos);
    this.sunLight.position.copy(sunWorldPos);
    const moonWorldPos = this.moonMesh.getWorldPosition(this.lightTargetPos);
    this.moonLight.position.copy(moonWorldPos);

    this.lightTarget.position.set(playerPosition.x, playerPosition.y + 16, playerPosition.z);

    this.sunFactor = clamp(sunElevation * 1.17 + 0.05, 0, 1);
    this.moonFactor = clamp(-sunElevation * 0.67, 0, 0.67);

    this.sunLight.intensity = this.sunFactor * 1.62;
    this.moonLight.intensity = this.moonFactor * 0.86;
    this.ambientLight.intensity = 0.3 + this.sunFactor * 0.92;

    const twilight = clamp(1 - Math.abs(sunElevation) * 3.2, 0, 1);
    this.currentSkyColor.copy(NIGHT_SKY).lerp(DAY_SKY, this.sunFactor);
    this.currentFogColor.copy(NIGHT_FOG).lerp(DAY_FOG, this.sunFactor);
    if (twilight > 0) {
      const tint = twilight * 0.58;
      this.currentSkyColor.lerp(SUNSET_SKY, tint);
      this.currentFogColor.lerp(SUNSET_FOG, tint);
    }

    this.currentFogNear = 12 + this.sunFactor * (FOG_NEAR - 12);
    this.currentFogFar = 74 + this.sunFactor * (FOG_FAR - 74);

    this.scene.background.copy(this.currentSkyColor);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.currentFogColor);
      this.scene.fog.near = this.currentFogNear;
      this.scene.fog.far = this.currentFogFar;
    }

    const starsOpacity = clamp((this.moonFactor - 0.08) * 2.4, 0, 0.88);
    this.starField.material.opacity = starsOpacity;
    this.sunMesh.material.opacity = clamp((this.sunFactor - 0.02) * 1.22, 0, 1);
    this.moonMesh.material.opacity = clamp((this.moonFactor - 0.03) * 1.7, 0, 0.95);
  }
}
