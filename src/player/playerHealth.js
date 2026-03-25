export class PlayerHealth {
  constructor(maxHealth = 10) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
    this.isDead = false;
    this.listeners = new Set();
    this.deathListeners = new Set();
    this.damageFlashTimer = 0;
    this.timeSinceDamage = Infinity;
    this.regenAccum = 0;
  }

  getHealth() {
    return this.health;
  }

  getMaxHealth() {
    return this.maxHealth;
  }

  takeDamage(amount) {
    if (this.isDead || amount <= 0) {
      return;
    }
    this.health = Math.max(0, this.health - amount);
    this.damageFlashTimer = 0.4;
    this.timeSinceDamage = 0;
    this.regenAccum = 0;
    this.emitChange();
    if (this.health <= 0) {
      this.isDead = true;
      this.emitDeath();
    }
  }

  heal(amount) {
    if (this.isDead || amount <= 0) {
      return;
    }
    this.health = Math.min(this.maxHealth, this.health + amount);
    this.emitChange();
  }

  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.damageFlashTimer = 0;
    this.timeSinceDamage = Infinity;
    this.regenAccum = 0;
    this.emitChange();
  }

  update(delta) {
    if (this.damageFlashTimer > 0) {
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - delta);
    }
    if (!this.isDead && this.health < this.maxHealth) {
      this.timeSinceDamage += delta;
      if (this.timeSinceDamage >= 5.0) {
        this.regenAccum += delta;
        if (this.regenAccum >= 4.0) {
          this.regenAccum -= 4.0;
          this.heal(1);
        }
      }
    }
  }

  isDamageFlashing() {
    return this.damageFlashTimer > 0;
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onDeath(listener) {
    this.deathListeners.add(listener);
    return () => this.deathListeners.delete(listener);
  }

  emitChange() {
    for (const listener of this.listeners) {
      listener(this.health, this.maxHealth);
    }
  }

  emitDeath() {
    for (const listener of this.deathListeners) {
      listener();
    }
  }
}
