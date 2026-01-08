/**
 * Fallback Animation Controller
 * Provides subtle ambient camera movement when tracking is unavailable
 */

export class FallbackAnimator {
  constructor(config, onUpdate) {
    this.config = config;
    this.onUpdate = onUpdate;
    
    this.isRunning = false;
    this.startTime = 0;
    
    // Animation parameters for figure-8 motion
    this.frequency = {
      x: 1,
      y: 2 // Creates figure-8 pattern
    };
    
    // Phase offset for more organic motion
    this.phase = {
      x: 0,
      y: Math.PI / 4
    };
  }
  
  /**
   * Start the fallback animation
   */
  start() {
    this.isRunning = true;
    this.startTime = performance.now();
  }
  
  /**
   * Stop the fallback animation
   */
  stop() {
    this.isRunning = false;
  }
  
  /**
   * Update the animation and emit new offset values
   * @param {number} time - Current timestamp from requestAnimationFrame
   */
  update(time) {
    if (!this.isRunning) {
      return;
    }
    
    const elapsed = time - this.startTime;
    const speed = this.config.fallbackAnimationSpeed;
    const radius = this.config.fallbackAnimationRadius;
    
    // Create smooth figure-8 / lemniscate motion
    // Using different frequencies creates the crossover pattern
    const t = elapsed * speed;
    
    // Lissajous curve for organic motion
    const x = Math.sin(t * this.frequency.x + this.phase.x) * radius.x;
    const y = Math.sin(t * this.frequency.y + this.phase.y) * radius.y;
    
    // Add subtle breathing/pulse effect with slower oscillation
    const breathe = Math.sin(t * 0.3) * 0.1;
    
    if (this.onUpdate) {
      this.onUpdate(x, y + breathe, 0);
    }
  }
  
  /**
   * Check if animation is currently running
   * @returns {boolean}
   */
  isActive() {
    return this.isRunning;
  }
  
  /**
   * Set animation speed
   * @param {number} speed
   */
  setSpeed(speed) {
    this.config.fallbackAnimationSpeed = speed;
  }
  
  /**
   * Set animation radius
   * @param {{x: number, y: number}} radius
   */
  setRadius(radius) {
    this.config.fallbackAnimationRadius = radius;
  }
}

