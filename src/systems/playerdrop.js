const DROP_FORWARD_OFFSET = 1.15;
const DROP_DOWN_OFFSET = 0.22;

export class PlayerDrop {
  constructor({ input, inventoryUI, playerController, gameModeManager, itemDropSystem }) {
    this.input = input;
    this.inventoryUI = inventoryUI;
    this.playerController = playerController;
    this.gameModeManager = gameModeManager;
    this.itemDropSystem = itemDropSystem;

    this.tmpOrigin = this.playerController.getPosition().clone();
    this.tmpDirection = this.playerController.getPosition().clone();
    this.tmpSpawn = this.playerController.getPosition().clone();
  }

  update(controlsEnabled) {
    if (!controlsEnabled || this.inventoryUI.isOpen()) {
      this.input.consumeKeyPress("KeyQ");
      return false;
    }

    if (!this.input.consumeKeyPress("KeyQ")) {
      return false;
    }

    return this.dropSelectedFromHotbar();
  }

  dropSelectedFromHotbar() {
    const selectedBlockId = this.inventoryUI.getSelectedBlockId();
    if (selectedBlockId == null) {
      return false;
    }

    if (this.gameModeManager.consumesBlocks()) {
      const consumed = this.inventoryUI.model.consumeSelectedBlock();
      if (!consumed) {
        return false;
      }
    }

    this.playerController.getCameraWorldPosition(this.tmpOrigin);
    this.playerController.getCameraWorldDirection(this.tmpDirection).normalize();
    this.tmpSpawn.copy(this.tmpOrigin).addScaledVector(this.tmpDirection, DROP_FORWARD_OFFSET);
    this.tmpSpawn.y -= DROP_DOWN_OFFSET;

    this.itemDropSystem.dropFromPlayer(
      selectedBlockId,
      this.tmpSpawn,
      this.tmpDirection,
      this.playerController.player.velocity
    );

    return true;
  }
}
