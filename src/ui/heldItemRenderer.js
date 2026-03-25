import * as THREE from "three";
import { createItemDisplayMesh } from "../items/itemMeshFactory.js";
import { HELD_ITEM_PIXEL_RATIO_MAX } from "../utils/constants.js";

export class HeldItemRenderer {
  constructor(canvas, atlasTexture) {
    this.canvas = canvas;
    this.atlasTexture = atlasTexture;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HELD_ITEM_PIXEL_RATIO_MAX));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(canvas.clientWidth || 220, canvas.clientHeight || 220, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 12);
    this.camera.position.set(0, 0, 2.72);
    this.camera.lookAt(0.35, -0.38, 0.12);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.96);
    this.dir = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dir.position.set(2.2, 3.2, 2.25);
    this.scene.add(this.ambient, this.dir);

    this.handGroup = new THREE.Group();
    this.baseHandPosition = new THREE.Vector3(0.96, -0.98, 0.06);
    this.baseHandRotation = new THREE.Euler(-0.78, 0.14, 0.42);
    this.handGroup.position.copy(this.baseHandPosition);
    this.handGroup.rotation.copy(this.baseHandRotation);

    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xd8b89b });
    const sleeveMaterial = new THREE.MeshLambertMaterial({ color: 0x4a6387 });
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.36, 0.78), sleeveMaterial);
    sleeve.position.set(0, -0.62, 0);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.0, 0.68), armMaterial);
    hand.position.set(0, 0.36, 0);
    this.handGroup.add(sleeve, hand);
    this.scene.add(this.handGroup);

    this.currentBlockId = null;
    this.currentMesh = null;
    this.currentMeshBaseRotation = new THREE.Euler();
    this.currentMeshBasePosition = new THREE.Vector3();
    this.currentMeshBaseScale = 1;
    this.time = 0;
    this.visible = true;

    // Swing animation state
    this.isSwinging = false;
    this.swingTimer = 0;
    this.swingDuration = 0.22;
    this.isBreakingAnim = false;
    this.breakPhase = 0;
  }

  setItem(blockId) {
    if (this.currentBlockId === blockId) {
      return;
    }
    this.currentBlockId = blockId;

    if (this.currentMesh) {
      this.handGroup.remove(this.currentMesh);
      this.disposeObject(this.currentMesh);
      this.currentMesh = null;
    }

    if (blockId == null) {
      return;
    }

    this.currentMesh = createItemDisplayMesh(blockId, this.atlasTexture);
    const kind = this.currentMesh.userData.itemKind || "block";
    if (kind === "plant") {
      this.currentMeshBaseRotation.set(-0.34, 0.72, 0.05);
      this.currentMeshBasePosition.set(0.04, 0.86, -0.06);
      this.currentMeshBaseScale = 0.9;
    } else if (kind === "torch") {
      this.currentMeshBaseRotation.set(-0.64, 0.4, -0.02);
      this.currentMeshBasePosition.set(0.06, 0.85, -0.06);
      this.currentMeshBaseScale = 0.88;
    } else {
      this.currentMeshBaseRotation.set(-0.48, 0.76, 0.05);
      this.currentMeshBasePosition.set(0.08, 0.8, -0.04);
      this.currentMeshBaseScale = 0.86;
    }
    this.currentMesh.rotation.copy(this.currentMeshBaseRotation);
    this.currentMesh.position.copy(this.currentMeshBasePosition);
    this.currentMesh.scale.setScalar(this.currentMeshBaseScale);
    this.handGroup.add(this.currentMesh);
  }

  setVisible(visible) {
    this.visible = visible;
    this.canvas.style.opacity = visible ? "1" : "0";
  }

  startSwing() {
    this.isSwinging = true;
    this.swingTimer = 0;
    this.isBreakingAnim = false;
    this.breakPhase = 0;
  }

  setBreaking(isBreaking) {
    if (isBreaking && !this.isBreakingAnim) {
      this.isBreakingAnim = true;
      this.breakPhase = 0;
      this.isSwinging = false;
    } else if (!isBreaking) {
      this.isBreakingAnim = false;
    }
  }

  update(delta, isSprinting = false) {
    if (!this.visible) {
      return;
    }
    this.time += delta;

    // Compute swing offset for X rotation
    let swingOffsetX = 0;
    if (this.isBreakingAnim) {
      this.breakPhase += delta * 9.5;
      swingOffsetX = -Math.abs(Math.sin(this.breakPhase)) * 0.9;
    } else if (this.isSwinging) {
      this.swingTimer += delta;
      const t = this.swingTimer / this.swingDuration;
      if (t >= 1) {
        this.isSwinging = false;
        this.swingTimer = 0;
      } else {
        swingOffsetX = -Math.sin(t * Math.PI) * 1.3;
      }
    }

    const bob = Math.sin(this.time * 5.8) * (isSprinting ? 0.05 : 0.022);
    this.handGroup.position.set(
      this.baseHandPosition.x,
      this.baseHandPosition.y + bob,
      this.baseHandPosition.z
    );
    this.handGroup.rotation.set(
      this.baseHandRotation.x + swingOffsetX + Math.cos(this.time * 3.2) * (isSprinting ? 0.045 : 0.015),
      this.baseHandRotation.y + Math.sin(this.time * 2.4) * 0.02,
      this.baseHandRotation.z + Math.sin(this.time * 2.2) * (isSprinting ? 0.035 : 0.012)
    );

    if (this.currentMesh) {
      this.currentMesh.position.set(
        this.currentMeshBasePosition.x,
        this.currentMeshBasePosition.y + Math.sin(this.time * 4.2) * 0.01,
        this.currentMeshBasePosition.z
      );
      this.currentMesh.rotation.set(
        this.currentMeshBaseRotation.x + Math.sin(this.time * 3.4) * 0.01,
        this.currentMeshBaseRotation.y + Math.sin(this.time * 2.7) * 0.016,
        this.currentMeshBaseRotation.z
      );
    }

    this.renderer.render(this.scene, this.camera);
  }

  disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (!child.material) {
        return;
      }
      if (Array.isArray(child.material)) {
        for (let i = 0; i < child.material.length; i += 1) {
          child.material[i].dispose();
        }
        return;
      }
      child.material.dispose();
    });
  }

  destroy() {
    if (this.currentMesh) {
      this.disposeObject(this.currentMesh);
      this.currentMesh = null;
    }
    this.handGroup.traverse((child) => {
      if (!child.geometry || !child.material) {
        return;
      }
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
