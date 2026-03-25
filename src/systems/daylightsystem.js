export class DaylightSystem {
  constructor(dayNightCycle, options = {}) {
    this.dayNightCycle = dayNightCycle;
    this.dayThreshold = options.dayThreshold ?? 0.32;
    this.nightThreshold = options.nightThreshold ?? 0.24;
    this.daylight = true;
    this.sunStrength = 1;
    this.time01 = 0;
  }

  update() {
    this.sunStrength = this.dayNightCycle.sunFactor ?? 0;
    this.time01 = this.dayNightCycle.time / this.dayNightCycle.cycleDuration;

    if (this.daylight) {
      if (this.sunStrength < this.nightThreshold) {
        this.daylight = false;
      }
      return;
    }

    if (this.sunStrength > this.dayThreshold) {
      this.daylight = true;
    }
  }

  isDaylight() {
    return this.daylight;
  }

  isNight() {
    return !this.daylight;
  }

  getSunStrength() {
    return this.sunStrength;
  }
}
